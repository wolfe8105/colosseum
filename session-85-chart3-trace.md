# Session 85 — Chart 3: Category Overlay (Hot Takes + Predictions)

## Stats
- **21/21 edges traced** across 3 files (index.html, async.js, tokens.js) + auth.js
- **14 fully wired**, **2 unwired**, **4 partially unwired**, **1 already annotated (Session 84)**
- **1 bug found** (share button single-quote injection)

---

## Files Traced
| File | Lines | Role in Chart 3 |
|------|-------|------------------|
| index.html | 722 | Overlay open/close, tab switching, spoke tile click |
| colosseum-async.js | 639 | Hot takes CRUD, reactions, challenges, predictions, author profile |
| colosseum-tokens.js | 417 | Token earn for reactions, posts, predictions |
| colosseum-auth.js | 880 | showUserProfile() modal |

---

## Edge-by-Edge Trace

### ✅ WIRED (14)

| Edge | Source → Target | Code Path |
|------|-----------------|-----------|
| E77 | OVERLAY → HOT TAKES TAB | index.html L408-454 openCategory(), defaults takes tab L417-418 |
| E78 | HOT TAKES → React 🔥💀😂 | async.js L188 onclick, L374-411 react(), react_hot_take RPC L388 |
| E80 | HOT TAKES → Challenge | async.js L195 onclick, L414-421 challenge(), L423-463 modal |
| E81 | HOT TAKES → Post a Take | index.html L430 getComposerHTML(), async.js L536-593 postTake(), create_hot_take RPC L570 |
| E82 | HOT TAKES → Author Avatar | async.js L164 onclick showUserProfile(), auth.js L512-622 modal |
| E85 | React → Token earn | async.js L403 claimReaction(), tokens.js L280-292, only on add |
| E86 | Post → Token earn | async.js L584 claimHotTake(), tokens.js L266-278 |
| E87 | OVERLAY → PREDICTIONS TAB | index.html L457-465 tab switch, L446-453 fetchPredictions() |
| E89 | Detail → Vote Yes/No | async.js L242-258 buttons, L272-324 placePrediction(), place_prediction RPC L300 |
| E91 | Vote → Token earn | async.js L311 claimPrediction(), tokens.js L341-353 |
| E92 | OVERLAY → Close/X/Swipe | index.html L467 close click, L468-470 swipe down (100px threshold) |
| E93 | Close → Home Screen | implicit — overlay.classList.remove('open'), home underneath |
| E155 | Chart 1 → Overlay (cross) | index.html L350 tile click → openCategory() |
| E164 | Close → Home (cross) | Already annotated Session 84 |

### ❌ UNWIRED (2)

| Edge | Source → Target | What's Missing |
|------|-----------------|----------------|
| E79 | HOT TAKES → Tap text (expand) | No truncation, no click handler. L185 renders full text as static div. 280 char max from input makes expand unnecessary, but the interaction doesn't exist. |
| E90 | PREDICTIONS → Create Prediction | No create prediction UI, no create_prediction RPC, no function anywhere in codebase. Predictions only come from debates. |

### ⚠️ PARTIALLY UNWIRED (4)

| Edge | Source → Target | What Works / What's Missing |
|------|-----------------|------------------------------|
| E83 | Challenge → Arena Pre-Debate | `_submitChallenge()` calls create_challenge RPC (L485) and creates DB record, but **does NOT navigate to arena**. Challenge is recorded but user stays in overlay. |
| E84 | Author Avatar → Public Profile | `showUserProfile()` shows in-app modal with follow/rival buttons, but **no link to /u/username public profile page**. Modal only. |
| E88 | PREDICTIONS → Tap detail | `renderPredictions()` renders inline cards with vote buttons, but **no separate detail view**. Voting happens on the card in the list. |
| E163 | Profile (cross-chart) | Same as E84 — modal, not /u/username page |

---

## Bug Found

### 🐛 BUG: Share button breaks on apostrophes (async.js L202)

**Location:** `colosseum-async.js` line 202
**Severity:** Medium — silent failure, affects most hot takes

**The code:**
```javascript
<button onclick="ColosseumShare?.shareTake?.('${t.id}','${encodeURIComponent(t.text)}')" ...>
```

**The problem:** `encodeURIComponent()` does NOT encode single quotes (`'`). If a hot take contains an apostrophe (it's, don't, can't — extremely common), the rendered onclick becomes:

```html
onclick="ColosseumShare?.shareTake?.('t1','it's%20a%20test')"
```

The `'` in "it's" terminates the JS string literal early → syntax error → share button silently fails.

**Fix:** Replace `encodeURIComponent(t.text)` with `encodeURIComponent(t.text).replace(/'/g, '%27')` or switch to data attributes + addEventListener.

**Note:** This is the same class of bug as the Session 84 arena share mismatch — share-related code paths have weak escaping.

---

## Big Picture: Chart 3 Health

**The good news:** The core hot takes loop works well. Post → React → Token earn is fully wired end-to-end. Predictions voting + token earn also works. The overlay open/close/tab-switch is clean.

**The gaps:**
1. **Create Prediction doesn't exist** — predictions only come from debates, there's no user-created predictions feature
2. **Challenge creates a DB record but goes nowhere** — user taps BET, sees a toast, but there's no arena entry flow from the overlay
3. **Author profile is a modal, not a page** — works fine as UX but the chart implies navigation to the public profile page
4. **Text expand isn't a thing** — takes are short enough (280 chars) that truncation isn't needed, but the chart shows it as an interaction

**Token gates in effect:**
- Post hot take: 25 tokens
- Challenge: 50 tokens
- Place prediction: 100 tokens
- React: free (but earn tokens)

---

## Next Session: Chart 4 (Groups)
- Upload the annotated .drawio
- Same trace approach: every arrow, every file, every line number
- Charts remaining after Chart 4: Charts 5-6
