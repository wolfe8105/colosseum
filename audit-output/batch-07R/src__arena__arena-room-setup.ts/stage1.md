# Stage 1 Outputs — arena-room-setup.ts

## Agent 01

1. comment — `// arena-room-setup.ts — pre-debate + room entry`
2. comment — `// Part of the arena.ts monolith split`
3. blank
4. import — `getCurrentProfile` from `../auth.ts`
5. import — `escapeHTML`, `DEBATE` from `../config.ts`
6. import — `safeRpc` from `../auth.ts`
7. import — `getPool`, `renderStakingPanel`, `wireStakingPanel` from `../staking.ts`
8. import — `getMyPowerUps`, `renderLoadout`, `wireLoadout`, `renderActivationBar`, `wireActivationBar`, `renderSilenceOverlay`, `renderRevealPopup`, `renderShieldIndicator`, `removeShieldIndicator`, `getOpponentPowerUps`, `hasMultiplier` from `../powerups.ts`
9. import — `nudge` from `../nudge.ts`
10. import — `view`, `currentDebate`, `screenEl`, `selectedModerator`, `selectedRuleset`, `selectedRanked`, `activatedPowerUps`, `shieldActive`, `equippedForDebate`, `silenceTimer`, `set_view`, `set_currentDebate`, `set_equippedForDebate`, `set_shieldActive`, `set_silenceTimer` from `./arena-state.ts`
11. import (type-only) — `CurrentDebate`, `DebateRole` from `./arena-types.ts`
12. import — `ROUND_DURATION`, `TEXT_MAX_CHARS` from `./arena-types.ts`
13. import — `isPlaceholder`, `formatTimer`, `pushArenaState` from `./arena-core.ts`
14. import — `renderInputControls`, `startLiveRoundTimer`, `initLiveAudio`, `addSystemMessage` from `./arena-room-live.ts`
15. import — `addReferenceButton`, `assignSelectedMod`, `startReferencePoll` from `./arena-mod-refs.ts`
16. import — `startModStatusPoll` from `./arena-mod-queue.ts`
17. import — `enterFeedRoom` from `./arena-feed-room.ts`
18. import — `renderLoadoutPicker` from `../reference-arsenal.ts`
19. import — `renderPresetBar` from `./arena-loadout-presets.ts`
20. import — `renderBountyClaimDropdown`, `resetBountyClaim` from `./arena-bounty-claim.ts`
21. import — `bountyDot` from `../bounties.ts`
22. blank
23. bind `showPreDebate` to function definition (exported)
24. blank
25. comment — `// Helper: refresh loadout panel after equip`
26. bind `showPreDebateLoadout` to function definition
27. blank
28. comment — `// ============================================================`
29. comment — `// DEBATE ROOM`
30. comment — `// ============================================================`
31. blank
32. bind `enterRoom` to function definition (exported)
33. blank
34. bind `_renderRoom` to function definition

## Agent 02

1. comment — `// arena-room-setup.ts — pre-debate + room entry`
2. comment — `// Part of the arena.ts monolith split`
3. blank
4. import — `getCurrentProfile` from `'../auth.ts'`
5. import — `escapeHTML`, `DEBATE` from `'../config.ts'`
6. import — `safeRpc` from `'../auth.ts'`
7. import — `getPool`, `renderStakingPanel`, `wireStakingPanel` from `'../staking.ts'`
8. import — `getMyPowerUps`, `renderLoadout`, `wireLoadout`, `renderActivationBar`, `wireActivationBar`, `renderSilenceOverlay`, `renderRevealPopup`, `renderShieldIndicator`, `removeShieldIndicator`, `getOpponentPowerUps`, `hasMultiplier` from `'../powerups.ts'`
9. import — `nudge` from `'../nudge.ts'`
10. import — `view`, `currentDebate`, `screenEl`, `selectedModerator`, `selectedRuleset`, `selectedRanked`, `activatedPowerUps`, `shieldActive`, `equippedForDebate`, `silenceTimer`, `set_view`, `set_currentDebate`, `set_equippedForDebate`, `set_shieldActive`, `set_silenceTimer` from `'./arena-state.ts'`
11. import (type-only) — `CurrentDebate`, `DebateRole` from `'./arena-types.ts'`
12. import — `ROUND_DURATION`, `TEXT_MAX_CHARS` from `'./arena-types.ts'`
13. import — `isPlaceholder`, `formatTimer`, `pushArenaState` from `'./arena-core.ts'`
14. import — `renderInputControls`, `startLiveRoundTimer`, `initLiveAudio`, `addSystemMessage` from `'./arena-room-live.ts'`
15. import — `addReferenceButton`, `assignSelectedMod`, `startReferencePoll` from `'./arena-mod-refs.ts'`
16. import — `startModStatusPoll` from `'./arena-mod-queue.ts'`
17. import — `enterFeedRoom` from `'./arena-feed-room.ts'`
18. import — `renderLoadoutPicker` from `'../reference-arsenal.ts'`
19. import — `renderPresetBar` from `'./arena-loadout-presets.ts'`
20. import — `renderBountyClaimDropdown`, `resetBountyClaim` from `'./arena-bounty-claim.ts'`
21. import — `bountyDot` from `'../bounties.ts'`
22. blank
23. bind `showPreDebate` to function definition (exported)
24. blank
25. comment — `// Helper: refresh loadout panel after equip`
26. bind `showPreDebateLoadout` to function definition
27. blank
28. comment — `// ============================================================`
29. comment — `// DEBATE ROOM`
30. comment — `// ============================================================`
31. blank
32. bind `enterRoom` to function definition (exported)
33. blank
34. bind `_renderRoom` to function definition

