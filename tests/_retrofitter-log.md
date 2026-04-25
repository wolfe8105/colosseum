# Retrofitter Log — Updated 2026-04-25

## Test count: 2422 passing, 19 failing (all pre-existing)
## Test files: 213 passing, 8 failing (all pre-existing)

---

## Completed (this session + previous sessions)

### Core / Config
- src/config.ts → tests/config.test.ts ✓
- src/config.toast.ts → tests/config-toast.test.ts ✓
- src/navigation.ts → tests/navigation.test.ts ✓

### Auth
- src/auth.core.ts → tests/auth-core.test.ts ✓
- src/auth.rpc.ts → tests/auth-rpc.test.ts ✓
- src/auth.ops.ts → tests/auth-ops.test.ts ✓
- src/auth.follows.ts → tests/auth-follows.test.ts ✓
- src/auth.rivals.ts → tests/auth-rivals.test.ts ✓
- src/auth.gate.ts → tests/auth-gate.test.ts ✓
- src/auth.moderator.ts → tests/auth-moderator.test.ts ✓
- src/auth.profile.ts → tests/auth-profile.test.ts ✓ (TC16-18 blocked by source bug)

### Async Module
- src/async.state.ts → tests/async-state.test.ts ✓
- src/async.fetch.ts → tests/async-fetch.test.ts ✓
- src/async.utils.ts → tests/async-utils.test.ts ✓
- src/async.render.ts → tests/async-render.test.ts ✓
- src/async.render.wager.ts → tests/async-render-wager.test.ts ✓
- src/async.render.predictions.ts → tests/async-render-predictions.test.ts ✓
- src/async.rivals.ts → tests/async-rivals.test.ts ✓
- src/async.actions-predict.ts → tests/async-actions-predict.test.ts ✓

### Tokens
- src/tokens.balance.ts → tests/tokens-balance.test.ts ✓
- src/tokens.animations.ts → tests/tokens-animations.test.ts ✓
- src/tokens.milestones.ts → tests/tokens-milestones.test.ts ✓
- src/tokens.claims.ts → tests/tokens-claims.test.ts ✓

### Leaderboard
- src/leaderboard.state.ts → tests/leaderboard-state.test.ts ✓
- src/leaderboard.list.ts → tests/leaderboard-list.test.ts ✓
- src/leaderboard.render.ts → tests/leaderboard-render.test.ts ✓
- src/leaderboard.elo.ts → tests/leaderboard-elo.test.ts ✓
- src/leaderboard.fetch.ts → tests/leaderboard-fetch.test.ts ✓

### Notifications
- src/notifications.state.ts → tests/notifications-state.test.ts ✓
- src/notifications.actions.ts → tests/notifications-actions.test.ts ✓
- src/notifications.panel.ts → tests/notifications-panel.test.ts ✓
- src/notifications.ts → tests/notifications.test.ts ✓

### Modifiers
- src/modifiers-rpc.ts → tests/modifiers-rpc.test.ts ✓
- src/modifiers-handlers.ts → tests/modifiers-handlers.test.ts ✓
- src/modifiers-render.ts → tests/modifiers-render.test.ts ✓
- src/modifiers-catalog.ts → tests/modifiers-catalog.test.ts ✓

### Bounties
- src/bounties.dot.ts → tests/bounties-dot.test.ts ✓
- src/bounties.rpc.ts → tests/bounties-rpc.test.ts ✓
- src/bounties.render.ts → tests/bounties-render.test.ts ✓

### Staking
- src/staking.rpc.ts → tests/staking-rpc.test.ts ✓
- src/staking.render.ts → tests/staking-render.test.ts ✓
- src/staking.wire.ts → tests/staking-wire.test.ts ✓

### Tournaments
- src/tournaments.rpc.ts → tests/tournaments-rpc.test.ts ✓
- src/tournaments.render.ts → tests/tournaments-render.test.ts ✓
- src/tournaments.indicator.ts → tests/tournaments-indicator.test.ts ✓
- src/tournaments.ts → tests/tournaments-barrel.test.ts ✓

