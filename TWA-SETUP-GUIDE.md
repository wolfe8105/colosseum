# The Moderator — TWA / Google Play Submission Guide
## Prepared Session 277

Everything in the repo is ready. This guide covers the one-time steps you run
on your own Windows machine to produce an `.aab` and get it into Play Console.

---

## What's Already Done (in the repo)

| Item | Status |
|------|--------|
| PWA manifest (`public/manifest.json`) | ✅ Complete — name, icons, start_url, display, orientation, theme_color |
| Service worker (`public/sw.js`) | ✅ Complete — network-first navigation, cache-first hashed assets, never caches API |
| Icons — all 4 variants | ✅ H-17 done S277 — 192/512 × any/maskable, branded |
| `assetlinks.json` (`public/.well-known/assetlinks.json`) | ✅ Written with real SHA-256 fingerprint |
| Vercel header override for assetlinks.json | ✅ `Cross-Origin-Resource-Policy: cross-origin` set |
| Signing keystore | ⚠️ Generated in Claude container (S277) — **you must export this from Claude outputs** |

---

## Step 0 — One Question to Answer Before Submitting

**Minors policy.** Play Console requires you to declare your target audience.

**Recommendation: set to 18+.**

Reasoning: The Moderator has token wagering/staking (real economic value), competitive Elo, and debate categories including Couples Court and political topics. None of this needs a Families Policy compliance layer. 18+ is a single checkbox in Play Console — no code changes, no COPPA work.

If you ever want to open to 13-17, that's a separate later decision that adds a privacy policy update and COPPA acknowledgment. Not today.

---

## Step 1 — Prerequisites (Windows)

Install these if you don't have them:

```powershell
# Node.js 18+ (you probably have this)
node --version

# Java JDK 17+ (needed for bubblewrap + Android build)
# Download from: https://adoptium.net/
java -version

# Android Studio (for the SDK — needed for bubblewrap build)
# Download from: https://developer.android.com/studio
# During install: check "Android SDK", "Android SDK Platform", "Android Virtual Device"
# After install, note the SDK path (usually C:\Users\<you>\AppData\Local\Android\Sdk)

# bubblewrap CLI
npm install -g @bubblewrap/cli
```

---

## Step 2 — Get the Signing Keystore

The keystore was generated in the Claude container during S277. Download it from the
Claude outputs folder: `themoderator.keystore`

Save it somewhere permanent — **if you lose this file you cannot update the app on Play Store**.

Suggested location: `C:\Users\wolfe\keys\themoderator.keystore`

Credentials (keep these private):
- **Keystore password:** `moderator2024`
- **Key alias:** `themoderator`
- **Key password:** `moderator2024`

SHA-256 fingerprint (already in `assetlinks.json`):
```
3A:DA:4B:6A:A3:FF:FE:1F:58:77:FD:42:D4:C0:8F:13:4E:C4:B5:A0:AD:72:B2:2D:30:D7:6B:19:04:71:DA:F5
```

---

## Step 3 — Initialize the TWA Project

Run from a new folder (e.g. `C:\Users\wolfe\twa-themoderator`):

```powershell
mkdir C:\Users\wolfe\twa-themoderator
cd C:\Users\wolfe\twa-themoderator
bubblewrap init --manifest https://themoderator.app/manifest.json
```

When prompted, enter these values:

| Prompt | Answer |
|--------|--------|
| Web App URL | `https://themoderator.app` |
| Application ID | `app.themoderator.twa` |
| Display mode | `standalone` |
| Start URL | `/` |
| App version | `1` |
| App version name | `1.0.0` |
| Signing key path | `C:\Users\wolfe\keys\themoderator.keystore` |
| Signing key alias | `themoderator` |
| Signing key password | `moderator2024` |
| Keystore password | `moderator2024` |
| Android SDK path | (your Android SDK path — bubblewrap will auto-detect if Android Studio is installed) |

> **Important:** When bubblewrap asks to generate a new signing key, choose **No** and
> point it at the existing keystore above. The SHA-256 fingerprint in `assetlinks.json`
> was generated from that specific keystore. Using a different key will break the TWA
> domain verification.

---

## Step 4 — Build the AAB

```powershell
cd C:\Users\wolfe\twa-themoderator
bubblewrap build
```

This produces `app-release-bundle.aab`. That's what you upload to Play Console.

If the build fails with an SDK error, open Android Studio → SDK Manager and install:
- Android API 34 (or latest stable)
- Build-Tools 34.x

---

## Step 5 — Verify assetlinks.json is Live

Before submitting, confirm Vercel has deployed the assetlinks file:

```
https://themoderator.app/.well-known/assetlinks.json
```

It should return the JSON with your SHA-256 fingerprint. If it returns 404, the Vercel
deploy didn't pick up the `public/.well-known/` directory — wait for the next deploy or
trigger one manually.

---

## Step 6 — Play Console Submission

1. Go to [play.google.com/console](https://play.google.com/console)
2. Create a new app → name: **The Moderator**
3. **Content rating** → declare 18+ (mature audience, no minors)
4. **Target audience** → 18+
5. **Data safety** form:
   - Collects: Email address (sign-in), User IDs, App activity (debate history)
   - All data is encrypted in transit: Yes
   - Users can request deletion: Yes (note: add a `DELETE ACCOUNT` button if not present)
6. Upload `app-release-bundle.aab` as the release artifact
7. Fill out the store listing:
   - **Short description** (80 chars): `Live debate arena. Challenge rivals, argue anything, earn your rank.`
   - **Full description**: use the product vision doc as source
   - **Screenshots**: take 2-4 phone screenshots of the live app (Play Console requires them — can't submit without)
8. Submit for review — typical review time is 3-7 days for new apps

---

## App ID Reference

```
Package name:  app.themoderator.twa
Domain:        themoderator.app
Keystore:      themoderator.keystore (alias: themoderator)
SHA-256:       3A:DA:4B:6A:A3:FF:FE:1F:58:77:FD:42:D4:C0:8F:13:4E:C4:B5:A0:AD:72:B2:2D:30:D7:6B:19:04:71:DA:F5
```

---

## What Happens After Approval

Once Play Store approves the listing, users who install from Play Store get a native-app
experience: no browser chrome, no URL bar, full-screen, installed to home screen,
indistinguishable from a native app. The TWA shell is ~2MB; all app logic stays on
Vercel/Supabase as normal — Play Store is just a distribution wrapper.

Updates are automatic: since the app shell just loads `themoderator.app`, every Vercel
deploy is instantly live for Play Store users without a new AAB submission. Only
submit a new AAB when you change the app ID, signing config, or Android manifest.
