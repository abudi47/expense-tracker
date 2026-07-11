const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const mongoose = require('mongoose');

async function computeAccountBalance(userId, accountId, openingBalance = 0) {
  const uid = new mongoose.Types.ObjectId(userId);
  const aid = new mongoose.Types.ObjectId(accountId);

  const [incomeAgg, expenseAgg, transferOutAgg, transferInAgg] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: uid, accountId: aid, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { userId: uid, accountId: aid, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { userId: uid, accountId: aid, type: 'transfer' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { userId: uid, toAccountId: aid, type: 'transfer' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const income = incomeAgg[0]?.total || 0;
  const expense = expenseAgg[0]?.total || 0;
  const transferOut = transferOutAgg[0]?.total || 0;
  const transferIn = transferInAgg[0]?.total || 0;

  return openingBalance + income - expense - transferOut + transferIn;
}

async function computeAllAccountBalances(userId) {
  const accounts = await Account.find({ userId, isArchived: false }).sort({ sortOrder: 1, name: 1 });
  const balances = await Promise.all(
    accounts.map(async (account) => {
      const balance = await computeAccountBalance(userId, account._id, account.openingBalance);
      return {
        ...account.toObject(),
        balance,
      };
    })
  );
  return balances;
}

async function validateAccountOwnership(userId, accountId) {
  const account = await Account.findOne({ _id: accountId, userId, isArchived: false });
  if (!account) {
    const err = new Error('Account not found');
    err.status = 404;
    throw err;
  }
  return account;
}

module.exports = {
  computeAccountBalance,
  computeAllAccountBalances,
  validateAccountOwnership,
};