### Power-Ups
- src/powerups.shop.ts → tests/powerups-shop.test.ts ✓
- src/powerups.rpc.ts → tests/powerups-rpc.test.ts ✓
- src/powerups.loadout.ts → tests/powerups-loadout.test.ts ✓
- src/powerups.activation.ts → tests/powerups-activation.test.ts ✓
- src/powerups.overlays.ts → tests/powerups-overlays.test.ts ✓

### Profile Debate Archive
- src/profile-debate-archive.state.ts → tests/profile-debate-archive-state.test.ts ✓
- src/profile-debate-archive.filter.ts → tests/profile-debate-archive-filter.test.ts ✓
- src/profile-debate-archive.ts → tests/profile-debate-archive.test.ts ✓
- src/profile-debate-archive.css.ts → tests/profile-debate-archive-css.test.ts ✓
- src/profile-debate-archive.edit.ts → tests/profile-debate-archive-edit.test.ts ✓
- src/profile-debate-archive.picker.ts → tests/profile-debate-archive-picker.test.ts ✓
- src/profile-debate-archive.render.ts → tests/profile-debate-archive-render.test.ts ✓

### Reference Arsenal
- src/reference-arsenal.rpc.ts → tests/reference-arsenal-rpc.test.ts ✓
- src/reference-arsenal.debate.ts → tests/reference-arsenal-debate.test.ts ✓
- src/reference-arsenal.render.ts → tests/reference-arsenal-render.test.ts ✓
- src/reference-arsenal.loadout.ts → tests/reference-arsenal-loadout.test.ts ✓
- src/reference-arsenal.forge.ts → tests/reference-arsenal-forge.test.ts ✓
- src/reference-arsenal.forge-render.ts → tests/reference-arsenal-forge-render.test.ts ✓
- src/reference-arsenal.forge-submit.ts → tests/reference-arsenal-forge-submit.test.ts ✓
- src/reference-arsenal.forge-wiring.ts → tests/reference-arsenal-forge-wiring.test.ts ✓
- src/reference-arsenal.armory.sheet.ts → tests/reference-arsenal-armory-sheet.test.ts ✓
- src/reference-arsenal.armory.ts → tests/reference-arsenal-armory.test.ts ✓
- src/reference-arsenal.constants.ts → tests/reference-arsenal-constants.test.ts ✓
- src/reference-arsenal.utils.ts → tests/reference-arsenal-utils.test.ts ✓

### Voicememo
- src/voicememo.upload.ts → tests/voicememo-upload.test.ts ✓
- src/voicememo.player.ts → tests/voicememo-player.test.ts ✓
- src/voicememo.sheet.ts → tests/voicememo-sheet.test.ts ✓
- src/voicememo.record.ts → tests/voicememo-record.test.ts ✓
- src/voicememo.ts → tests/voicememo-barrel.test.ts ✓

### DM Module
- src/dm/dm.state.ts → tests/dm-state.test.ts ✓
- src/dm/dm.fetch.ts → tests/dm-fetch.test.ts ✓
- src/dm/dm.render.ts → tests/dm-render.test.ts ✓
- src/dm/dm.ts → tests/dm.test.ts ✓

### Rivals Presence
- src/rivals-presence.ts → tests/rivals-presence.test.ts ✓
- src/rivals-presence-channel.ts → tests/rivals-presence-channel.test.ts ✓
- src/rivals-presence-css.ts → tests/rivals-presence-css.test.ts ✓
- src/rivals-presence-popup.ts → tests/rivals-presence-popup.test.ts ✓

### Contracts
- src/contracts/dependency-clamps.ts → tests/dependency-clamps.test.ts (14 tests) ✓
- src/contracts/rpc-schemas.ts → (type/schema only — ARCH test via arena-feed-spec-chat import) ✓