## Agent 03

1. comment — `// arena-room-setup.ts — pre-debate + room entry`
2. comment — `// Part of the arena.ts monolith split`
3. blank
4. import — `getCurrentProfile` from `'../auth.ts'`
5. import — `escapeHTML`, `DEBATE` from `'../config.ts'`
6. import — `safeRpc` from `'../auth.ts'`
7. import — `getPool`, `renderStakingPanel`, `wireStakingPanel` from `'../staking.ts'`
8. import — `getMyPowerUps`, `renderLoadout`, `wireLoadout`, `renderActivationBar`, `wireActivationBar`, `renderSilenceOverlay`, `renderRevealPopup`, `renderShieldIndicator`, `removeShieldIndicator`, `getOpponentPowerUps`, `hasMultiplier` from `'../powerups.ts'`
9. import — `nudge` from `'../nudge.ts'`
10. import — `view`, `currentDebate`, `screenEl`, `selectedModerator`, `selectedRuleset`, `selectedRanked`, `activatedPowerUps`, `shieldActive`, `equippedForDebate`, `silenceTimer`, `set_view`, `set_currentDebate`, `set_equippedForDebate`, `set_shieldActive`, `set_silenceTimer` from `'./arena-state.ts'`
11. import (type-only) — `CurrentDebate`, `DebateRole` from `'./arena-types.ts'`
12. import — `ROUND_DURATION`, `TEXT_MAX_CHARS` from `'./arena-types.ts'`
13. import — `isPlaceholder`, `formatTimer`, `pushArenaState` from `'./arena-core.ts'`
14. import — `renderInputControls`, `startLiveRoundTimer`, `initLiveAudio`, `addSystemMessage` from `'./arena-room-live.ts'`
15. import — `addReferenceButton`, `assignSelectedMod`, `startReferencePoll` from `'./arena-mod-refs.ts'`
16. import — `startModStatusPoll` from `'./arena-mod-queue.ts`
17. import — `enterFeedRoom` from `'./arena-feed-room.ts'`
18. import — `renderLoadoutPicker` from `'../reference-arsenal.ts'`
19. import — `renderPresetBar` from `'./arena-loadout-presets.ts'`
20. import — `renderBountyClaimDropdown`, `resetBountyClaim` from `'./arena-bounty-claim.ts'`
21. import — `bountyDot` from `'../bounties.ts'`
22. blank
23. bind `showPreDebate` to function definition (exported, async)
24. blank
25. comment — `// Helper: refresh loadout panel after equip`
26. bind `showPreDebateLoadout` to function definition (async, not exported)
27. blank
28. comment — `// ============================================================`
29. comment — `// DEBATE ROOM`
30. comment — `// ============================================================`
31. blank
32. bind `enterRoom` to function definition (exported)
33. blank
34. bind `_renderRoom` to function definition (not exported)

## Agent 04

