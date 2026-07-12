const { stripNoise, parseAmount, normalizeResult, extractReference, stableFallbackRef } = require('./shared');

/**
 * CBE SMS — credited/transferred ETB{amount}, balance, receipt URL slug.
 */
function parseCbeSms(text = '') {
  const raw = String(text);
  const cleaned = stripNoise(text);

  const looksCbe =
    /cbe|commercial bank|mbreciept\.cbe\.com\.et/i.test(raw) ||
    /Dear Customer/i.test(raw);
  // Avoid stealing telebirr/generic "received ETB" messages
  if (!looksCbe && !/mbreciept\.cbe\.com\.et/i.test(raw)) {
    return null;
  }

  let direction = null;
  if (/credited|received|deposited/i.test(raw)) direction = 'incoming';
  else if (/transferred|debited|paid|sent/i.test(raw)) direction = 'outgoing';
  if (!direction) return null;

  const amountMatch = raw.match(/ETB\s*([\d,.]+)/i);
  const amount = parseAmount(amountMatch?.[1]);
  if (amount == null) return null;

  const feeMatch = raw.match(/(?:service\s*)?fee[:\s]*ETB\s*([\d,.]+)/i);
  const vatMatch = raw.match(/VAT[:\s]*ETB\s*([\d,.]+)/i);
  const balMatch = raw.match(/(?:current\s+)?balance(?:\s+is)?[:\s]*ETB\s*([\d,.]+)/i);
  const accountMatch = raw.match(/account\s+([Xx*\d]+)/i);
  const ref =
    extractReference(raw) ||
    stableFallbackRef('cbe', direction, amount, 'ETB', cleaned);

  return normalizeResult({
    source: 'cbe',
    amount,
    currency: 'ETB',
    direction,
    date: new Date(),
    accountHint: accountMatch?.[1] || 'cbe',
    rawReference: ref,
    fee: parseAmount(feeMatch?.[1]) ?? undefined,
    vat: parseAmount(vatMatch?.[1]) ?? undefined,
    reportedBalance: parseAmount(balMatch?.[1]) ?? undefined,
    rawSnippet: cleaned.slice(0, 400),
  });
}

module.exports = { parseCbeSms };
