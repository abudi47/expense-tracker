/** Shared helpers for SMS/email parsers */

function stripNoise(text = '') {
  return String(text)
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/Thank you for using[^.]*\.?/gi, ' ')
    .replace(/Bank of Abyssinia/gi, ' ')
    .replace(/Commercial Bank of Ethiopia/gi, ' ')
    .replace(/Call\s*:\s*[\d\s-]+/gi, ' ')
    .replace(/Help\s*line[:\s]*[\d\s-]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAmount(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/,/g, '').replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeResult(partial) {
  return {
    source: partial.source || 'other',
    amount: partial.amount,
    currency: (partial.currency || 'ETB').toUpperCase(),
    direction: partial.direction,
    date: partial.date ? new Date(partial.date) : new Date(),
    accountHint: partial.accountHint || '',
    rawReference: partial.rawReference || '',
    fee: partial.fee ?? undefined,
    vat: partial.vat ?? undefined,
    reportedBalance: partial.reportedBalance ?? undefined,
    rawSnippet: (partial.rawSnippet || '').slice(0, 500),
  };
}

module.exports = { stripNoise, parseAmount, normalizeResult };
