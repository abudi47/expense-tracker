# Android Notification Access — Store Review Copy (DRAFT)

**Status:** Awaiting product owner approval before any Play Store / App Store submission that declares notification-listener access.

## In-app disclosure (shown on Notification Access screen)

**Title:** Read bank notifications (Android)

**Summary:** Asset Tracker can watch notification banners from banks and wallets (CBE, Bank of Abyssinia, telebirr) to suggest transactions for your review. We never post to your balance without your approval.

**Bullets:**
- We read the title and text of notifications from financial apps you allow — not your full SMS inbox.
- We do not request the READ_SMS permission.
- Parsed amounts go to a “Detected — needs review” queue. You confirm the account before anything affects balances.
- You can turn this off anytime in Settings, and revoke access in Android Settings → Notifications → Device & app notifications.
- Only short parsed fields are stored (amount, date, reference). Full message bodies are not kept after processing.

## Play Store justification (proposed)

This app uses the Notification Listener Service solely to parse bank and payment confirmation notifications for optional expense tracking. Access is user-initiated, opt-in, and limited to extracting transaction fields for a manual review queue. The app does not read SMS, does not send messages, and does not use notification access for advertising.

## Notes for reviewers

- Source code: `mobile/src/screens/NotificationAccessScreen.tsx` (`NOTIFICATION_DISCLOSURE`)
- Backend ingest: `POST /api/ingest/notification` (requires `ingest.androidNotifications` opt-in)
- Parsers: CBE, BOA, telebirr under `backend/src/parsers/`
- Native listener bridge is stubbed for Expo Go; a custom native module / config plugin is required for production notification capture on device.
