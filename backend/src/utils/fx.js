/**
 * Convert an account balance into a target display currency using user FX rates.
 *
 * Rates are always stored as "1 USD = X ETB".
 * - cryptoUsdToEtb: Binance / Grey / Bybit / USDT
 * - bankUsdToEtb: Local bank / cash / other USD
 */

function usdToEtbRate(fxGroup, rates) {
  if (fxGroup === 'crypto') return rates.cryptoUsdToEtb;
  return rates.bankUsdToEtb;
}

function normalizeToUsd(amount, currency, fxGroup, rates) {
  const cur = String(currency || 'ETB').toUpperCase();
  if (cur === 'USD' || cur === 'USDT') return amount;
  if (cur === 'ETB') {
    const rate = usdToEtbRate(fxGroup === 'local' ? 'bank' : fxGroup, rates);
    return rate > 0 ? amount / rate : 0;
  }
  // Unknown foreign currency: treat as USD (best-effort)
  return amount;
}

function normalizeToEtb(amount, currency, fxGroup, rates) {
  const cur = String(currency || 'ETB').toUpperCase();
  if (cur === 'ETB') return amount;
  if (cur === 'USD' || cur === 'USDT') {
    return amount * usdToEtbRate(fxGroup, rates);
  }
  return amount * usdToEtbRate(fxGroup === 'local' ? 'bank' : fxGroup, rates);
}

function convertBalance(amount, currency, fxGroup, rates, displayCurrency) {
  if (displayCurrency === 'USD') {
    return normalizeToUsd(amount, currency, fxGroup, rates);
  }
  return normalizeToEtb(amount, currency, fxGroup, rates);
}

function attachConvertedBalances(accounts, rates, displayCurrency) {
  return accounts.map((account) => {
    const plain = account.toObject ? account.toObject() : { ...account };
    const converted = convertBalance(
      plain.balance || 0,
      plain.currency,
      plain.fxGroup || 'local',
      rates,
      displayCurrency
    );
    return {
      ...plain,
      convertedBalance: converted,
      displayCurrency,
    };
  });
}

function sumConverted(accountsWithConverted) {
  return accountsWithConverted.reduce((sum, a) => sum + (a.convertedBalance || 0), 0);
}

module.exports = {
  convertBalance,
  attachConvertedBalances,
  sumConverted,
  normalizeToUsd,
  normalizeToEtb,
};
