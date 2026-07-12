/**
 * Expo push helper — sends to stored Expo push tokens on the user.
 * Failures are swallowed so ingest/sync never fails on push errors.
 */

async function sendExpoPush(tokens, { title, body, data }) {
  const list = (tokens || []).filter(Boolean);
  if (!list.length) return { sent: 0 };

  const messages = list.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    data: data || {},
  }));

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn('Expo push failed:', text.slice(0, 200));
      return { sent: 0 };
    }
    return { sent: messages.length };
  } catch (err) {
    console.warn('Expo push error:', err.message);
    return { sent: 0 };
  }
}

async function notifyDetectedItem(user, item) {
  if (!user?.pushAlertsEnabled) return { sent: 0 };
  const amount = item.amount != null ? String(item.amount) : '';
  const currency = item.currency || '';
  return sendExpoPush(user.pushTokens, {
    title: 'New transaction to review',
    body: `${item.source || 'Detected'}: ${amount} ${currency}`.trim(),
    data: { type: 'detected', id: String(item._id || '') },
  });
}

async function notifyOverdueScheduled(user, count) {
  if (!user?.pushAlertsEnabled || !count) return { sent: 0 };
  return sendExpoPush(user.pushTokens, {
    title: 'Scheduled item overdue',
    body:
      count === 1
        ? '1 scheduled item is past its expected date'
        : `${count} scheduled items are past their expected date`,
    data: { type: 'overdue', count },
  });
}

module.exports = {
  sendExpoPush,
  notifyDetectedItem,
  notifyOverdueScheduled,
};
