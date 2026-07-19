const { parseBinance } = require('./binance');
const { parseGrey } = require('./grey');
const { parseCbeSms } = require('./cbeSms');
const { parseBoaSms } = require('./boaSms');
const { parseTelebirrSms } = require('./telebirrSms');

function parseEmail(subject, body) {
  return parseBinance(subject, body) || parseGrey(subject, body) || null;
}

function parseNotification(title = '', body = '') {
  const text = `${title}\n${body}`;
  const lower = text.toLowerCase();

  // Prefer source hinted by title/package/sender keywords
  if (/telebirr|e-money|ethio\s*telecom|ethiotelecom/.test(lower)) {
    return parseTelebirrSms(text) || parseCbeSms(text) || parseBoaSms(text) || null;
  }
  if (/abyssinia|boa|bankofabyssinia/.test(lower)) {
    return parseBoaSms(text) || parseCbeSms(text) || parseTelebirrSms(text) || null;
  }
  if (/cbe|commercial bank|mbreciept|mreciept|thanks for banking/.test(lower)) {
    return parseCbeSms(text) || parseBoaSms(text) || parseTelebirrSms(text) || null;
  }

  return (
    parseCbeSms(text) ||
    parseBoaSms(text) ||
    parseTelebirrSms(text) ||
    parseBinance(title, body) ||
    parseGrey(title, body) ||
    null
  );
}

module.exports = {
  parseEmail,
  parseNotification,
  parseBinance,
  parseGrey,
  parseCbeSms,
  parseBoaSms,
  parseTelebirrSms,
};
