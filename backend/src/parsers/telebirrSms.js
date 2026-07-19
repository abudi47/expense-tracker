const { stripNoise, parseAmount, normalizeResult, extractReference, stableFallbackRef } = require('./shared');

/**
 * telebirr SMS — received / transferred / pack purchase with balance + txn id.
 */
function parseTelebirrSms(text = '') {
  const raw = String(text);
  const cleaned = stripNoise(raw);
  if (!/telebirr|e-money|ethiotelecom|transactioninfo\.ethiotelecom/i.test(raw)) {
    if (!/You have transferred ETB|You have received ETB|purchase made for/i.test(raw)) {
      return null;
    }
  }

  let direction = null;
  if (/transferred ETB|sent ETB|You have paid|purchase made for/i.test(raw)) {
    direction = 'outgoing';
  } else if (/received ETB|You have received|credited/i.test(raw)) {
    direction = 'incoming';
  }
  if (!direction) return null;

  const amountMatch =
    raw.match(/(?:transferred|received|paid)\s+ETB\s*([\d,.]+)/i) ||
    raw.match(/You have received\s+ETB\s*([\d,.]+)/i) ||
    // Pack purchase: amount often only appears as balance; try receipt total patterns later
    raw.match(/ETB\s*([\d,.]+)/i);

  let amount = parseAmount(amountMatch?.[1]);

  // Student/data pack purchases often omit the pack price and only show balance.
  // Prefer not to treat balance as the transaction amount — look for explicit price first.
  if (/purchase made for/i.test(raw)) {
    const priceMatch =
      raw.match(/(?:price|amount|cost|paid)\s*(?:of\s*)?ETB\s*([\d,.]+)/i) ||
      raw.match(/ETB\s*([\d,.]+)\s*(?:for|purchase)/i);
    const priced = parseAmount(priceMatch?.[1]);
    if (priced != null) {
      amount = priced;
    } else {
      // No pack price in SMS — skip rather than mis-queue balance as amount
      // unless we find a non-balance ETB earlier in the message
      const balIdx = raw.search(/current balance is\s*ETB/i);
      const re = /ETB\s*([\d,.]+)/gi;
      let m;
      let found = null;
      while ((m = re.exec(raw))) {
        if (balIdx >= 0 && m.index >= balIdx) break;
        const n = parseAmount(m[1]);
        if (n != null) {
          found = n;
          break;
        }
      }
      if (found == null) return null;
      amount = found;
    }
  }

  if (amount == null) return null;

  const recipientMatch =
    raw.match(/to your telebirr Account\s+([\d]+)\s*-\s*([^.]+)/i) ||
    raw.match(/to\s+([^(]+)\s*\(([^)]+)\)/i);
  const feeMatch = raw.match(/service fee is\s+ETB\s*([\d,.]+)/i);
  const vatMatch =
    raw.match(/(?:\d+\s*%\s*)?VAT(?:\s+on\s+the\s+service\s+fee)?(?:\s+is)?[:\s]*ETB\s*([\d,.]+)/i) ||
    raw.match(/VAT\s*\([^)]*\)\s*of\s*(?:ETB\s*)?([\d,.]+)/i);
  const balMatch =
    raw.match(/(?:current\s+)?(?:E-Money\s+Account\s+)?balance is\s+ETB\s*([\d,.]+)/i);

  const dateMatch =
    raw.match(/on\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}:\d{2})/i) ||
    raw.match(/on\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?)/i);

  let date = new Date();
  if (dateMatch) {
    const a = dateMatch[1];
    const b = dateMatch[2];
    let parsed;
    if (/^\d{4}-\d{2}-\d{2}$/.test(a)) {
      parsed = new Date(`${a}T${b}`);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(a)) {
      const [dd, mm, yyyy] = a.split('/');
      parsed = new Date(`${yyyy}-${mm}-${dd}T${b}`);
    } else {
      parsed = new Date(`${a} ${b}`);
    }
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }

  const ref =
    extractReference(raw) ||
    stableFallbackRef('telebirr', direction, amount, 'ETB', cleaned);

  const accountHint =
    recipientMatch?.[1]?.trim() ||
    (raw.match(/purchase made for\s+(\d+)/i)?.[1]) ||
    'telebirr';

  return normalizeResult({
    source: 'telebirr',
    amount,
    currency: 'ETB',
    direction,
    date,
    accountHint,
    rawReference: ref,
    fee: parseAmount(feeMatch?.[1]) ?? undefined,
    vat: parseAmount(vatMatch?.[1]) ?? undefined,
    reportedBalance: parseAmount(balMatch?.[1]) ?? undefined,
    rawSnippet: cleaned.slice(0, 400),
  });
}

module.exports = { parseTelebirrSms };
