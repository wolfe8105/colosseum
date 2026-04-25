# Integrator Log

## Completed
- Seam #001 (canonical) — `arena-feed-ui` → `arena-state` + `arena-feed-state` + `arena-core.utils` — 20 TCs — `int-arena-feed-ui.test.ts`
- Seam #002 (canonical) — `arena-room-live-messages` → `arena-state` + `auth` + `config` — 12 TCs — `int-arena-room-live-messages.test.ts`
- Seam #003 (canonical) — `arena-state` → `powerups` (type binding + overlays runtime) — 13 TCs — `int-arena-state-powerups.test.ts`
- Seam #007 (canonical) — `arena-feed-events` → `arena-state` + `arena-feed-state` — 20 TCs — `int-arena-feed-events.test.ts`
- Extra (pre-seams) — `feed-card` → `auth` + `badge` + `bounties.dot` — 11 TCs — `int-feed-card.test.ts`

## Walled
- Seam #004 — `arena-room-live-poll` → `arena-state` [WALL: → arena-room-end → webrtc.ts → @peermetrics/webrtc-stats not installed]
- Seam #005 — `arena-room-end` → `arena-state` [WALL: direct webrtc.ts import]
- Seam #006 — `arena-match-found` → `arena-state` [WALL: → arena-room-enter → arena-feed-room → webrtc.ts]
- Seam #009 — `arena-feed-machine-turns` → `arena-state` [WALL: → webrtc.ts]
- Seam #010 — `arena-room-enter` → `arena-state` [WALL: → arena-feed-room → webrtc.ts]

## Remaining
See `_integrator-seams.md` starting at rank 004.
