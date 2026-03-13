# LAND MINE MAP — SESSION 91 ADDITIONS
# Append these entries to THE-COLOSSEUM-LAND-MINE-MAP.md
# Also update LM-149 NOTE section.

---

## UPDATE TO LM-149: leg2Bluesky flag missing from bot-config.js flags block

Add to end of existing LM-149 entry, before the closing ```:

```
NOTE (Session 91): Hit this AGAIN. Session 90 fixed the flag in the .env but
  the bot-config.js on GitHub (which was the basis for VPS copy) never had
  the bluesky flags OR the bluesky config block. Root cause: setup-bluesky.js
  patched bot-config.js on VPS to add both, but the GitHub version was never
  updated. When a fresh bot-config.js was uploaded from GitHub, it overwrote
  the patched version. Three-way fix required:
  1. Added bluesky: { handle, appPassword, maxPostsPerDay: 12, ... } config block via sed
  2. Added leg1Bluesky, leg2Bluesky, leg3BlueskyPost to flags block via sed
  3. Removed leg2Lemmy, leg3LemmyPost from flags block via sed
  Crash error was: "Cannot read properties of undefined (reading 'maxPostsPerDay')"
  because leg2-bluesky-poster.js v2 referenced config.bluesky.maxPostsPerDay
  but config.bluesky didn't exist.
SESSION: 58, recurred 77, recurred 90/91.
```

---

## LM-166: bot-config.js GitHub version diverges from VPS — VPS is authoritative
```
DECISION (Session 42): setup-bluesky.js patches bot-config.js on VPS to add
  a bluesky: { handle, appPassword, maxPostsPerDay, ... } config block.
  This patch was never committed back to GitHub.
BITES YOU WHEN: You upload bot-config.js from GitHub to VPS (via SCP or
  any other method). The GitHub version is missing the bluesky config block.
  The Bluesky poster crashes with "Cannot read properties of undefined
  (reading 'maxPostsPerDay')". Debates still get created in Supabase but
  never post to Bluesky — silent failure except for one error log line.
SYMPTOM: `pm2 logs` shows "Leg 2 pipeline failed for headline: Cannot read
  properties of undefined (reading 'maxPostsPerDay')" after every headline.
  Features line may or may not show L2-Bluesky depending on whether flags
  block was also lost.
FIX: Either:
  (a) Use sed to patch bot-config.js directly on VPS (preferred), or
  (b) Sync the VPS version back to GitHub so both match.
  Never upload GitHub → VPS for bot-config.js without verifying the bluesky
  block exists.
RULE: VPS bot-config.js is the authoritative version. GitHub is stale.
  When making bot-config changes, patch on VPS first, verify, then optionally
  push to GitHub.
SESSION: 42 (created divergence), 91 (burned by it).
```

---

## LM-167: SCP from multiple machines delivers stale files
```
DECISION: Pat switches between multiple computers at random times.
  Downloads from Claude land on whichever machine is active.
BITES YOU WHEN: Pat downloads a file on Machine A, switches to Machine B,
  runs SCP from Machine B's Downloads folder. Machine B has an older version
  of the file (or no file at all, and Windows serves a cached/renamed copy).
  SCP reports 100% success with correct byte count, but the content is wrong.
SYMPTOM: `grep "Session 91" /path/to/file.js` returns nothing after SCP
  reported success. File header shows an older session number.
  Extension of LM-152 (Windows browser cache) but with multi-machine twist.
FIX: After ANY SCP transfer, verify content on VPS:
  grep "UNIQUE_STRING" /path/to/file.js
  If wrong file, prefer sed patches directly on VPS instead of re-downloading.
RULE: For bot army files, default to sed patches on VPS. Reserve SCP for
  large new files that don't exist on VPS yet.
SESSION: 91 (SCP reported success, file was Session 75 not Session 91).
```

---

## LM-168: APP_BASE_URL default in bot-config.js pointed to Vercel not mirror
```
DECISION: bot-config.js app.baseUrl defaults to colosseum-six.vercel.app
  if APP_BASE_URL env var is not set or still has the old value.
  NT says all bot links should go to colosseum-f30.pages.dev (mirror).
BITES YOU WHEN: .env has APP_BASE_URL=https://colosseum-six.vercel.app
  (the original value). Every bot post links to Vercel instead of the
  static mirror. Mirror gets zero bot traffic.
SYMPTOM: Bluesky posts contain colosseum-six.vercel.app links instead of
  colosseum-f30.pages.dev links.
FIX: Set APP_BASE_URL=https://colosseum-f30.pages.dev in .env.
  Also update the hardcoded default in bot-config.js to match.
  Run pm2 restart all after .env change.
SESSION: 91 (found and fixed).
```
