# First Run Files

**Total unique files:** 57
**Batch size:** Variable — sized by byte total, not file count.
**Byte budget:** ≤ 40,000 bytes per batch (empirical ceiling: 46,789 bytes worked, 49,048 bytes failed).
**Batches:** 16 total after full restructure.

Feed these batches one at a time into the v3 audit method orchestration prompt. All paths verified present in the repo.

**2026-04-13 restructure:** Batch 6 at 5 files hit Claude Code context compaction on file 5. Remaining batches sized by byte total. Batch 7R+ use ≤ 40KB budget.
**2026-04-14 byte audit:** Batch 8R (original, 4 files, 49,048 bytes) hit compaction on file 2. Split into 8Ra (26,196 bytes) and 8Rb (30,209 bytes). All byte totals confirmed below 40KB ceiling.

---

## Batch 1 (DONE)

1. src/arena/arena-css.ts
2. src/arena/arena-feed-events.ts
3. src/arena/arena-feed-machine.ts
4. src/arena/arena-feed-room.ts
5. src/arena/arena-feed-ui.ts

## Batch 2 (DONE)

1. src/arena/arena-feed-wiring.ts
2. src/arena/arena-room-end.ts
3. src/arena/arena-room-live.ts
4. src/arena/arena-types.ts
5. src/pages/groups.ts

## Batch 3 (DONE)

1. src/pages/groups.types.ts
2. src/pages/groups.settings.ts
3. src/pages/groups.auditions.ts
4. src/pages/home.ts
5. src/pages/home.nav.ts

## Batch 4 (DONE — 2026-04-14)

1. src/pages/home.arsenal.ts
2. src/pages/home.arsenal-shop.ts
3. src/pages/home.invite.ts
4. src/pages/plinko.ts

## Batch 5 (DONE)

1. src/modifiers.ts
2. src/reference-arsenal.ts
3. src/reference-arsenal.types.ts
4. src/reference-arsenal.rpc.ts
5. src/reference-arsenal.render.ts

## Batch 6 (PARTIAL — 4 of 5 done)

1. src/rivals-presence.ts ✓
2. src/share.ts ✓
3. api/invite.js ✓
4. src/arena/arena-loadout-presets.ts ✓
5. src/arena/arena-room-setup.ts — DEFERRED, now first file in Batch 7R

---

## Batch 7R

1. src/arena/arena-room-setup.ts
2. src/pages/spectate.ts
3. src/auth.types.ts
4. src/auth.profile.ts

## Batch 8Ra (DONE — covered by old Batch 8R run 2026-04-14)

**Note:** Original Batch 8R split into 8Ra and 8Rb (2026-04-14). `settings.ts` and `profile-debate-archive.ts` are both 20KB+ — together they exceed the 40KB byte budget. Split keeps each batch well under the ceiling.

1. src/pages/settings.ts (19,979 bytes)
2. src/reference-arsenal.loadout.ts (3,553 bytes)
3. src/badge.ts (766 bytes)
4. vite.config.ts (1,898 bytes)

## Batch 8Rb (PARTIALLY DONE — profile-debate-archive.ts covered by old Batch 8R)

1. src/profile-debate-archive.ts (24,750 bytes)
2. src/async.types.ts (1,523 bytes)
3. src/pages/home.feed.ts (3,445 bytes)
4. src/pages/home.types.ts (491 bytes)

## Batch 9R (PENDING) — 29,246 bytes

1. src/leaderboard.ts (21,195 bytes)
2. src/arena/arena-ads.ts (3,954 bytes)
3. src/arena/arena-mod-scoring.ts (4,097 bytes)

## Batch 10R (PENDING) — 31,471 bytes

1. src/tokens.ts (18,998 bytes)
2. src/arena/arena-core.ts (6,262 bytes)
3. src/arena/arena-bounty-claim.ts (6,211 bytes)

## Batch 11R (PENDING) — 28,861 bytes

1. src/arena/arena-entrance.ts (17,896 bytes)
2. src/async.fetch.ts (5,858 bytes)
3. src/pages/spectate.types.ts (5,107 bytes)

## Batch 12R (PENDING) — 30,806 bytes

1. src/pages/spectate.render.ts (22,974 bytes)
2. src/arena/arena-feed-spec-chat.ts (7,832 bytes)

## Batch 13R (PENDING) — 33,959 bytes

1. src/pages/group-banner.ts (15,084 bytes)
2. src/async.render.ts (18,875 bytes)

## Batch 14R (PENDING) — 30,677 bytes

1. src/bounties.ts (18,281 bytes)
2. src/arena/arena-sounds.ts (12,396 bytes)

