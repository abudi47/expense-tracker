const mongoose = require('mongoose');

const detectedItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['binance', 'grey', 'cbe', 'boa', 'telebirr', 'other'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, trim: true, uppercase: true, default: 'ETB' },
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
    },
    date: { type: Date, required: true },
    accountHint: { type: String, trim: true, default: '' },
    suggestedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    rawReference: { type: String, trim: true, default: '' },
    fee: { type: Number, min: 0 },
    vat: { type: Number, min: 0 },
    reportedBalance: { type: Number },
    rawSnippet: { type: String, trim: true, default: '', maxlength: 500 },
    status: {
      type: String,
      enum: ['needs_review', 'approved', 'dismissed', 'duplicate'],
      default: 'needs_review',
      index: true,
    },
    externalRef: { type: String, trim: true },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
  },
  { timestamps: true }
);

detectedItemSchema.index({ userId: 1, status: 1, createdAt: -1 });
detectedItemSchema.index(
  { userId: 1, externalRef: 1 },
  { unique: true, partialFilterExpression: { externalRef: { $type: 'string', $gt: '' } } }
);

module.exports = mongoose.model('DetectedItem', detectedItemSchema);
