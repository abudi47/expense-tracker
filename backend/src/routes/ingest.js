const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { parseEmail, parseNotification } = require('../parsers');
const { upsertDetectedFromParsed } = require('../utils/ingestHelpers');

const router = express.Router();

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

async function exchangeCode(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Token exchange failed');
  return data;
}

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

// Public OAuth callback (no auth — Google redirects here)
router.get('/gmail/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) {
      return res.status(400).send(`Gmail authorization failed: ${error}`);
    }
    if (!code || !state) {
      return res.status(400).send('Missing code or state');
    }

    const user = await User.findById(state);
    if (!user) return res.status(404).send('User not found');

    const tokens = await exchangeCode(code);
    const accessToken = tokens.access_token;
    const profile = await gmailGet('/users/me/profile', accessToken);

    if (!user.ingest) user.ingest = {};
    user.ingest.gmailConnected = true;
    user.ingest.gmailTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || user.ingest.gmailTokens?.refreshToken,
      expiryDate: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
      email: profile.emailAddress,
    };
    user.markModified('ingest');
    await user.save();

    res.send(
      `<html><body style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>Gmail connected</h2>
        <p>${profile.emailAddress || 'Account'} linked. You can close this window and return to the app.</p>
      </body></html>`
    );
  } catch (err) {
    res.status(500).send(`Gmail connect failed: ${err.message}`);
  }
});

router.use(auth);

router.get('/gmail/auth-url', async (req, res) => {
  try {
    if (!googleConfigured()) {
      return res.status(503).json({
        message:
          'Gmail OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.',
      });
    }
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: String(req.user._id),
    });
    res.json({
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      configured: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/gmail/status', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      configured: googleConfigured(),
      ...user.getIngestSettings(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/gmail/disconnect', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.ingest) user.ingest = {};
    user.ingest.gmailConnected = false;
    user.ingest.gmailTokens = undefined;
    user.ingest.gmailBinance = false;
    user.ingest.gmailGrey = false;
    user.markModified('ingest');
    await user.save();
    res.json({ message: 'Gmail disconnected', ingest: user.getIngestSettings() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/gmail/sync', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.ingest?.gmailTokens?.refreshToken) {
      return res.status(400).json({ message: 'Connect Gmail first' });
    }
    if (!user.ingest.gmailBinance && !user.ingest.gmailGrey) {
      return res.status(400).json({
        message: 'Enable at least one source (Binance or Grey) in settings',
      });
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
      const full = await gmailGet(
        `/users/me/messages/${msg.id}?format=full`,
        accessToken
      );
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

      const { item, outcome } = await upsertDetectedFromParsed(req.user._id, parsed);
      if (outcome === 'created' && item) {
        created.push(item);
        try {
          const { notifyDetectedItem } = require('../utils/push');
          await notifyDetectedItem(user, item);
        } catch {
          // push optional
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

    const needsReviewCount = await require('../models/DetectedItem').countDocuments({
      userId: req.user._id,
      status: 'needs_review',
    });

    res.json({
      scanned: (list.messages || []).length,
      queued: created.length,
      parseFailed,
      duplicates,
      alreadyQueued,
      skippedOther,
      needsReviewCount,
      samples,
      items: created,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Gmail sync failed' });
  }
});

function stripForSample(body = '') {
  return String(body).replace(/\s+/g, ' ').trim().slice(0, 140);
}

/** Android notification ingest — client sends title/body after opt-in listener */
router.post('/notification', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.ingest?.androidNotifications) {
      return res.status(403).json({
        message: 'Android notification scanning is not enabled. Turn it on in Settings.',
      });
    }

    const { title, body, packageName } = req.body;
    if (!title && !body) {
      return res.status(400).json({ message: 'title or body required' });
    }

    const parsed = parseNotification(title || '', body || '');
    if (!parsed) {
      return res.json({ matched: false, item: null });
    }

    const { item, outcome } = await upsertDetectedFromParsed(req.user._id, {
      ...parsed,
      rawSnippet: `${packageName || ''} ${parsed.rawSnippet || ''}`.trim().slice(0, 500),
    });

    if (outcome === 'created' && item) {
      try {
        const { notifyDetectedItem } = require('../utils/push');
        await notifyDetectedItem(user, item);
      } catch {
        // ignore
      }
    }

    res.json({ matched: true, item, outcome });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Notification ingest failed' });
  }
});

/** Manual parse test helper */
router.post('/parse-preview', async (req, res) => {
  try {
    const { subject, body, title, text, channel } = req.body;
    const parsed =
      channel === 'email'
        ? parseEmail(subject || title || '', body || text || '')
        : parseNotification(title || subject || '', body || text || '');
    res.json({ parsed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
