# Integrator Log

## Completed
- Seam #339 — `async.ts` → `async.render` — 6 TCs — `int-async.test.ts`
- Seam #340 — `async.ts` → `async.fetch` — 5 TCs — `int-async.test.ts`
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

## Batch 22 (seams #273–#282)
Passed: #273 (16), #274 (7), #275 (7), #276 (24), #277 (8), #278 (7 new, 32 total), #279+#280 (11), #281 (12), #282 (7 new, 21 total)
Walled: none
Failed: none

## Totals
Done: 202 / 623
Walled: 93
Failed: 0
Remaining: 328

## Remaining
See `_integrator-seams.md` starting at rank 283.

## Batch 23 (seams #283–#292)
Passed: #284 (9 new, 17 total), #285 (8 new, 57 total), #286 (8), #287 (8), #292 (20 new, 31 total)
Walled: #283 (home.ts imports cards.ts), #288–#291 (arena-room-end.ts imports webrtc.ts)
Failed: none

## Totals
Done: 207 / 623
Walled: 98
Failed: 0
Remaining: 318

## Remaining
See `_integrator-seams.md` starting at rank 293.

## Batch 24 (seams #293–#302)
Passed: #293 (8), #294 (10), #295 (8), #296 (9), #297 (9), #298 (9), #299 (8), #302 (8)
Walled: #300 (arena-feed-disconnect imports arena-deepgram), #301 (arena-feed-disconnect-mod imports arena-deepgram)
Failed: none

## Totals
Done: 215 / 623
Walled: 100
Failed: 0
Remaining: 308

## Remaining
See `_integrator-seams.md` starting at rank 303.

## Batch 25 (seams #303–#312)
Passed: #303 (10), #304 (9), #305 (8), #306 (9), #307 (7), #308 (4 new, 12 total), #309 (6), #310 (6), #311 (6), #312 (14)
Walled: none
Failed: none

## Totals
Done: 225 / 623
Walled: 100
Failed: 0
Remaining: 298

## Remaining
See `_integrator-seams.md` starting at rank 313.

## Batch 26 (seams #313–#322)
Passed: #313 (9), #314 (9), #315 (10), #316 (6 new, 14 total), #317 (6 new, 17 total), #320 (5 new, 13 total), #321 (5 new, 12 total)
Walled: #318 (arena-match-found imports arena-sounds), #319 (same), #322 (same)
Failed: none

## Totals
Done: 232 / 623
Walled: 103
Failed: 0
Remaining: 288

## Remaining
See `_integrator-seams.md` starting at rank 323.

## Batch 27 (seams #323–#332)
Passed: #323 (7 new, 29 total), #330 (7 new, 20 total), #331 (12)
Walled: #324 (deepgram), #325–#327 (arena-feed-machine-ads imports arena-sounds), #328 (arena-feed-events-render imports arena-sounds), #329 (arena-feed-disconnect-debater → arena-room-end → webrtc), #332 (arena.ts re-exports voicememo)
Failed: none

## Totals
Done: 235 / 623
Walled: 110
Failed: 0
Remaining: 278

## Remaining
See `_integrator-seams.md` starting at rank 333.

## Batch 28 (seams #333–#342)
Passed: #333 (6 new, 20 total), #334 (6 new, 20 total), #335 (5), #336 (5), #337 (7), #338 (11), #339 (6), #340 (5), #341 (5), #342 (5)
Walled: none
Failed: none

## Totals
Done: 245 / 623
Walled: 110
Failed: 0
Remaining: 268

## Remaining
See `_integrator-seams.md` starting at rank 343.

## Batch 29 (seams #343–#352)
Passed: #343 (5 new, 13 total), #344 (6 new, 13 total), #345 (6 new, 21 total), #346 (7 new, 20 total), #347 (8), #348 (7), #349 (6), #350 (6), #351 (7), #352 (10)
Walled: none
Failed: none

## Totals
Done: 255 / 623
Walled: 110
Failed: 0
Remaining: 258

## Remaining
See `_integrator-seams.md` starting at rank 353.

## Batch 30 (seams #353–#362)
Passed: #353 (4 new, 12 total), #354 (5 new, 12 total), #355 (5 new, 13 total), #356 (5 new, 13 total), #357 (5), #358 (6), #362 (5 new, 13 total)
Walled: #359 (realtime-client + feed-room), #360 (deepgram + feed-room), #361 (deepgram + feed-room)
Failed: none

## Totals
Done: 262 / 623
Walled: 113
Failed: 0
Remaining: 248

## Remaining
See `_integrator-seams.md` starting at rank 363.

## Batch 31 (seams #363–#372)
Passed: #363 (5 new), #364 (5 new), #365 (5 new), #366 (5 new), #367 (6), #368 (6 new, 15 total), #370 (8 new, 17 total), #371 (7 new), #372 (8 new)
Walled: #369 (arena-room-render.ts does not exist in repo)
Failed: none

## Totals
Done: 271 / 623
Walled: 114
Failed: 0
Remaining: 238

## Remaining
See `_integrator-seams.md` starting at rank 373.

