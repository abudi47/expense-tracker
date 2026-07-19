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

/**
 * Redact amounts, balances, accounts, phones, and names from text kept in
 * snippets/logs/API samples so money and identity are not stored in clear text.
 */
function redactSensitive(text = '') {
  return String(text)
    .replace(/https?:\/\/\S+/gi, '[link]')
    .replace(/\bETB\s*[\d,]+(?:\.\d+)?/gi, 'ETB[…]')
    .replace(/\$\s*[\d,]+(?:\.\d+)?/gi, '$[…]')
    .replace(/\b(?:USD|USDT|USDC)\s*[\d,]+(?:\.\d+)?/gi, '[…]')
    .replace(/\b[\d,]+(?:\.\d+)?\s*(?:ETB|USD|USDT|USDC)\b/gi, '[…]')
    // Bare fee/VAT/DR figures: "of 0.50", "of 0.0"
    .replace(
      /\b(?:VAT|Disaster Recovery|service charge|fee)([^.]{0,40}?)\bof\s+(?:ETB\s*)?[\d,]+(?:\.\d+)?/gi,
      (m) => m.replace(/\bof\s+(?:ETB\s*)?[\d,]+(?:\.\d+)?/i, 'of […]')
    )
    .replace(/\b\d[*xX]{2,}\d+\b/g, '[account]')
    .replace(/\b(?:account)\s+[*\dXx]{4,}/gi, 'account [account]')
    .replace(/\b251\d{8,9}\b/g, '[phone]')
    .replace(/\(\s*251[\d*]{4,}\s*\)/g, '([phone])')
    .replace(/\bDear\s+[A-Za-z][A-Za-z\s.'-]{1,60}(?=\s+(?:You|A|your)\b|,)/gi, 'Dear [name]')
    .replace(/\(([A-Za-z][A-Za-z\s.'-]{2,50})\)/g, '([name])')
    .replace(/\bby\s+[A-Za-z][A-Za-z\s.'-]{2,50}(?=\.|$)/gi, 'by [name]')
    .replace(/\b(?:FT|DG)[A-Z0-9]{6,}\b/gi, '[ref]')
    .replace(/\btransaction number(?:\s+is)?\s+[A-Za-z0-9-]+/gi, 'transaction number [ref]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

/** Common bank/wallet reference patterns */
function extractReference(text = '') {
  const raw = String(text);
  const match =
    raw.match(/m+b?reciept\.cbe\.com\.et\/(?:v2-)?([A-Za-z0-9._-]+)/i) ||
    raw.match(/mreciept\.cbe\.com\.et\/(?:v2-)?([A-Za-z0-9._-]+)/i) ||
    raw.match(/transactioninfo\.ethiotelecom\.et\/receipt\/([A-Za-z0-9_-]+)/i) ||
    raw.match(/[?&]trx=([A-Za-z0-9_-]+)/i) ||
    raw.match(/transaction\s+number\s+is\s+([A-Za-z0-9-]+)/i) ||
    raw.match(/by\s+transaction\s+number\s+([A-Za-z0-9-]+)/i) ||
    raw.match(
      /(?:Transaction\s*(?:ID|No\.?|Number)|Txn\s*ID|Ref(?:erence)?|ID)[:\s#]*([A-Za-z0-9_-]{6,})/i
    ) ||
    raw.match(/\b(FT[A-Z0-9]{8,})\b/i) ||
    raw.match(/\b(DG[A-Z0-9]{8,})\b/i);
  return match?.[1] || null;
}

/** Stable fallback when message has no explicit ref (avoid Date.now uniqueness) */
function stableFallbackRef(source, direction, amount, currency, snippet = '') {
  const day = new Date().toISOString().slice(0, 10);
  const snip = redactSensitive(snippet)
    .toLowerCase()
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
    rawSnippet: redactSensitive(partial.rawSnippet || ''),
  };
}

module.exports = {
  stripNoise,
  parseAmount,
  redactSensitive,
  extractReference,
  stableFallbackRef,
  isNonTransactionMail,
  normalizeResult,
};
