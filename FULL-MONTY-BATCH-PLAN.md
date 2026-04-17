# Full Monty Batch Plan — 5-Agent Audit
**Generated:** 2026-04-17
**Method:** `THE-MODERATOR-AUDIT-METHOD-V3.md` (5 parallel agents per stage)
**Scope:** `src/` + `api/` — TypeScript and JavaScript source files only
**File count:** 338 files
**Batch count:** 85 batches
**Batch limit:** 40,000 bytes, 4 files max

---

## Parallelism Rules

### What CAN run in parallel
- Any two batches that do not share files — which is every batch pair, since files are not duplicated across batches.
- **All 85 batches are fully parallel with each other at the batch level.** Spin up as many CC sessions as you want simultaneously.

### What CANNOT run in parallel (within a single batch)
The 4-stage pipeline inside each batch is strictly sequential:
```
Stage 1 → Stage 1.5 → Stage 2 → Stage 3
```
Each stage within a batch must complete before the next starts. The manifest enforces this. Never run two stages of the same batch concurrently.

### The one shared resource: `audit/manifest.json`
Each CC session writes to its own batch subdirectory under `audit/`. The manifest is per-run (not global), so **parallel CC sessions do not share a manifest** — each session manages its own. No locking needed.

### The one shared output: `AUDIT-FINDINGS.md`
Do NOT have parallel sessions write to `AUDIT-FINDINGS.md` simultaneously. Findings consolidation is a post-run human step (or a dedicated triage session run after all batches complete).

---

## Practical Parallelism Ceiling

At the current plan (Max 5x Claude plan):
- Run **5 CC sessions in parallel** comfortably
- Each session handles one batch at a time (Stages 1 → 1.5 → 2 → 3)
- When a session finishes its batch, feed it the next unstarted batch
- 85 batches ÷ 5 parallel sessions ≈ **17 rounds** to completion

If you upgrade to Max 20x: run up to 20 parallel sessions → ~5 rounds.

---

## Batch Index

