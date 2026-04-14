# First Run Files

**Total unique files:** 57
**Batch size:** 5 for Batches 1–6, 4 for Batch 7R onward.
**Batches:** 14 total after restructure.

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

## Batch 4 (PENDING — never successfully run)

1. src/pages/home.arsenal.ts
2. src/pages/home.arsenal-shop.ts
3. src/pages/home.invite.ts
4. src/pages/plinko.ts

**Note:** original Batch 4 had 5 files (plus `src/pages/spectate.ts`). `spectate.ts` has been moved to Batch 7R to honor the new 4-file ceiling. When you run Batch 4, use this 4-file list.

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

## Batch 8R

1. src/pages/settings.ts
2. src/reference-arsenal.loadout.ts
3. src/badge.ts
4. src/profile-debate-archive.ts

## Batch 9R

1. src/async.fetch.ts
2. src/async.render.ts
3. src/async.types.ts
4. src/leaderboard.ts

## Batch 10R

1. src/pages/home.feed.ts
2. src/intro-music.ts
3. src/arena/arena-entrance.ts
4. src/pages/group-banner.ts

## Batch 11R

1. src/arena/arena-sounds.ts
2. src/arena/arena-core.ts
3. src/tokens.ts
4. src/notifications.ts

## Batch 12R

1. src/bounties.ts
2. src/arena/arena-bounty-claim.ts
3. vite.config.ts
4. src/pages/home.types.ts

## Batch 13R

1. src/arena/arena-mod-scoring.ts
2. src/arena/arena-ads.ts
3. src/arena/arena-feed-spec-chat.ts
4. src/pages/spectate.types.ts

## Batch 14R

1. src/pages/spectate.render.ts

**Note:** Batch 14R has only 1 file (the leftover after the 4-per-batch restructure). You could roll it into Batch 13R instead if you'd rather have one less batch, though with 5 files in that combined batch there's a small compaction risk on oversized files.
