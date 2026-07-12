const express = require('express');
const ScheduledItem = require('../models/ScheduledItem');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const {
  computeAccountBalance,
  validateAccountOwnership,
} = require('../utils/accountBalance');
const { findDuplicateTransaction } = require('../utils/duplicates');
const {
  refreshOverdue,
  startOfToday,
  addMonths,
  withEffectiveStatus,
} = require('../utils/scheduled');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    await refreshOverdue(req.user._id);
    const { status, direction } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    if (direction) filter.direction = direction;

    const items = await ScheduledItem.find(filter)
      .sort({ expectedDate: 1 })
      .populate('accountId', 'name currency color icon fxGroup');

    res.json(items.map(withEffectiveStatus));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch scheduled items', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, amount, direction, expectedDate, accountId, recurring, note, currency } =
      req.body;

    if (!title?.trim() || amount == null || !direction || !expectedDate || !accountId) {
      return res.status(400).json({
        message: 'title, amount, direction, expectedDate, and accountId are required',
      });
    }
    if (!['incoming', 'outgoing'].includes(direction)) {
      return res.status(400).json({ message: 'direction must be incoming or outgoing' });
    }

    const account = await validateAccountOwnership(req.user._id, accountId);
    const expected = new Date(expectedDate);
    const status = expected < startOfToday() ? 'overdue' : 'pending';

    const item = await ScheduledItem.create({
      userId: req.user._id,
      title: title.trim(),
      amount: Number(amount),
      direction,
      expectedDate: expected,
      accountId,
      recurring: !!recurring,
      note: note || '',
      currency: (currency || account.currency || 'ETB').toUpperCase(),
      status,
    });

    const populated = await ScheduledItem.findById(item._id).populate(
      'accountId',
      'name currency color icon fxGroup'
    );
    res.status(201).json(withEffectiveStatus(populated));
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || 'Failed to create scheduled item',
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await ScheduledItem.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!existing) return res.status(404).json({ message: 'Scheduled item not found' });
    if (existing.status === 'landed') {
      return res.status(400).json({ message: 'Cannot edit a landed item' });
    }

    const { title, amount, direction, expectedDate, accountId, recurring, note, currency, status } =
      req.body;

    if (accountId) await validateAccountOwnership(req.user._id, accountId);

    const updates = {};
    if (title != null) updates.title = String(title).trim();
    if (amount != null) updates.amount = Number(amount);
    if (direction && ['incoming', 'outgoing'].includes(direction)) updates.direction = direction;
    if (expectedDate) {
      updates.expectedDate = new Date(expectedDate);
      if (!status) {
        updates.status =
          updates.expectedDate < startOfToday() && existing.status !== 'cancelled'
            ? 'overdue'
            : existing.status === 'cancelled'
              ? 'cancelled'
              : 'pending';
      }
    }
    if (accountId) updates.accountId = accountId;
    if (recurring != null) updates.recurring = !!recurring;
    if (note != null) updates.note = note;
    if (currency) updates.currency = String(currency).toUpperCase();
    if (status && ['pending', 'overdue', 'cancelled'].includes(status)) updates.status = status;

    const item = await ScheduledItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    ).populate('accountId', 'name currency color icon fxGroup');

    res.json(withEffectiveStatus(item));
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || 'Failed to update scheduled item',
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await ScheduledItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, status: { $ne: 'landed' } },
      { status: 'cancelled' },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Scheduled item not found' });
    res.json({ message: 'Scheduled item cancelled', item: withEffectiveStatus(item) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel scheduled item', error: error.message });
  }
});

router.post('/:id/land', async (req, res) => {
  try {
    const { allowOverdraft, category, source, note } = req.body;
    const item = await ScheduledItem.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!item) return res.status(404).json({ message: 'Scheduled item not found' });
    if (item.status === 'landed') {
      return res.status(400).json({ message: 'Item already landed' });
    }
    if (item.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot land a cancelled item' });
    }

    const account = await validateAccountOwnership(req.user._id, item.accountId);
    const type = item.direction === 'incoming' ? 'income' : 'expense';
    const txCategory =
      category ||
      (type === 'income' ? 'Scheduled income' : item.title || 'Scheduled expense');

    if (type === 'expense') {
      const balance = await computeAccountBalance(
        req.user._id,
        item.accountId,
        account.openingBalance
      );
      if (item.amount > balance && !allowOverdraft) {
        return res.status(409).json({
          code: 'OVERDRAFT',
          message: 'Landing this expense would overdraw the account',
          balance,
          amount: item.amount,
          projectedBalance: balance - item.amount,
          accountName: account.name,
        });
      }
    }

    const duplicate = await findDuplicateTransaction(req.user._id, {
      amount: item.amount,
      date: item.expectedDate,
      accountId: item.accountId,
    });
    if (duplicate && !req.body.force) {
      return res.status(409).json({
        code: 'DUPLICATE',
        message: 'A similar transaction already exists',
        transaction: duplicate,
      });
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      type,
      amount: item.amount,
      accountId: item.accountId,
      category: txCategory,
      source: type === 'income' ? source || item.title : undefined,
      date: new Date(),
      note: note != null ? note : item.note || item.title,
      isRecurring: item.recurring,
      sourceChannel: 'scheduled',
    });

    item.status = 'landed';
    item.transactionId = transaction._id;
    await item.save();

    let nextItem = null;
    if (item.recurring) {
      const nextDate = addMonths(item.expectedDate, 1);
      nextItem = await ScheduledItem.create({
        userId: item.userId,
        title: item.title,
        amount: item.amount,
        direction: item.direction,
        expectedDate: nextDate,
        accountId: item.accountId,
        recurring: true,
        note: item.note,
        currency: item.currency,
        status: nextDate < startOfToday() ? 'overdue' : 'pending',
      });
    }

    res.json({
      item: withEffectiveStatus(item),
      transaction,
      nextItem,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || 'Failed to land scheduled item',
    });
  }
});

module.exports = router;
