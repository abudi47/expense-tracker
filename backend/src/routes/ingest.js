const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { parseEmail, parseNotification } = require('../parsers');
const { redactSensitive } = require('../parsers/shared');
const { upsertDetectedFromParsed } = require('../utils/ingestHelpers');
const { gmailGet, syncGmailForUser } = require('../utils/gmailSync');

function smsEnabled(user) {
  return !!(user.ingest?.androidSms || user.ingest?.androidNotifications);
}

function smsExternalRef({ messageId, address, date, body }) {
  if (messageId) return `sms-${messageId}`;
  // Hash only — never embed SMS body (amounts/accounts) in the stored ref
  const raw = `${address || ''}|${date || ''}|${String(body || '')}`;
  return `sms-${crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32)}`;
}

function safeSnippet(prefix, snippetOrText) {
  return redactSensitive(`${prefix || ''} ${snippetOrText || ''}`.trim());
}

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
    if (!user) return res.status(404).json({ message: 'User not found' });

    const result = await syncGmailForUser(user);
    res.json({
      scanned: result.scanned,
      queued: result.queued,
      parseFailed: result.parseFailed,
      duplicates: result.duplicates,
      alreadyQueued: result.alreadyQueued,
      skippedOther: result.skippedOther,
      needsReviewCount: result.needsReviewCount,
      samples: result.samples,
      items: result.items,
    });
  } catch (error) {
    if (error.code === 'GMAIL_NOT_CONNECTED' || error.code === 'NO_SOURCES') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Gmail sync failed' });
  }
});

/** Android notification ingest — legacy path; prefer /ingest/sms */
router.post('/notification', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!smsEnabled(user)) {
      return res.status(403).json({
        message: 'Android bank SMS scanning is not enabled. Turn it on in Settings.',
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
      rawSnippet: safeSnippet(packageName, parsed.rawSnippet),
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

/**
 * Android SMS inbox ingest — client reads matching bank SMS (opt-in READ_SMS).
 * Body: { body, address?, date?, messageId? }
 */
router.post('/sms', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!smsEnabled(user)) {
      return res.status(403).json({
        message: 'Android bank SMS scanning is not enabled. Turn it on in Settings.',
      });
    }

    const { body, address, date, messageId } = req.body;
    if (!body || !String(body).trim()) {
      return res.status(400).json({ message: 'body is required' });
    }

    const text = String(body);
    const parsed = parseNotification(address || '', text);
    if (!parsed) {
      return res.json({ matched: false, item: null });
    }

    const smsDate = date ? new Date(date) : parsed.date || new Date();
    const externalRef = smsExternalRef({ messageId, address, date: smsDate.toISOString(), body: text });

    const { item, outcome } = await upsertDetectedFromParsed(req.user._id, {
      ...parsed,
      date: Number.isNaN(smsDate.getTime()) ? parsed.date || new Date() : smsDate,
      rawReference: externalRef,
      rawSnippet: safeSnippet(address || 'SMS', parsed.rawSnippet || text),
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
    res.status(500).json({ message: error.message || 'SMS ingest failed' });
  }
});

/** Batch SMS ingest (inbox scan) */
router.post('/sms/batch', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!smsEnabled(user)) {
      return res.status(403).json({
        message: 'Android bank SMS scanning is not enabled. Turn it on in Settings.',
      });
    }

    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    if (!messages.length) {
      return res.status(400).json({ message: 'messages array required' });
    }

    let created = 0;
    let matched = 0;
    let skipped = 0;
    const items = [];

    for (const msg of messages.slice(0, 100)) {
      const text = String(msg.body || '').trim();
      if (!text) {
        skipped += 1;
        continue;
      }
      const parsed = parseNotification(msg.address || '', text);
      if (!parsed) {
        skipped += 1;
        continue;
      }
      matched += 1;
      const smsDate = msg.date ? new Date(msg.date) : parsed.date || new Date();
      const externalRef = smsExternalRef({
        messageId: msg.messageId,
        address: msg.address,
        date: smsDate.toISOString(),
        body: text,
      });
      const { item, outcome } = await upsertDetectedFromParsed(req.user._id, {
        ...parsed,
        date: Number.isNaN(smsDate.getTime()) ? parsed.date || new Date() : smsDate,
        rawReference: externalRef,
        rawSnippet: safeSnippet(msg.address || 'SMS', parsed.rawSnippet || text),
      });
      if (outcome === 'created' && item) {
        created += 1;
        items.push(item);
      }
    }

    if (created > 0) {
      try {
        const { notifyDetectedItem } = require('../utils/push');
        await notifyDetectedItem(user, items[0]);
      } catch {
        // ignore
      }
    }

    res.json({ matched, created, skipped, items });
  } catch (error) {
    res.status(500).json({ message: error.message || 'SMS batch ingest failed' });
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
