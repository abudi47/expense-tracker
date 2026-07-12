/** Shared helpers for SMS/email parsers */

function stripNoise(text = '') {
  return String(text)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#?\w+;/g, ' ')
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
  if (!cleaned || cleaned === '.') return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Common bank/wallet reference patterns */
function extractReference(text = '') {
  const raw = String(text);
  const match =
    raw.match(/mbreciept\.cbe\.com\.et\/([A-Za-z0-9._-]+)/i) ||
    raw.match(/[?&]trx=([A-Za-z0-9_-]+)/i) ||
    raw.match(/transaction\s+number\s+is\s+([A-Za-z0-9-]+)/i) ||
    raw.match(
      /(?:Transaction\s*(?:ID|No\.?|Number)|Txn\s*ID|Ref(?:erence)?|ID)[:\s#]*([A-Za-z0-9_-]{6,})/i
    ) ||
    raw.match(/\b(FT[A-Z0-9]{8,})\b/i);
  return match?.[1] || null;
}

/** Stable fallback when message has no explicit ref (avoid Date.now uniqueness) */
function stableFallbackRef(source, direction, amount, currency, snippet = '') {
  const day = new Date().toISOString().slice(0, 10);
  const snip = String(snippet)
    .toLowerCase()
    .replace(/balance[^\d]*[\d,.]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48);
  return `${source}-${direction}-${amount}-${currency}-${day}-${snip}`.slice(0, 180);
}

/** Security / marketing mail — not a money movement */
function isNonTransactionMail(subject = '', body = '') {
  const t = `${subject}\n${body}`.toLowerCase();
  return (
    /new device|ip login|login alert|security alert|unusual activity|2fa|otp code|verification code|verify your|password reset|products updates|newsletter|welcome to|account opened|kyc|identity verification/.test(
      t
    ) && !/(deposit|withdraw|amount received|amount tendered|card transaction|credited|debited)/.test(t)
  );
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

module.exports = {
  stripNoise,
  parseAmount,
  extractReference,
  stableFallbackRef,
  isNonTransactionMail,
  normalizeResult,
};
