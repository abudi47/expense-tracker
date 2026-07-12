const {
  stripNoise,
  parseAmount,
  normalizeResult,
  extractReference,
  stableFallbackRef,
  isNonTransactionMail,
} = require('./shared');

/**
 * Grey email — withdrawal, card spend, amount received/tendered, HTML bodies.
 */
function parseGrey(subject = '', body = '') {
  const combined = `${subject}\n${body}`;
  if (!/grey|amount tendered|amount received|greymarket|card transaction|withdrawal/i.test(combined)) {
    return null;
  }
  if (isNonTransactionMail(subject, body) && !/withdrawal|card transaction|amount /i.test(subject)) {
    return null;
  }

  const text = stripNoise(combined);

  const received =
    text.match(/Amount\s+received[:\s]*([\d,.]+)\s*([A-Z]{3,5})?/i) ||
    text.match(/You\s+(?:received|got)[:\s]*\$?\s*([\d,.]+)\s*([A-Z]{3,5})?/i);
  const tendered =
    text.match(/Amount\s+tendered[:\s]*([\d,.]+)\s*([A-Z]{3,5})?/i) ||
    text.match(/(?:Paid|Sent|Sold)[:\s]*\$?\s*([\d,.]+)\s*([A-Z]{3,5})?/i);
  const withdrawal =
    text.match(/(?:Withdrawal|Withdrawn|You\s+withdrew)[:\s]*\$?\s*([\d,.]+)\s*([A-Z]{3,5})?/i) ||
    text.match(/successfully\s+withdrew\s+\$?\s*([\d,.]+)\s*([A-Z]{3,5})?/i);
  const card =
    text.match(/(?:Card\s+transaction|Spent|Charged|Purchase)[:\s]*\$?\s*([\d,.]+)\s*([A-Z]{3,5})?/i) ||
    text.match(/(?:Amount|Total)[:\s]*\$?\s*([\d,.]+)\s*([A-Z]{3,5})?/i);

  const typeMatch = text.match(/Transaction\s+Type[:\s]*([^\n\r]+)/i);
  const refMatch =
    extractReference(text) ||
    text.match(/Reference[:\s#]*([A-Za-z0-9_-]+)/i) ||
    text.match(/(?:Ref|TXN|ID)[:\s#]*([A-Za-z0-9_-]{6,})/i);
  const dateMatch = text.match(/Date\s*&\s*Time[:\s]*([^\n\r]+)/i);

  const hit = received || tendered || withdrawal || card;
  let amount = parseAmount(hit?.[1]);
  let currency = (hit?.[2] || '').toUpperCase();

  if (amount == null) {
    const money =
      text.match(/\$\s*([\d,.]+)/) ||
      text.match(/([\d,.]+)\s*(ETB|USDT|USD|USDC|NGN|EUR|GBP)/i);
    if (money) {
      amount = parseAmount(money[1]);
      currency = (money[2] || 'USD').toUpperCase();
      if (currency === '$' || !money[2]) currency = 'USD';
    }
  }
  if (!currency) currency = /withdrawal|card transaction/i.test(subject) ? 'USD' : 'ETB';
  if (amount == null) return null;

  const typeStr = `${typeMatch?.[1] || ''} ${subject} ${text}`.toLowerCase();
  let direction = 'incoming';
  if (/sell|withdraw|send|debit|payout|paid|card transaction|spent|charged|purchase/i.test(typeStr)) {
    direction = 'outgoing';
  }
  if (/buy|deposit|receive|credit|received|amount received/i.test(typeStr) && !/card transaction|withdraw/i.test(subject)) {
    direction = 'incoming';
  }
  if (/withdrawal successful/i.test(subject)) direction = 'outgoing';
  if (/card transaction/i.test(subject)) direction = 'outgoing';

  let date = new Date();
  if (dateMatch?.[1]) {
    const parsed = new Date(dateMatch[1]);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }

  const ref =
    (typeof refMatch === 'string' ? refMatch : refMatch?.[1]) ||
    stableFallbackRef('grey', direction, amount, currency, `${subject} ${text}`);

  return normalizeResult({
    source: 'grey',
    amount,
    currency,
    direction,
    date,
    accountHint: 'grey',
    rawReference: ref,
    rawSnippet: text.slice(0, 400),
  });
}

module.exports = { parseGrey };
