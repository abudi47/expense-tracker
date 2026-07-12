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
  const filter = {
    userId,
    status: 'pending',
    expectedDate: { $lt: startOfToday() },
  };
  const newlyOverdue = await ScheduledItem.countDocuments(filter);
  await ScheduledItem.updateMany(filter, { $set: { status: 'overdue' } });

  if (newlyOverdue > 0) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (user?.pushAlertsEnabled) {
        const { notifyOverdueScheduled } = require('./push');
        await notifyOverdueScheduled(user, newlyOverdue);
      }
    } catch {
      // push optional
    }
  }

  return newlyOverdue;
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