### Misc (new batch)
- src/async.actions.ts → tests/async-actions.test.ts (2 tests) ✓
- src/safe-button.ts → tests/safe-button.test.ts (6 tests) ✓
- src/notifications.deeplink.ts → tests/notifications-deeplink.test.ts (11 tests) ✓
- src/push-notifications.ts → tests/push-notifications.test.ts (9 tests) ✓
- src/profile-socials.ts → tests/profile-socials.test.ts (7 tests) ✓

### Arena (new batch)
- src/arena/arena-css-feed-phase4-5.ts → tests/arena-css-feed-phase4-5.test.ts (5 tests) ✓
- src/arena/arena-ads.ts → tests/arena-ads.test.ts (9 tests) ✓
- src/arena/arena-bounty-claim.ts → tests/arena-bounty-claim.test.ts (9 tests) ✓
- src/arena/arena-lobby.open-debates.ts → tests/arena-lobby-open-debates.test.ts (9 tests) ✓
- src/arena/arena-config-mode-select.ts → tests/arena-config-mode-select.test.ts (12 tests) ✓
- src/arena/arena-config-settings.ts → tests/arena-config-settings.test.ts (13 tests) ✓
- src/arena/arena-feed-spec-chat.ts → tests/arena-feed-spec-chat.test.ts (12 tests) ✓

### Pages (new batch)
- src/pages/plinko-password.ts → tests/plinko-password.test.ts (10 tests) ✓
- src/pages/plinko-step2-age.ts → tests/plinko-step2-age.test.ts (7 tests) ✓
- src/pages/plinko-step4-step5.ts → tests/plinko-step4-step5.test.ts (5 tests) ✓
- src/pages/group-banner-css.ts → tests/group-banner-css.test.ts (4 tests) ✓

### Pages
- src/pages/plinko-state.ts → tests/plinko-state.test.ts ✓
- src/pages/spectate.share.ts → tests/spectate-share.test.ts ✓
- src/pages/home.invite-html.ts → tests/home-invite-html.test.ts ✓
- src/pages/home.invite-wiring.ts → tests/home-invite-wiring.test.ts ✓
- src/pages/home.invite.ts → tests/home-invite.test.ts ✓
- src/pages/home.invite-render.ts → tests/home-invite-render.test.ts ✓
- src/pages/home.invite-sheet.ts → tests/home-invite-sheet.test.ts ✓

### Arena CSS Injectors (all idempotency-free, inject-always)
- src/arena/arena-css-after-effects.ts → tests/arena-css-after-effects.test.ts ✓
- src/arena/arena-css-feed-controls.ts → tests/arena-css-feed-controls.test.ts ✓
- src/arena/arena-css-feed-fireworks.ts → tests/arena-css-feed-fireworks.test.ts ✓
- src/arena/arena-css-feed-room.ts → tests/arena-css-feed-room.test.ts ✓
- src/arena/arena-css-feed-spec-chat.ts → tests/arena-css-feed-spec-chat.test.ts ✓
- src/arena/arena-css-feed-stream.ts → tests/arena-css-feed-stream.test.ts ✓
- src/arena/arena-css-lobby.ts → tests/arena-css-lobby.test.ts ✓
- src/arena/arena-css-misc.ts → tests/arena-css-misc.test.ts ✓
- src/arena/arena-css-mode-select.ts → tests/arena-css-mode-select.test.ts ✓
- src/arena/arena-css-moderator.ts → tests/arena-css-moderator.test.ts ✓
- src/arena/arena-css-post-debate.ts → tests/arena-css-post-debate.test.ts ✓
- src/arena/arena-css-pre-debate.ts → tests/arena-css-pre-debate.test.ts ✓
- src/arena/arena-css-queue-match.ts → tests/arena-css-queue-match.test.ts ✓
- src/arena/arena-css-ranked.ts → tests/arena-css-ranked.test.ts ✓
- src/arena/arena-css-references-phase3.ts → tests/arena-css-references-phase3.test.ts ✓
- src/arena/arena-css-references.ts → tests/arena-css-references.test.ts ✓
- src/arena/arena-css-room-input.ts → tests/arena-css-room-input.test.ts ✓
- src/arena/arena-css-room.ts → tests/arena-css-room.test.ts ✓
- src/arena/arena-css-transcript.ts → tests/arena-css-transcript.test.ts ✓
- src/arena/arena-css-unplugged.ts → tests/arena-css-unplugged.test.ts ✓
- src/arena/arena-entrance-css.ts → tests/arena-entrance-css.test.ts ✓ (has _cssInjected guard)
- src/arena/arena-css.ts → tests/arena-css-orchestrator.test.ts ✓ (orchestrator)

