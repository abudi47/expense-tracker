const express = require('express');
const User = require('../models/User');
const { syncGmailForUser } = require('../utils/gmailSync');

const router = express.Router();

/** Skip users synced this recently by app/manual (ms) */
const SKIP_RECENT_MS = 20 * 60 * 1000;
/** Max users per cron invocation (Vercel timeout safety) */
const MAX_USERS = 10;

function assertCronAuth(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    res.status(503).json({ message: 'CRON_SECRET is not configured' });
    return false;
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token !== secret) {
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }
  return true;
}

/**
 * Vercel Cron: sync Gmail for connected users.
 * Schedule: every 30 minutes (see vercel.json).
 */
async function runGmailCron(req, res) {
  if (!assertCronAuth(req, res)) return;

  try {
    const users = await User.find({
      'ingest.gmailConnected': true,
      'ingest.gmailTokens.refreshToken': { $exists: true, $ne: null },
      $or: [{ 'ingest.gmailBinance': true }, { 'ingest.gmailGrey': true }],
    })
      .sort({ 'ingest.lastGmailSyncAt': 1 })
      .limit(MAX_USERS);

    const results = [];
    let queuedTotal = 0;

    for (const user of users) {
      try {
        const result = await syncGmailForUser(user, {
          skipIfSyncedWithinMs: SKIP_RECENT_MS,
          notify: true,
        });
        queuedTotal += result.queued || 0;
        results.push({
          userId: String(user._id),
          email: user.ingest?.gmailTokens?.email || null,
          skipped: !!result.skipped,
          reason: result.reason || null,
          scanned: result.scanned,
          queued: result.queued,
        });
      } catch (err) {
        results.push({
          userId: String(user._id),
          email: user.ingest?.gmailTokens?.email || null,
          error: err.message || 'sync failed',
        });
      }
    }

    res.json({
      ok: true,
      processed: results.length,
      queuedTotal,
      results,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Cron gmail sync failed' });
  }
}

router.get('/gmail-sync', runGmailCron);
router.post('/gmail-sync', runGmailCron);

module.exports = router;
