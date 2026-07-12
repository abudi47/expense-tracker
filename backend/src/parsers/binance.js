const {
  stripNoise,
  parseAmount,
  normalizeResult,
  extractReference,
  stableFallbackRef,
  isNonTransactionMail,
} = require('./shared');

/**
 * Binance deposit/withdrawal confirmation email patterns — broadened for real templates.
 * Security / login alerts intentionally return null (not money movements).
 */
function parseBinance(subject = '', body = '') {
  if (isNonTransactionMail(subject, body)) return null;

  const text = stripNoise(`${subject}\n${body}`);
  const lower = text.toLowerCase();

  if (!/binance/i.test(subject + body) && !/deposit|withdraw/i.test(lower)) {
    return null;
  }

  // Login / device alerts often contain "binance" but no money move
  if (/login alert|new device|ip login|security alert/i.test(subject)) return null;

  let direction = null;
  if (/withdraw|sent|outgoing|debit/i.test(text)) direction = 'outgoing';
  else if (/deposit|credited|received|incoming|credit|available/i.test(text)) direction = 'incoming';
  if (!direction && /binance/i.test(subject)) {
    if (/withdraw/i.test(subject)) direction = 'outgoing';
    else if (/deposit/i.test(subject)) direction = 'incoming';
  }
  if (!direction) return null;

  const amountMatch =
    text.match(/(?:deposit|withdrawal|withdraw|received|sent)\s+(?:of\s+)?([\d,.]+)\s*([A-Z]{3,5})/i) ||
    text.match(/([\d,.]+)\s*(USDT|BTC|ETH|BNB|BUSD|USD|ETB|FDUSD|USDC)/i) ||
    text.match(/(?:Amount|Quantity)[:\s]*([\d,.]+)\s*([A-Z]{3,5})?/i);
  if (!amountMatch) return null;

  const amount = parseAmount(amountMatch[1]);
  const currency = (amountMatch[2] || 'USDT').toUpperCase();
  if (amount == null) return null;

  const ref =
    extractReference(text) ||
    text.match(/(?:TxID|Transaction ID|Order ID|Withdraw ID|Deposit ID)[:\s#]*([A-Za-z0-9_-]+)/i)?.[1] ||
    text.match(/\b([A-F0-9]{16,64})\b/)?.[1] ||
    stableFallbackRef('binance', direction, amount, currency, text);

  return normalizeResult({
    source: 'binance',
    amount,
    currency,
    direction,
    date: new Date(),
    accountHint: 'binance',
    rawReference: ref,
    rawSnippet: text.slice(0, 400),
  });
}

module.exports = { parseBinance };
