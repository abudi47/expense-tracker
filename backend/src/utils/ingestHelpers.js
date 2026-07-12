const Account = require('../models/Account');
const DetectedItem = require('../models/DetectedItem');
const Transaction = require('../models/Transaction');
const { findDuplicateTransaction } = require('../utils/duplicates');
const { computeAccountBalance } = require('../utils/accountBalance');

function suggestAccount(accounts, hint = '', currency = 'ETB') {
  const h = String(hint).toLowerCase();
  if (!accounts.length) return null;

  const byName = accounts.find((a) => {
    const n = String(a.name).toLowerCase();
    return h && (n.includes(h) || h.includes(n));
  });
  if (byName) return byName;

  const byCurrency = accounts.find(
    (a) => String(a.currency).toUpperCase() === String(currency).toUpperCase()
  );
  return byCurrency || accounts[0];
}

async function upsertDetectedFromParsed(userId, parsed) {
  if (!parsed?.amount || !parsed.direction) {
    return { item: null, outcome: 'parse_failed' };
  }

  const externalRef =
    parsed.rawReference ||
    `${parsed.source}-${parsed.amount}-${parsed.date?.getTime?.() || Date.now()}`;

  let existing = await DetectedItem.findOne({ userId, externalRef });

  // Soft dedupe: same source/amount/direction still in review (unstable refs)
  if (!existing) {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    existing = await DetectedItem.findOne({
      userId,
      source: parsed.source,
      amount: parsed.amount,
      currency: parsed.currency,
      direction: parsed.direction,
      status: { $in: ['needs_review', 'duplicate'] },
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 });
  }

  if (existing) {
    if (existing.status === 'needs_review') {
      return { item: existing, outcome: 'already_queued' };
    }
    if (existing.status === 'duplicate') {
      return { item: existing, outcome: 'duplicate' };
    }
    return { item: existing, outcome: existing.status }; // approved | dismissed
  }

  const accounts = await Account.find({ userId, isArchived: false });
  const suggested = suggestAccount(accounts, parsed.accountHint, parsed.currency);

  const dupTx = await findDuplicateTransaction(userId, {
    amount: parsed.amount,
    date: parsed.date,
    accountId: suggested?._id,
    externalRef,
  });

  const item = await DetectedItem.create({
    userId,
    source: parsed.source,
    amount: parsed.amount,
    currency: parsed.currency,
    direction: parsed.direction,
    date: parsed.date || new Date(),
    accountHint: parsed.accountHint || '',
    suggestedAccountId: suggested?._id,
    rawReference: externalRef,
    externalRef,
    fee: parsed.fee,
    vat: parsed.vat,
    reportedBalance: parsed.reportedBalance,
    rawSnippet: parsed.rawSnippet || '',
    status: dupTx ? 'duplicate' : 'needs_review',
  });

  return {
    item,
    outcome: dupTx ? 'duplicate' : 'created',
  };
}

async function approveDetectedItem(userId, item, { accountId, category, note, allowOverdraft, force } = {}) {
  if (item.status === 'approved') {
    const err = new Error('Already approved');
    err.status = 400;
    throw err;
  }
  if (item.status === 'dismissed') {
    const err = new Error('Item was dismissed');
    err.status = 400;
    throw err;
  }

  const targetAccountId = accountId || item.suggestedAccountId;
  if (!targetAccountId) {
    const err = new Error('Select an account');
    err.status = 400;
    throw err;
  }

  const account = await Account.findOne({ _id: targetAccountId, userId, isArchived: false });
  if (!account) {
    const err = new Error('Account not found');
    err.status = 404;
    throw err;
  }

  const type = item.direction === 'incoming' ? 'income' : 'expense';
  const txCategory =
    category ||
    (type === 'income' ? `${item.source} deposit` : `${item.source} payment`);

  if (type === 'expense') {
    const balance = await computeAccountBalance(userId, account._id, account.openingBalance);
    if (item.amount > balance && !allowOverdraft) {
      const err = new Error('This expense would overdraw the account');
      err.status = 409;
      err.code = 'OVERDRAFT';
      err.data = {
        balance,
        amount: item.amount,
        projectedBalance: balance - item.amount,
        accountName: account.name,
      };
      throw err;
    }
  }

  const dup = await findDuplicateTransaction(userId, {
    amount: item.amount,
    date: item.date,
    accountId: account._id,
    externalRef: item.externalRef,
  });
  if (dup && !force) {
    const err = new Error('A similar transaction already exists');
    err.status = 409;
    err.code = 'DUPLICATE';
    err.data = { transaction: dup };
    throw err;
  }

  const transactions = [];
  const mainTx = await Transaction.create({
    userId,
    type,
    amount: item.amount,
    accountId: account._id,
    category: txCategory,
    source: type === 'income' ? item.source : undefined,
    date: item.date || new Date(),
    note: note != null ? note : item.rawSnippet?.slice(0, 120) || '',
    externalRef: item.externalRef,
    sourceChannel: item.source,
    fee: item.fee,
    vat: item.vat,
  });
  transactions.push(mainTx);

  // Record fee as separate expense so main amount reconciles with bank balance
  if (item.fee && item.fee > 0 && type === 'expense') {
    const feeTx = await Transaction.create({
      userId,
      type: 'expense',
      amount: item.fee,
      accountId: account._id,
      category: 'Service fee',
      date: item.date || new Date(),
      note: `Fee for ${item.externalRef || item.source}`,
      externalRef: item.externalRef ? `${item.externalRef}-fee` : undefined,
      sourceChannel: item.source,
    });
    transactions.push(feeTx);
  }
  if (item.vat && item.vat > 0 && type === 'expense') {
    const vatTx = await Transaction.create({
      userId,
      type: 'expense',
      amount: item.vat,
      accountId: account._id,
      category: 'VAT',
      date: item.date || new Date(),
      note: `VAT for ${item.externalRef || item.source}`,
      externalRef: item.externalRef ? `${item.externalRef}-vat` : undefined,
      sourceChannel: item.source,
    });
    transactions.push(vatTx);
  }

  item.status = 'approved';
  item.suggestedAccountId = account._id;
  item.transactionId = mainTx._id;
  await item.save();

  let balanceMismatch = null;
  if (item.reportedBalance != null) {
    const appBalance = await computeAccountBalance(userId, account._id, account.openingBalance);
    const drift = Math.abs(appBalance - item.reportedBalance);
    if (drift > 0.5) {
      balanceMismatch = {
        accountId: account._id,
        accountName: account.name,
        appBalance,
        reportedBalance: item.reportedBalance,
        difference: appBalance - item.reportedBalance,
      };
    }
  }

  return { item, transactions, balanceMismatch };
}

module.exports = {
  suggestAccount,
  upsertDetectedFromParsed,
  approveDetectedItem,
};
