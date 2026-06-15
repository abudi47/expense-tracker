const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    source: { type: String, trim: true },
    date: { type: Date, required: true, default: Date.now },
    note: { type: String, trim: true, default: '' },
    isRecurring: { type: Boolean, default: false },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
