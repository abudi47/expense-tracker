const { stripNoise, parseAmount, normalizeResult } = require('./shared');

/**
 * Grey email — labeled fields and looser fallbacks for real templates.
 */
function parseGrey(subject = '', body = '') {
  const text = stripNoise(`${subject}\n${body}`);
  const combined = `${subject}\n${body}`;
  if (!/grey|amount tendered|amount received|greymarket/i.test(combined)) return null;

  const received =
    text.match(/Amount\s+received[:\s]*([\d,.]+)\s*([A-Z]{3,5})?/i) ||
    text.match(/You\s+(?:received|got)[:\s]*([\d,.]+)\s*([A-Z]{3,5})?/i);
  const tendered =
    text.match(/Amount\s+tendered[:\s]*([\d,.]+)\s*([A-Z]{3,5})?/i) ||
    text.match(/(?:Paid|Sent|Sold)[:\s]*([\d,.]+)\s*([A-Z]{3,5})?/i);
  const typeMatch = text.match(/Transaction\s+Type[:\s]*([^\n\r]+)/i);
  const refMatch =
    text.match(/Reference[:\s#]*([A-Za-z0-9_-]+)/i) ||
    text.match(/(?:Ref|TXN|ID)[:\s#]*([A-Za-z0-9_-]{6,})/i);
  const dateMatch = text.match(/Date\s*&\s*Time[:\s]*([^\n\r]+)/i);

  const amountRaw = received?.[1] || tendered?.[1];
  let amount = parseAmount(amountRaw);
  let currency = (received?.[2] || tendered?.[2] || 'ETB').toUpperCase();

  if (amount == null) {
    const fallback = text.match(/([\d,.]+)\s*(ETB|USDT|USD|USDC)/i);
    if (fallback) {
      amount = parseAmount(fallback[1]);
      currency = fallback[2].toUpperCase();
    }
  }
  if (amount == null) return null;

  const typeStr = (typeMatch?.[1] || subject || '').toLowerCase();
  let direction = 'incoming';
  if (/sell|withdraw|send|debit|payout|paid/i.test(typeStr + ' ' + text)) direction = 'outgoing';
  if (/buy|deposit|receive|credit|received/i.test(typeStr + ' ' + text)) direction = 'incoming';

  let date = new Date();
  if (dateMatch?.[1]) {
    const parsed = new Date(dateMatch[1]);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }

  return normalizeResult({
    source: 'grey',
    amount,
    currency,
    direction,
    date,
    accountHint: 'grey',
    rawReference: refMatch?.[1] || `grey-${amount}-${date.getTime()}`,
    rawSnippet: text.slice(0, 400),
  });
}

module.exports = { parseGrey };
