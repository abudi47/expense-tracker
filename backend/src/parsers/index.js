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
