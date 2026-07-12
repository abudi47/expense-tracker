const ScheduledItem = require('../models/ScheduledItem');

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function refreshOverdue(userId) {
  await ScheduledItem.updateMany(
    {
      userId,
      status: 'pending',
      expectedDate: { $lt: startOfToday() },
    },
    { $set: { status: 'overdue' } }
  );
}

function withEffectiveStatus(item) {
  const plain = item.toObject ? item.toObject() : { ...item };
  if (
    (plain.status === 'pending' || plain.status === 'overdue') &&
    plain.expectedDate &&
    new Date(plain.expectedDate) < startOfToday()
  ) {
    plain.status = 'overdue';
  }
  return plain;
}

module.exports = {
  startOfToday,
  addMonths,
  refreshOverdue,
  withEffectiveStatus,
};
