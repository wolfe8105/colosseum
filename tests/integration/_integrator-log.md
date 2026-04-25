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

## Batch 8 (seams #095–#106)
Passed: #095 (12), #097 (7 new), #098 (6 new), #099 (7 new), #100 (9), #102 (6 new), #103 (9 new), #105 (20 existing)
Walled: #096 (arena-room-render.ts imports arena-room-live-audio), #101 (arena-core.ts imports webrtc/arena-css/voicememo/arena-feed-room), #104 (arena-lobby.ts imports arena-feed-room), #106 (arena-feed-machine-turns.ts imports webrtc/arena-sounds/deepgram)
Failed: none

## Totals
Done: 77 / 623
Walled: 31
Failed: 0
Remaining: 515

## Remaining
See `_integrator-seams.md` starting at rank 107.

## Batch 9 (seams #107–#116)
Passed: #107 (15), #108 (11 existing), #109 (7), #110 (5 new), #112 (11 existing), #115 (8)
Walled: #111 (imports realtime-client/feed-room), #113 (imports deepgram), #114 (imports deepgram), #116 (imports webrtc/arena-sounds/deepgram)
Failed: none

## Totals
Done: 83 / 623
Walled: 35
Failed: 0
Remaining: 505

## Remaining
See `_integrator-seams.md` starting at rank 117.

## Batch 10 (seams #117–#126)
Passed: #117 (8), #118 (7 new), #122 (8), #123 (7 new), #124 (18), #126 (10)
Walled: #119 (deepgram), #120 (arena-sounds), #121 (arena-sounds), #125 (webrtc)
Pre-walled (known importer): #129 (deepgram), #130 (deepgram), #133 (webrtc), #134 (webrtc)
Failed: none

## Totals
Done: 89 / 623
Walled: 43
Failed: 0
Remaining: 491

## Remaining
See `_integrator-seams.md` starting at rank 127.

## Batch 11 (seams #127–#140)
Passed: #127 (7 new), #128 (15 new), #131 (7 new), #132 (15 new), #135 (7), #136 (9), #138 (8), #139 (8), #140 (11)
Walled: #137 (arena-room-enter dynamic imports arena-sounds)
Pre-walled (known importer): #144 (deepgram), #145 (arena-sounds), #146 (arena-sounds), #149 (webrtc)
Failed: none

## Totals
Done: 98 / 623
Walled: 49
Failed: 0
Remaining: 476

## Remaining
See `_integrator-seams.md` starting at rank 141.

