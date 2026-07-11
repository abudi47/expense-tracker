const express = require('express');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const {
  computeAccountBalance,
  computeAllAccountBalances,
  validateAccountOwnership,
} = require('../utils/accountBalance');

const router = express.Router();

router.use(auth);

const DEFAULT_ACCOUNT_TEMPLATES = [
  { name: 'Cash', icon: 'cash', color: '#10b981', currency: 'USD' },
  { name: 'Local Bank', icon: 'business', color: '#3b82f6', currency: 'USD' },
  { name: 'Binance', icon: 'logo-bitcoin', color: '#f59e0b', currency: 'USD' },
  { name: 'Bybit', icon: 'trending-up', color: '#8b5cf6', currency: 'USD' },
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

router.get('/', async (req, res) => {
  try {
    await ensureDefaultAccounts(req.user._id);
    const accounts = await computeAllAccountBalances(req.user._id);
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch accounts', error: error.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    await ensureDefaultAccounts(req.user._id);
    const accounts = await computeAllAccountBalances(req.user._id);

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
      });
    }

    const legacyCount = await Transaction.countDocuments({
      userId: req.user._id,
      accountId: { $exists: false },
    });

    res.json({
      totalsByCurrency: Object.values(byCurrency),
      accounts,
      legacyTransactionCount: legacyCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch accounts summary', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const account = await validateAccountOwnership(req.user._id, req.params.id);
    const balance = await computeAccountBalance(req.user._id, account._id, account.openingBalance);

    const recentTransactions = await Transaction.find({
      userId: req.user._id,
      $or: [{ accountId: account._id }, { toAccountId: account._id }],
    })
      .sort({ date: -1 })
      .limit(20);

    res.json({ ...account.toObject(), balance, recentTransactions });
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || 'Failed to fetch account',
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, icon, color, currency, openingBalance, sortOrder } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Account name is required' });
    }

    const account = await Account.create({
      userId: req.user._id,
      name: name.trim(),
      icon: icon || 'wallet',
      color: color || '#3b82f6',
      currency: (currency || 'USD').toUpperCase(),
      openingBalance: openingBalance || 0,
      sortOrder: sortOrder || 0,
    });

    const balance = await computeAccountBalance(req.user._id, account._id, account.openingBalance);
    res.status(201).json({ ...account.toObject(), balance });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create account', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, icon, color, currency, openingBalance, sortOrder } = req.body;
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, isArchived: false },
      { name, icon, color, currency, openingBalance, sortOrder },
      { new: true, runValidators: true }
    );

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const balance = await computeAccountBalance(req.user._id, account._id, account.openingBalance);
    res.json({ ...account.toObject(), balance });
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