### Arena Non-CSS
- src/arena/arena-constants.ts → tests/arena-constants.test.ts ✓
- src/arena/arena-core.utils.ts → tests/arena-core-utils.test.ts ✓
- src/arena/arena-entrance-render.ts → tests/arena-entrance-render.test.ts ✓
- src/arena/arena-entrance.ts → tests/arena-entrance.test.ts ✓
- src/arena/arena-sounds-core.ts → tests/arena-sounds-core.test.ts ✓
- src/arena/arena-match-timers.ts → tests/arena-match-timers.test.ts ✓
- src/arena/arena-deepgram.token.ts → tests/arena-deepgram-token.test.ts ✓
- src/arena/arena-config-round-picker.ts → tests/arena-config-round-picker.test.ts ✓
- src/arena/arena-room-live-messages.ts → tests/arena-room-live-messages.test.ts ✓
- src/arena/arena-feed-state.ts → tests/arena-feed-state.test.ts ✓
- src/arena/arena-realtime-client.ts → tests/arena-realtime-client.test.ts ✓
- src/arena/arena-room-end-nulled.ts → tests/arena-room-end-nulled.test.ts ✓
- src/arena/arena-feed-transcript.ts → tests/arena-feed-transcript.test.ts ✓
- src/arena/arena-pending-challenges.ts → tests/arena-pending-challenges.test.ts ✓
- src/arena/arena-state.ts → tests/arena-state.test.ts ✓
- src/arena/arena-lobby.cards.ts → tests/arena-lobby-cards.test.ts ✓
- src/arena/arena-mod-scoring.ts → tests/arena-mod-scoring.test.ts ✓
- src/arena/arena-config-category.ts → tests/arena-config-category.test.ts ✓
- src/arena/arena-loadout-presets.ts → tests/arena-loadout-presets.test.ts ✓
- src/arena/arena-match-found.ts → tests/arena-match-found.test.ts ✓
- src/arena/arena-match-flow.ts → tests/arena-match-flow.test.ts ✓
- src/arena/arena-intro-music.ts → tests/arena-intro-music.test.ts ✓
- src/arena/arena-queue.ts → tests/arena-queue.test.ts ✓
- src/arena/arena-room-enter.ts → tests/arena-room-enter.test.ts ✓
- src/arena/arena-room-end.ts → tests/arena-room-end.test.ts ✓
- src/arena/arena-room-end-scores.ts → tests/arena-room-end-scores.test.ts ✓
- src/arena/arena-room-end-transcript.ts → tests/arena-room-end-transcript.test.ts ✓
- src/arena/arena-room-end-after-effects.ts → tests/arena-room-end-after-effects.test.ts ✓
- src/arena/arena-room-ai-scoring.ts → tests/arena-room-ai-scoring.test.ts ✓
- src/arena/arena-room-ai-response.ts
- src/arena/arena-room-voicememo.ts → tests/arena-room-voicememo.test.ts (20 tests) ✓
- src/arena/arena-room-live-input.ts → tests/arena-room-live-input.test.ts (13 tests) ✓
- src/arena/arena-room-live-audio.ts → tests/arena-room-live-audio.test.ts (12 tests) ✓
- src/arena/arena-room-live-poll.ts → tests/arena-room-live-poll.test.ts (17 tests) ✓
- src/arena/arena-room-render.ts → tests/arena-room-render.test.ts (16 tests) ✓
- src/arena/arena-room-predebate.ts → tests/arena-room-predebate.test.ts (17 tests) ✓
- src/arena/arena-room-end-render.ts → tests/arena-room-end-render.test.ts (14 tests) ✓
- src/arena/arena-room-end-finalize.ts → tests/arena-room-end-finalize.test.ts (14 tests) ✓
- src/arena/arena-private-lobby.join.ts → tests/arena-private-lobby-join.test.ts (8 tests) ✓
- src/arena/arena-private-lobby.ts → tests/arena-private-lobby.test.ts (15 tests) ✓
- src/arena/arena-private-picker.ts → tests/arena-private-picker.test.ts (18 tests) ✓
- src/arena/arena-lobby.ts → tests/arena-lobby.test.ts (17 tests) ✓ → tests/arena-room-ai-response.test.ts ✓
- src/arena/arena-mod-refs.ts → tests/arena-mod-refs.test.ts (2 tests) ✓
- src/arena/arena-mod-refs-ai.ts → tests/arena-mod-refs-ai.test.ts (10 tests) ✓
- src/arena/arena-mod-refs-form.ts → tests/arena-mod-refs-form.test.ts (14 tests) ✓
- src/arena/arena-mod-refs-ruling.ts → tests/arena-mod-refs-ruling.test.ts (11 tests) ✓
- src/arena/arena-mod-debate-waiting.ts → tests/arena-mod-debate-waiting.test.ts (10 tests) ✓

