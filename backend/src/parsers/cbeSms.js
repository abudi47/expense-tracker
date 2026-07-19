const { stripNoise, parseAmount, normalizeResult, extractReference, stableFallbackRef } = require('./shared');

/**
 * CBE SMS — debit/credit, P2P "total of ETB", balance, mreciept/mbreciept URL.
 */
function parseCbeSms(text = '') {
  const raw = String(text);
  const cleaned = stripNoise(text);

  const looksCbe =
    /cbe|commercial bank|m+b?reciept\.cbe\.com\.et|mreciept\.cbe\.com\.et/i.test(raw) ||
    /Thanks for Banking with CBE/i.test(raw) ||
    /Dear Customer/i.test(raw);
  if (!looksCbe) return null;

  // Prefer money-movement wording over fee lines
  let direction = null;
  if (/credit(?:ed|)\s+transaction|was credited|credited with|deposited|has been credited/i.test(raw)) {
    direction = 'incoming';
  } else if (
    /debit(?:ed|)\s+transaction|was debited|debited|transferred|has been transferred|paid|sent|has occurred on your account/i.test(
      raw
    )
  ) {
    direction = 'outgoing';
  } else if (/with total of\s*ETB/i.test(raw) && /\([A-Za-z][^)]+\)/.test(raw)) {
    // Truncated transfer SMS: masked account + (beneficiary) + total of ETB
    direction = 'outgoing';
  }
  if (!direction) return null;

  // Principal amount — never use "with total of" when debit/credit/transfer amount exists
  // (total includes service charge + VAT + disaster recovery)
  const amountMatch =
    raw.match(/(?:debit|credit)(?:ed|)\s+transaction\s+of\s*ETB\s*([\d,]+(?:\.\d+)?)/i) ||
    raw.match(
      /(?:successfully\s+)?(?:credited|debited|transferred|received|deposited)\s+(?:with\s+)?ETB\s*([\d,]+(?:\.\d+)?)/i
    ) ||
    raw.match(/with total of\s*ETB\s*([\d,]+(?:\.\d+)?)/i) ||
    raw.match(/total of\s*ETB\s*([\d,]+(?:\.\d+)?)/i);

  let amount = parseAmount(amountMatch?.[1]);
  // Fallback: first positive ETB that is not clearly a fee / total line
  if (amount == null) {
    const re = /ETB\s*([\d,]+(?:\.\d+)?)/gi;
    let m;
    while ((m = re.exec(raw))) {
      const n = parseAmount(m[1]);
      if (n == null) continue;
      const around = raw.slice(Math.max(0, m.index - 40), m.index + 20).toLowerCase();
      if (/service charge|vat|disaster recovery|fee|with total|total of/.test(around)) continue;
      amount = n;
      break;
    }
  }
  if (amount == null) return null;

  const feeMatch =
    raw.match(/Service charge of\s*ETB\s*([\d,]+(?:\.\d+)?)/i) ||
    raw.match(/(?:service\s*)?fee[:\s]*ETB\s*([\d,]+(?:\.\d+)?)/i);
  const drMatch = raw.match(
    /Disaster Recovery\s*\([^)]*\)\s*of\s*(?:ETB\s*)?([\d,]+(?:\.\d+)?)/i
  );
  const vatMatch =
    raw.match(/VAT\s*\([^)]*\)\s*of\s*ETB\s*([\d,]+(?:\.\d+)?)/i) ||
    raw.match(/VAT\s*\([^)]*\)\s*of\s*([\d,]+(?:\.\d+)?)/i) ||
    raw.match(/VAT[:\s]*ETB\s*([\d,]+(?:\.\d+)?)/i);
  const balMatch = raw.match(/(?:current\s+)?balance(?:\s+is)?[:\s]*ETB\s*([\d,]+(?:\.\d+)?)/i);
  // Prefer destination account on transfers ("to account …")
  const accountMatch =
    raw.match(/to account\s+([Xx*\d]+)/i) ||
    raw.match(/(?:from|on your)\s+account\s+([Xx*\d]+)/i) ||
    raw.match(/account\s+([Xx*\d]+)/i) ||
    raw.match(/(?:^|\s)([*\dXx]{4,})\s*\(/);

  const serviceFee = parseAmount(feeMatch?.[1]) || 0;
  const disasterRecovery = parseAmount(drMatch?.[1]) || 0;
  const feeTotal = serviceFee + disasterRecovery;

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
    fee: feeTotal > 0 ? feeTotal : undefined,
    vat: parseAmount(vatMatch?.[1]) ?? undefined,
    reportedBalance: parseAmount(balMatch?.[1]) ?? undefined,
    rawSnippet: cleaned.slice(0, 400),
  });
}

module.exports = { parseCbeSms };
