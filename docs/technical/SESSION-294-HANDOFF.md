# The Moderator — Session 294 Handoff
## F-68 Unified Feed (Kill Hot Takes) — SHIPPED | April 21, 2026

---

## What happened this session

Built and shipped F-68 — the unified feed. Hot takes are dead. Everything is a debate card now. One card type, one feed, one renderer. A posted opinion is an `arena_debates` row with `status='open'`. When challenged, it transitions to `pending → live`.

---

## Commits pushed (all on main, all pushed)

| Commit | Description |
|--------|-------------|
| `c2758b0` | F-68 SQL migration + `feed-card.ts` unified renderer |
| `2f3d1a7` | `home.feed.ts` rewrite — unified feed, category pills, new composer |
| `e52ab0b` | `groups.feed.ts` rewire to unified feed + voicememo stub |
| `4b580b7` | `search.ts` rewire from `hot_takes` to `arena_debates` |
| `d2bcb2e` | `home.overlay.ts` rewire to unified feed |
| `351736b` | Arena CTA copy update ("opinion" not "hot take") |
| `0d38425` | Phase 4: gut async module — 5 files deleted, 6 trimmed (-904 lines) |
| `a200a18` | Phase 5 SQL file (retire RPCs + drop tables) |
| `77b0775` | Doc updates: CLAUDE.md + punch list (F-62 + F-68 SHIPPED) |

---

## Supabase changes (applied directly to production)

### Phase 1 SQL (session-294-f68-unified-feed.sql)
1. `arena_debates.content TEXT DEFAULT NULL` — new column (the opinion text)
2. `arena_debates.reaction_count INT DEFAULT 0` — new column
3. `debate_reactions` table — replaces `hot_take_reactions` (unique per user/debate, RLS SELECT-only, cascade delete)
4. `create_debate_card()` RPC — inserts `arena_debates` with `status='open'`, supports link cards (F-62)
5. `react_debate_card()` RPC — toggle pattern (LM-065 compliant)
6. `accept_challenge()` RPC — fills `debater_b`, transitions `open → pending`, row-locked
7. `get_unified_feed()` RPC — returns all card states with profiles, filterable by category/status, 100 default
8. `update_search_index_debate_card()` trigger — indexes open cards in `search_index`
9. `update_dm_eligibility_challenge()` trigger — DM eligibility on challenge accept (ON CONFLICT DO NOTHING per LM-218)

### Phase 5 SQL (session-294-f68-retire-hot-takes.sql)
1. Dropped trigger `on_reaction_change` on `hot_take_reactions`
2. Dropped function `update_reaction_count()`
3. Dropped function `create_hot_take()`
4. Dropped function `create_voice_take()`
5. Dropped function `react_hot_take()`
6. Dropped function `create_challenge()`
7. Dropped table `hot_take_reactions`
8. Dropped table `hot_takes`
9. Dropped table `async_debates`

---

## Files created

| File | Purpose |
|------|---------|
| `src/feed-card.ts` | Unified card renderer — one component for all states (open, live, voting, complete). Link preview, reaction buttons, challenge button, spectate, view. Replaces both `async.render.takes.ts` and `arena-lobby.cards.ts`. |
| `session-294-f68-unified-feed.sql` | Phase 1 SQL migration |
| `session-294-f68-retire-hot-takes.sql` | Phase 5 SQL — retire RPCs + drop tables |

## Files deleted (5)

| File | Lines | Was |
|------|-------|-----|
| `src/async.actions-challenge.ts` | 110 | Challenge from hot take |
| `src/async.actions-post.ts` | 65 | Post hot take |
| `src/async.actions-react.ts` | ~60 | React to hot take |
| `src/async.render.takes.ts` | 135 | Hot take card renderer |
| `src/async.wiring.ts` | 177 | Hot take delegation wiring |

## Files rewritten

| File | Change |
|------|--------|
| `src/pages/home.feed.ts` | Complete rewrite. Calls `get_unified_feed`, renders with `feed-card.ts`, category filter pills, composer says "Let your opinion be heard..." |
| `src/pages/groups.feed.ts` | Rewired from `hot_takes` table to `get_unified_feed` with group ID as category. Shows all card states. |
| `src/pages/home.overlay.ts` | Hot takes section replaced with unified feed cards. Predictions kept via async. |
| `src/search.ts` | Query changed from `hot_takes` to `arena_debates WHERE status='open'` |
| `src/voicememo.sheet.ts` | `loadHotTakes` import stubbed |
| `src/arena/arena-lobby.ts` | CTA copy: "hot take" → "opinion" |

## Files trimmed (async module gut)

| File | Change |
|------|--------|
| `src/async.ts` | Barrel stripped to predictions + rivals only |
| `src/async.actions.ts` | Only prediction exports remain |
| `src/async.render.ts` | Only predictions + wager picker remain |
| `src/async.fetch.ts` | `fetchTakes` removed, only predictions remain |
| `src/async.state.ts` | Hot take state + placeholders removed |
| `src/async.types.ts` | `HotTake`, `ReactResult`, `CreateHotTakeResult`, `CategoryFilter` removed |

---

## Bundle impact

- main.js: 417KB → 397KB (-20KB)
- Build time: ~8.5s, zero errors

---

## Current state

### What works now
- Home feed shows one unified stream: OPEN cards, LIVE debates, VOTING, VERDICTS
- Category pills filter the feed (ALL, Sports, Politics, Music, Entertainment, Couples Court, Trending)
- Composer posts to `create_debate_card` → creates `arena_debates` with `status='open'`
- React button toggles via `react_debate_card`
- Challenge button navigates to arena with pre-filled challenge
- Groups feed shows unified cards for that group
- Search queries `arena_debates` instead of `hot_takes`
- Link card previews (F-62) work on all card states

### Cosmetic cleanup (minor, next session)
- Rename DOM element `detail-hot-takes` → `detail-feed` in `moderator-groups.html`
- Update `groups.state.ts` default tab from `'hot-takes'` to `'feed'`
- Update `groups.nav.ts` tab array
- Update `groups.detail.ts` loading text
- Update F-67 tutorial description (still says "hot takes")
- Update notification placeholder text (still says "hot take")
- Update onboarding-drip.ts text

### Open punch list items
- **F-03** 🔶 — Entrance sequence variants
- **F-61** 📋 — Debate card expiration + creator cancel
- **F-63** 📋 — Spectator participation gate
- **F-64** 📋 — SQL-level ranked eligibility hardening
- **F-65** 📋 — Vote velocity detection
- **F-66** 📋 — Friction-right security strategy
- **F-67** ⏳ — First-time user tutorial
- **F-12** 🅿️ — Seasonal token boosts (parked)

### Key technical notes
- `hot_takes`, `hot_take_reactions`, `async_debates` tables are GONE from production
- `create_hot_take`, `react_hot_take`, `create_challenge`, `create_voice_take`, `update_reaction_count` RPCs are GONE
- `arena_debates.status = 'open'` is the new state for posted opinions
- `debate_reactions` table replaces `hot_take_reactions`
- Async module still exists but only for predictions + rivals — hot take code fully removed
- Token earn action string `'hot_take'` still used in `claim_action_tokens` — backward compat with existing DB entries
- `get_arena_feed` RPC still exists (arena lobby uses it) — `get_unified_feed` is the new canonical feed RPC

### GitHub token
Search past chats for "github token colosseum ghp" — 90-day, never commit to files.