## Batch 12 (seams #141–#154)
Passed: #141 (7 new, 14 total), #142 (5 new, 13 total), #143 (6 written, 21 total), #147 (5 new, 15 total), #148 (18), #150 (8), #151 (5 new, 13 total), #152 (11), #153 (7 new, 14 total), #154 (7)
Walled: none (pre-walled #144, #145, #146, #149 already marked)
Failed: none

## Totals
Done: 108 / 623
Walled: 49
Failed: 0
Remaining: 466

## Remaining
See `_integrator-seams.md` starting at rank 155.

## Batch 13 (seams #155–#165)
Passed: #155 (7), #156 (7), #157 (9), #158 (9), #159 (7 new, 26 total), #161 (10), #162 (41), #163 (7 new, 15 total), #164 (7 new, 18 total), #165 (9)
Walled: none (pre-walled #160 already marked)
Failed: none

## Totals
Done: 118 / 623
Walled: 50
Failed: 0
Remaining: 455

## Remaining
See `_integrator-seams.md` starting at rank 166.

## Batch 14 (seams #166–#182)
Passed: #166 (8), #167 (12), #168 (13), #169 (16), #170 (29), #171 (7 new, 31 total), #172 (20), #178 (17), #182 (14)
Walled: none dispatched (pre-walled #173–#177, #179–#180 before batch = +7 walls)
Failed: none
Stalled: #181 (600s watchdog — retry in Batch 15)

## Totals
Done: 127 / 623
Walled: 60
Failed: 0
Remaining: 436

## Remaining
See `_integrator-seams.md` starting at rank 181.

## Batch 15 (seams #181–#193)
Passed: #181 retry (5 new, 14 total), #183 (8 new, 20 total), #184 (7 new, 23 total), #186 (13), #187 (9), #188 (8), #190 (7 new, 20 total), #192 (13 new, 20 total), #193 (11 new, 30 total)
Walled: none dispatched (pre-walled #185, #189, #191 before batch = +3 walls; #203–#204 pre-walled now = +2)
Failed: none

## Totals
Done: 136 / 623
Walled: 65
Failed: 0
Remaining: 422

## Remaining
See `_integrator-seams.md` starting at rank 194.

## Batch 16 (seams #194–#205)
Passed: #194 (7 new, 39 total), #195 (12 new, 52 total), #196 (7 new, 15 total), #197 (7 new, 15 total), #198 (7 new, 42 total), #199 (7 new, 49 total), #200 (7 new, 34 total), #201 (7 new, 16 total), #202 (7 new, 33 total), #205 (9 new)
Walled: none dispatched (pre-walled #203–#204, #213 = +3 walls)
Failed: none

## Totals
Done: 146 / 623
Walled: 68
Failed: 0
Remaining: 409

## Remaining
See `_integrator-seams.md` starting at rank 206.

## Batch 17 (seams #206–#217)
Passed: #206 (10), #207 (9), #208 (15 existing), #209 (10), #210 (9), #212 (7 new, 28 total), #214 (7), #215 (8), #216 (7), #217 (7)
Walled: none dispatched (pre-walled #211, #213, #222 = +3 walls)
Failed: none

## Totals
Done: 156 / 623
Walled: 71
Failed: 0
Remaining: 396

## Remaining
See `_integrator-seams.md` starting at rank 218.

## Batch 18 (seams #218–#228)
Passed: #218 (7), #219 (7), #220 (7), #221 (12), #223 (7 new, 14 total), #224 (7 new, 22 total), #225 (9), #226 (7 new, 23 total), #227 (7 new, 57 total), #228 (9)
Walled: none dispatched (pre-walled #222, #230–#235, #243–#245 = +11 walls)
Failed: none

## Totals
Done: 166 / 623
Walled: 82
Failed: 0
Remaining: 375

## Remaining
See `_integrator-seams.md` starting at rank 229.

## Batch 19 (seams #229, #236–#242, #246–#247)
Passed: #229 (14), #236 (8), #237 (9 new, 20 total), #238 (9), #239 (8), #240 (7 new, 31 total), #241 (8), #242 (8), #247 (7 new, 14 total)
Walled: #246 (arena-room-live-input imports arena-room-live-audio); pre-walled #249, #253 = +2 walls
Failed: none

## Totals
Done: 175 / 623
Walled: 86
Failed: 0
Remaining: 362

## Remaining
See `_integrator-seams.md` starting at rank 248.

## Batch 20 (seams #248–#259)
Passed: #248 (9), #250 (19), #252 (12), #254 (8), #255 (24), #256 (14), #257 (6 new, 15 total), #258 (7 new, 16 total), #259 (7 new, 15 total)
Walled: #251 (arena.ts re-exports voicememo); pre-walled #265, #267, #268 = +3 walls
Failed: none

## Totals
Done: 184 / 623
Walled: 91
Failed: 0
Remaining: 348

## Remaining
See `_integrator-seams.md` starting at rank 260.

## Batch 21 (seams #260–#272)
Passed: #260 (22), #261 (13), #262 (21), #263 (10), #264 (covered in #263 file), #266 (8), #271 (8), #272 (9)
Walled: #269 (arena-feed-disconnect-mod imports arena-deepgram), #270 (settings.wiring dynamically imports arena-sounds + intro-music)
Failed: none
Note: TC7 in int-plinko-step3-username.test.ts fixed — assertion scoped to step3 RPCs only (auth-init RPCs allowed)

## Totals
Done: 192 / 623
Walled: 93
Failed: 0
Remaining: 338

## Remaining
See `_integrator-seams.md` starting at rank 273.
