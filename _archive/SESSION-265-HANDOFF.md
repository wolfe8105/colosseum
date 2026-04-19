# The Moderator — Session Handoff
## Session 265 | April 12, 2026

---

## What happened this session

Single-track build session. F-16/F-17/F-18 shipped end-to-end.

**F-16/F-17/F-18 — Group Settings, Entry Requirements, Audition System**

SQL migration applied to `faomczmipsccwbhpivmp`:
- 1 new table: `group_auditions` (RLS locked, SECURITY DEFINER only, DEFERRABLE UNIQUE on candidate+group)
- 3 new columns on `groups`: `join_mode TEXT DEFAULT 'open'`, `entry_requirements JSONB`, `audition_config JSONB`
- 1 new column on `arena_debates`: `audition_id UUID → group_auditions`
- 2 RPCs replaced: `join_group` (now branches on join_mode — open passes through, requirements runs 3 gates, audition returns `{audition_required:true}`, invite_only blocks), `get_group_details` (now returns new columns)
- 9 RPCs new: `update_group_settings`, `delete_group`, `request_audition`, `accept_audition`, `approve_audition`, `deny_audition`, `withdraw_audition`, `resolve_audition_from_debate`, `get_pending_auditions`

Client shipped:
- `src/pages/groups.settings.ts` — new. Full-screen settings modal, all editable fields, join mode switching with conditional requirement/audition sub-sections, delete group with name confirmation
- `src/pages/groups.auditions.ts` — new. Audition request modal with leader-override field locking, pending auditions list with role-aware action buttons
- `src/pages/groups.types.ts` — added `GroupDetail` interface extending `GroupListItem`
- `src/pages/groups.ts` — imports new modules, stores `currentGroupData`, gear icon for leader only, `updateJoinBtn` handles all 4 join modes, `toggleMembership` handles `audition_required` and requirements rejection, `switchDetailTab` includes auditions, full event delegation wired
- `moderator-groups.html` — gear icon, Settings full-screen view, Audition request modal, Auditions tab + content div, all CSS
- `src/arena/arena-room-end.ts` — `resolve_audition_from_debate` called after `settleStakes`

Build: clean, 7.03s, zero TS errors, main.js 362KB unchanged, zero new circular deps. All 3 gates passed.

GitHub commit: `e85f569`

**Known simplification to flag:** `accept_audition` forces `ruleset='unplugged'` for exhibition scoring rather than a separate `is_exhibition` column on `arena_debates`. Can refine later.

---

## Codebase state right now

Build: Clean. 7.03s. Zero TypeScript errors.
Circular deps: 38 pre-existing cycles, all in `src/arena/`. Zero new ones. Baseline is 38.
Knip: OOMs pre-existing (oxc-parser). Not a real issue.
arena-lobby.ts: Async-only dynamic chunk. Never statically import it. LM-225.
Supabase project: `faomczmipsccwbhpivmp`. Function count ~208 (199 from S264 + 9 new).
Deployed functions export: **STALE AGAIN** — re-export before any session that needs to audit the function list.

---

## What's shipped vs what's tested

| Feature | Code | Tested | Notes |
|---|---|---|---|
| F-51 Live Debate Feed Ph1+Ph2 | ✅ | ✅ 20/20 | Open deps: Deepgram, AdSense, turn enforcement |
| F-23 DM/Chat | ✅ | ❌ | Needs live test: 2 accounts + 1 blocked |
| F-24 Search | ✅ | ❌ | Needs live test: fuzzy, anon filter, block-hide, pg_cron |
| F-16 Group Settings | ✅ | ❌ | Needs live test: edit all fields, save, verify |
| F-17 Entry Requirements | ✅ | ❌ | Needs live test: min Elo rejection, tier rejection, profile gate |
| F-18 Audition System | ✅ | ❌ | Needs live test: request → accept → debate → auto-admit on pass |

---

## Active land mines

- **LM-209** — `profiles.is_bot` column does not exist. F-55 migration must add it first.
- **LM-225** — `arena-lobby.ts` is async-only. Never statically import it.
- **LM-191** — `score_debate_comment` writes directly to `debate_feed_events`, bypassing `insert_feed_event`. Both must be updated together.
- **LM-219** — F-23 silent-block realtime leak. Resolved via RLS Option 1. If a future migration touches the realtime publication, verify the policy survives.
- **F-58 eligibility trigger gap** — `sentiment_tips` and `debate_watches` eligibility triggers for `dm_eligibility` are still deferred. F-58 build migration must add them.

---

## What's next — prioritized build order

### Immediate next: F-58 Sentiment Tipping

**Context read is complete from S265.** Do NOT re-read the spec — everything is below.

