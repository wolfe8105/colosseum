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

## Batch 8Ra (PENDING) — 26,196 bytes

**Note:** Original Batch 8R split into 8Ra and 8Rb (2026-04-14). `settings.ts` and `profile-debate-archive.ts` are both 20KB+ — together they exceed the 40KB byte budget. Split keeps each batch well under the ceiling.

1. src/pages/settings.ts (19,979 bytes)
2. src/reference-arsenal.loadout.ts (3,553 bytes)
3. src/badge.ts (766 bytes)
4. vite.config.ts (1,898 bytes)

## Batch 8Rb (PENDING) — 30,209 bytes

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
