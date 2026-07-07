const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DEFAULT_FX = {
  displayCurrency: 'ETB',
  cryptoUsdToEtb: 180,
  bankUsdToEtb: 158,
};

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    fxSettings: {
      displayCurrency: {
        type: String,
        enum: ['ETB', 'USD'],
        default: 'ETB',
      },
      /** Rate for Binance / Grey / Bybit / USDT-style accounts */
      cryptoUsdToEtb: { type: Number, default: 180, min: 0 },
      /** Rate for bank / cash / other USD accounts */
      bankUsdToEtb: { type: Number, default: 158, min: 0 },
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = async function (password) {
  return bcrypt.hash(password, 12);
};

userSchema.methods.getFxSettings = function () {
  return {
    displayCurrency: this.fxSettings?.displayCurrency || DEFAULT_FX.displayCurrency,
    cryptoUsdToEtb: this.fxSettings?.cryptoUsdToEtb ?? DEFAULT_FX.cryptoUsdToEtb,
    bankUsdToEtb: this.fxSettings?.bankUsdToEtb ?? DEFAULT_FX.bankUsdToEtb,
  };
};

const User = mongoose.model('User', userSchema);
User.DEFAULT_FX = DEFAULT_FX;
module.exports = User;
