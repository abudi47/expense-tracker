const { stripNoise, parseAmount, normalizeResult } = require('./shared');

/**
 * Binance deposit/withdrawal confirmation email patterns.
 * Subject often: "[Binance] Deposit Confirmed"
 * Body: "Your deposit of {amount} {currency} is now available"
 */
function parseBinance(subject = '', body = '') {
  const text = stripNoise(`${subject}\n${body}`);
  const lower = text.toLowerCase();

  let direction = null;
  if (/withdraw/i.test(text)) direction = 'outgoing';
  else if (/deposit|credited|received/i.test(text)) direction = 'incoming';
  if (!direction) return null;

  const amountMatch =
    text.match(/(?:deposit|withdrawal|withdraw)\s+of\s+([\d,.]+)\s*([A-Z]{3,5})/i) ||
    text.match(/([\d,.]+)\s*(USDT|BTC|ETH|BNB|BUSD|USD|ETB)/i);
  if (!amountMatch) return null;

  const amount = parseAmount(amountMatch[1]);
  const currency = (amountMatch[2] || 'USDT').toUpperCase();
  if (amount == null) return null;

  const refMatch =
    text.match(/(?:TxID|Transaction ID|Order ID)[:\s#]*([A-Za-z0-9-]+)/i) ||
    text.match(/\b([A-F0-9]{16,64})\b/);

  return normalizeResult({
    source: 'binance',
    amount,
    currency,
    direction,
    date: new Date(),
    accountHint: 'binance',
    rawReference: refMatch ? refMatch[1] : `binance-${direction}-${amount}-${currency}-${Date.now()}`,
    rawSnippet: text.slice(0, 400),
  });
}

module.exports = { parseBinance };
