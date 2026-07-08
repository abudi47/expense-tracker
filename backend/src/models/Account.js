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
    currency: { type: String, default: 'ETB', trim: true, uppercase: true },
    /**
     * crypto = Binance/Grey/Bybit/USDT → cryptoUsdToEtb rate
     * bank   = Local bank / other USD → bankUsdToEtb rate
     * local  = ETB (or native) → no FX needed for ETB totals
     */
    fxGroup: {
      type: String,
      enum: ['crypto', 'bank', 'local'],
      default: 'local',
    },
    openingBalance: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

accountSchema.index({ userId: 1, name: 1 });

/** Infer fx group from name + currency when not explicitly set */
accountSchema.statics.inferFxGroup = function (name = '', currency = 'ETB') {
  const cur = String(currency).toUpperCase();
  const n = String(name).toLowerCase();

  if (cur === 'ETB') return 'local';

  const cryptoHints = ['binance', 'grey', 'gray', 'bybit', 'usdt', 'crypto', 'okx', 'kucoin'];
  if (cryptoHints.some((h) => n.includes(h)) || cur === 'USDT') {
    return 'crypto';
  }

  if (['USD', 'EUR', 'GBP'].includes(cur)) return 'bank';
  return 'bank';
};

module.exports = mongoose.model('Account', accountSchema);
