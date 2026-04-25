# Integrator Log

## Completed
- Seam #001 (canonical) — `arena-feed-ui` → `arena-state` + `arena-feed-state` + `arena-core.utils` — 20 TCs — `int-arena-feed-ui.test.ts`
- Seam #002 (canonical) — `arena-room-live-messages` → `arena-state` + `auth` + `config` — 12 TCs — `int-arena-room-live-messages.test.ts`
- Seam #003 (canonical) — `arena-state` → `powerups` (type binding + overlays runtime) — 13 TCs — `int-arena-state-powerups.test.ts`
- Seam #007 (canonical) — `arena-feed-events` → `arena-state` + `arena-feed-state` — 20 TCs — `int-arena-feed-events.test.ts`
- Seam #011 (canonical) — `arena-feed-heartbeat` → `arena-state` + `arena-feed-state` — 11 TCs — `int-arena-feed-heartbeat.test.ts`
- Seam #015 (canonical) — `arena-mod-queue-status` → `arena-state` — 11 TCs — `int-arena-mod-queue-status.test.ts`
- Seam #016 (canonical) — `arena-match-timers` → `arena-state` — 5 TCs — `int-arena-match-timers.test.ts`
- Seam #017 (canonical) — `arena-config-round-picker` → `arena-state` — 7 TCs — `int-arena-config-round-picker.test.ts`
- Seam #022 (canonical) — `arena-feed-references` → `arena-state` + `arena-feed-state` — 12 TCs — `int-arena-feed-references.test.ts`
- Seam #024 (canonical) — `arena-feed-machine-pause` → `arena-state` + `arena-feed-state` — 11 TCs — `int-arena-feed-machine-pause.test.ts`
- Extra (pre-seams) — `feed-card` → `auth` + `badge` + `bounties.dot` — 11 TCs — `int-feed-card.test.ts`

## Walled
- Seam #004 — `arena-room-live-poll` → `arena-state` [WALL: → arena-room-end → webrtc.ts → @peermetrics/webrtc-stats not installed]
- Seam #005 — `arena-room-end` → `arena-state` [WALL: direct webrtc.ts import]
- Seam #006 — `arena-match-found` → `arena-state` [WALL: → arena-room-enter → arena-feed-room → webrtc.ts]
- Seam #008 — `arena-queue` → `arena-state` [WALL: → arena-match-found → arena-room-enter → webrtc.ts]
- Seam #009 — `arena-feed-machine-turns` → `arena-state` [WALL: → webrtc.ts]
- Seam #010 — `arena-room-enter` → `arena-state` [WALL: → arena-feed-room → webrtc.ts]
- Seam #012 — `arena-room-predebate` → `arena-state` [WALL: → arena-room-enter → webrtc.ts]
- Seam #013 — `arena-room-ai-response` → `arena-state` [WALL: → arena-room-live-poll → arena-room-end → webrtc.ts]
- Seam #014 — `arena-private-picker` → `arena-state` [WALL: → arena-match-found → webrtc.ts]
- Seam #018 — `arena-config-mode-select` → `arena-state` [WALL: → arena-queue → webrtc.ts]
- Seam #019 — `arena-room-live-audio` → `arena-state` [WALL: direct webrtc.ts import]
- Seam #020 — `arena-private-lobby.join` → `arena-state` [WALL: → arena-match-found → webrtc.ts]
- Seam #021 — `arena-mod-debate-waiting` → `arena-state` [WALL: → arena-mod-debate-poll → arena-room-enter → webrtc.ts]
- Seam #023 — `arena-feed-realtime` → `arena-state` [WALL: → arena-feed-room → webrtc.ts]
- Seam #025 — `arena-feed-disconnect` → `arena-state` [WALL: → arena-feed-room → webrtc.ts]
- Seam #026 — `arena-feed-disconnect-mod` → `arena-state` [WALL: → arena-room-end → webrtc.ts]
- Seam #027 — `arena-config-settings` → `arena-state` [WALL: → arena-config-mode-select → arena-queue → webrtc.ts]

## Remaining
See `_integrator-seams.md` starting at rank 004.
