# Session 88 — Chart 6 Trace: Auto-Debate (Guest) + Debate Landing + Leaderboard

## Summary
- **27 internal edges + 6 cross-refs = 33 total**
- **15 wired, 8 unwired, 4 partially unwired, 6 cross-refs updated**
- **0 bugs found** (all escaping correct, RPCs used properly)
- **Files involved:** colosseum-auto-debate.html, colosseum-debate-landing.html, colosseum-leaderboard.js, colosseum-tokens.js, colosseum-cards.js, index.html, api/profile.js, mirror-generator.js (VPS)

---

## AUTO-DEBATE PAGE (colosseum-auto-debate.html, 710 lines)

### E-262: Auto-Debate → Vote Agree (UNGATED) ✅ WIRED
- auto-debate.html L530: `onclick="castVote('a')"` on vote button
- auto-debate.html L576-612: `castVote()` calls `sb.rpc('cast_auto_debate_vote')` L588
- Fingerprint-based anonymous voting via `getFingerprint()` L410-417

### E-263: Auto-Debate → Vote Disagree (UNGATED) ✅ WIRED
- auto-debate.html L533: `onclick="castVote('b')"` on vote button
- Same castVote() path as E-262

### E-265: Vote Agree → Results Bar ✅ WIRED
- auto-debate.html L588-593: RPC returns `{votes_a, votes_b, vote_count}`
- auto-debate.html L601-602: `showResults(data.votes_a, data.votes_b, ...)`
- auto-debate.html L614-636: `showResults()` renders percentage bar + vote count
- Offline fallback L606-610: optimistic UI if RPC fails

### E-266: Vote Disagree → Results Bar ✅ WIRED
- Same path as E-265 (both sides flow through same castVote → showResults)

### E-268: Results → Rage Label ✅ WIRED
- auto-debate.html L629: `const audienceWinner = votesA > votesB ? 'a' : 'b'`
- auto-debate.html L631-635: If audience disagrees with AI → "🔥 THE PEOPLE DISAGREE WITH THE AI"
- Otherwise → "The audience agrees with the AI... for now."

### E-270: Rage Label → CTA ✅ WIRED
- auto-debate.html L548-552: CTA banner always rendered (not conditional on rage)
- Headline: "THINK THE AI IS WRONG?" + "ENTER THE ARENA" button
- Layout places CTA directly below vote section

### E-272: CTA → Plinko Gate ✅ WIRED
- auto-debate.html L551: `<a href="/colosseum-plinko.html" class="cta-btn">ENTER THE ARENA</a>`

### E-274: Share Button ✅ WIRED
- auto-debate.html L555-559: Three share buttons (copy, twitter, native)
- auto-debate.html L639-674: `shareDebate()` handles all three methods
- Copy L647: `navigator.clipboard.writeText(url)` + button text swap
- Twitter L654: `window.open(twitter.com/intent/tweet)`
- Native L657-670: `ColosseumCards.shareCard()` for image share, falls back to `navigator.share`

### E-276: Category Tag ⚠️ UNWIRED
- auto-debate.html L458: `<span class="cat-pill">` — display only, no onclick
- Category pill renders icon + name but is not clickable

### E-277: Category Tag → Plinko ⚠️ UNWIRED
- Depends on E-276 — no handler exists on cat-pill element

### E-279: More Debates (scroll bottom) ⚠️ UNWIRED
- auto-debate.html has NO "more debates" section
- (debate-landing.html L479-496 has this feature, auto-debate does not)
- Page loads one debate by ?id param, shows verdict, ends

### E-280: More Debates → loads another ⚠️ UNWIRED
- Follows from E-279 — no more-debates navigation exists

### E-336: Token earn (if logged in) ✅ WIRED
- auto-debate.html L604: `if (typeof ColosseumTokens !== 'undefined') ColosseumTokens.claimVote(d.id)`
- colosseum-tokens.js L294-306: `claimVote()` → `_rpc('claim_action_tokens', {p_action:'vote', p_reference_id: debateId})`
- Updates balance display + token toast + checks first_vote milestone

---

## DEBATE LANDING PAGE (colosseum-debate-landing.html, 594 lines)

**Architecture note:** This page uses hardcoded DEBATES object (L298-340) with 4 demo debates. No Supabase connection. Voting is localStorage-only. This is a placeholder page for the bot funnel — real debate data not wired.

### E-287: Vote (auth required per diagram) 🔶 PARTIAL
- debate-landing.html L399-409: Vote buttons `castVote('yes'/'no')`
- debate-landing.html L502-509: `castVote()` stores in localStorage, calls render()
- L507 comment: `// PLACEHOLDER: When Supabase is connected, record vote server-side here`
- **No auth check exists.** Voting works for anyone but is not persisted to backend.

