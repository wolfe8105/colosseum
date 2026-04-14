# First Run Files

**Total unique files:** 57
**Batch size:** 5 for Batches 1–6, variable from 7R onward (2–4 files, size-limited).
**Batches:** 16 total after full restructure (8Ra/8Rb split added 2026-04-14 after large-file audit).

Feed these batches one at a time into the v3 audit method orchestration prompt. All paths verified present in the repo.

**2026-04-13 restructure:** Batch 6 at 5 files hit Claude Code context compaction on file 5 of 5. Remaining batches cut to 4 files each for headroom. The 5th Batch 6 file (`arena-room-setup.ts`) is first in Batch 7R ("R" = restructured). All Batch 7+ numbers have been re-flowed to account for the smaller batch size.

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

## Batch 8Ra (PENDING)

**Note:** Original Batch 8R split into 8Ra and 8Rb (2026-04-14). `settings.ts` and `profile-debate-archive.ts` are both 500+ lines — putting them in the same batch is a compaction risk. Split keeps each batch under 730 lines total.

1. src/pages/settings.ts (518 lines)
2. src/reference-arsenal.loadout.ts (94 lines)
3. src/badge.ts (16 lines)
4. vite.config.ts (50 lines)

## Batch 8Rb (PENDING)

1. src/profile-debate-archive.ts (521 lines)
2. src/async.types.ts (80 lines)
3. src/pages/home.feed.ts (80 lines)
4. src/pages/home.types.ts (24 lines)

## Batch 9R (PENDING)

1. src/leaderboard.ts (521 lines)
2. src/arena/arena-ads.ts (115 lines)
3. src/arena/arena-mod-scoring.ts (85 lines)

## Batch 10R (PENDING)

1. src/tokens.ts (510 lines)
2. src/arena/arena-core.ts (173 lines)
3. src/arena/arena-bounty-claim.ts (150 lines)

## Batch 11R (PENDING)

1. src/arena/arena-entrance.ts (496 lines)
2. src/async.fetch.ts (187 lines)
3. src/pages/spectate.types.ts (179 lines)

## Batch 12R (PENDING)

1. src/pages/spectate.render.ts (490 lines)
2. src/arena/arena-feed-spec-chat.ts (223 lines)

## Batch 13R (PENDING)

1. src/pages/group-banner.ts (459 lines)
2. src/async.render.ts (329 lines)

## Batch 14R (PENDING)

1. src/bounties.ts (433 lines)
2. src/arena/arena-sounds.ts (346 lines)

## Batch 15R (PENDING)

1. src/notifications.ts (424 lines)
2. src/intro-music.ts (409 lines)
