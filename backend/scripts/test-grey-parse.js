const { parseGrey } = require('../src/parsers/grey');
const { parseBinance } = require('../src/parsers/binance');
const { isNonTransactionMail } = require('../src/parsers/shared');

const cases = [
  ['withdraw', parseGrey('Withdrawal Successful', 'You withdrew $50.00 USD. Reference: GRW-99')],
  ['card', parseGrey('Card transaction successful', 'Amount: 12.50 USD Ref: CARD123456')],
  ['html withdraw', parseGrey('Withdrawal Successful', '<p>You withdrew <b>$25.00</b> USD</p>')],
  ['login skip', isNonTransactionMail('[Binance] New Device or IP Login Alert', 'IP')],
  ['binance login', parseBinance('[Binance] New Device or IP Login Alert', 'login')],
];
for (const [name, result] of cases) {
  console.log(name, result && typeof result === 'object' ? { amount: result.amount, currency: result.currency, direction: result.direction, ref: result.rawReference } : result);
}
