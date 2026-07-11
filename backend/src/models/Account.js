const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: 'wallet' },
    color: { type: String, default: '#3b82f6' },
    currency: { type: String, default: 'USD', trim: true, uppercase: true },
    openingBalance: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

accountSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Account', accountSchema);
