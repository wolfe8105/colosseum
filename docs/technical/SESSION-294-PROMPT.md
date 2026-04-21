# Next Session Prompt — Session 294

Read CLAUDE.md first. Then read SESSION-293-HANDOFF.md (docs/technical/). Then read THE-MODERATOR-NEW-TESTAMENT.md (docs/). Do not suggest anything until you've read all three.

## Context

The Moderator (themoderator.app) — live debate platform. Repo: github.com/wolfe8105/colosseum. Supabase project: faomczmipsccwbhpivmp. Vercel team: team_L7vGoGpTPhIreB0cs9Ac8Ege.

## What's done

- F-62 Link Card Debates shipped S293. Reddit-style OG preview on debate cards. SQL live, serverless function deployed, client rendering complete.
- Full codebase sweep S293: all dead code removed, all stale comments cleaned, all open audit findings resolved, punch list fully current.
- Build clean. Zero known bugs. All 13 pages audited clean (S292).
- Sports debate lobby mockup approved — unified feed with link cards, open cards, live debates, verdicts all in one stream.

## What's needed — BUILD F-68: Unified Feed (Kill Hot Takes)

This is a 2-3 session build. The full spec is in SESSION-293-HANDOFF.md under "F-68 Unified Feed — SPECCED."

**The core idea:** hot takes and debate cards are the same thing. Kill the distinction. One card type, one feed, one renderer. A card starts as a posted opinion (`status = 'open'`) and graduates into a live debate when someone challenges it.

### Recommended build order

**Phase 1 — SQL foundation:**
1. Add `'open'` to `arena_debates` status values
2. Add `reaction_count INT DEFAULT 0` to `arena_debates`
3. Add `content TEXT` to `arena_debates` (the opinion text — what `hot_takes.content` is today)
4. Create `debate_reactions` table
5. Create `create_debate_card()` RPC — inserts `arena_debates` with `status='open'`, `debater_b=NULL`
6. Create `react_debate_card()` RPC — toggle reaction
7. Create `accept_challenge()` RPC — fills `debater_b`, transitions `open` → `pending`
8. Create `get_unified_feed()` RPC — returns all cards (open + live + voting + complete) with profiles, link_preview, reaction_count

**Phase 2 — Unified card renderer:**
1. New `src/feed-card.ts` (or similar) — one renderer for all card states
2. Uses the approved mockup layout: badges → topic → link preview → VS bar or reactions → action buttons
3. Card state determines what renders: OPEN shows react/challenge, LIVE shows spectate, VERDICT shows view

**Phase 3 — Feed tab rewire:**
1. `home.feed.ts` calls `get_unified_feed` instead of `fetchTakes`
2. Composer posts to `create_debate_card` instead of `create_hot_take`
3. Challenge flow calls `accept_challenge` instead of `create_challenge`
4. Category filters work against `arena_debates.category`

**Phase 4 — Kill async modules:**
1. Delete all 16 `src/async.*` files (1,757 lines)
2. Rewire remaining references (groups feed, tokens, onboarding drip, search)
3. Update `search_index` triggers

**Phase 5 — Cleanup:**
1. Retire `create_hot_take`, `react_hot_take`, `create_challenge` RPCs
2. `hot_takes` table (6 rows) can be dropped
3. `hot_take_reactions` table can be dropped
4. Update docs (NT, punch list, CLAUDE.md)

### Land mines to read before starting
- THE-MODERATOR-LAND-MINE-MAP.md — always before SQL changes
- Groups feed (`src/pages/groups.feed.ts`) queries `hot_takes` directly
- Token earn calls in `src/tokens.claims.ts` reference hot takes
- DM eligibility triggers may fire on `hot_takes`
- `search_index` triggers on `hot_takes` need to move to `arena_debates`
- `section` on hot_takes = `category` on arena_debates

## Also investigate (not build)

- **Anti-spam posture** — how are we stopping spam signups and spam card creators? Review Supabase auth settings, Plinko friction, and what F-66 (Turnstile) would add.

## Rules

- Read CLAUDE.md first for all conventions
- File Read Verification: wc -l before, read, confirm "Read N of total"
- Castle Defense: all mutations via .rpc() SECURITY DEFINER
- escapeHTML() on all user content in innerHTML
- Number() cast on all numeric values in innerHTML
- GitHub PAT: search past chats for "github token colosseum ghp" — 90-day, never commit to files
