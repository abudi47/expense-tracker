const express = require('express');
const DetectedItem = require('../models/DetectedItem');
const auth = require('../middleware/auth');
const { approveDetectedItem } = require('../utils/ingestHelpers');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const status = req.query.status || 'needs_review';
    const filter = { userId: req.user._id };
    if (status !== 'all') filter.status = status;

    const items = await DetectedItem.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('suggestedAccountId', 'name currency color icon');

    const needsReviewCount = await DetectedItem.countDocuments({
      userId: req.user._id,
      status: 'needs_review',
    });

    res.json({ items, needsReviewCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load detected items', error: error.message });
  }
});

router.get('/count', async (req, res) => {
  try {
    const needsReviewCount = await DetectedItem.countDocuments({
      userId: req.user._id,
      status: 'needs_review',
    });
    res.json({ needsReviewCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const item = await DetectedItem.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!item) return res.status(404).json({ message: 'Detected item not found' });

    const result = await approveDetectedItem(req.user._id, item, req.body);
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      code: error.code,
      message: error.message || 'Approve failed',
      ...(error.data || {}),
    });
  }
});

router.post('/:id/dismiss', async (req, res) => {
  try {
    const item = await DetectedItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'dismissed' },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Detected item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { amount, currency, direction, date, suggestedAccountId, note } = req.body;
    const updates = {};
    if (amount != null) updates.amount = Number(amount);
    if (currency) updates.currency = String(currency).toUpperCase();
    if (direction && ['incoming', 'outgoing'].includes(direction)) updates.direction = direction;
    if (date) updates.date = new Date(date);
    if (suggestedAccountId) updates.suggestedAccountId = suggestedAccountId;
    if (note != null) updates.rawSnippet = String(note).slice(0, 500);

    const item = await DetectedItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, status: { $in: ['needs_review', 'duplicate'] } },
      updates,
      { new: true, runValidators: true }
    ).populate('suggestedAccountId', 'name currency color icon');

    if (!item) return res.status(404).json({ message: 'Detected item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
