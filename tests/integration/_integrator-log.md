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

- Seam #030 (canonical) — `arena-room-end-render` → `arena-state` — 13 TCs — `int-arena-room-end-render.test.ts`
- Seam #031 (canonical) — `arena-room-end-nulled` → `arena-state` — 7 TCs — `int-arena-room-end-nulled.test.ts`
- Seam #032 (canonical) — `arena-private-lobby` → `arena-state` — 7 TCs — `int-arena-private-lobby.test.ts`
- Seam #033 (canonical) — `arena-pending-challenges` → `arena-state` — 8 TCs — `int-arena-pending-challenges.test.ts`
- Seam #034 (canonical) — `arena-mod-refs-ruling` → `arena-state` — 7 TCs — `int-arena-mod-refs-ruling.test.ts`
- Seam #035 (canonical) — `arena-mod-refs-form` → `arena-state` — 8 TCs — `int-arena-mod-refs-form.test.ts`
- Seam #036 (canonical) — `arena-mod-queue-browse` → `arena-state` — 7 TCs — `int-arena-mod-queue-browse.test.ts`
- Seam #037 (canonical) — `arena-mod-debate-poll` → `arena-state` — 7 TCs — `int-arena-mod-debate-poll.test.ts`

## Batch 2 (seams #028–#045)
Passed: #029 (9 TCs), #038 (8 TCs), #039 (8 TCs), #040 (8 TCs), #041 (8 TCs), #042 (13 TCs)
Walled: #028 (imports arena-room-live-audio), #043 (imports arena-sounds), #044 (imports arena-sounds), #045 (imports webrtc/arena-css/voicememo/arena-feed-room)
Failed: none

## Totals
Done: 24 / 623
Walled: 21
Failed: 0
Remaining: 578

## Batch 3 (seams #046–#055)
Passed: #046 (7 TCs), #047 (8 TCs), #048 (8 TCs), #049 (49 TCs), #050 (8 TCs), #051 (8 TCs), #052 (9 TCs), #053 (10 TCs), #054 (9 TCs)
Walled: #055 (arena-room-end.ts imports webrtc)
Failed: none

## Totals
Done: 33 / 623
Walled: 22
Failed: 0
Remaining: 568

## Batch 4 (seams #056–#065)
Passed: #057 (8 TCs), #058 (7 TCs), #059 (8 TCs), #060 (7 TCs), #061 (8 TCs), #062 (7 TCs), #063 (8 TCs), #064 (8 TCs), #065 (7 TCs)
Walled: #056 (arena-match-found.ts imports arena-sounds)
Failed: none

## Totals
Done: 42 / 623
Walled: 23
Failed: 0
Remaining: 558

## Batch 5 (seams #066–#075)
Passed: #066 (7), #067 (7), #068 (11), #069 (7), #070 (8), #071 (5), #072 (8), #073 (7), #074 (8), #075 (7)
Walled: none
Failed: none

## Totals
Done: 52 / 623
Walled: 23
Failed: 0
Remaining: 548

## Batch 6 (seams #076–#085)
Passed: #076 (8), #077 (7), #078 (15), #079 (7), #080 (7), #081 (11), #083 (7), #084 (7), #085 (9)
Walled: none
Failed: none
Skipped: #082 (interrupted — retrying next batch)

## Totals
Done: 61 / 623
Walled: 23
Failed: 0
Remaining: 539

## Batch 7 (seams #082–#094)
Passed: #082 (10), #086 (7), #087 (9), #088 (7), #090 (9), #092 (8), #093 (7), #094 (7)
Walled: #089 (arena-room-live-audio imports webrtc), #091 (arena-feed-realtime imports realtime-client)
Failed: none

## Totals
Done: 69 / 623
Walled: 25
Failed: 0
Remaining: 529

## Remaining
See `_integrator-seams.md` starting at rank 095.
