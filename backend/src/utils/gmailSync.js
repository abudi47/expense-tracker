const { parseEmail } = require('../parsers');
const { upsertDetectedFromParsed } = require('./ingestHelpers');

async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Token refresh failed');
  return data;
}

async function getValidAccessToken(user) {
  const tokens = user.ingest?.gmailTokens;
  if (!tokens?.refreshToken) throw new Error('Gmail not connected');

  if (tokens.accessToken && tokens.expiryDate && Date.now() < tokens.expiryDate - 60_000) {
    return tokens.accessToken;
  }

  const refreshed = await refreshAccessToken(tokens.refreshToken);
  user.ingest.gmailTokens.accessToken = refreshed.access_token;
  if (refreshed.expires_in) {
    user.ingest.gmailTokens.expiryDate = Date.now() + refreshed.expires_in * 1000;
  }
  if (refreshed.refresh_token) {
    user.ingest.gmailTokens.refreshToken = refreshed.refresh_token;
  }
  user.markModified('ingest');
  await user.save();
  return user.ingest.gmailTokens.accessToken;
}

async function gmailGet(path, accessToken) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Gmail API error');
  return data;
}

function decodeBody(payload) {
  const parts = [];
  function walk(p) {
    if (!p) return;
    if (p.body?.data) {
      parts.push(Buffer.from(p.body.data, 'base64url').toString('utf8'));
    }
    (p.parts || []).forEach(walk);
  }
  walk(payload);
  return parts.join('\n');
}

function headerValue(headers, name) {
  const h = (headers || []).find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value || '';
}

function stripForSample(body = '') {
  return String(body).replace(/\s+/g, ' ').trim().slice(0, 140);
}

function syncError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * Sync Binance/Grey Gmail for one user into the Detected review queue.
 * @param {import('mongoose').Document} user
 * @param {{ skipIfSyncedWithinMs?: number, notify?: boolean }} [opts]
 */
async function syncGmailForUser(user, opts = {}) {
  const { skipIfSyncedWithinMs = 0, notify = true } = opts;

  if (!user.ingest?.gmailTokens?.refreshToken) {
    throw syncError('GMAIL_NOT_CONNECTED', 'Connect Gmail first');
  }
  if (!user.ingest.gmailBinance && !user.ingest.gmailGrey) {
    throw syncError(
      'NO_SOURCES',
      'Enable at least one source (Binance or Grey) in settings'
    );
  }

  if (skipIfSyncedWithinMs > 0 && user.ingest.lastGmailSyncAt) {
    const last = new Date(user.ingest.lastGmailSyncAt).getTime();
    if (!Number.isNaN(last) && Date.now() - last < skipIfSyncedWithinMs) {
      return {
        skipped: true,
        reason: 'recent',
        scanned: 0,
        queued: 0,
        parseFailed: 0,
        duplicates: 0,
        alreadyQueued: 0,
        skippedOther: 0,
        needsReviewCount: undefined,
        samples: [],
        items: [],
      };
    }
  }

  const accessToken = await getValidAccessToken(user);
  const allowlist = (user.ingest.senderAllowlist || []).map((s) => s.toLowerCase());
  const fromQueries = [];
  if (user.ingest.gmailBinance) fromQueries.push('from:binance.com');
  if (user.ingest.gmailGrey) {
    fromQueries.push('from:grey.co OR from:greymarket.com OR subject:Grey');
  }
  const q = `(${fromQueries.join(' OR ')}) newer_than:14d`;

  const list = await gmailGet(
    `/users/me/messages?maxResults=40&q=${encodeURIComponent(q)}`,
    accessToken
  );

  const created = [];
  const samples = [];
  let parseFailed = 0;
  let duplicates = 0;
  let alreadyQueued = 0;
  let skippedOther = 0;
  const { isNonTransactionMail } = require('../parsers/shared');

  for (const msg of list.messages || []) {
    const full = await gmailGet(`/users/me/messages/${msg.id}?format=full`, accessToken);
    const subject = headerValue(full.payload?.headers, 'Subject');
    const from = headerValue(full.payload?.headers, 'From').toLowerCase();
    const body = decodeBody(full.payload);

    const allowed =
      allowlist.length === 0 ||
      allowlist.some((d) => from.includes(d)) ||
      from.includes('binance') ||
      from.includes('grey');
    if (!allowed) {
      skippedOther += 1;
      continue;
    }

    if (isNonTransactionMail(subject, body)) {
      skippedOther += 1;
      if (samples.length < 5) {
        samples.push({
          reason: 'not_a_transaction',
          from: from.slice(0, 80),
          subject: subject.slice(0, 120),
          snippet: 'Skipped (login/security/marketing — not a money movement)',
        });
      }
      continue;
    }

    let parsed = null;
    if (user.ingest.gmailBinance && (from.includes('binance') || /binance/i.test(subject))) {
      const { parseBinance } = require('../parsers/binance');
      parsed = parseBinance(subject, body) || parseEmail(subject, body);
    }
    if (!parsed && user.ingest.gmailGrey) {
      const { parseGrey } = require('../parsers/grey');
      parsed =
        parseGrey(subject, body) ||
        (from.includes('grey') || /grey/i.test(subject) ? parseEmail(subject, body) : null);
    }

    if (!parsed) {
      parseFailed += 1;
      if (samples.length < 5) {
        samples.push({
          reason: 'parse_failed',
          from: from.slice(0, 80),
          subject: subject.slice(0, 120),
          snippet: stripForSample(body),
        });
      }
      continue;
    }

    const { item, outcome } = await upsertDetectedFromParsed(user._id, parsed);
    if (outcome === 'created' && item) {
      created.push(item);
      if (notify) {
        try {
          const { notifyDetectedItem } = require('./push');
          await notifyDetectedItem(user, item);
        } catch {
          // push optional
        }
      }
    } else if (outcome === 'already_queued') {
      alreadyQueued += 1;
    } else if (outcome === 'duplicate') {
      duplicates += 1;
    } else {
      skippedOther += 1;
      if (samples.length < 5) {
        samples.push({
          reason: outcome,
          from: from.slice(0, 80),
          subject: subject.slice(0, 120),
          snippet: (parsed.rawSnippet || '').slice(0, 120),
        });
      }
    }
  }

  const DetectedItem = require('../models/DetectedItem');
  const needsReviewCount = await DetectedItem.countDocuments({
    userId: user._id,
    status: 'needs_review',
  });

  if (!user.ingest) user.ingest = {};
  user.ingest.lastGmailSyncAt = new Date();
  user.markModified('ingest');
  await user.save();

  return {
    skipped: false,
    scanned: (list.messages || []).length,
    queued: created.length,
    parseFailed,
    duplicates,
    alreadyQueued,
    skippedOther,
    needsReviewCount,
    samples,
    items: created,
  };
}

module.exports = {
  getValidAccessToken,
  gmailGet,
  syncGmailForUser,
};