| Batch | Files | Size | File List |
|-------|-------|------|-----------|
| 01 | 3 | 39,996 | profile-depth.data.ts · arena-private-picker.ts · auth.ts |
| 02 | 4 | 39,992 | arena-lobby.ts · auth.profile.ts · groups.challenges.ts · arena-match-timers.ts |
| 03 | 4 | 39,963 | spectate.ts · arena-queue.ts · bounties.render.ts · reference-arsenal.armory.sheet.ts |
| 04 | 4 | 39,993 | spectate.render.ts · arena-state.ts · arena-feed-events-render.ts · reference-arsenal.rpc.ts |
| 05 | 4 | 39,977 | config.ts · arena-feed-room.ts · debate-landing.ts · staking.render.ts |
| 06 | 4 | 39,970 | reference-arsenal.armory.ts · challenge.html.js · arena-deepgram.ts · auth.core.ts |
| 07 | 4 | 39,321 | arena-room-render.ts · async.actions-predict.ts · arena-entrance-css.ts · async.render.predictions.ts |
| 08 | 4 | 36,259 | arena-css-references-phase3.ts · groups.settings.ts · groups.auditions.ts · arena-feed-spec-chat.ts |
| 09 | 4 | 35,041 | arena-loadout-presets.ts · login.forms.ts · arena-room-predebate.ts · arena-private-lobby.ts |
| 10 | 4 | 34,062 | payments.ts · onboarding-drip.ts · go-respond.js · profile.html.js |
| 11 | 4 | 32,758 | auto-debate.render.ts · groups.members.modal.ts · arena-feed-wiring-mod.ts · plinko-step3-username.ts |
| 12 | 4 | 31,144 | cards.ts · arena-feed-machine-ads.ts · login.ts · arena-config-mode-select.ts |
| 13 | 4 | 30,165 | home.ts · arena-css-lobby.ts · arena-feed-machine-turns.ts · profile.css.js |
| 14 | 4 | 29,411 | arena-room-live-poll.ts · profile-debate-archive.css.ts · paywall.ts · arena-room-end-render.ts |
| 15 | 4 | 29,069 | spectate.render-timeline.ts · notifications.panel.ts · arena-intro-music.ts · arena-room-end-finalize.ts |
| 16 | 4 | 28,218 | profile-depth.section.ts · home.depth.ts · home.overlay.ts · webrtc.engine.ts |
| 17 | 4 | 26,993 | arena-css-feed-phase4-5.ts · auto-debate.ts · arena-match-found.ts · voicememo.record.ts |
| 18 | 4 | 26,412 | arena-feed-machine-pause.ts · async.render.takes.ts · arena-bounty-claim.ts · powerups.loadout.ts |
| 19 | 4 | 25,898 | reference-arsenal.forge-render.ts · arena-mod-debate-picker.ts · auth.moderator.ts · arena-config-settings.ts |
| 20 | 4 | 24,835 | arena-feed-references.ts · groups.detail.ts · share.ts · async.wiring.ts |
| 21 | 4 | 24,349 | profile-debate-archive.render.ts · arena-feed-wiring.ts · cosmetics.render.ts · async.ts |
| 22 | 4 | 23,442 | group-banner-upload.ts · async.fetch.ts · arena-mod-queue-browse.ts · arena-core.ts |
| 23 | 4 | 22,910 | tiers.ts · home.profile.ts · arena-mod-refs-ruling.ts · async.state.ts |
| 24 | 4 | 22,397 | arena-room-live-audio.ts · webrtc.ts · arena-css-queue-match.ts · async.actions-challenge.ts |
| 25 | 4 | 21,627 | modifiers-render.ts · arena-config-category.ts · arena-feed-ui.ts · webrtc.peer.ts |
| 26 | 4 | 20,864 | arena-mod-queue-status.ts · reference-arsenal.render.ts · intro-music.ts · arena-css-post-debate.ts |
| 27 | 4 | 20,404 | arena-room-ai-response.ts · leaderboard.list.ts · spectate.types.ts · group-banner-css.ts |
| 28 | 4 | 19,626 | arena-room-voicememo.ts · arena-feed-state.ts · home.invite-render.ts · tokens.claims.ts |
| 29 | 4 | 19,415 | arena-feed-events.ts · groups.feed.ts · settings.wiring.ts · webrtc.signaling.ts |
| 30 | 4 | 19,202 | groups.members.ts · groups.members.modal.html.ts · groups.ts · arena-pending-challenges.ts |
| 31 | 4 | 18,802 | leaderboard.elo.ts · arena-feed-wiring-debater.ts · debate-landing.data.ts · arena-ads.ts |
| 32 | 4 | 18,364 | arena-css-references.ts · powerups.overlays.ts · cosmetics.ts · spectate.chat.ts |
| 33 | 4 | 17,773 | arena-css-room.ts · profile-depth.render.ts · arena-css-feed-controls.ts · webrtc.audio.ts |
| 34 | 4 | 17,403 | analytics.utils.ts · leaderboard.fetch.ts · profile-debate-archive.edit.ts · tokens.animations.ts |
| 35 | 4 | 17,221 | home.arsenal-shop-render.ts · arena-match-flow.ts · arena-feed-heartbeat.ts · arena-room-end.ts |
| 36 | 4 | 16,860 | home.arsenal-shop-sheet.ts · cosmetics.modal.ts · groups.utils.ts · rivals-presence-popup.ts |
| 37 | 4 | 16,381 | arena-mod-scoring.ts · arena-feed-wiring-spectator.ts · reference-arsenal.forge-wiring.ts · intro-music-css.ts |
| 38 | 4 | 16,044 | rivals-presence-channel.ts · arena-mod-refs-form.ts · leaderboard.render.ts · settings.moderator.ts |
| 39 | 4 | 15,795 | arena-constants.ts · arena-mod-debate-poll.ts · home.arsenal.ts · staking.wire.ts |
| 40 | 4 | 15,514 | async.render.wager.ts · settings.save.ts · arena-css-moderator.ts · tokens.milestones.ts |
| 41 | 4 | 14,957 | arena-room-ai-scoring.ts · arena-lobby.cards.ts · async.rivals.ts · auth.ops.ts |
| 42 | 4 | 14,633 | profile-depth.state.ts · profile.js · arena-css-ranked.ts · auth.types.ts |
| 43 | 4 | 14,390 | arena-room-end-after-effects.ts · arena-css-mode-select.ts · share.ui.ts · spectate.vote.ts |
| 44 | 4 | 14,206 | arena-entrance-render.ts · reference-arsenal.loadout.ts · arena-private-lobby.join.ts · arena-sounds.ts |
| 45 | 4 | 13,965 | arena-mod-debate-waiting.ts · webrtc.state.ts · groups.auditions.render.ts · home.invite-sheet.ts |
| 46 | 4 | 13,714 | home.feed.ts · config.types.ts · profile-depth.tier.ts · home.arsenal-shop-wiring.ts |
| 47 | 4 | 13,603 | arena-css-feed-spec-chat.ts · tournaments.rpc.ts · home.nav.ts · plinko-auth-return.ts |
| 48 | 4 | 13,369 | settings.load.ts · analytics.ts · arena-feed-realtime.ts · arena-css-room-input.ts |
| 49 | 4 | 13,074 | modifiers-rpc.ts · voicememo.ts · challenge.js · arena-feed-disconnect-debater.ts |
| 50 | 4 | 12,590 | arena-room-live-input.ts · arena-feed-transcript.ts · rivals-presence-css.ts · scoring.ts |
| 51 | 4 | 12,051 | voicememo.sheet.ts · groups.nav.ts · reference-arsenal.types.ts · reference-arsenal.forge-submit.ts |
| 52 | 4 | 11,675 | auth.follows.ts · arena-entrance.ts · tournaments.render.ts · powerups.activation.ts |
| 53 | 4 | 11,545 | arena-types-feed-room.ts · bounties.rpc.ts · voicememo.player.ts · auto-debate.vote.ts |
| 54 | 4 | 11,315 | staking.rpc.ts · arena.ts · plinko-step1-method.ts · rivals-presence.ts |
| 55 | 4 | 11,046 | plinko-helpers.ts · reference-arsenal.ts · auth.gate.ts · webrtc.types.ts |
| 56 | 4 | 10,772 | notifications.ts · tokens.balance.ts · arena-feed-disconnect.ts · groups.load.ts |
| 57 | 4 | 10,453 | arena-feed-disconnect-mod.ts · tournaments.indicator.ts · home.arsenal-shop.ts · profile-depth.ts |
| 58 | 4 | 10,065 | powerups.rpc.ts · arena-sounds-core.ts · arena-css.ts · arena-room-end-scores.ts |
| 59 | 4 | 9,852 | settings.ts · arena-config-round-picker.ts · home.invite-html.ts · group-banner.ts |
| 60 | 4 | 9,647 | profile-debate-archive.picker.ts · async.actions-post.ts · arena-css-feed-room.ts · nudge.ts |
| 61 | 4 | 9,412 | arena-css-transcript.ts · plinko-invite-nudge.ts · powerups.shop.ts · arena-css-feed-stream.ts |
| 62 | 4 | 9,036 | webrtc.turn.ts · arena-css-after-effects.ts · arena-room-end-transcript.ts · arena-mod-refs-ai.ts |
| 63 | 4 | 8,605 | config.toast.ts · webrtc.timer.ts · tokens.ts · notifications.state.ts |
| 64 | 4 | 8,331 | spectate.render-messages.ts · groups.create.ts · arena-css-pre-debate.ts · reference-arsenal.debate.ts |
| 65 | 4 | 7,963 | spectate.utils.ts · leaderboard.ts · voicememo.upload.ts · cards.helpers.ts |
| 66 | 4 | 7,656 | groups.state.ts · webrtc.ice.ts · home.invite-wiring.ts · modifiers.ts |
| 67 | 4 | 7,447 | home.invite.ts · auth.rpc.ts · intro-music-save.ts · arena-types.ts |
| 68 | 4 | 7,292 | groups.types.ts · plinko-password.ts · reference-arsenal.forge.ts · modifiers-catalog.ts |
| 69 | 4 | 6,908 | cards.types.ts · arena-css-misc.ts · arena-room-end-nulled.ts · terms.ts |
| 70 | 4 | 6,646 | profile.helpers.js · powerups.ts · arena-core.utils.ts · async.actions-react.ts |
| 71 | 4 | 6,428 | arena-room-live-messages.ts · settings.helpers.ts · notifications.types.ts · spectate.share.ts |
| 72 | 4 | 6,185 | notifications.actions.ts · arena-types-results.ts · auth.rivals.ts · async.types.ts |
| 73 | 4 | 5,946 | powerups.types.ts · profile-debate-archive.ts · reference-arsenal.constants.ts · invite.js |
| 74 | 4 | 5,474 | modifiers-handlers.ts · plinko-step2-age.ts · plinko.ts · arena-room-enter.ts |
| 75 | 4 | 5,043 | tournaments.ts · cosmetics.types.ts · home.state.ts · profile-debate-archive.filter.ts |
| 76 | 4 | 4,647 | arena-types-moderator.ts · arena-deepgram.token.ts · arena-mod-refs.ts · arena-css-feed-fireworks.ts |
| 77 | 4 | 4,321 | spectate.state.ts · async.render.ts · profile-debate-archive.types.ts · challenge.helpers.js |
| 78 | 4 | 4,104 | plinko-state.ts · bounties.dot.ts · tokens.types.ts · profile-depth.types.ts |
| 79 | 4 | 3,740 | arena-css-unplugged.ts · tournaments.types.ts · async.utils.ts · bounties.types.ts |
| 80 | 4 | 3,426 | leaderboard.state.ts · plinko-step4-step5.ts · arena-types-private-lobby.ts · leaderboard.types.ts |
| 81 | 4 | 3,121 | home.arsenal-shop-filters.ts · profile-debate-archive.state.ts · badge.ts · auto-debate.types.ts |
| 82 | 4 | 2,791 | staking.ts · navigation.ts · home.invite-types.ts · staking.types.ts |
| 83 | 4 | 2,309 | reference-arsenal.utils.ts · home.arsenal-shop-types.ts · arena-types-feed-list.ts · bounties.ts |
| 84 | 4 | 1,966 | arena-deepgram.types.ts · home.types.ts · arena-types-match.ts · debate-landing.types.ts |
| 85 | 3 | 1,095 | async.actions.ts · arena-types-ai-scoring.ts · login.types.ts |

