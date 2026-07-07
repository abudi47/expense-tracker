const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/fx', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.getFxSettings());
  } catch (error) {
    res.status(500).json({ message: 'Failed to load FX settings', error: error.message });
  }
});

router.put('/fx', async (req, res) => {
  try {
    const { displayCurrency, cryptoUsdToEtb, bankUsdToEtb } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.fxSettings) user.fxSettings = {};

    if (displayCurrency === 'ETB' || displayCurrency === 'USD') {
      user.fxSettings.displayCurrency = displayCurrency;
    }
    if (cryptoUsdToEtb != null) {
      const n = Number(cryptoUsdToEtb);
      if (Number.isNaN(n) || n < 0) {
        return res.status(400).json({ message: 'cryptoUsdToEtb must be a non-negative number' });
      }
      user.fxSettings.cryptoUsdToEtb = n;
    }
    if (bankUsdToEtb != null) {
      const n = Number(bankUsdToEtb);
      if (Number.isNaN(n) || n < 0) {
        return res.status(400).json({ message: 'bankUsdToEtb must be a non-negative number' });
      }
      user.fxSettings.bankUsdToEtb = n;
    }

    user.markModified('fxSettings');
    await user.save();
    res.json(user.getFxSettings());
  } catch (error) {
    res.status(500).json({ message: 'Failed to update FX settings', error: error.message });
  }
});

module.exports = router;
