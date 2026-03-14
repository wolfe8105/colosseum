# Session 102 — Dead End Fixes + Housekeeping

**Date:** March 14, 2026
**Tool:** Claude Code
**Repo:** wolfe8105/colosseum
**Goal:** Fix every dead-end navigation path that bot traffic currently hits, fix known bugs, and clean up housekeeping items. No new features.

---

## CONTEXT

The draw.io annotation project (Sessions 81–88) traced all 174 edges across 6 charts and identified unwired/partially wired edges — places where a user clicks something and nothing happens. The bot army drives anonymous traffic through static mirrors into the app funnel. Every dead end is a leak.

**Rules (from CLAUDE.md):**
- All Supabase writes go through `.rpc()` SECURITY DEFINER functions wrapped in `safeRpc()`
- All user data entering innerHTML must pass through `escapeHTML()` (maps `&`, `<`, `>`, `"`, `'`)
- No inline `onclick` with user data — use `data-*` attributes + event delegation
- UUID validation before any PostgREST `.or()` filter interpolation
- `colosseum-tokens.js` loads after `colosseum-auth.js` and before `colosseum-async.js` and `colosseum-arena.js`
- Single canonical debate table: `arena_debates` (legacy `debates` table eliminated Session 101)

---

## PHASE 1: DEAD END FIXES (navigation wiring)

### Task 1.1 — Leaderboard player rows: add profile navigation
**File:** `colosseum-leaderboard.html`
**Problem:** Player rows render with name, Elo, record, streak — but no click handler. Rows are dead ends. Every leaderboard visitor hits a wall.
**Fix:** Add `data-username` attribute to each player row. Add event delegation on the leaderboard container: click → `window.location.href = '/u/' + row.dataset.username`. Ensure username is escaped via `escapeHTML()` before insertion into the data attribute.
**Edge ref:** Identified in NT "on the horizon" section.

### Task 1.2 — Auto-debate page: add player/debater profile navigation
**File:** `colosseum-auto-debate.html`
**Problem:** Debater names display in auto-debate cards but are not clickable. No way to visit a debater's profile from the auto-debate page.
**Fix:** Wrap debater names in a clickable element with `data-username`. Click → navigate to `/u/username`. Escape username.
**Edge ref:** NT "on the horizon" — player/debater profile navigation missing.

### Task 1.3 — Auto-debate page: add "more debates" discovery loop
**File:** `colosseum-auto-debate.html`
**Problem:** After viewing one auto-debate, there's no way to discover more. Dead end. The Vercel auto-debate page has no discovery section (the mirror does for some debate-landing pages but auto-debate doesn't).
**Fix:** Add a "More Debates" section below the current debate content. Query `arena_debates` for recent/active debates (excluding current), render as clickable cards linking to their auto-debate URLs. Limit to 5-6 cards.
**Security:** Use `safeRpc()` if fetching via RPC, or direct Supabase query with proper parameterization. Escape all user-generated content.

### Task 1.4 — debate-landing.html: add player/debater profile navigation
**File:** `debate-landing.html`
**Problem:** Debater names shown but not clickable. Same pattern as auto-debate.
**Fix:** Same approach as Task 1.2 — `data-username` + click handler + escape.

### Task 1.5 — Category pills: make clickable on home screen
**File:** `index.html` (home/carousel)
**Problem:** Category pills display on home screen but are not interactive. Users see "Politics", "Sports", etc. but tapping does nothing. Should filter or navigate.
**Fix:** Add click handlers to category pills. On click, navigate to arena with category pre-selected (e.g., `colosseum-arena.html?category=politics`) OR filter the home carousel to that category. Check how arena handles `?category=` param — if it does, navigate there. If not, filter home content.
**Security:** Category values come from a fixed enum, not user input. Still validate against known list before using in navigation.

### Task 1.6 — Group member avatars: add profile navigation
**File:** `colosseum-groups.html`
**Problem:** Member list in group detail renders avatars and names (L791-806) but no click handler exists. Members are display-only.
**Fix:** Add `data-username` to member-row elements. Event delegation on member list container: click → navigate to `/u/username`.
**Edge ref:** E213, E217 (Chart 4 trace, Session 86).

