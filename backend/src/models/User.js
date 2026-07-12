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
      cryptoUsdToEtb: { type: Number, default: 180, min: 0 },
      bankUsdToEtb: { type: Number, default: 158, min: 0 },
    },
    scheduledWindowDays: {
      type: Number,
      enum: [7, 14, 30],
      default: 7,
    },
    ingest: {
      gmailConnected: { type: Boolean, default: false },
      gmailBinance: { type: Boolean, default: false },
      gmailGrey: { type: Boolean, default: false },
      androidNotifications: { type: Boolean, default: false },
      gmailTokens: {
        accessToken: { type: String },
        refreshToken: { type: String },
        expiryDate: { type: Number },
        email: { type: String },
      },
      senderAllowlist: {
        type: [String],
        default: ['binance.com', 'grey.co', 'greymarket.com'],
      },
    },
    pushTokens: { type: [String], default: [] },
    pushAlertsEnabled: { type: Boolean, default: false },
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

userSchema.methods.getIngestSettings = function () {
  return {
    gmailConnected: !!this.ingest?.gmailConnected && !!this.ingest?.gmailTokens?.refreshToken,
    gmailBinance: !!this.ingest?.gmailBinance,
    gmailGrey: !!this.ingest?.gmailGrey,
    androidNotifications: !!this.ingest?.androidNotifications,
    gmailEmail: this.ingest?.gmailTokens?.email || null,
    senderAllowlist: this.ingest?.senderAllowlist || [],
  };
};

userSchema.methods.getNotificationPrefs = function () {
  return {
    pushAlertsEnabled: !!this.pushAlertsEnabled,
    hasPushToken: Array.isArray(this.pushTokens) && this.pushTokens.length > 0,
  };
};

const User = mongoose.model('User', userSchema);
User.DEFAULT_FX = DEFAULT_FX;
module.exports = User;