### Feed / Cards
- src/feed-card.ts → tests/feed-card.test.ts ✓
- src/cards.helpers.ts → tests/cards-helpers.test.ts ✓

### Misc
- src/tiers.ts → tests/tiers.test.ts ✓
- src/share.ts → tests/share.test.ts ✓
- src/share.ui.ts → tests/share-ui.test.ts ✓
- src/search.ts → tests/search.test.ts ✓
- src/paywall.ts → tests/paywall.test.ts ✓
- src/onboarding-drip.ts → tests/onboarding-drip.test.ts ✓
- src/intro-music-save.ts → tests/intro-music-save.test.ts ✓
- src/intro-music-css.ts → tests/intro-music-css.test.ts ✓
- src/intro-music.ts → tests/intro-music.test.ts ✓
- src/analytics.ts → tests/analytics.test.ts ✓
- src/analytics.utils.ts → tests/analytics-utils.test.ts ✓
- src/scoring.ts → tests/scoring.test.ts ✓
- src/nudge.ts → tests/nudge.test.ts ✓
- src/badge.ts → tests/badge.test.ts ✓
- src/depth-gate.ts → tests/depth-gate.test.ts ✓
- src/plinko-helpers.ts → tests/plinko-helpers.test.ts ✓
- src/settings-helpers.ts → tests/settings-helpers.test.ts ✓
- src/spectate-utils.ts → tests/spectate-utils.test.ts ✓
- src/groups-utils.ts → tests/groups-utils.test.ts ✓
- src/payments.ts → tests/payments.test.ts ✓

### Pre-existing tests
- tests/f47-moderator-scoring.test.ts ✓
- tests/f48-mod-debate.test.ts (8 pre-existing failures)

---

