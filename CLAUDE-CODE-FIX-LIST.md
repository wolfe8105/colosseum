# COLOSSEUM — Prioritized Fix List for Claude Code
## Feed this entire file as your prompt. Fix each item in order. After each fix, confirm what you changed.

You are working in the `colosseum` repo. Fix these issues in the exact order listed. For each fix, show me what you changed. Do NOT skip items. Do NOT refactor beyond what's specified — surgical fixes only.

---

## PHASE 1: SECURITY (Fix these first — they protect users)

### Fix 1: escapeHTML() single-quote gap
**File:** `colosseum-config.js`
**Lines:** ~130-135
**What:** Replace the DOM-based escapeHTML with string-based OWASP 5-char mapping. The current version uses `document.createElement('div')` + `textContent`/`innerHTML` round-trip which does NOT escape single quotes. This is the foundation — every other file calls this function.

**Replace the entire escapeHTML function with:**
```javascript
function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

### Fix 2: Open redirect in login.html
**File:** `colosseum-login.html`
**Find:** the `getReturnTo()` function (around line 507-513)
**What:** Add backslash check. Plinko already has this fix, login doesn't. An attacker can use `returnTo=/\evil.com` — browser normalizes `\` to `/` making it `//evil.com` which redirects off-site.

**In the getReturnTo() validation, add a check for backslash.** The condition should reject if the destination contains `\\` or `\`. Match whatever plinko.html does in its `getReturnTo()` function — find plinko's version first, then port the exact same validation to login.html.

### Fix 3: Remove all inline onclick interpolation in async.js
**File:** `colosseum-async.js`
**What:** There are 9+ places where onclick handlers interpolate variables like `onclick="ColosseumAsync.react('${t.id}')"`. A crafted ID containing `')` breaks the string and injects JS. Replace ALL inline onclick interpolation with `data-*` attributes + delegated event listeners.

**Strategy:**
1. In `_renderTake()`: replace all `onclick="ColosseumAsync.react('${t.id}')"` with `data-action="react" data-id="${t.id}"` (and same for challenge, share, author click)
2. In `_renderPredictionCard()`: replace onclick vote buttons with `data-action="predict" data-id="${p.debate_id}" data-pick="a"` pattern
3. Add a single delegated event listener on the parent container that reads `data-action` and dispatches to the right function
4. Do the same for `showUserProfile` calls — use `data-action="profile" data-user-id="${t.user_id}"` instead of inline onclick

Search for every `onclick=` in the file and replace each one. Zero inline onclick handlers should remain.

### Fix 4: Fix escHtml in auto-debate.html
**File:** `colosseum-auto-debate.html`
**Find:** the local `escHtml()` function (around line 679)
**What:** It's missing single-quote encoding. Replace with the same 5-char OWASP mapping:
```javascript
function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```
Do the same for any local `escHtml` in `colosseum-profile-depth.html` and any other file that has its own copy.

### Fix 5: Fix sanitize() in arena.js
**File:** `colosseum-arena.js`
**Find:** the `sanitize()` function (around line 112-116)
**What:** Same DOM round-trip problem. Replace with a call to `ColosseumConfig.escapeHTML()` — don't maintain a separate implementation:
```javascript
const sanitize = (s) => ColosseumConfig.escapeHTML(s);
```

### Fix 6: XSS in voicememo.js
**File:** `colosseum-voicememo.js`
**Lines:** ~469 and ~712-723
**What:** Unescaped usernames and voice URLs injected into innerHTML.
- At L469: `@${context.replyTo}` and `${context.replyText}` need escaping
- At L712-723: voice URL from database goes into onclick and `<audio src=` — escape or use setAttribute

Find every innerHTML assignment in this file that interpolates user-controlled data and wrap with `ColosseumConfig.escapeHTML()`. For URLs going into `src=` attributes, use `encodeURI()`.

### Fix 7: UUID validation before RPC calls
**File:** `colosseum-auth.js`
**What:** Add a shared UUID validator near the top of the module, then add early-return validation in `followUser()`, `unfollowUser()`, `declareRival()`, `getPublicProfile()`, and `showUserProfile()`.

```javascript
const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
```

At the top of each function that takes a user ID param, add:
```javascript
if (!isUUID(targetUserId)) return { success: false, error: 'Invalid user ID' };
```

### Fix 8: Validate debateId from URL params
**File:** `colosseum-auto-debate.html` (~L385)
**What:** `debateId` comes from URL `?id=` param and is used in a Supabase query without validation.
Add UUID validation before the query:
```javascript
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(debateId)) {
  // show error, return
}
```
Do the same in `colosseum-groups.html` where `urlGroup` from URL param is used (~L910).

