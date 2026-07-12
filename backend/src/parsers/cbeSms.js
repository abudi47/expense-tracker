const { stripNoise, parseAmount, normalizeResult } = require('./shared');

/**
 * CBE SMS — credited/transferred ETB{amount}, balance, receipt URL slug.
 */
function parseCbeSms(text = '') {
  const cleaned = stripNoise(text);
  if (!/ETB|cbe|commercial bank/i.test(cleaned) && !/mbreciept\.cbe\.com\.et/i.test(text)) {
    // Still try if ETB pattern present
    if (!/ETB\s*[\d,]+/i.test(text)) return null;
  }

  const raw = String(text);
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

  const receiptMatch =
    raw.match(/mbreciept\.cbe\.com\.et\/([A-Za-z0-9._-]+)/i) ||
    raw.match(/\/v2-([A-Za-z0-9._-]+)/i);

  const accountMatch = raw.match(/account\s+([Xx*\d]+)/i);

  return normalizeResult({
    source: 'cbe',
    amount,
    currency: 'ETB',
    direction,
    date: new Date(),
    accountHint: accountMatch?.[1] || 'cbe',
    rawReference: receiptMatch?.[1] || `cbe-${amount}-${Date.now()}`,
    fee: parseAmount(feeMatch?.[1]) ?? undefined,
    vat: parseAmount(vatMatch?.[1]) ?? undefined,
    reportedBalance: parseAmount(balMatch?.[1]) ?? undefined,
    rawSnippet: cleaned.slice(0, 400),
  });
}

module.exports = { parseCbeSms };
