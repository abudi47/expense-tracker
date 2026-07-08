const express = require('express');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const auth = require('../middleware/auth');
const {
  computeAccountBalance,
  computeAllAccountBalances,
  validateAccountOwnership,
} = require('../utils/accountBalance');
const { attachConvertedBalances, sumConverted } = require('../utils/fx');

const router = express.Router();

router.use(auth);

const DEFAULT_ACCOUNT_TEMPLATES = [
  { name: 'Cash', icon: 'cash', color: '#10b981', currency: 'ETB', fxGroup: 'local' },
  { name: 'Local Bank', icon: 'business', color: '#3b82f6', currency: 'ETB', fxGroup: 'local' },
  { name: 'Binance', icon: 'logo-bitcoin', color: '#f59e0b', currency: 'USDT', fxGroup: 'crypto' },
  { name: 'Grey', icon: 'card', color: '#64748b', currency: 'USDT', fxGroup: 'crypto' },
  { name: 'Bybit', icon: 'trending-up', color: '#8b5cf6', currency: 'USDT', fxGroup: 'crypto' },
];

async function ensureDefaultAccounts(userId) {
  const count = await Account.countDocuments({ userId, isArchived: false });
  if (count > 0) return;
  await Account.insertMany(
    DEFAULT_ACCOUNT_TEMPLATES.map((t, i) => ({
      userId,
      ...t,
      sortOrder: i,
      openingBalance: 0,
    }))
  );
}

async function getUserFx(userId) {
  const user = await User.findById(userId);
  return user ? user.getFxSettings() : User.DEFAULT_FX;
}

function withInferredFxGroup(accounts) {
  return accounts.map((a) => {
    const plain = a.toObject ? a.toObject() : { ...a };
    if (!plain.fxGroup) {
      plain.fxGroup = Account.inferFxGroup(plain.name, plain.currency);
    }
    return plain;
  });
}

router.get('/', async (req, res) => {
  try {
    await ensureDefaultAccounts(req.user._id);
    const fx = await getUserFx(req.user._id);
    const accounts = withInferredFxGroup(await computeAllAccountBalances(req.user._id));
    const withFx = attachConvertedBalances(accounts, fx, fx.displayCurrency);
    res.json(withFx);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch accounts', error: error.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    await ensureDefaultAccounts(req.user._id);
    const fx = await getUserFx(req.user._id);
    const displayCurrency =
      req.query.displayCurrency === 'USD' || req.query.displayCurrency === 'ETB'
        ? req.query.displayCurrency
        : fx.displayCurrency;

    const accounts = withInferredFxGroup(await computeAllAccountBalances(req.user._id));
    const withFx = attachConvertedBalances(accounts, fx, displayCurrency);
    const totalConverted = sumConverted(withFx);

    const byCurrency = {};
    for (const account of accounts) {
      if (!byCurrency[account.currency]) {
        byCurrency[account.currency] = { currency: account.currency, total: 0, accounts: [] };
      }
      byCurrency[account.currency].total += account.balance;
      byCurrency[account.currency].accounts.push({
        _id: account._id,
        name: account.name,
        icon: account.icon,
        color: account.color,
        balance: account.balance,
        currency: account.currency,
        fxGroup: account.fxGroup,
      });
    }

    const legacyCount = await Transaction.countDocuments({
      userId: req.user._id,
      accountId: { $exists: false },
    });

    res.json({
      totalsByCurrency: Object.values(byCurrency),
      accounts: withFx,
      legacyTransactionCount: legacyCount,
      fx,
      displayCurrency,
      totalConverted,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch accounts summary', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const account = await validateAccountOwnership(req.user._id, req.params.id);
    const balance = await computeAccountBalance(req.user._id, account._id, account.openingBalance);
    const fx = await getUserFx(req.user._id);

    const recentTransactions = await Transaction.find({
      userId: req.user._id,
      $or: [{ accountId: account._id }, { toAccountId: account._id }],
    })
      .sort({ date: -1 })
      .limit(20);

    const plain = { ...account.toObject(), balance };
    const [withFx] = attachConvertedBalances([plain], fx, fx.displayCurrency);

    res.json({ ...withFx, recentTransactions, fx });
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || 'Failed to fetch account',
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, icon, color, currency, openingBalance, sortOrder, fxGroup } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Account name is required' });
    }

    const cur = (currency || 'ETB').toUpperCase();
    const group =
      fxGroup && ['crypto', 'bank', 'local'].includes(fxGroup)
        ? fxGroup
        : Account.inferFxGroup(name, cur);

    const account = await Account.create({
      userId: req.user._id,
      name: name.trim(),
      icon: icon || 'wallet',
      color: color || '#3b82f6',
      currency: cur,
      fxGroup: group,
      openingBalance: openingBalance || 0,
      sortOrder: sortOrder || 0,
    });

    const balance = await computeAccountBalance(req.user._id, account._id, account.openingBalance);
    const fx = await getUserFx(req.user._id);
    const [withFx] = attachConvertedBalances(
      [{ ...account.toObject(), balance }],
      fx,
      fx.displayCurrency
    );
    res.status(201).json(withFx);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create account', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, icon, color, currency, openingBalance, sortOrder, fxGroup } = req.body;
    const updates = { name, icon, color, openingBalance, sortOrder };

    if (currency) updates.currency = String(currency).toUpperCase();
    if (fxGroup && ['crypto', 'bank', 'local'].includes(fxGroup)) {
      updates.fxGroup = fxGroup;
    } else if (name || currency) {
      const existing = await Account.findOne({ _id: req.params.id, userId: req.user._id });
      if (existing) {
        updates.fxGroup = Account.inferFxGroup(
          name || existing.name,
          currency || existing.currency
        );
      }
    }

    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, isArchived: false },
      updates,
      { new: true, runValidators: true }
    );

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const balance = await computeAccountBalance(req.user._id, account._id, account.openingBalance);
    const fx = await getUserFx(req.user._id);
    const [withFx] = attachConvertedBalances(
      [{ ...account.toObject(), balance }],
      fx,
      fx.displayCurrency
    );
    res.json(withFx);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update account', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const linked = await Transaction.countDocuments({
      userId: req.user._id,
      $or: [{ accountId: req.params.id }, { toAccountId: req.params.id }],
    });

    if (linked > 0) {
      const account = await Account.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { isArchived: true },
        { new: true }
      );
      if (!account) return res.status(404).json({ message: 'Account not found' });
      return res.json({ message: 'Account archived (has linked transactions)' });
    }

    const account = await Account.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete account', error: error.message });
  }
});

module.exports = router;