### Fix 9: Validate screenId in navigateTo
**File:** `index.html` (~L558)
**What:** `navigateTo()` uses screenId from localStorage/URL in a querySelector without validation.
Add whitelist check:
```javascript
const VALID_SCREENS = ['home', 'arena', 'profile', 'shop', 'leaderboard'];
if (!VALID_SCREENS.includes(screenId)) screenId = 'home';
```

---

## PHASE 2: BUGS (These cause wrong behavior)

### Fix 10: readyPromise can hang forever
**File:** `colosseum-auth.js` (~L98)
**What:** `_loadProfile().then(() => _resolveReady())` has no `.catch()`. If profile load fails after safety timeout was cleared, readyPromise never resolves and the app hangs.
**Fix:** Add `.catch()`:
```javascript
_loadProfile(session.user.id)
  .then(() => _resolveReady())
  .catch(e => { console.error('Profile load failed:', e); _resolveReady(); });
```

### Fix 11: Random winner in ranked matches
**File:** `colosseum-arena.js` (~L1641-1643)
**What:** `scoreA = 60 + Math.floor(Math.random() * 30)` decides who wins ranked matches and feeds Elo calculations. For AI sparring mode, random is fine. For real matches, this is a game-breaking bug.
**Fix:** Add mode check — only use random for AI/placeholder. For real debates, scores should come from the moderator ruling or vote tally. For now, if no scoring mechanism exists yet, at least make it a draw (equal scores) for non-AI matches so Elo doesn't change randomly:
```javascript
let scoreA, scoreB;
if (debate.mode === 'ai' || !debate.opponentId) {
  // AI sparring — random scoring is fine
  scoreA = 60 + Math.floor(Math.random() * 30);
  scoreB = 60 + Math.floor(Math.random() * 30);
} else {
  // Real match — equal scores until proper scoring exists
  scoreA = 70;
  scoreB = 70;
}
```

### Fix 12: Prediction percentage math
**File:** `colosseum-async.js` (~L287-290)
**What:** Uses already-incremented `pred.total` to reverse-calculate old count, producing wrong percentages.
**Fix:** Calculate count BEFORE incrementing total. Find the math block and ensure `total` is incremented after percentage calculation, not before.

### Fix 13: Auto-allow countdown doesn't call RPC
**File:** `colosseum-arena.js` (~L1887-1891)
**What:** When moderator ruling countdown hits 0, the overlay is removed but `ruleOnReference()` is never called. Evidence vanishes without being allowed in the database.
**Fix:** Add the RPC call when countdown expires:
```javascript
ColosseumAuth.ruleOnReference(ref.id, 'allowed', 'Auto-allowed (moderator timeout)', 'system');
```

### Fix 14: Terms/Privacy placeholder text in production
**File:** `colosseum-terms.html`
**What:** `PASTE_SUPPORT_EMAIL_HERE`, `PASTE_PRIVACY_EMAIL_HERE`, `PASTE_JURISDICTION_HERE` are visible to users. The arbitration clause is legally unenforceable without jurisdiction.
**Fix:** Replace all with `support@thecolosseum.app` (or `support@colosseum-six.vercel.app` as temporary) and `State of Ohio` for jurisdiction. Search the entire file for `PASTE_` and replace every instance.

### Fix 15: Delete account clears localStorage even on server failure
**File:** `colosseum-settings.html` (~L667-672)
**What:** `localStorage.clear()` runs before checking if server deletion succeeded.
**Fix:** Check result first:
```javascript
const result = await ColosseumAuth.deleteAccount();
if (result?.error) {
  ColosseumConfig.showToast('Delete failed — try again', 'error');
  return;
}
localStorage.clear();
```

### Fix 16: Toast animation keyframe missing on most pages
**File:** `colosseum-config.js` in the `showToast()` function
**What:** `coloToastIn` keyframe is only defined in index.html's CSS. Toast appears without animation on all other pages.
**Fix:** Inject the keyframe dynamically on first call:
```javascript
let _keyframeInjected = false;
// Inside showToast(), before appending:
if (!_keyframeInjected) {
  const style = document.createElement('style');
  style.textContent = '@keyframes coloToastIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
  document.head.appendChild(style);
  _keyframeInjected = true;
}
```

### Fix 17: Status code string comparison
**File:** `colosseum-config.js` (~L202)
**What:** `code === '429'` fails if `err.code` is a number.
**Fix:** Change to `String(code) === '429'`

