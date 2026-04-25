# Retrofitter Log — Updated 2026-04-24

## Test count: 1264 passing, 11 failing (8 pre-existing f48-mod-debate + 3 pre-existing auth-profile source bug)
## Test files: 102 passing, 2 failing

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

### Async Module
- src/async.state.ts → tests/async-state.test.ts ✓
- src/async.fetch.ts → tests/async-fetch.test.ts ✓
- src/async.utils.ts → tests/async-utils.test.ts ✓
- src/async.render.ts → tests/async-render.test.ts ✓
- src/async.render.wager.ts → tests/async-render-wager.test.ts ✓
- src/async.rivals.ts → tests/async-rivals.test.ts ✓
- src/async.actions-predict.ts → tests/async-actions-predict.test.ts ✓
- src/async.actions.ts → tests/barrels.test.ts (ARCH) ✓

### Tokens
- src/tokens.balance.ts → tests/tokens-balance.test.ts ✓
- src/tokens.animations.ts → tests/tokens-animations.test.ts ✓
- src/tokens.milestones.ts → tests/tokens-milestones.test.ts ✓
- src/tokens.claims.ts → tests/tokens-claims.test.ts ✓

### Leaderboard
- src/leaderboard.state.ts → tests/leaderboard-state.test.ts ✓
- src/leaderboard.list.ts → tests/leaderboard-list.test.ts ✓
- src/leaderboard.render.ts → tests/leaderboard-render.test.ts ✓

### Notifications
- src/notifications.state.ts → tests/notifications-state.test.ts ✓
- src/notifications.actions.ts → tests/notifications-actions.test.ts ✓
- src/notifications.panel.ts → tests/notifications-panel.test.ts ✓
- src/notifications.ts → tests/notifications.test.ts ✓

### Modifiers
- src/modifiers-rpc.ts → tests/modifiers-rpc.test.ts ✓
- src/modifiers-handlers.ts → tests/modifiers-handlers.test.ts ✓

### Bounties
- src/bounties.dot.ts → tests/bounties-dot.test.ts ✓
- src/bounties.rpc.ts → tests/bounties-rpc.test.ts ✓
- src/bounties.ts → tests/barrels.test.ts (ARCH) ✓

### Staking
- src/staking.rpc.ts → tests/staking-rpc.test.ts ✓
- src/staking.render.ts → tests/staking-render.test.ts ✓
- src/staking.ts → tests/barrels.test.ts (ARCH) ✓

### Tournaments
- src/tournaments.rpc.ts → tests/tournaments-rpc.test.ts ✓
- src/tournaments.render.ts → tests/tournaments-render.test.ts ✓
- src/tournaments.indicator.ts → tests/tournaments-indicator.test.ts ✓
- src/tournaments.ts → tests/tournaments-barrel.test.ts ✓

### Power-Ups
- src/powerups.shop.ts → tests/powerups-shop.test.ts ✓
- src/powerups.ts → tests/barrels.test.ts (ARCH) ✓
- src/staking.wire.ts → tests/staking-wire.test.ts ✓

### Profile Debate Archive
- src/profile-debate-archive.state.ts → tests/profile-debate-archive-state.test.ts ✓
- src/profile-debate-archive.filter.ts → tests/profile-debate-archive-filter.test.ts ✓
- src/profile-debate-archive.ts → tests/profile-debate-archive.test.ts ✓

### Misc
- src/tiers.ts → tests/tiers.test.ts ✓
- src/share.ts → tests/share.test.ts ✓
- src/search.ts → tests/search.test.ts ✓
- src/paywall.ts → tests/paywall.test.ts ✓
- src/rivals-presence.ts → tests/rivals-presence.test.ts ✓
- src/onboarding-drip.ts → tests/onboarding-drip.test.ts ✓
- src/intro-music-save.ts → tests/intro-music-save.test.ts ✓

### Pre-existing / This Session
- tests/f47-moderator-scoring.test.ts ✓
- tests/async-render-predictions.test.ts ✓
- tests/arena-core-utils.test.ts ✓

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

---

## Walled (too complex / too many deps to mock safely without source changes)
- tests/f48-mod-debate.test.ts — 8 pre-existing failures, blocked

---

## Remaining (priority order)

### Small / Pure (tackle next)
- src/auth.profile.ts → tests/auth-profile.test.ts ✓ (16/19; TC16-18 blocked by source bug in showUserProfile querySelector — see note)
- src/modifiers-render.ts → tests/modifiers-render.test.ts ✓
- src/modifiers-catalog.ts → tests/modifiers-catalog.test.ts ✓ (pre-existing)
- src/scoring.ts
- src/nudge.ts
- src/analytics.ts / analytics.utils.ts
- src/share.ui.ts
- src/rivals-presence-channel.ts → tests/rivals-presence-channel.test.ts ✓
- src/rivals-presence-css.ts → tests/rivals-presence-css.test.ts ✓
- src/rivals-presence-popup.ts → tests/rivals-presence-popup.test.ts ✓
- src/powerups.rpc.ts → tests/powerups-rpc.test.ts ✓ (pre-existing)
- src/powerups.loadout.ts → tests/powerups-loadout.test.ts ✓
- src/powerups.activation.ts → tests/powerups-activation.test.ts ✓
- src/powerups.overlays.ts → tests/powerups-overlays.test.ts ✓
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
- src/voicememo.upload.ts → tests/voicememo-upload.test.ts ✓
- src/voicememo.player.ts → tests/voicememo-player.test.ts ✓
- src/voicememo.sheet.ts → tests/voicememo-sheet.test.ts ✓
- src/voicememo.record.ts → tests/voicememo-record.test.ts ✓
- src/voicememo.ts → tests/voicememo-barrel.test.ts ✓
- src/pages/plinko-state.ts → tests/plinko-state.test.ts ✓
- src/pages/spectate.share.ts → tests/spectate-share.test.ts ✓
- src/pages/home.invite-html.ts → tests/home-invite-html.test.ts ✓
- src/pages/home.invite-wiring.ts → tests/home-invite-wiring.test.ts ✓
- src/pages/home.invite.ts → tests/home-invite.test.ts ✓
- src/pages/home.invite-render.ts → tests/home-invite-render.test.ts ✓
- src/pages/home.invite-sheet.ts → tests/home-invite-sheet.test.ts ✓
- src/scoring.ts → tests/scoring.test.ts ✓ (pre-existing)
- src/nudge.ts → tests/nudge.test.ts ✓ (pre-existing)
- src/analytics.utils.ts → tests/analytics-utils.test.ts ✓ (pre-existing)
- src/share.ui.ts → tests/share-ui.test.ts ✓ (pre-existing)
- src/pages/* (many large page files)

### Large / Arena (wall candidates)
- src/arena/* (31 files, highly integrated, arena-level state machines)
- src/webrtc.* (audio/ICE/signaling — browser APIs)