## Batch 15R (PENDING) — 29,914 bytes

1. src/notifications.ts (16,057 bytes)
2. src/intro-music.ts (13,857 bytes)

## Batch 16R (PENDING) — 28,861 bytes

**Note:** Created 2026-04-15. The original Batch 11R as planned (`arena-entrance.ts`, `async.fetch.ts`, `spectate.types.ts`) was never run — the actual 11R session audited a different file list (`arena-sounds`, `arena-core`, `tokens`, `notifications`) instead. Batch 16R closes out the 3 files left uncovered by that swap. After 16R, audit coverage hits 57/57.

1. src/arena/arena-entrance.ts (17,896 bytes)
2. src/async.fetch.ts (5,858 bytes)
3. src/pages/spectate.types.ts (5,107 bytes)

## Batch 8Rc (PENDING) — 7,357 bytes

**Note:** Created 2026-04-14. The old Batch 8R run covered settings.ts, reference-arsenal.loadout.ts, badge.ts, and profile-debate-archive.ts — overlapping 8Ra and 8Rb entirely except for these 4 small files. Combined into one mini-batch.

1. vite.config.ts (1,898 bytes)
2. src/async.types.ts (1,523 bytes)
3. src/pages/home.feed.ts (3,445 bytes)
4. src/pages/home.types.ts (491 bytes)

---

# Refactor Audit Batches (post-split, April 2026)

These batches cover the 25 new files created by the refactor plus 13 significantly
modified originals. All are new to the audit — none appeared in Batches 1–16R.
Byte budget: ≤ 40,000 bytes per batch.

## Batch A (PENDING) — 30,041 bytes
Deepgram split + Realtime feed split + lobby cards

1. src/arena/arena-deepgram.types.ts (534 bytes)
2. src/arena/arena-deepgram.token.ts (1,177 bytes)
3. src/arena/arena-deepgram.ts (10,238 bytes)
4. src/arena/arena-feed-realtime.ts (3,012 bytes)
5. src/arena/arena-feed-heartbeat.ts (4,290 bytes)
6. src/arena/arena-feed-disconnect.ts (7,035 bytes)
7. src/arena/arena-lobby.cards.ts (3,755 bytes)

## Batch B (PENDING) — 30,976 bytes
Lobby + Private lobby splits

1. src/arena/arena-lobby.ts (14,056 bytes)
2. src/arena/arena-private-lobby.ts (8,662 bytes)
3. src/arena/arena-private-lobby.join.ts (3,528 bytes)
4. src/arena/arena-pending-challenges.ts (4,730 bytes)

## Batch C (PENDING) — 37,245 bytes
Staking split + Tournaments split + Queue (never audited)

1. src/staking.types.ts (679 bytes)
2. src/staking.ts (714 bytes)
3. src/staking.rpc.ts (2,842 bytes)
4. src/staking.render.ts (6,914 bytes)
5. src/staking.wire.ts (3,918 bytes)
6. src/tournaments.types.ts (953 bytes)
7. src/tournaments.ts (1,289 bytes)
8. src/tournaments.indicator.ts (2,610 bytes)
9. src/tournaments.rpc.ts (3,403 bytes)
10. src/tournaments.render.ts (2,906 bytes)
11. src/arena/arena-queue.ts (11,017 bytes)

## Batch D (PENDING) — 35,439 bytes
Login split + Auto-debate split

1. src/pages/login.types.ts (283 bytes)
2. src/pages/login.forms.ts (8,734 bytes)
3. src/pages/login.ts (7,742 bytes)
4. src/pages/auto-debate.types.ts (741 bytes)
5. src/pages/auto-debate.vote.ts (2,737 bytes)
6. src/pages/auto-debate.render.ts (8,402 bytes)
7. src/pages/auto-debate.ts (6,800 bytes)

## Batch E (PENDING) — 36,692 bytes
Reference arsenal armory (new) + Debate landing split

1. src/reference-arsenal.armory.ts (15,346 bytes)
2. src/reference-arsenal.render.ts (5,225 bytes)
3. src/pages/debate-landing.types.ts (455 bytes)
4. src/pages/debate-landing.data.ts (4,678 bytes)
5. src/pages/debate-landing.ts (10,988 bytes)

## Batch F (PENDING) — 29,688 bytes
Groups members split + Groups auditions split

1. src/pages/groups.members.modal.ts (12,514 bytes)
2. src/pages/groups.members.ts (4,753 bytes)
3. src/pages/groups.auditions.render.ts (3,488 bytes)
4. src/pages/groups.auditions.ts (8,933 bytes)