## Skipped (type-only — no runtime exports to test)
- src/async.types.ts
- src/auth.types.ts
- src/bounties.types.ts
- src/cards.types.ts
- src/config.types.ts
- src/leaderboard.types.ts
- src/notifications.types.ts
- src/powerups.types.ts
- src/profile-debate-archive.types.ts
- src/reference-arsenal.types.ts
- src/staking.types.ts
- src/tokens.types.ts
- src/tournaments.types.ts
- src/webrtc.types.ts
- src/arena/arena-types*.ts (all)
- src/pages/*.types.ts (all)
- src/dm/dm.types.ts
- src/arena/arena-deepgram.types.ts

---

## Walled (too complex / too many deps to mock safely)
- tests/f48-mod-debate.test.ts — 8 pre-existing failures, blocked
- src/webrtc.* — WebRTC/ICE/audio browser APIs, no jsdom support
- src/cards.ts — Canvas API (no jsdom support for canvas drawing)

---

## Remaining (priority order)

### Arena files remaining
- src/arena/arena-sounds.ts (WebAudio API — may wall)
- src/arena/arena-deepgram.ts (large, realtime browser API)
- src/arena/arena-core.ts
- src/arena/arena-mod-debate-picker.ts → tests/arena-mod-debate-picker.test.ts (13 tests) ✓
- src/arena/arena-mod-debate-poll.ts → tests/arena-mod-debate-poll.test.ts (15 tests) ✓
- src/arena/arena-mod-queue-browse.ts → tests/arena-mod-queue-browse.test.ts (22 tests) ✓
- src/arena/arena-mod-queue-status.ts → tests/arena-mod-queue-status.test.ts (18 tests) ✓
- src/arena/arena-feed-heartbeat.ts → tests/arena-feed-heartbeat.test.ts (18 tests) ✓
- src/arena/arena-feed-disconnect.ts → tests/arena-feed-disconnect.test.ts (15 tests) ✓
- src/arena/arena-feed-disconnect-debater.ts → tests/arena-feed-disconnect-debater.test.ts (8 tests) ✓
- src/arena/arena-feed-disconnect-mod.ts → tests/arena-feed-disconnect-mod.test.ts (13 tests) ✓
- src/arena/arena-feed-ui.ts → tests/arena-feed-ui.test.ts (21 tests) ✓
- src/arena/arena-feed-realtime.ts → tests/arena-feed-realtime.test.ts ✓
- src/arena/arena-feed-wiring.ts → tests/arena-feed-wiring.test.ts ✓
- src/arena/arena-feed-wiring-debater.ts → tests/arena-feed-wiring-debater.test.ts ✓
- src/arena/arena-feed-wiring-mod.ts → tests/arena-feed-wiring-mod.test.ts ✓
- src/arena/arena-feed-wiring-spectator.ts → tests/arena-feed-wiring-spectator.test.ts ✓
- src/arena/arena-feed-events.ts → tests/arena-feed-events.test.ts ✓
- src/arena/arena-feed-events-render.ts → tests/arena-feed-events-render.test.ts ✓
- src/arena/arena-feed-machine-ads.ts → tests/arena-feed-machine-ads.test.ts ✓
- src/arena/arena-feed-machine-pause.ts → tests/arena-feed-machine-pause.test.ts ✓
- src/arena/arena-feed-machine-turns.ts → tests/arena-feed-machine-turns.test.ts ✓
- src/arena/arena-feed-references.ts → tests/arena-feed-references.test.ts ✓
- src/arena/arena-feed-room.ts → tests/arena-feed-room.test.ts (33 tests) ✓
- src/arena/arena-feed-spec-chat.ts
- src/arena/arena-config-*.ts (remaining)

### Barrel files needing ARCH tests only
- src/arena.ts → barrels.test.ts (ARCH)
- src/async.ts → barrels.test.ts (ARCH)
- src/auth.ts → barrels.test.ts (ARCH)
- src/leaderboard.ts → barrels.test.ts (ARCH)
- src/modifiers.ts (or inline)
- src/powerups.ts → barrels.test.ts (ARCH)
- src/reference-arsenal.ts → barrels.test.ts (ARCH)
- src/staking.ts → barrels.test.ts (ARCH)
- src/tokens.ts → barrels.test.ts (ARCH)

### Page files remaining
- src/pages/* (many large page files — not yet tackled)
