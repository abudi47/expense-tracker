const { stripNoise, parseAmount, normalizeResult } = require('./shared');

/**
 * Binance deposit/withdrawal confirmation email patterns — broadened for real templates.
 */
function parseBinance(subject = '', body = '') {
  const text = stripNoise(`${subject}\n${body}`);
  const lower = text.toLowerCase();

  if (!/binance/i.test(subject + body) && !/deposit|withdraw/i.test(lower)) {
    return null;
  }

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

  const refMatch =
    text.match(/(?:TxID|Transaction ID|Order ID|Withdraw ID|Deposit ID)[:\s#]*([A-Za-z0-9_-]+)/i) ||
    text.match(/\b([A-F0-9]{16,64})\b/);

  return normalizeResult({
    source: 'binance',
    amount,
    currency,
    direction,
    date: new Date(),
    accountHint: 'binance',
    rawReference: refMatch
      ? refMatch[1]
      : `binance-${direction}-${amount}-${currency}-${Date.now()}`,
    rawSnippet: text.slice(0, 400),
  });
}

module.exports = { parseBinance };
