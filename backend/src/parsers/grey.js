const { stripNoise, parseAmount, normalizeResult } = require('./shared');

/**
 * Grey email labeled fields:
 * Amount tendered, Amount received, Transaction Type, Date & Time, Reference
 */
function parseGrey(subject = '', body = '') {
  const text = stripNoise(`${subject}\n${body}`);
  if (!/grey|amount tendered|amount received/i.test(text)) return null;

  const received = text.match(/Amount\s+received[:\s]*([\d,.]+)\s*([A-Z]{3,5})?/i);
  const tendered = text.match(/Amount\s+tendered[:\s]*([\d,.]+)\s*([A-Z]{3,5})?/i);
  const typeMatch = text.match(/Transaction\s+Type[:\s]*([^\n\r]+)/i);
  const refMatch = text.match(/Reference[:\s#]*([A-Za-z0-9-]+)/i);
  const dateMatch = text.match(/Date\s*&\s*Time[:\s]*([^\n\r]+)/i);

  const amountRaw = received?.[1] || tendered?.[1];
  const amount = parseAmount(amountRaw);
  if (amount == null) return null;

  const currency = (received?.[2] || tendered?.[2] || 'ETB').toUpperCase();
  const typeStr = (typeMatch?.[1] || '').toLowerCase();
  let direction = 'incoming';
  if (/sell|withdraw|send|debit|payout/i.test(typeStr)) direction = 'outgoing';
  if (/buy|deposit|receive|credit/i.test(typeStr)) direction = 'incoming';

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
