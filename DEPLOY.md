# Deployment Guide

Deploy the **backend to Vercel** and the **mobile app with EAS Build**.

---

## 1. Backend → Vercel

### Prerequisites
- [Vercel account](https://vercel.com)
- [MongoDB Atlas](https://cloud.mongodb.com) cluster (you already have one)
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`

### MongoDB Atlas (important for Vercel)
Vercel uses changing IP addresses. In Atlas → **Network Access**:
- Add **`0.0.0.0/0`** (allow from anywhere) for serverless, **or**
- Use Atlas **VPC / Private Link** for production hardening later

### Deploy steps

```powershell
cd backend
vercel login
vercel
```

Follow prompts:
- **Set up and deploy?** Yes
- **Which scope?** Your account
- **Link to existing project?** No (first time)
- **Project name?** `expense-tracker-api` (or your choice)
- **Directory?** `./`

### Set environment variables

In [Vercel Dashboard](https://vercel.com/dashboard) → your project → **Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | Long random string (not the dev one) |
| `JWT_EXPIRES_IN` | `7d` |
| `CRON_SECRET` | Long random string; Vercel Cron sends it as `Authorization: Bearer …` to `/api/cron/gmail-sync` (Hobby: once daily) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Optional — Gmail Binance/Grey ingest |

Then redeploy:

```powershell
vercel --prod
```

### Verify

```powershell
curl https://YOUR-PROJECT.vercel.app/api/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### Seed categories (optional, run locally once)

```powershell
cd backend
# Use same MONGODB_URI as production in .env
npm run seed
```

---

## 2. Mobile app → EAS Build

### Prerequisites
- [Expo account](https://expo.dev)
- EAS CLI: `npm i -g eas-cli`
- For Play Store: Google Play Developer account ($25 one-time)
- For App Store: Apple Developer account ($99/year)

### One-time setup

```powershell
cd mobile
eas login
eas init
```

`eas init` links the project and adds a `projectId` to `app.json`.

### Update production API URL

Edit `mobile/eas.json` — replace `YOUR-PROJECT` with your Vercel URL:

```json
"EXPO_PUBLIC_API_URL": "https://expense-tracker-api.vercel.app/api"
```

### Build APK (easy testing — sideload on Android)

```powershell
cd mobile
eas build --platform android --profile preview
```

When done, download the **APK** from the link EAS provides and install on your phone.

**Bank SMS ingest** (CBE / telebirr / BOA) requires this EAS APK — Expo Go cannot use `READ_SMS`. After install: Settings → Bank SMS → grant permission → matching SMS appear in Detected. See [`mobile/SMS_DISCLOSURE.md`](mobile/SMS_DISCLOSURE.md).

### Build for Google Play Store

```powershell
eas build --platform android --profile production
```

Produces an **AAB** file. Submit with:

```powershell
eas submit --platform android
```

### Build for iOS / App Store

Requires a Mac-linked Apple Developer account:

```powershell
eas build --platform ios --profile production
eas submit --platform ios
```

---

## 3. Profile summary

| Profile | Use case | Output |
|---------|----------|--------|
| `development` | Dev client with local backend | Internal install |
| `preview` | Test production backend | **APK** (Android) |
| `production` | App Store / Play Store | AAB (Android) / IPA (iOS) |

---

## 4. Architecture after deploy

```
Mobile app (APK/IPA)
    ↓ HTTPS
Vercel API (https://your-project.vercel.app/api)
    ↓
MongoDB Atlas
```

---

## 5. Checklist before going live

- [ ] Change `JWT_SECRET` to a strong production value
- [ ] MongoDB Atlas network access configured
- [ ] `EXPO_PUBLIC_API_URL` in `eas.json` points to Vercel URL
- [ ] Health check returns OK
- [ ] Register / login / add transaction tested on production build
- [ ] Update `android.package` / `ios.bundleIdentifier` in `app.json` if needed (must be unique)

---

## Troubleshooting

**API returns 503 Database unavailable**
→ Check `MONGODB_URI` in Vercel env vars and Atlas IP whitelist.

**Mobile app can't connect**
→ Ensure `EXPO_PUBLIC_API_URL` uses `https://` and ends with `/api`.

**Vercel cold starts**
→ First request after idle may take 2–5 seconds; normal for serverless free tier.

**Biometric login on production build**
→ Works on real devices; requires the standalone app (not Expo Go SDK mismatch).