### Fix 18: Division by zero in debate-landing
**File:** `colosseum-debate-landing.html` (~L374)
**What:** Division by zero when no votes exist produces NaN.
**Fix:** Guard: `totalVotes ? Math.round(...) : 50`

---

## PHASE 3: PERFORMANCE (These waste bandwidth and memory)

### Fix 19: Remove Stripe.js from index.html
**File:** `index.html` (~L12)
**What:** `<script src="https://js.stripe.com/v3/"></script>` loads 40KB on every page. Stripe is only used in the payments/paywall flow.
**Fix:** Remove the script tag from index.html. If/when Stripe is needed, load it dynamically in colosseum-payments.js.

### Fix 20: Remove colosseum-home.js script tag
**File:** `index.html` (~L25)
**What:** `<script src="colosseum-home.js"></script>` loads 961 lines that are never called.
**Fix:** Remove the script tag. The file can stay in the repo for now but shouldn't be loaded.

### Fix 21: Move Google Fonts link before scripts
**File:** `index.html` (~L27)
**What:** The `<link>` for Google Fonts is placed after 16 `<script>` tags, causing Flash of Unstyled Text.
**Fix:** Move the `<link href="https://fonts.googleapis.com/css2?family=...` tag to right after the `<meta>` tags, before any `<script>` tags. Also remove `Bebas+Neue` from the font URL — it's loaded but never used in the CSS.

### Fix 22: Notification polling uses setTimeout instead of readyPromise
**File:** `colosseum-notifications.js` (~L284-285)
**What:** `setTimeout(init, 100)` instead of waiting for auth to be ready.
**Fix:** Replace with `ColosseumAuth.ready.then(() => init());`

---

## PHASE 4: DEAD CODE CLEANUP

### Fix 23: Delete Lemmy files
**Files to delete:**
- `leg2-lemmy-poster.js`
- `leg3-lemmy-poster.js`

Lemmy is dead. These files are 400+ lines of unused code.

### Fix 24: Remove Lemmy config from bot-config.js
**File:** `bot-config.js`
**What:** Remove the entire `lemmy: { ... }` config block (~L68-79). Remove `leg2Lemmy` and `leg3LemmyPost` from the flags block (~L128-129). Remove the Lemmy credential validation block (~L195-199).

### Fix 25: Remove dead feature flags
**File:** `colosseum-config.js`
**What:** Remove these flags from the FEATURES object — they're all `false` with zero references:
- `pushNotifications`
- `dms`
- `teams`
- `tournaments`

### Fix 26: Remove token purchase packages from config
**File:** `colosseum-config.js`
**What:** Tokens are earned only, never purchased (locked product decision). Remove the `packages` array from `TOKENS` object and remove the token price IDs (`tokens_50`, `tokens_250`, `tokens_600`, `tokens_1800`) from `STRIPE_PRICES`.

---

## PHASE 5: QUALITY (Nice to have, do if time permits)

### Fix 27: Consolidate local escHtml copies
After Fix 1 and Fix 4, search the entire codebase for any remaining local `escHtml` or `escapeHTML` function definitions. Every file should use `ColosseumConfig.escapeHTML()` — no local copies. Files to check:
- `colosseum-async.js` (has 4 inline fallback copies)
- `colosseum-profile-depth.html`
- `colosseum-auto-debate.html`
- `colosseum-arena.js`
- `colosseum-voicememo.js`
- `colosseum-debate-landing.html`

For each: remove the local definition and replace calls with `ColosseumConfig.escapeHTML()`.

### Fix 28: Remove console.log from production
Search all `.js` files for `console.log(` statements. Remove them or replace with conditional debug logging. Leave `console.warn()` and `console.error()` — those are useful. Target files:
- `colosseum-scoring.js` (9 instances)
- `colosseum-auth.js` (4 instances — especially L189 which logs email PII)
- `colosseum-webrtc.js` (3)
- `colosseum-home.js` (3)

### Fix 29: Add Number() casts on numeric innerHTML
Search all `.js` files for patterns where numeric database values go into innerHTML template literals without `Number()` wrapping. Key locations:
- `colosseum-auth.js` L554-566: elo_rating, wins, losses, followers, following
- `colosseum-arena.js` L583, L598, L845, L1091: scores, votes, token balance, mod stats
- `colosseum-tokens.js` L132-134: token balance, streak freezes

Wrap each with `Number(value)` or `parseInt(value, 10)`.

---

## STOP HERE
Do NOT go beyond Phase 5 unless I ask. After completing all fixes, give me a summary of what was changed, organized by phase.