### Task 1.7 — Author avatar → profile navigation (category overlay)
**Files:** `colosseum-async.js`, `index.html`
**Problem:** Author avatars on hot takes / predictions show an in-app modal popup, not the actual `/u/username` public profile page. Users can't get to real profiles from the category overlay.
**Fix:** Change avatar click behavior from modal to navigation to `/u/username`. If modal serves other purposes (like quick-follow), add a "View Profile" link inside the modal that navigates to `/u/username`.
**Edge ref:** E84, E163 (Chart 3 trace, Session 85). Partially wired — modal exists, real navigation doesn't.

---

## PHASE 2: BUG FIXES

### Task 2.1 — Hot take share button: apostrophe XSS/break
**File:** `colosseum-async.js` (around L202)
**Problem:** `encodeURIComponent(t.text)` is used inside a single-quoted `onclick` attribute. `encodeURIComponent` does NOT encode single quotes. Any hot take containing an apostrophe breaks the JS string literal → share button silently fails on most real content.
**Fix:** Replace inline `onclick` with `data-*` attribute + event delegation, OR use `escapeHTML()` on the text before inserting into the attribute. The castle defense pattern is `data-*` + delegation — use that.
**Edge ref:** Session 85 bug, same class as Session 84 arena share mismatch.

### Task 2.2 — Challenge button doesn't navigate to arena
**File:** `colosseum-async.js`
**Problem:** `_submitChallenge()` creates a DB record via `create_challenge` RPC but does NOT navigate the user to the arena afterward. Challenge is created silently — user has no idea what happened next.
**Fix:** After successful RPC call, navigate to arena page (e.g., `colosseum-arena.html?challenge=UUID` or equivalent). Confirm what the arena expects for challenge-based entry.
**Edge ref:** E83 (Chart 3 trace, Session 85). Partially wired.

---

## PHASE 3: HOUSEKEEPING

### Task 3.1 — NT Section 12 schema note update
**File:** `THE-COLOSSEUM-NEW-TESTAMENT.md`
**Problem:** Section 12 still says "Two parallel debate systems — legacy `debates` table and active `arena_debates` table. Any debate RPC must account for both."
**Fix:** Replace with: "Single canonical debate table: `arena_debates`. Legacy `debates` table eliminated in Session 101."

### Task 3.2 — GitHub file cleanup
**Repo:** `wolfe8105/colosseum`
**Actions:**
- Delete stray UUID-named HTML file (find it — it's a random UUID as filename)
- Rename `package_1.json` to `package.json` (or delete if duplicate)
- Delete duplicate root-level `profile.js` (if a non-root version is the real one)
**Approach:** `ls` the repo root, identify the files, confirm before deleting.

### Task 3.3 — guard_profile_columns trigger correction
**File:** Supabase SQL (run in SQL Editor, not via Claude Code file edit)
**Problem:** `guard_profile_columns` trigger only guards `level` and `xp`, not the broader set previously documented.
**Action:** Document the actual current state in the Land Mine Map if not already accurate. If the trigger should guard more columns, provide the corrected SQL for Pat to run in Supabase SQL Editor.
**NOTE:** This is SQL-only. Claude Code identifies what needs to change and writes the SQL. Pat runs it manually.

### Task 3.4 — ecosystem.config.js cleanup
**File:** `ecosystem.config.js` (VPS bot army config)
**Problem:** Needs cleanup (specifics TBD — inspect file, identify dead entries, outdated config, Lemmy references that should be removed since Lemmy is dead as a channel).
**NOTE:** VPS changes require Pat to run commands manually. Claude Code prepares the updated file; Pat SCPs and restarts PM2.

---

## OUT OF SCOPE (future sessions)

These are feature builds, not fixes. Each needs its own session:
- **GvG challenge flow** (E212, E215) — entire feature unbuilt
- **Create Prediction UI** (E90) — no UI/RPC exists anywhere
- **Group hot takes posting** (E211) — display exists, no submit UI
- **debate-landing.html backend persistence** (L507 PLACEHOLDER) — votes are localStorage-only

---

## EXECUTION ORDER

1. Phase 3.1 (NT update) — 2 minutes, gets the docs right first
2. Phase 3.2 (file cleanup) — 5 minutes, reduces noise
3. Phase 2.1 (share button bug) — security fix, highest severity
4. Phase 1.1 through 1.7 (dead ends) — bulk of the work, in order listed
5. Phase 2.2 (challenge navigation) — depends on understanding arena entry flow
6. Phase 3.3 (trigger SQL) — prepare SQL, Pat runs
7. Phase 3.4 (ecosystem.config.js) — prepare file, Pat deploys

Commit after each phase. Verify site live after Phase 1 and Phase 2.
