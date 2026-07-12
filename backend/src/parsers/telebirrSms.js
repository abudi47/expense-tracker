const { stripNoise, parseAmount, normalizeResult } = require('./shared');

/**
 * telebirr SMS — transferred / received with fee and balance
 */
function parseTelebirrSms(text = '') {
  const raw = String(text);
  const cleaned = stripNoise(raw);
  if (!/telebirr|e-money/i.test(raw)) {
    if (!/You have transferred ETB|You have received ETB/i.test(raw)) return null;
  }

  let direction = null;
  if (/transferred ETB|sent ETB/i.test(raw)) direction = 'outgoing';
  else if (/received ETB|credited|You have received/i.test(raw)) direction = 'incoming';
  if (!direction) return null;

  const amountMatch = raw.match(/(?:transferred|received)\s+ETB\s*([\d,.]+)/i);
  const amount = parseAmount(amountMatch?.[1]);
  if (amount == null) return null;

  const recipientMatch = raw.match(/to\s+([^(]+)\s*\(([^)]+)\)/i);
  const refMatch = raw.match(/transaction number is\s+([A-Za-z0-9-]+)/i);
  const feeMatch = raw.match(/service fee is\s+ETB\s*([\d,.]+)/i);
  const vatMatch = raw.match(/VAT[:\s]*ETB\s*([\d,.]+)/i);
  const balMatch = raw.match(/balance is\s+ETB\s*([\d,.]+)/i);
  const dateMatch = raw.match(/on\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?)/i);

  let date = new Date();
  if (dateMatch) {
    const parsed = new Date(`${dateMatch[1]} ${dateMatch[2]}`);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }

  return normalizeResult({
    source: 'telebirr',
    amount,
    currency: 'ETB',
    direction,
    date,
    accountHint: recipientMatch?.[1]?.trim() || 'telebirr',
    rawReference: refMatch?.[1] || `telebirr-${amount}-${date.getTime()}`,
    fee: parseAmount(feeMatch?.[1]) ?? undefined,
    vat: parseAmount(vatMatch?.[1]) ?? undefined,
    reportedBalance: parseAmount(balMatch?.[1]) ?? undefined,
    rawSnippet: cleaned.slice(0, 400),
  });
}

module.exports = { parseTelebirrSms };