**SQL migration needed:**
1. `CREATE TABLE debate_watches` — exact schema from spec (id, user_id, debate_id, watched_at, UNIQUE(user_id,debate_id), indexes, RLS service-role-only)
2. `CREATE TABLE sentiment_tips` — exact schema from spec (id, debate_id, user_id, side, amount CHECK≥2, created_at, refund_amount, settled_at, 3 indexes)
3. `ALTER TABLE arena_debates ADD COLUMN sentiment_total_a BIGINT DEFAULT 0, ADD COLUMN sentiment_total_b BIGINT DEFAULT 0` + CHECK constraints (cap 1B each)
4. RPC: `log_debate_watch` — SECURITY DEFINER, inserts ON CONFLICT DO NOTHING, excludes debaters, excludes guests (NULL uid)
5. RPC: `get_user_watch_tier` — returns `{tier, count}` from debate_watches count. Tiers: 0=Unranked, 1-4=Observer, 5-14=Fan, 15-49=Analyst, 50+=Insider
6. RPC: `cast_sentiment_tip` — auth check, side IN('a','b'), amount≥2, derive watch tier, reject Unranked, reject if status!='live', reject if mode='ai', atomic debit token_balance, insert sentiment_tips, UPDATE arena_debates.sentiment_total_a/b, emit 'sentiment_tip' feed event, return {success, new_total_a, new_total_b, new_balance}
7. RPC: `settle_sentiment_tips` — called from post-debate flow alongside settle_stakes, loops unsettled rows FOR UPDATE, winner side gets FLOOR(amount*0.5) refund, loser/draw gets 0, idempotent via settled_at IS NULL
8. **DROP** `cast_sentiment_vote` — confirmed live in production (S250 investigation). Drop it.
9. **F-23 eligibility trigger gap** — add triggers on `sentiment_tips` and `debate_watches` INSERT to populate `dm_eligibility` pairs. Match the ON CONFLICT DO NOTHING pattern used by the arena_debates/arena_votes triggers.

**Client changes (4 files):**
- `src/arena/arena-feed-wiring.ts` — replace `wireSpectatorVoteButtons` entirely. New spectator controls: 2/3/5/10 tip strip buttons (cyan for A, magenta for B), watch tier gate (Unranked → locked state with message), `cast_sentiment_tip` RPC call on each tap. Remove the old vote buttons + `feed-vote-label` + `feed-vote-status` + `votedRounds` logic. Also remove `setVotingEnabled` calls if any remain.
- `src/arena/arena-feed-events.ts` line 220 — rename case from `'sentiment_vote'` to `'sentiment_tip'`. Change increment logic: use `Number(ev.metadata?.amount ?? 1)` instead of flat +1, so the gauge moves by tip amount not by event count. Keep `'sentiment_vote'` as a fallback case for historical rows (same +1 behavior).
- `src/arena/arena-types.ts` line 276 — add `| 'sentiment_tip'` to FeedEventType. Keep `| 'sentiment_vote'` for historical row compatibility.
- `src/pages/spectate.ts` line 155 — add `safeRpc('log_debate_watch', { p_debate_id: state.debateId }).catch(...)` immediately after the existing `bump_spectator_count` call. Same fire-and-forget pattern.

**Gauge rendering note:** The existing `updateSentimentGauge()` in `arena-feed-ui.ts` uses `sentimentA` and `sentimentB` state variables as percentages. Under F-58, these are absolute token totals. The gauge render logic needs to stay percentage-based (A / total * 100) but now the values represent tokens not votes — no render change needed, the math is the same. The visual behavior is correct: if A=50M and B=100, gauge is almost entirely cyan.

**Tip strip CSS needed:** Two rows of 2 buttons each (or one row of 4 on wider screens). Each button shows the token amount. Color-coded per side — side selector above the buttons (tap A or B to choose side, then tap amount). Or: 4 cyan buttons for A, 4 magenta for B in two rows. Pat's call at build time — either layout works. Locked state (Unranked): buttons disabled, message "Watch a full debate to unlock tipping."

**After F-58 (in order):**
1. F-57 — Modifier & Power-Up System (major, unblocks F-10 + F-59)
2. F-55 — Reference System Overhaul (LM-209 first: `profiles.is_bot`)
3. F-10 — Power-Up Shop (needs F-57)
4. F-59 — Invite Rewards (needs F-57)
5. F-25 — Rival online alerts
6. F-28 — Bounty Board (needs F-27 first)
7. F-27 — The Armory
8. F-39 — Challenge links
9. F-53 — Profile Debate Archive
10. F-54 — Private Profile Toggle
11. F-04 — Instant Rematch
12. F-08 — Tournament
13. **11-agent 3-stage audit** — run after all features shipped

---

## GitHub

Token: `ghp_REDACTED`
Repo: `https://github.com/wolfe8105/colosseum.git`
Set remote at session start: `git remote set-url origin https://ghp_REDACTED@github.com/wolfe8105/colosseum.git`

---

## Project knowledge — needs updating

`THE-MODERATOR-NEW-TESTAMENT.md` and `THE-MODERATOR-PUNCH-LIST.md` were updated and committed this session (S265 entries added, F-16/17/18 marked SHIPPED). Both are current. No update needed before next session.

`supabase-deployed-functions-export.sql` is stale (~208 functions but file reflects ~199). Re-export if you need to audit the function list.
