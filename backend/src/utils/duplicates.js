const Transaction = require('../models/Transaction');

/**
 * Find likely duplicate transactions for ingest / scheduled land.
 */
async function findDuplicateTransaction(userId, { amount, date, accountId, externalRef }) {
  if (externalRef) {
    const byRef = await Transaction.findOne({ userId, externalRef });
    if (byRef) return byRef;
  }

  if (amount == null || !date) return null;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  // ±1 day window
  dayStart.setDate(dayStart.getDate() - 1);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const filter = {
    userId,
    amount: Number(amount),
    date: { $gte: dayStart, $lte: dayEnd },
  };
  if (accountId) {
    filter.$or = [{ accountId }, { toAccountId: accountId }];
  }

  return Transaction.findOne(filter);
}

module.exports = { findDuplicateTransaction };