---

## Full File Lists Per Batch

*(For pasting into CC orchestration prompt — substitute into `[FILE_LIST]`)*

**Batch 01**
```
src/pages/profile-depth.data.ts
src/arena/arena-private-picker.ts
src/auth.ts
```
**Batch 02**
```
src/arena/arena-lobby.ts
src/auth.profile.ts
src/pages/groups.challenges.ts
src/arena/arena-match-timers.ts
```
**Batch 03**
```
src/pages/spectate.ts
src/arena/arena-queue.ts
src/bounties.render.ts
src/reference-arsenal.armory.sheet.ts
```
**Batch 04**
```
src/pages/spectate.render.ts
src/arena/arena-state.ts
src/arena/arena-feed-events-render.ts
src/reference-arsenal.rpc.ts
```
**Batch 05**
```
src/config.ts
src/arena/arena-feed-room.ts
src/pages/debate-landing.ts
src/staking.render.ts
```
**Batch 06**
```
src/reference-arsenal.armory.ts
api/challenge.html.js
src/arena/arena-deepgram.ts
src/auth.core.ts
```
**Batch 07**
```
src/arena/arena-room-render.ts
src/async.actions-predict.ts
src/arena/arena-entrance-css.ts
src/async.render.predictions.ts
```
**Batch 08**
```
src/arena/arena-css-references-phase3.ts
src/pages/groups.settings.ts
src/pages/groups.auditions.ts
src/arena/arena-feed-spec-chat.ts
```
**Batch 09**
```
src/arena/arena-loadout-presets.ts
src/pages/login.forms.ts
src/arena/arena-room-predebate.ts
src/arena/arena-private-lobby.ts
```
**Batch 10**
```
src/payments.ts
src/onboarding-drip.ts
api/go-respond.js
api/profile.html.js
```
**Batch 11**
```
src/pages/auto-debate.render.ts
src/pages/groups.members.modal.ts
src/arena/arena-feed-wiring-mod.ts
src/pages/plinko-step3-username.ts
```
**Batch 12**
```
src/cards.ts
src/arena/arena-feed-machine-ads.ts
src/pages/login.ts
src/arena/arena-config-mode-select.ts
```
**Batch 13**
```
src/pages/home.ts
src/arena/arena-css-lobby.ts
src/arena/arena-feed-machine-turns.ts
api/profile.css.js
```
**Batch 14**
```
src/arena/arena-room-live-poll.ts
src/profile-debate-archive.css.ts
src/paywall.ts
src/arena/arena-room-end-render.ts
```
**Batch 15**
```
src/pages/spectate.render-timeline.ts
src/notifications.panel.ts
src/arena/arena-intro-music.ts
src/arena/arena-room-end-finalize.ts
```
**Batch 16**
```
src/pages/profile-depth.section.ts
src/pages/home.depth.ts
src/pages/home.overlay.ts
src/webrtc.engine.ts
```
**Batch 17**
```
src/arena/arena-css-feed-phase4-5.ts
src/pages/auto-debate.ts
src/arena/arena-match-found.ts
src/voicememo.record.ts
```
**Batch 18**
```
src/arena/arena-feed-machine-pause.ts
src/async.render.takes.ts
src/arena/arena-bounty-claim.ts
src/powerups.loadout.ts
```
**Batch 19**
```
src/reference-arsenal.forge-render.ts
src/arena/arena-mod-debate-picker.ts
src/auth.moderator.ts
src/arena/arena-config-settings.ts
```
**Batch 20**
```
src/arena/arena-feed-references.ts
src/pages/groups.detail.ts
src/share.ts
src/async.wiring.ts
```
**Batch 21**
```
src/profile-debate-archive.render.ts
src/arena/arena-feed-wiring.ts
src/pages/cosmetics.render.ts
src/async.ts
```
**Batch 22**
```
src/pages/group-banner-upload.ts
src/async.fetch.ts
src/arena/arena-mod-queue-browse.ts
src/arena/arena-core.ts
```
**Batch 23**
```
src/tiers.ts
src/pages/home.profile.ts
src/arena/arena-mod-refs-ruling.ts
src/async.state.ts
```
**Batch 24**
```
src/arena/arena-room-live-audio.ts
src/webrtc.ts
src/arena/arena-css-queue-match.ts
src/async.actions-challenge.ts
```
**Batch 25**
```
src/modifiers-render.ts
src/arena/arena-config-category.ts
src/arena/arena-feed-ui.ts
src/webrtc.peer.ts
```
**Batch 26**
```
src/arena/arena-mod-queue-status.ts
src/reference-arsenal.render.ts
src/intro-music.ts
src/arena/arena-css-post-debate.ts
```
**Batch 27**
```
src/arena/arena-room-ai-response.ts
src/leaderboard.list.ts
src/pages/spectate.types.ts
src/pages/group-banner-css.ts
```
**Batch 28**
```
src/arena/arena-room-voicememo.ts
src/arena/arena-feed-state.ts
src/pages/home.invite-render.ts
src/tokens.claims.ts
```
**Batch 29**
```
src/arena/arena-feed-events.ts
src/pages/groups.feed.ts
src/pages/settings.wiring.ts
src/webrtc.signaling.ts
```
**Batch 30**
```
src/pages/groups.members.ts
src/pages/groups.members.modal.html.ts
src/pages/groups.ts
src/arena/arena-pending-challenges.ts
```
**Batch 31**
```
src/leaderboard.elo.ts
src/arena/arena-feed-wiring-debater.ts
src/pages/debate-landing.data.ts
src/arena/arena-ads.ts
```
**Batch 32**
```
src/arena/arena-css-references.ts
src/powerups.overlays.ts
src/pages/cosmetics.ts
src/pages/spectate.chat.ts
```
**Batch 33**
```
src/arena/arena-css-room.ts
src/pages/profile-depth.render.ts
src/arena/arena-css-feed-controls.ts
src/webrtc.audio.ts
```
**Batch 34**
```
src/analytics.utils.ts
src/leaderboard.fetch.ts
src/profile-debate-archive.edit.ts
src/tokens.animations.ts
```
**Batch 35**
```
src/pages/home.arsenal-shop-render.ts
src/arena/arena-match-flow.ts
src/arena/arena-feed-heartbeat.ts
src/arena/arena-room-end.ts
```
**Batch 36**
```
src/pages/home.arsenal-shop-sheet.ts
src/pages/cosmetics.modal.ts
src/pages/groups.utils.ts
src/rivals-presence-popup.ts
```
**Batch 37**
```
src/arena/arena-mod-scoring.ts
src/arena/arena-feed-wiring-spectator.ts
src/reference-arsenal.forge-wiring.ts
src/intro-music-css.ts
```
**Batch 38**
```
src/rivals-presence-channel.ts
src/arena/arena-mod-refs-form.ts
src/leaderboard.render.ts
src/pages/settings.moderator.ts
```
**Batch 39**
```
src/arena/arena-constants.ts
src/arena/arena-mod-debate-poll.ts
src/pages/home.arsenal.ts
src/staking.wire.ts
```
**Batch 40**
```
src/async.render.wager.ts
src/pages/settings.save.ts
src/arena/arena-css-moderator.ts
src/tokens.milestones.ts
```
**Batch 41**
```
src/arena/arena-room-ai-scoring.ts
src/arena/arena-lobby.cards.ts
src/async.rivals.ts
src/auth.ops.ts
```
**Batch 42**
```
src/pages/profile-depth.state.ts
api/profile.js
src/arena/arena-css-ranked.ts
src/auth.types.ts
```
**Batch 43**
```
src/arena/arena-room-end-after-effects.ts
src/arena/arena-css-mode-select.ts
src/share.ui.ts
src/pages/spectate.vote.ts
```
**Batch 44**
```
src/arena/arena-entrance-render.ts
src/reference-arsenal.loadout.ts
src/arena/arena-private-lobby.join.ts
src/arena/arena-sounds.ts
```
**Batch 45**
```
src/arena/arena-mod-debate-waiting.ts
src/webrtc.state.ts
src/pages/groups.auditions.render.ts
src/pages/home.invite-sheet.ts
```
**Batch 46**
```
src/pages/home.feed.ts
src/config.types.ts
src/pages/profile-depth.tier.ts
src/pages/home.arsenal-shop-wiring.ts
```
**Batch 47**
```
src/arena/arena-css-feed-spec-chat.ts
src/tournaments.rpc.ts
src/pages/home.nav.ts
src/pages/plinko-auth-return.ts
```
**Batch 48**
```
src/pages/settings.load.ts
src/analytics.ts
src/arena/arena-feed-realtime.ts
src/arena/arena-css-room-input.ts
```
**Batch 49**
```
src/modifiers-rpc.ts
src/voicememo.ts
api/challenge.js
src/arena/arena-feed-disconnect-debater.ts
```
**Batch 50**
```
src/arena/arena-room-live-input.ts
src/arena/arena-feed-transcript.ts
src/rivals-presence-css.ts
src/scoring.ts
```
**Batch 51**
```
src/voicememo.sheet.ts
src/pages/groups.nav.ts
src/reference-arsenal.types.ts
src/reference-arsenal.forge-submit.ts
```
**Batch 52**
```
src/auth.follows.ts
src/arena/arena-entrance.ts
src/tournaments.render.ts
src/powerups.activation.ts
```
**Batch 53**
```
src/arena/arena-types-feed-room.ts
src/bounties.rpc.ts
src/voicememo.player.ts
src/pages/auto-debate.vote.ts
```
**Batch 54**
```
src/staking.rpc.ts
src/arena.ts
src/pages/plinko-step1-method.ts
src/rivals-presence.ts
```
**Batch 55**
```
src/pages/plinko-helpers.ts
src/reference-arsenal.ts
src/auth.gate.ts
src/webrtc.types.ts
```
**Batch 56**
```
src/notifications.ts
src/tokens.balance.ts
src/arena/arena-feed-disconnect.ts
src/pages/groups.load.ts
```
**Batch 57**
```
src/arena/arena-feed-disconnect-mod.ts
src/tournaments.indicator.ts
src/pages/home.arsenal-shop.ts
src/pages/profile-depth.ts
```
**Batch 58**
```
src/powerups.rpc.ts
src/arena/arena-sounds-core.ts
src/arena/arena-css.ts
src/arena/arena-room-end-scores.ts
```
**Batch 59**
```
src/pages/settings.ts
src/arena/arena-config-round-picker.ts
src/pages/home.invite-html.ts
src/pages/group-banner.ts
```
**Batch 60**
```
src/profile-debate-archive.picker.ts
src/async.actions-post.ts
src/arena/arena-css-feed-room.ts
src/nudge.ts
```
**Batch 61**
```
src/arena/arena-css-transcript.ts
src/pages/plinko-invite-nudge.ts
src/powerups.shop.ts
src/arena/arena-css-feed-stream.ts
```
**Batch 62**
```
src/webrtc.turn.ts
src/arena/arena-css-after-effects.ts
src/arena/arena-room-end-transcript.ts
src/arena/arena-mod-refs-ai.ts
```
**Batch 63**
```
src/config.toast.ts
src/webrtc.timer.ts
src/tokens.ts
src/notifications.state.ts
```
**Batch 64**
```
src/pages/spectate.render-messages.ts
src/pages/groups.create.ts
src/arena/arena-css-pre-debate.ts
src/reference-arsenal.debate.ts
```
**Batch 65**
```
src/pages/spectate.utils.ts
src/leaderboard.ts
src/voicememo.upload.ts
src/cards.helpers.ts
```
**Batch 66**
```
src/pages/groups.state.ts
src/webrtc.ice.ts
src/pages/home.invite-wiring.ts
src/modifiers.ts
```
**Batch 67**
```
src/pages/home.invite.ts
src/auth.rpc.ts
src/intro-music-save.ts
src/arena/arena-types.ts
```
**Batch 68**
```
src/pages/groups.types.ts
src/pages/plinko-password.ts
src/reference-arsenal.forge.ts
src/modifiers-catalog.ts
```
**Batch 69**
```
src/cards.types.ts
src/arena/arena-css-misc.ts
src/arena/arena-room-end-nulled.ts
src/pages/terms.ts
```
**Batch 70**
```
api/profile.helpers.js
src/powerups.ts
src/arena/arena-core.utils.ts
src/async.actions-react.ts
```
**Batch 71**
```
src/arena/arena-room-live-messages.ts
src/pages/settings.helpers.ts
src/notifications.types.ts
src/pages/spectate.share.ts
```
**Batch 72**
```
src/notifications.actions.ts
src/arena/arena-types-results.ts
src/auth.rivals.ts
src/async.types.ts
```
**Batch 73**
```
src/powerups.types.ts
src/profile-debate-archive.ts
src/reference-arsenal.constants.ts
api/invite.js
```
**Batch 74**
```
src/modifiers-handlers.ts
src/pages/plinko-step2-age.ts
src/pages/plinko.ts
src/arena/arena-room-enter.ts
```
**Batch 75**
```
src/tournaments.ts
src/pages/cosmetics.types.ts
src/pages/home.state.ts
src/profile-debate-archive.filter.ts
```
**Batch 76**
```
src/arena/arena-types-moderator.ts
src/arena/arena-deepgram.token.ts
src/arena/arena-mod-refs.ts
src/arena/arena-css-feed-fireworks.ts
```
**Batch 77**
```
src/pages/spectate.state.ts
src/async.render.ts
src/profile-debate-archive.types.ts
api/challenge.helpers.js
```
**Batch 78**
```
src/pages/plinko-state.ts
src/bounties.dot.ts
src/tokens.types.ts
src/pages/profile-depth.types.ts
```
**Batch 79**
```
src/arena/arena-css-unplugged.ts
src/tournaments.types.ts
src/async.utils.ts
src/bounties.types.ts
```
**Batch 80**
```
src/leaderboard.state.ts
src/pages/plinko-step4-step5.ts
src/arena/arena-types-private-lobby.ts
src/leaderboard.types.ts
```
**Batch 81**
```
src/pages/home.arsenal-shop-filters.ts
src/profile-debate-archive.state.ts
src/badge.ts
src/pages/auto-debate.types.ts
```
**Batch 82**
```
src/staking.ts
src/navigation.ts
src/pages/home.invite-types.ts
src/staking.types.ts
```
**Batch 83**
```
src/reference-arsenal.utils.ts
src/pages/home.arsenal-shop-types.ts
src/arena/arena-types-feed-list.ts
src/bounties.ts
```
**Batch 84**
```
src/arena/arena-deepgram.types.ts
src/pages/home.types.ts
src/arena/arena-types-match.ts
src/pages/debate-landing.types.ts
```
**Batch 85**
```
src/async.actions.ts
src/arena/arena-types-ai-scoring.ts
src/pages/login.types.ts
```

---

## Post-Run Triage

After all 85 batches complete:
1. One dedicated triage CC session reads all `audit/*/stage3.md` outputs
2. Merges findings into `AUDIT-FINDINGS.md`
3. This triage session is **sequential, not parallel** — it needs the full picture before writing

Do NOT run triage concurrently with any active batch session.
