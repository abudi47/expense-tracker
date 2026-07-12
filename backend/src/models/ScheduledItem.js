const mongoose = require('mongoose');

const scheduledItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
    },
    expectedDate: { type: Date, required: true },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'landed', 'overdue', 'cancelled'],
      default: 'pending',
      index: true,
    },
    recurring: { type: Boolean, default: false },
    note: { type: String, trim: true, default: '' },
    currency: { type: String, trim: true, uppercase: true, default: 'ETB' },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
  },
  { timestamps: true }
);

scheduledItemSchema.index({ userId: 1, status: 1, expectedDate: 1 });

module.exports = mongoose.model('ScheduledItem', scheduledItemSchema);
