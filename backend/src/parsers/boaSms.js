const { stripNoise, parseAmount, normalizeResult, extractReference, stableFallbackRef } = require('./shared');

/**
 * Bank of Abyssinia SMS — credited / debited patterns + ?trx= ref
 */
function parseBoaSms(text = '') {
  const raw = String(text);
  const cleaned = stripNoise(raw);
  if (!/abyssinia|your account/i.test(raw) && !/trx=/i.test(raw)) {
    if (!/credited with ETB|debited|transferred/i.test(raw)) return null;
  }

  let direction = null;
  if (/was credited|credited with/i.test(raw)) direction = 'incoming';
  else if (/debited|transferred|withdrawn/i.test(raw)) direction = 'outgoing';
  if (!direction) return null;

  const amountMatch =
    raw.match(/(?:credited with|debited(?: with)?|transferred)\s*ETB\s*([\d,.]+)/i) ||
    raw.match(/ETB\s*([\d,.]+)/i);
  const amount = parseAmount(amountMatch?.[1]);
  if (amount == null) return null;

  const accountMatch = raw.match(/account\s+([Xx*\d-]+)/i);
  const senderMatch = raw.match(/by\s+([^.]+?)(?:\.|$)/i);
  const balMatch = raw.match(/(?:Available\s+)?Balance[:\s]*ETB\s*([\d,.]+)/i);
  const ref =
    extractReference(raw) ||
    stableFallbackRef('boa', direction, amount, 'ETB', cleaned);

  return normalizeResult({
    source: 'boa',
    amount,
    currency: 'ETB',
    direction,
    date: new Date(),
    accountHint: accountMatch?.[1] || senderMatch?.[1]?.trim() || 'boa',
    rawReference: ref,
    reportedBalance: parseAmount(balMatch?.[1]) ?? undefined,
    rawSnippet: cleaned.slice(0, 400),
  });
}

module.exports = { parseBoaSms };