## Batch 32 (seams #373–#382)
Passed: #373 (7 new, 25 total), #378 (9), #379 (7), #380 (10), #381 (7), #382 (13)
Walled: #374 (arena-feed-wiring-debater imports deepgram), #375 (arena-feed-machine-turns imports webrtc+deepgram), #376 (arena-core imports webrtc+voicememo), #377 (same)
Failed: none

## Totals
Done: 277 / 623
Walled: 118
Failed: 0
Remaining: 228

## Remaining
See `_integrator-seams.md` starting at rank 383.

## Batch 33 (seams #383–#393)
Passed: #384 (7 new, 24 total), #385 (7), #386 (7 new, 64 total), #389 (10 existing), #390 (16), #391 (7 new, 18 total), #392 (7 new), #393 (6 new, 25 total int-async)
Walled: #383 (arena-match-found imports arena-sounds), #387 (arena.ts contains voicememo re-export), #388 (arena-room-enter dynamically imports arena-sounds)
Failed: none

## Totals
Done: 285 / 623
Walled: 121
Failed: 0
Remaining: 217

## Remaining
See `_integrator-seams.md` starting at rank 394.

## Batch 34 (seams #394–#404)
Passed: #394 (7 new, 27 total), #395 (7), #396 (9), #397 (7 new, 14 total), #398 (6 new, 17 total), #399 (8), #400 (7), #401 (6, 15 total panel), #402 (7, 10 total), #403 (5 new), #404 (7 new, 18 total)
Walled: none
Failed: none

## Totals
Done: 296 / 623
Walled: 121
Failed: 0
Remaining: 206

## Remaining
See `_integrator-seams.md` starting at rank 405.

## Batch 35 (seams #405–#416)
Passed: #405 (7 new, 26 total), #406 (7 new, 14 total), #407 (8), #408 (8), #409 (7 new, 21 total), #410 (6 new, 15 total), #411 (7 new, 17 total), #412 (8), #413 (9), #414 (6), #415 (7), #416 (7 new, 17 total)
Walled: none
Failed: none

## Totals
Done: 308 / 623
Walled: 121
Failed: 0
Remaining: 194

## Remaining
See `_integrator-seams.md` starting at rank 417.

## Batch 36 (seams #417–#428)
Passed: #417 (7 new, 15 total), #418 (7), #419 (7, 25 total), #420 (5 new, 20 total), #421 (8 new, 17 total), #422 (6 new, 28 total), #423 (6 new, 13 total), #424 (9), #425 (7 new, 56 total), #428 (7 new, 31 total)
Walled: #426 (arena-room-enter imports feed-room+arena-sounds), #427 (arena-feed-wiring-debater imports deepgram)
Failed: none

## Totals
Done: 318 / 623
Walled: 123
Failed: 0
Remaining: 182

## Remaining
See `_integrator-seams.md` starting at rank 429.

## Batch 37 (seams #429–#440)
Passed: #429 (6 new, 84 total), #430 (7 new, 84 total), #431 (7 new, 84 total), #432 (7 new, 19 total), #433 (7 new, 19 total), #434 (4), #435 (5, 12 total), #436 (5 new, 21 total), #437 (6 new, 21 total), #438 (7 new, 21 total), #439 (7 new, 28 total), #440 (13)
Walled: none
Failed: none

## Totals
Done: 330 / 623
Walled: 123
Failed: 0
Remaining: 170

## Batch 38 (seams #441–#450)
Passed: #441 (8 new, 14 total), #442 (7 new, 18 total), #443 (7 new, 25 total), #444 (7 new, 17 total), #445 (7 new, 15 total), #446 (7 new, 38 total), #449 (7 new, 25 total), #450 (7)
Walled: #447 (arena-feed-realtime imports arena-feed-room), #448 (arena-feed-disconnect imports arena-deepgram)
Failed: none

## Totals
Done: 338 / 623
Walled: 125
Failed: 0
Remaining: 160

## Batch 39 (seams #451–#460)
Passed: #451 (7), #452 (7 new, 14 total), #453 (8), #454 (7 new, 27 total), #455 (7 new, 35 total), #456 (14), #457 (12), #458 (8), #459 (9), #460 (8)
Walled: none
Failed: none

## Totals
Done: 348 / 623
Walled: 125
Failed: 0
Remaining: 150

## Batch 40 (seams #461–#470)
Passed: #461 (5 new, 14 total), #463 (11), #464 (7 new), #465 (7 new, 28 total), #467 (7 new, 63 total), #468 (6 new, 32 total), #469 (7 new, 21 total), #470 (7 new, 21 total)
Walled: #462 (dm.render.ts does not exist in repo), #466 (arena-room-render imports arena-room-live-audio)
Failed: none

## Totals
Done: 356 / 623
Walled: 127
Failed: 0
Remaining: 140

## Batch 41 (seams #471–#480)
Passed: #471 (11 new, 18 total), #472 (8 new, 15 total), #473 (5 new, 18 total), #476 (8 new, 28 total), #477 (10), #478 (10), #479 (7), #480 (7 new, 23 total)
Walled: #474 (arena-core imports webrtc + voicememo), #475 (same)
Failed: none