### E-288: Share ✅ WIRED
- debate-landing.html L437-443: 4 share buttons (copy, X, native, save card)
- debate-landing.html L528-547: `shareDebate()` — copy/X/native methods
- debate-landing.html L550-566: `downloadCard()` → `ColosseumCards.downloadCard()`

### E-289: Tap Debater Avatar ⚠️ UNWIRED
- No avatar elements exist on debate-landing page
- Takes show `@author` text (L453) but no clickable avatar or profile link

### E-290: More Debates ✅ WIRED
- debate-landing.html L479-496: Renders mini-debate cards for other topics
- L487: `onclick="window.location.href='/debate?topic=${safeSlug}'"` (slug encoded via encodeURIComponent L486)
- Limited to hardcoded DEBATES object (4 topics)

### E-292: Vote → Guest → Plinko (auth gate) 🔶 PARTIAL
- debate-landing.html L399-409: No auth check on vote buttons
- debate-landing.html L462-476: CTA banner with signup buttons exists separately
- Vote itself is not auth-gated — any visitor can vote (localStorage)
- CTA nudges signup but doesn't block voting

### E-293: Guest → Plinko ✅ WIRED
- debate-landing.html L578-580: `function goSignup() { window.location.href = 'colosseum-plinko.html'; }`
- Called by Google button L466, Apple button L470, email link L475

### E-295: Debater Avatar → Public Profile ⚠️ UNWIRED
- No avatars exist — follows from E-289

---

## LEADERBOARD (colosseum-leaderboard.js, 376 lines)

### E-300: Elo Tab ✅ WIRED
- leaderboard.js L236-249: Tab button `onclick="ColosseumLeaderboard.setTab('elo')"`
- leaderboard.js L336-342: `setTab()` resets liveData, calls render() + fetch + re-render
- leaderboard.js L56: Sorts by `elo_rating` column from profiles_public
- Elo tab includes `?` explainer button (L242-248) → `_showEloExplainer()` modal

### E-301: Wins Tab ✅ WIRED
- leaderboard.js L250-255: Tab button `onclick="ColosseumLeaderboard.setTab('wins')"`
- leaderboard.js L57: Sorts by `wins` column

### E-302: Streak Tab ✅ WIRED
- leaderboard.js L256-261: Tab button `onclick="ColosseumLeaderboard.setTab('streak')"`
- leaderboard.js L58: Sorts by `current_streak` column

### E-304: Time Filters 🔶 PARTIAL
- leaderboard.js L265-273: Filter buttons (ALL TIME / THIS WEEK / THIS MONTH)
- leaderboard.js L344-351: `setTime()` updates `currentTime` and re-renders
- L347-349 NOTE: "Week/month time filters require time-bucketed stats which don't exist yet in the schema. For now, all filters show the same data."
- **UI works, but all three filters return identical data.**

### E-306: Tap Player on Board ⚠️ UNWIRED
- leaderboard.js L309-333: Player rows rendered as `<div>` elements
- No onclick handler on any player row
- Data includes user id (L71) but no navigation code exists

### E-308: Player → Public Profile ⚠️ UNWIRED
- Follows from E-306 — player rows are not clickable

### E-310: My Rank ✅ WIRED
- leaderboard.js L196-201: `myElo`, `myWins`, `myName` from `ColosseumAuth?.currentProfile`
- leaderboard.js L82-86: `myRank` calculated from position in fetched data
- leaderboard.js L214-232: My Rank card rendered with avatar initial, name, Elo, rank number
- Display only — no scroll-to behavior

---

## CROSS-REFERENCE EDGES (updated)

### E-316: Chart 1 → Auto-Debate Page ✅ WIRED
- mirror-gen.js (VPS) generates links to `/verdict?id=`
- auto-debate.html L384-406: Reads `?id` param, fetches debate from Supabase
- auto-debate.html L420-441: `loadDebate()` → `renderDebate()`

### E-317: Chart 1 → Debate Landing ✅ WIRED
- api/profile.js generates debate history links
- debate-landing.html L344-346: Reads `?topic` param
- debate-landing.html L378-499: `render()` builds full page

### E-318: Chart 1 → Leaderboard ✅ WIRED
- index.html L311: Bottom nav `data-screen="leaderboard"` (🏆 Ranks)
- index.html L554-567: `navigateTo()` shows screen-leaderboard
- leaderboard.js L353-366: `init()` MutationObserver triggers render on screen activation

