# Android Bank SMS — Disclosure & EAS rebuild

**Distribution:** EAS preview/production APK (sideload). `READ_SMS` is a [Play restricted permission](https://support.google.com/googleplay/android-developer/answer/10208820); do not submit to Play without a separate compliance pass.

## In-app disclosure (SmsAccess screen)

**Title:** Read bank SMS (Android)

**Summary:** Asset Tracker can read matching SMS from CBE, Bank of Abyssinia, and telebirr to suggest transactions for your review. We never post to your balance without your approval.

**Bullets:**
- We only upload SMS that look like bank or wallet confirmations (sender/keywords filter) — not your full inbox.
- This uses the Android READ_SMS permission. It works in an EAS-built APK, not in Expo Go.
- Parsed amounts go to a “Detected — needs review” queue. You confirm the account before anything affects balances.
- You can turn this off anytime in Settings, and revoke SMS permission in Android Settings → Apps → Asset Tracker → Permissions.
- Only short parsed fields are stored (amount, date, reference). Full message bodies are not kept after processing.

## Rebuild required

Expo Go cannot grant or use `READ_SMS`. After pulling these changes:

```powershell
cd mobile
npm install
eas build --platform android --profile preview
```

Install the APK from the EAS link, then:

1. Open **Settings → Bank SMS** and accept the disclosure
2. Grant SMS permission when prompted
3. Receive (or have on device) a CBE / telebirr / BOA confirmation SMS
4. Confirm an item appears in **Detected**
5. Approve into the correct account
6. Confirm Gmail sync still works independently

## Code map

- Native module: `mobile/modules/android-sms-reader/`
- Bridge: `mobile/src/services/androidSmsReader.ts`
- UI: `mobile/src/screens/SmsAccessScreen.tsx`
- Backend: `POST /api/ingest/sms` and `POST /api/ingest/sms/batch` (opt-in `ingest.androidSms`)
- Parsers: `backend/src/parsers/cbeSms.js`, `telebirrSms.js`, `boaSms.js`

The older notification-listener module remains in the repo but is unused by Settings.