1. comment — `// arena-room-setup.ts — pre-debate + room entry`
2. comment — `// Part of the arena.ts monolith split`
3. blank
4. import — `getCurrentProfile` from `../auth.ts`
5. import — `escapeHTML`, `DEBATE` from `../config.ts`
6. import — `safeRpc` from `../auth.ts`
7. import — `getPool`, `renderStakingPanel`, `wireStakingPanel` from `../staking.ts`
8. import — `getMyPowerUps`, `renderLoadout`, `wireLoadout`, `renderActivationBar`, `wireActivationBar`, `renderSilenceOverlay`, `renderRevealPopup`, `renderShieldIndicator`, `removeShieldIndicator`, `getOpponentPowerUps`, `hasMultiplier` from `../powerups.ts`
9. import — `nudge` from `../nudge.ts`
10. import — `view`, `currentDebate`, `screenEl`, `selectedModerator`, `selectedRuleset`, `selectedRanked`, `activatedPowerUps`, `shieldActive`, `equippedForDebate`, `silenceTimer`, `set_view`, `set_currentDebate`, `set_equippedForDebate`, `set_shieldActive`, `set_silenceTimer` from `./arena-state.ts`
11. import (type-only) — `CurrentDebate`, `DebateRole` from `./arena-types.ts`
12. import — `ROUND_DURATION`, `TEXT_MAX_CHARS` from `./arena-types.ts`
13. import — `isPlaceholder`, `formatTimer`, `pushArenaState` from `./arena-core.ts`
14. import — `renderInputControls`, `startLiveRoundTimer`, `initLiveAudio`, `addSystemMessage` from `./arena-room-live.ts`
15. import — `addReferenceButton`, `assignSelectedMod`, `startReferencePoll` from `./arena-mod-refs.ts`
16. import — `startModStatusPoll` from `./arena-mod-queue.ts`
17. import — `enterFeedRoom` from `./arena-feed-room.ts`
18. import — `renderLoadoutPicker` from `../reference-arsenal.ts`
19. import — `renderPresetBar` from `./arena-loadout-presets.ts`
20. import — `renderBountyClaimDropdown`, `resetBountyClaim` from `./arena-bounty-claim.ts`
21. import — `bountyDot` from `../bounties.ts`
22. blank
23. bind `showPreDebate` to function definition (exported, async)
24. blank
25. comment — `// Helper: refresh loadout panel after equip`
26. bind `showPreDebateLoadout` to function definition (async, not exported)
27. blank
28. comment — `// ============================================================`
29. comment — `// DEBATE ROOM`
30. comment — `// ============================================================`
31. blank
32. bind `enterRoom` to function definition (exported)
33. blank
34. bind `_renderRoom` to function definition (not exported)

## Agent 05

1. comment — `// arena-room-setup.ts — pre-debate + room entry`
2. comment — `// Part of the arena.ts monolith split`
3. blank
4. import — `getCurrentProfile` from `'../auth.ts'`
5. import — `escapeHTML`, `DEBATE` from `'../config.ts'`
6. import — `safeRpc` from `'../auth.ts'`
7. import — `getPool`, `renderStakingPanel`, `wireStakingPanel` from `'../staking.ts'`
8. import — `getMyPowerUps`, `renderLoadout`, `wireLoadout`, `renderActivationBar`, `wireActivationBar`, `renderSilenceOverlay`, `renderRevealPopup`, `renderShieldIndicator`, `removeShieldIndicator`, `getOpponentPowerUps`, `hasMultiplier` from `'../powerups.ts'`
9. import — `nudge` from `'../nudge.ts'`
10. import — `view`, `currentDebate`, `screenEl`, `selectedModerator`, `selectedRuleset`, `selectedRanked`, `activatedPowerUps`, `shieldActive`, `equippedForDebate`, `silenceTimer`, `set_view`, `set_currentDebate`, `set_equippedForDebate`, `set_shieldActive`, `set_silenceTimer` from `'./arena-state.ts'`
11. import (type-only) — `CurrentDebate`, `DebateRole` from `'./arena-types.ts'`
12. import — `ROUND_DURATION`, `TEXT_MAX_CHARS` from `'./arena-types.ts'`
13. import — `isPlaceholder`, `formatTimer`, `pushArenaState` from `'./arena-core.ts'`
14. import — `renderInputControls`, `startLiveRoundTimer`, `initLiveAudio`, `addSystemMessage` from `'./arena-room-live.ts'`
15. import — `addReferenceButton`, `assignSelectedMod`, `startReferencePoll` from `'./arena-mod-refs.ts'`
16. import — `startModStatusPoll` from `'./arena-mod-queue.ts'`
17. import — `enterFeedRoom` from `'./arena-feed-room.ts'`
18. import — `renderLoadoutPicker` from `'../reference-arsenal.ts'`
19. import — `renderPresetBar` from `'./arena-loadout-presets.ts'`
20. import — `renderBountyClaimDropdown`, `resetBountyClaim` from `'./arena-bounty-claim.ts'`
21. import — `bountyDot` from `'../bounties.ts'`
22. blank
23. bind `showPreDebate` to function definition (exported, async)
24. blank
25. comment — `// Helper: refresh loadout panel after equip`
26. bind `showPreDebateLoadout` to function definition (async, not exported)
27. blank
28. comment — `// ============================================================`
29. comment — `// DEBATE ROOM`
30. comment — `// ============================================================`
31. blank
32. bind `enterRoom` to function definition (exported)
33. blank
34. bind `_renderRoom` to function definition (not exported)