## Totals
Done: 364 / 623
Walled: 129
Failed: 0
Remaining: 130

## Batch 42 (seams #481–#490)
Passed: #485 (16 new, 50 total), #486 (22 new, 33 total), #487 (7 new, 26 total), #488 (7 new, 18 total), #489 (13), #490 (7 new, 21 total)
Walled: #481 (imports feed-room + cards.ts), #482 (arena.ts imports voicememo), #483 (same), #484 (same)
Failed: none

## Totals
Done: 370 / 623
Walled: 133
Failed: 0
Remaining: 120

## Batch 43 (seams #491–#500)
Passed: #491 (8 new, 29 total), #492 (7 new, 23 total), #493 (7), #494 (8), #496 (8 new, 33 total), #497 (6 new, 13 total), #498 (10), #499 (14), #500 (7 new, 21 total)
Walled: #495 (arena-feed-disconnect.ts does not exist in repo)
Failed: none

## Totals
Done: 379 / 623
Walled: 134
Failed: 0
Remaining: 110

## Batch 44 (seams #501–#510)
Passed: #501 (8 new, 39 total), #502 (8 new, 24 total), #503 (7 new, 31 total), #504 (6 new, 21 total), #505 (7 new, 39 total), #506 (7 new, 32 total), #507 (7 new, 51 total), #508 (7 new, 43 total), #510 (7 new, 22 total)
Walled: #509 (home.invite-sheet.ts does not exist in repo)
Failed: none

## Totals
Done: 388 / 623
Walled: 135
Failed: 0
Remaining: 100

## Remaining
See `_integrator-seams.md` starting at rank 511.

## Batch 45 (seams #511–#520)
Passed: #511 (29, new file), #512 (10, new file), #513 (8 new, 31 total), #514 (6 new, 23 total), #515 (8 new, 17 total), #516 (12, new file), #517 (6 new, 20 total), #518 (10, new file), #519 (10 appended)
Walled: #520 (arena-room-render.ts does not exist in repo)
Failed: none

## Totals
Done: 397 / 623
Walled: 136
Failed: 0
Remaining: 90

## Remaining
See `_integrator-seams.md` starting at rank 521.

## Batch 46 (seams #521–#530)
Passed: #522 (10 new, 26 total), #523 (14 new, 76 total), #524 (8 new, 84 total), #525 (7 new, 40 total), #526 (7 new, 29 total), #527 (7 new, 27 total), #528 (8 new, 43 total), #529 (6 new)
Walled: #521 (imports arena-room-live-audio), #530 (imports arena-deepgram)
Failed: none

## Totals
Done: 405 / 623
Walled: 138
Failed: 0
Remaining: 80

## Remaining
See `_integrator-seams.md` starting at rank 531.

## Batch 47 (seams #531–#540)
Passed: #533 (21), #534 (11), #535 (11), #536 (10 new), #537 (8 new, 15 total), #538 (7 new, 39 total), #539 (7 new, 31 total), #540 (7 new, 38 total)
Walled: #531 (imports arena-sounds), #532 (imports webrtc, arena-css, voicememo, feed-room)
Failed: none

## Totals
Done: 413 / 623
Walled: 140
Failed: 0
Remaining: 70

## Remaining
See `_integrator-seams.md` starting at rank 541.

## Batch 48 (seams #541–#550)
Passed: #541 (7 new, 98 total), #543 (7 new, 91 total), #544 (7 new, 47 total), #545 (8 new, 55 total), #547 (7 new, 18 total), #548 (7 new, 75 total), #549 (7 new, 59 total), #550 (7 new, 67 total)
Walled: #542 (arena.ts re-exports voicememo), #546 (imports arena-sounds)
Failed: none

## Totals
Done: 421 / 623
Walled: 142
Failed: 0
Remaining: 60

## Remaining
See `_integrator-seams.md` starting at rank 551.

## Batch 49 (seams #551–#559, #560 skip)
Passed: #551 (7 new, 82 total), #552 (10), #553 (9), #554 (7 new, 36 total), #555 (7 new, 21 total), #556 (7 new, 17 total), #557 (7), #558 (7 new, 19 total), #559 (7 new, 22 total)
Walled: none
Failed: none
Note: #560 worker tested wrong seam (modifiers-catalog vs home.arsenal-shop-filters) — left pending

## Totals
Done: 430 / 623
Walled: 142
Failed: 0
Remaining: 51

## Remaining
See `_integrator-seams.md` starting at rank 560.

## Batch 50 (seams #560–#569)
Passed: #560 (7 new, 29 total), #561 (7 new, 39 total), #562 (7 new, 46 total), #563 (7), #564 (7), #565 (7 new, 8 total), #567 (7 new, 91 total), #568 (7 new, 98 total), #569 (7 new, 20 total)
Walled: #566 (arena-room-render.ts does not exist)
Failed: none

## Totals
Done: 439 / 623
Walled: 143
Failed: 0
Remaining: 41

## Remaining
See `_integrator-seams.md` starting at rank 570.
