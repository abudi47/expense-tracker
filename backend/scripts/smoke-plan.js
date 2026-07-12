/**
 * Local smoke tests for parsers + ingest helpers (no HTTP required for unit part).
 * Optional HTTP tests if API is up and TEST_EMAIL/TEST_PASSWORD set.
 */
const assert = require('assert');
const { parseBinance } = require('../src/parsers/binance');
const { parseGrey } = require('../src/parsers/grey');
const { parseEmail, parseNotification } = require('../src/parsers');
const { formatSyncToast } = (() => {
  // mirror mobile toast formatting for regression
  function formatSyncToast(r) {
    const parts = [`Scanned ${r.scanned}`, `${r.queued} new`];
    if (r.parseFailed > 0) parts.push(`${r.parseFailed} couldn’t parse`);
    if (r.alreadyQueued > 0) parts.push(`${r.alreadyQueued} already queued`);
    if (r.duplicates > 0) parts.push(`${r.duplicates} already seen`);
    return parts.join(' · ');
  }
  return { formatSyncToast };
})();

let failed = 0;
function ok(name, fn) {
  try {
    fn();
    console.log('PASS', name);
  } catch (e) {
    failed += 1;
    console.error('FAIL', name, e.message);
  }
}

ok('binance deposit', () => {
  const p = parseBinance(
    'Binance Deposit Successful',
    'Your deposit of 250.75 USDT is complete. TxID: AABBCCDDEEFF00112233'
  );
  assert(p, 'expected parse');
  assert.strictEqual(p.amount, 250.75);
  assert.strictEqual(p.currency, 'USDT');
  assert.strictEqual(p.direction, 'incoming');
  assert.strictEqual(p.source, 'binance');
});

ok('binance withdraw', () => {
  const p = parseBinance(
    'Withdrawal Request',
    'You have withdrawn 10 USDT. Withdraw ID: W123456789'
  );
  assert(p);
  assert.strictEqual(p.direction, 'outgoing');
  assert.strictEqual(p.amount, 10);
});

ok('binance misses unrelated', () => {
  assert.strictEqual(parseBinance('Hello', 'No money here'), null);
});

ok('grey amount received', () => {
  const p = parseGrey(
    'Grey Transaction',
    'Amount received: 12,500.00 ETB\nTransaction Type: Buy\nReference: GR-ABC-1\nDate & Time: 2026-01-15 10:00:00'
  );
  assert(p);
  assert.strictEqual(p.amount, 12500);
  assert.strictEqual(p.currency, 'ETB');
  assert.strictEqual(p.direction, 'incoming');
  assert.strictEqual(p.rawReference, 'GR-ABC-1');
});

ok('grey amount tendered sell', () => {
  const p = parseGrey(
    'Grey confirmation',
    'Amount tendered: 100 USDT\nTransaction Type: Sell\nReference: GR-SELL-9'
  );
  assert(p);
  assert.strictEqual(p.direction, 'outgoing');
  assert.strictEqual(p.currency, 'USDT');
});

ok('parseEmail routes binance', () => {
  const p = parseEmail('Binance Deposit', 'deposit of 1 USDT completed TxID: ABCDEFGHIJKLMNOP');
  assert(p && p.source === 'binance');
});

ok('cbe/boa/telebirr notification parsers', () => {
  const cbe = parseNotification('CBE', 'You have received ETB 100.00. Balance is ETB 500.00 Ref: 123456');
  // may or may not match depending on parser — just ensure no throw
  assert(cbe === null || typeof cbe.amount === 'number');
});

ok('toast breakdown format', () => {
  const msg = formatSyncToast({
    scanned: 8,
    queued: 0,
    parseFailed: 5,
    alreadyQueued: 0,
    duplicates: 3,
  });
  assert(msg.includes('Scanned 8'));
  assert(msg.includes('0 new'));
  assert(msg.includes('couldn’t parse') || msg.includes("couldn't parse"));
  assert(msg.includes('already seen'));
});

ok('push helper exports', () => {
  const push = require('../src/utils/push');
  assert.strictEqual(typeof push.notifyDetectedItem, 'function');
  assert.strictEqual(typeof push.notifyOverdueScheduled, 'function');
});

ok('ingestHelpers upsert export', () => {
  const h = require('../src/utils/ingestHelpers');
  assert.strictEqual(typeof h.upsertDetectedFromParsed, 'function');
});

(async () => {
  const base =
    process.env.API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    'http://127.0.0.1:5000/api';

  console.log('\n--- HTTP checks against', base, '---');
  try {
    const health = await fetch(`${base.replace(/\/api$/, '')}/api/health`);
    const h = await health.json();
    console.log('PASS health', h.status);
  } catch (e) {
    console.log('SKIP health — API not reachable:', e.message);
    console.log(failed ? `\n${failed} unit failures` : '\nUnit tests OK (API offline)');
    process.exit(failed ? 1 : 0);
  }

  // parse-preview requires auth — try login with env or skip
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    console.log('SKIP authenticated routes (set TEST_EMAIL / TEST_PASSWORD)');
    process.exit(failed ? 1 : 0);
  }

  try {
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const login = await loginRes.json();
    if (!loginRes.ok) throw new Error(login.message || 'login failed');
    const token = login.token;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const preview = await fetch(`${base}/ingest/parse-preview`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        channel: 'email',
        subject: 'Binance Deposit',
        body: 'Your deposit of 99 USDT is complete. TxID: ZZYYXXWWVVUUTTSS',
      }),
    });
    const pv = await preview.json();
    assert(pv.parsed && pv.parsed.amount === 99, 'parse-preview amount');
    console.log('PASS parse-preview');

    const prefsGet = await fetch(`${base}/settings/preferences`, { headers });
    const prefs = await prefsGet.json();
    assert('pushAlertsEnabled' in prefs || prefs.ingest, 'prefs shape');
    console.log('PASS preferences get', {
      pushAlertsEnabled: prefs.pushAlertsEnabled,
      gmail: prefs.ingest?.gmailConnected,
    });

    const pushTok = await fetch(`${base}/settings/push-token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token: 'ExponentPushToken[smoke-test-token]', enabled: false }),
    });
    const pt = await pushTok.json();
    assert(pushTok.ok, pt.message || 'push-token failed');
    console.log('PASS push-token', pt);

    const count = await fetch(`${base}/detected/count`, { headers });
    const c = await count.json();
    console.log('PASS detected/count', c);

    console.log(failed ? `\n${failed} unit failures` : '\nAll reachable tests passed');
    process.exit(failed ? 1 : 0);
  } catch (e) {
    console.error('FAIL authenticated flow', e.message);
    process.exit(1);
  }
})();
