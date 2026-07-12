const express = require('express');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const {
  computeAccountBalance,
  validateAccountOwnership,
} = require('../utils/accountBalance');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { type, category, accountId, startDate, endDate, page = 1, limit = 50, legacyOnly } =
      req.query;
    const filter = { userId: req.user._id };

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (accountId) {
      filter.$or = [{ accountId }, { toAccountId: accountId }];
    }
    if (legacyOnly === 'true') {
      filter.accountId = { $exists: false };
    }
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit, 10)),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      transactions,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const { type, category, accountId, startDate, endDate, format = 'csv' } = req.query;
    const filter = { userId: req.user._id };

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (accountId) filter.$or = [{ accountId }, { toAccountId: accountId }];
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });

    if (format === 'json') {
      return res.json({ transactions });
    }

    const header = 'Date,Type,Category,Amount,Account,Source,Note,Recurring\n';
    const rows = transactions
      .map((t) => {
        const date = t.date.toISOString().split('T')[0];
        const note = (t.note || '').replace(/"/g, '""');
        const source = (t.source || '').replace(/"/g, '""');
        return `${date},${t.type},${t.category || ''},${t.amount},${t.accountId || ''},"${source}","${note}",${t.isRecurring}`;
      })
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(header + rows);
  } catch (error) {
    res.status(500).json({ message: 'Export failed', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transaction', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      type,
      amount,
      category,
      source,
      date,
      note,
      isRecurring,
      accountId,
      toAccountId,
      allowOverdraft,
      externalRef,
      sourceChannel,
      fee,
      vat,
    } = req.body;

    if (!type || amount == null) {
      return res.status(400).json({ message: 'Type and amount are required' });
    }

    if (!['income', 'expense', 'transfer'].includes(type)) {
      return res.status(400).json({ message: 'Type must be income, expense, or transfer' });
    }

    if (type === 'transfer') {
      if (!accountId || !toAccountId) {
        return res.status(400).json({ message: 'Transfer requires accountId and toAccountId' });
      }
      if (accountId === toAccountId) {
        return res.status(400).json({ message: 'Cannot transfer to the same account' });
      }
      const fromAccount = await validateAccountOwnership(req.user._id, accountId);
      await validateAccountOwnership(req.user._id, toAccountId);

      const balance = await computeAccountBalance(
        req.user._id,
        accountId,
        fromAccount.openingBalance
      );
      if (amount > balance && !allowOverdraft) {
        return res.status(409).json({
          code: 'OVERDRAFT',
          message: 'Insufficient funds for transfer',
          balance,
          amount,
          projectedBalance: balance - amount,
        });
      }

      const transaction = await Transaction.create({
        userId: req.user._id,
        type: 'transfer',
        amount,
        accountId,
        toAccountId,
        category: 'Transfer',
        date: date || new Date(),
        note: note || '',
      });
      return res.status(201).json(transaction);
    }

    if (!accountId) {
      return res.status(400).json({ message: 'accountId is required for income and expense' });
    }
    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }

    const account = await validateAccountOwnership(req.user._id, accountId);

    if (type === 'expense') {
      const balance = await computeAccountBalance(
        req.user._id,
        accountId,
        account.openingBalance
      );
      if (amount > balance && !allowOverdraft) {
        return res.status(409).json({
          code: 'OVERDRAFT',
          message: 'This expense would overdraw the account',
          balance,
          amount,
          projectedBalance: balance - amount,
          accountName: account.name,
        });
      }
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      type,
      amount,
      accountId,
      category,
      source: type === 'income' ? source : undefined,
      date: date || new Date(),
      note,
      isRecurring: isRecurring || false,
      externalRef: externalRef || undefined,
      sourceChannel: sourceChannel || 'manual',
      fee: fee || undefined,
      vat: vat || undefined,
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || 'Failed to create transaction',
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      type,
      amount,
      category,
      source,
      date,
      note,
      isRecurring,
      accountId,
      allowOverdraft,
    } = req.body;

    const existing = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existing) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (type === 'expense' || (existing.type === 'expense' && type === undefined)) {
      const targetAccountId = accountId || existing.accountId;
      if (targetAccountId) {
        const account = await validateAccountOwnership(req.user._id, targetAccountId);
        const balance = await computeAccountBalance(
          req.user._id,
          targetAccountId,
          account.openingBalance
        );
        const newAmount = amount ?? existing.amount;
        const adjustment = existing.accountId?.equals(targetAccountId) ? existing.amount : 0;
        const projected = balance + adjustment - newAmount;
        if (projected < 0 && !allowOverdraft) {
          return res.status(409).json({
            code: 'OVERDRAFT',
            message: 'This update would overdraw the account',
            balance,
            projectedBalance: projected,
          });
        }
      }
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { type, amount, category, source, date, note, isRecurring, accountId },
      { new: true, runValidators: true }
    );

    res.json(transaction);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || 'Failed to update transaction',
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete transaction', error: error.message });
  }
});

module.exports = router;
