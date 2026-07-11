const express = require('express');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const auth = require('../middleware/auth');
const { computeAllAccountBalances } = require('../utils/accountBalance');

const router = express.Router();

router.use(auth);

const getMonthRange = (year, month) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

router.get('/summary', async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const thisMonth = getMonthRange(now.getFullYear(), now.getMonth());
    const lastMonth = getMonthRange(
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
      now.getMonth() === 0 ? 11 : now.getMonth() - 1
    );

    const [totals, thisMonthTotals, lastMonthTotals, categorySpending, monthlyTrend, budgets, accounts] =
      await Promise.all([
        Transaction.aggregate([
          { $match: { userId, accountId: { $exists: true } } },
          { $group: { _id: '$type', total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          {
            $match: {
              userId,
              accountId: { $exists: true },
              date: { $gte: thisMonth.start, $lte: thisMonth.end },
            },
          },
          { $group: { _id: '$type', total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          {
            $match: {
              userId,
              accountId: { $exists: true },
              date: { $gte: lastMonth.start, $lte: lastMonth.end },
            },
          },
          { $group: { _id: '$type', total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          {
            $match: {
              userId,
              type: 'expense',
              accountId: { $exists: true },
              date: { $gte: thisMonth.start, $lte: thisMonth.end },
            },
          },
          { $group: { _id: '$category', total: { $sum: '$amount' } } },
          { $sort: { total: -1 } },
        ]),
        getMonthlyTrend(userId, 6),
        Budget.find({ userId }),
        computeAllAccountBalances(userId),
      ]);

    const totalMap = Object.fromEntries(totals.map((t) => [t._id, t.total]));
    const thisMonthMap = Object.fromEntries(thisMonthTotals.map((t) => [t._id, t.total]));
    const lastMonthMap = Object.fromEntries(lastMonthTotals.map((t) => [t._id, t.total]));

    const totalIncome = totalMap.income || 0;
    const totalExpenses = totalMap.expense || 0;

    const expenseSpendingMap = Object.fromEntries(
      categorySpending.map((c) => [c._id, c.total])
    );

    const budgetAlerts = budgets
      .map((b) => {
        const spent = expenseSpendingMap[b.category] || 0;
        const percentage = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
        let status = 'ok';
        if (percentage >= 100) status = 'over';
        else if (percentage >= 80) status = 'warning';
        return {
          category: b.category,
          monthlyLimit: b.monthlyLimit,
          spent,
          percentage: Math.round(percentage),
          status,
        };
      })
      .filter((b) => b.status !== 'ok');

    const legacyTotals = await Transaction.aggregate([
      { $match: { userId, accountId: { $exists: false } } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);
    const legacyMap = Object.fromEntries(legacyTotals.map((t) => [t._id, t.total]));

    const byCurrency = {};
    for (const account of accounts) {
      if (!byCurrency[account.currency]) {
        byCurrency[account.currency] = 0;
      }
      byCurrency[account.currency] += account.balance;
    }

    res.json({
      balance: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
      accountsSummary: {
        totalsByCurrency: Object.entries(byCurrency).map(([currency, total]) => ({
          currency,
          total,
        })),
        accounts: accounts.map((a) => ({
          _id: a._id,
          name: a.name,
          icon: a.icon,
          color: a.color,
          currency: a.currency,
          balance: a.balance,
        })),
      },
      legacy: {
        income: legacyMap.income || 0,
        expenses: legacyMap.expense || 0,
        balance: (legacyMap.income || 0) - (legacyMap.expense || 0),
      },
      thisMonth: {
        income: thisMonthMap.income || 0,
        expenses: thisMonthMap.expense || 0,
        net: (thisMonthMap.income || 0) - (thisMonthMap.expense || 0),
      },
      lastMonth: {
        income: lastMonthMap.income || 0,
        expenses: lastMonthMap.expense || 0,
        net: (lastMonthMap.income || 0) - (lastMonthMap.expense || 0),
      },
      spendingByCategory: categorySpending.map((c) => ({
        category: c._id,
        total: c.total,
      })),
      monthlyTrend,
      budgetAlerts,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard summary', error: error.message });
  }
});

async function getMonthlyTrend(userId, months) {
  const now = new Date();
  const result = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const { start, end } = getMonthRange(d.getFullYear(), d.getMonth());

    const totals = await Transaction.aggregate([
      {
        $match: {
          userId,
          accountId: { $exists: true },
          date: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);

    const map = Object.fromEntries(totals.map((t) => [t._id, t.total]));
    const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });

    result.push({
      month: monthLabel,
      income: map.income || 0,
      expenses: map.expense || 0,
    });
  }

  return result;
}

router.get('/categories', async (req, res) => {
  try {
    const { type } = req.query;
    const filter = type ? { type } : {};
    const categories = await Category.find(filter).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
});

module.exports = router;
