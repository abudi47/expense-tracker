const express = require('express');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

const getMonthRange = (year, month) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

router.get('/', async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user._id });
    const now = new Date();
    const { start, end } = getMonthRange(now.getFullYear(), now.getMonth());

    const spending = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type: 'expense',
          date: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: '$category', spent: { $sum: '$amount' } } },
    ]);

    const spentMap = Object.fromEntries(spending.map((s) => [s._id, s.spent]));

    const budgetsWithStatus = budgets.map((b) => {
      const spent = spentMap[b.category] || 0;
      const percentage = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
      let status = 'ok';
      if (percentage >= 100) status = 'over';
      else if (percentage >= 80) status = 'warning';

      return {
        ...b.toObject(),
        spent,
        percentage: Math.round(percentage),
        status,
      };
    });

    res.json(budgetsWithStatus);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch budgets', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { category, monthlyLimit } = req.body;

    if (!category || monthlyLimit == null) {
      return res.status(400).json({ message: 'Category and monthlyLimit are required' });
    }

    const existing = await Budget.findOne({ userId: req.user._id, category });
    if (existing) {
      return res.status(409).json({ message: 'Budget for this category already exists' });
    }

    const budget = await Budget.create({
      userId: req.user._id,
      category,
      monthlyLimit,
    });

    res.status(201).json(budget);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create budget', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { category, monthlyLimit } = req.body;

    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { category, monthlyLimit },
      { new: true, runValidators: true }
    );

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json(budget);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update budget', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete budget', error: error.message });
  }
});

module.exports = router;