### E-325: CTA → Plinko Gate ✅ WIRED
- auto-debate.html L347: Top bar "JOIN FREE" → `/colosseum-plinko.html`
- auto-debate.html L551: CTA button → `/colosseum-plinko.html`

### E-326: Debater Avatar → Public Profile ⚠️ UNWIRED
- debate-landing.html has no avatar elements or profile links

### E-327: Leaderboard Player → Public Profile ⚠️ UNWIRED
- Leaderboard rows have no onclick handler

---

## SCORECARD

| Status | Count | Edges |
|--------|-------|-------|
| ✅ WIRED | 15 | E-262, E-263, E-265, E-266, E-268, E-270, E-272, E-274, E-288, E-290, E-293, E-300, E-301, E-302, E-310, E-336 |
| ⚠️ UNWIRED | 8 | E-276, E-277, E-279, E-280, E-289, E-295, E-306, E-308 |
| 🔶 PARTIAL | 4 | E-287, E-292, E-304, E-310* |
| Cross-refs ✅ | 4 | E-316, E-317, E-318, E-325 |
| Cross-refs ⚠️ | 2 | E-326, E-327 |

*E-310 is wired for display but has no scroll-to behavior

---

## KEY FINDINGS

### 1. Auto-Debate Page is the strongest page in Chart 6
The auto-debate verdict page (710 lines) is well-built. Ungated voting works end-to-end via `cast_auto_debate_vote` RPC with fingerprint-based anonymous voting. Results bar shows live percentages. Rage label fires when audience disagrees with AI. Token earn fires for logged-in users. Share works across 3 methods including ESPN-style image cards. All escaping uses local `escHtml()` with OWASP 4-char mapping.

**Three gaps:** category pill not clickable (E-276/277), no "more debates" section for discovery (E-279/280), no debater avatars to tap.

### 2. Debate Landing Page is a placeholder
The debate-landing page (594 lines) uses hardcoded demo data with 4 topics. No Supabase connection. Voting is localStorage-only with a PLACEHOLDER comment at L507. This was designed as a bot funnel entry point but never wired to the real backend.

**Three gaps:** voting not persisted (E-287), no auth gate (E-292), no debater avatars (E-289/295).

### 3. Leaderboard player rows are dead ends
The leaderboard fetches live data from Supabase, renders tabs/filters/ranks correctly, and the Elo explainer modal is well-done. But player rows are just display — no onclick, no navigation to profiles. This is the single biggest UX gap: users see a ranking but can't explore anyone on it.

**Three gaps:** player rows not clickable (E-306/308), time filters show same data (E-304), no scroll-to for "My Rank" (E-310).

### 4. No bugs found
All three files use proper escaping (`escHtml()` with OWASP mapping). Numeric values are cast with `Number()` in leaderboard.js. Auto-debate uses `sb.rpc()` for server-side vote recording. No innerHTML injection risks. `encodeURIComponent()` used for URL params in debate-landing.

---

## UNWIRED EDGE CLUSTERS

The 8 unwired edges cluster into 3 fixable gaps:

**Gap 1: Category tag navigation (E-276, E-277)**
Add `onclick` to cat-pill in auto-debate.html → navigate to category overlay or Plinko for guests. Smallest fix.

**Gap 2: Debater/player → profile navigation (E-289, E-295, E-306, E-308, E-326, E-327)**
All 6 edges are the same pattern: user identity displayed but not clickable. Leaderboard has user IDs in the data. Adding `onclick` to player rows → profile modal or `/u/username` wires 4 edges. Debate-landing needs avatar elements added first.

**Gap 3: Discovery (E-279, E-280)**
Auto-debate page shows one debate and stops. Adding a "More Debates" section at the bottom (query `auto_debates` table for recent debates) creates a content loop that keeps visitors on the platform.

---

## FILES PRODUCED
- `Colosseum6-annotated.drawio` — Chart 6 annotations injected (27 internal + 6 cross-refs)
- `session-88-chart6-trace.md` — this file

## CHART ANNOTATION PROJECT COMPLETE
All 6 charts annotated across Sessions 83-88:
- Chart 1 (Session 83): 48 edges — Main Funnel
- Chart 2 (Session 84): 42 edges — Arena
- Chart 3 (Session 85): 21 edges — Category Overlay
- Chart 4 (Session 86): 14 edges — Groups
- Chart 5 (Session 87): 16 edges — Profile + Settings
- Chart 6 (Session 88): 33 edges — Auto-Debate + Leaderboard
- **Total: 174 edges annotated with full file chains + line numbers**
