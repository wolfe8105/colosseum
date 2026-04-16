# Stage 1 Outputs — arena-lobby.ts

## Agent 01

1. comment — `// arena-lobby.ts — Lobby rendering, feed, power-up shop`
2. comment — `// Part of the arena.ts monolith split`
3. comment — `// Card renders extracted to arena-lobby.cards.ts (Session 254 track).`
4. blank
5. import — `safeRpc`, `getSupabaseClient`, `getCurrentUser`, `getCurrentProfile`, `toggleModerator` from `../auth.ts`
6. import — `showToast` from `../config.ts`
7. import — `buy as buyPowerUp`, `renderShop` from `../powerups.ts`
8. import — `removeShieldIndicator` from `../powerups.ts`
9. import — `navigateTo` from `../navigation.ts`
10. import — `screenEl`, `selectedRuleset`, `selectedRanked`, `privateLobbyPollTimer`, `privateLobbyDebateId`, `activatedPowerUps`, `shieldActive`, `silenceTimer`, `set_view`, `set_selectedMode`, `set_selectedModerator`, `set_selectedRanked`, `set_selectedRuleset`, `set_selectedCategory`, `set_selectedWantMod`, `set_privateLobbyPollTimer`, `set_privateLobbyDebateId`, `set_shieldActive`, `set_equippedForDebate`, `set_silenceTimer` from `./arena-state.ts`
11. import (type-only) — `ArenaView` from `./arena-types.ts`
12. import (type-only) — `ArenaFeedItem`, `AutoDebateItem` from `./arena-types-feed-list.ts`
13. import — `isPlaceholder`, `pushArenaState` from `./arena-core.ts`
14. import — `showRankedPicker` from `./arena-config-settings.ts`
15. import — `showPrivateLobbyPicker` from `./arena-private-picker.ts`
16. import — `showModQueue` from `./arena-mod-queue.ts`
17. import — `joinWithCode` from `./arena-private-lobby.join.ts`
18. import — `loadPendingChallenges` from `./arena-pending-challenges.ts`
19. import — `stopReferencePoll` from `./arena-mod-refs.ts`
20. import — `enterFeedRoomAsSpectator` from `./arena-feed-room.ts`
21. import — `renderArenaFeedCard`, `renderAutoDebateCard`, `renderPlaceholderCards` from `./arena-lobby.cards.ts`
22. blank
23. comment — `// ============================================================`
24. comment — `// LOBBY`
25. comment — `// ============================================================`
26. blank
27. bind name to function definition — `renderLobby` (exported)
28. blank
29. bind name to function definition — `loadLobbyFeed` (exported, async)
30. blank
31. comment — `// ============================================================`
32. comment — `// POWER-UP SHOP`
33. comment — `// ============================================================`
34. blank
35. bind name to function definition — `showPowerUpShop` (exported, async)
36. blank
37. comment — `// Re-export card renderers for backward compat (importers that use dynamic import('./arena-lobby.ts'))`
38. re-export — `renderArenaFeedCard`, `renderAutoDebateCard`, `renderPlaceholderCards` from `./arena-lobby.cards.ts`

## Agent 02

1. comment — `// arena-lobby.ts — Lobby rendering, feed, power-up shop`
2. comment — `// Part of the arena.ts monolith split`
3. comment — `// Card renders extracted to arena-lobby.cards.ts (Session 254 track).`
4. blank
5. import — `safeRpc`, `getSupabaseClient`, `getCurrentUser`, `getCurrentProfile`, `toggleModerator` from `../auth.ts`
6. import — `showToast` from `../config.ts`
7. import — `buy as buyPowerUp`, `renderShop` from `../powerups.ts`
8. import — `removeShieldIndicator` from `../powerups.ts`
9. import — `navigateTo` from `../navigation.ts`
10. import — `screenEl`, `selectedRuleset`, `selectedRanked`, `privateLobbyPollTimer`, `privateLobbyDebateId`, `activatedPowerUps`, `shieldActive`, `silenceTimer`, `set_view`, `set_selectedMode`, `set_selectedModerator`, `set_selectedRanked`, `set_selectedRuleset`, `set_selectedCategory`, `set_selectedWantMod`, `set_privateLobbyPollTimer`, `set_privateLobbyDebateId`, `set_shieldActive`, `set_equippedForDebate`, `set_silenceTimer` from `./arena-state.ts`
11. import — type `ArenaView` from `./arena-types.ts`
12. import — type `ArenaFeedItem`, `AutoDebateItem` from `./arena-types-feed-list.ts`
13. import — `isPlaceholder`, `pushArenaState` from `./arena-core.ts`
14. import — `showRankedPicker` from `./arena-config-settings.ts`
15. import — `showPrivateLobbyPicker` from `./arena-private-picker.ts`
16. import — `showModQueue` from `./arena-mod-queue.ts`
17. import — `joinWithCode` from `./arena-private-lobby.join.ts`
18. import — `loadPendingChallenges` from `./arena-pending-challenges.ts`
19. import — `stopReferencePoll` from `./arena-mod-refs.ts`
20. import — `enterFeedRoomAsSpectator` from `./arena-feed-room.ts`
21. import — `renderArenaFeedCard`, `renderAutoDebateCard`, `renderPlaceholderCards` from `./arena-lobby.cards.ts`
22. blank
23. comment — section divider `// === LOBBY ===`
24. blank
25. bind `renderLobby` to function definition — exported
26. blank
27. bind `loadLobbyFeed` to function definition — exported
28. blank
29. comment — section divider `// === POWER-UP SHOP ===`
30. blank
31. bind `showPowerUpShop` to function definition — exported
32. blank
33. comment — `// Re-export card renderers for backward compat ...`
34. re-export — `renderArenaFeedCard`, `renderAutoDebateCard`, `renderPlaceholderCards` from `./arena-lobby.cards.ts`

## Agent 03

1. comment — `// arena-lobby.ts — Lobby rendering, feed, power-up shop`
2. comment — `// Part of the arena.ts monolith split`
3. comment — `// Card renders extracted to arena-lobby.cards.ts (Session 254 track).`
4. blank
5. import — `safeRpc`, `getSupabaseClient`, `getCurrentUser`, `getCurrentProfile`, `toggleModerator` from `../auth.ts`
6. import — `showToast` from `../config.ts`
7. import — `buy as buyPowerUp`, `renderShop` from `../powerups.ts`
8. import — `removeShieldIndicator` from `../powerups.ts`
9. import — `navigateTo` from `../navigation.ts`
10. import — `screenEl`, `selectedRuleset`, `selectedRanked`, `privateLobbyPollTimer`, `privateLobbyDebateId`, `activatedPowerUps`, `shieldActive`, `silenceTimer`, `set_view`, `set_selectedMode`, `set_selectedModerator`, `set_selectedRanked`, `set_selectedRuleset`, `set_selectedCategory`, `set_selectedWantMod`, `set_privateLobbyPollTimer`, `set_privateLobbyDebateId`, `set_shieldActive`, `set_equippedForDebate`, `set_silenceTimer` from `./arena-state.ts`
11. import — type `ArenaView` from `./arena-types.ts`
12. import — type `ArenaFeedItem`, `AutoDebateItem` from `./arena-types-feed-list.ts`
13. import — `isPlaceholder`, `pushArenaState` from `./arena-core.ts`
14. import — `showRankedPicker` from `./arena-config-settings.ts`
15. import — `showPrivateLobbyPicker` from `./arena-private-picker.ts`
16. import — `showModQueue` from `./arena-mod-queue.ts`
17. import — `joinWithCode` from `./arena-private-lobby.join.ts`
18. import — `loadPendingChallenges` from `./arena-pending-challenges.ts`
19. import — `stopReferencePoll` from `./arena-mod-refs.ts`
20. import — `enterFeedRoomAsSpectator` from `./arena-feed-room.ts`
21. import — `renderArenaFeedCard`, `renderAutoDebateCard`, `renderPlaceholderCards` from `./arena-lobby.cards.ts`
22. blank
23. comment — section divider `// ============================================================`
24. comment — `// LOBBY`
25. comment — section divider `// ============================================================`
26. blank
27. bind name to function definition — `renderLobby` (exported)
28. blank
29. bind name to function definition — `loadLobbyFeed` (exported, async)
30. blank
31. comment — section divider `// ============================================================`
32. comment — `// POWER-UP SHOP`
33. comment — section divider `// ============================================================`
34. blank
35. bind name to function definition — `showPowerUpShop` (exported, async)
36. blank
37. comment — `// Re-export card renderers for backward compat ...`
38. re-export — `renderArenaFeedCard`, `renderAutoDebateCard`, `renderPlaceholderCards` from `./arena-lobby.cards.ts`

## Agent 04

1. comment — `// arena-lobby.ts — Lobby rendering, feed, power-up shop`
2. comment — `// Part of the arena.ts monolith split`
3. comment — `// Card renders extracted to arena-lobby.cards.ts (Session 254 track).`
4. blank
5. import — `safeRpc`, `getSupabaseClient`, `getCurrentUser`, `getCurrentProfile`, `toggleModerator` from `../auth.ts`
6. import — `showToast` from `../config.ts`
7. import — `buy as buyPowerUp`, `renderShop` from `../powerups.ts`
8. import — `removeShieldIndicator` from `../powerups.ts`
9. import — `navigateTo` from `../navigation.ts`
10. import — `screenEl`, `selectedRuleset`, `selectedRanked`, `privateLobbyPollTimer`, `privateLobbyDebateId`, `activatedPowerUps`, `shieldActive`, `silenceTimer`, `set_view`, `set_selectedMode`, `set_selectedModerator`, `set_selectedRanked`, `set_selectedRuleset`, `set_selectedCategory`, `set_selectedWantMod`, `set_privateLobbyPollTimer`, `set_privateLobbyDebateId`, `set_shieldActive`, `set_equippedForDebate`, `set_silenceTimer` from `./arena-state.ts`
11. import (type-only) — `ArenaView` from `./arena-types.ts`
12. import (type-only) — `ArenaFeedItem`, `AutoDebateItem` from `./arena-types-feed-list.ts`
13. import — `isPlaceholder`, `pushArenaState` from `./arena-core.ts`
14. import — `showRankedPicker` from `./arena-config-settings.ts`
15. import — `showPrivateLobbyPicker` from `./arena-private-picker.ts`
16. import — `showModQueue` from `./arena-mod-queue.ts`
17. import — `joinWithCode` from `./arena-private-lobby.join.ts`
18. import — `loadPendingChallenges` from `./arena-pending-challenges.ts`
19. import — `stopReferencePoll` from `./arena-mod-refs.ts`
20. import — `enterFeedRoomAsSpectator` from `./arena-feed-room.ts`
21. import — `renderArenaFeedCard`, `renderAutoDebateCard`, `renderPlaceholderCards` from `./arena-lobby.cards.ts`
22. blank
23. comment — `// ============================================================`
24. comment — `// LOBBY`
25. comment — `// ============================================================`
26. blank
27. bind name to function definition — `renderLobby` (exported)
28. blank
29. bind name to function definition — `loadLobbyFeed` (exported, async)
30. blank
31. comment — `// ============================================================`
32. comment — `// POWER-UP SHOP`
33. comment — `// ============================================================`
34. blank
35. bind name to function definition — `showPowerUpShop` (exported, async)
36. blank
37. comment — `// Re-export card renderers for backward compat (importers that use dynamic import('./arena-lobby.ts'))`
38. re-export — `renderArenaFeedCard`, `renderAutoDebateCard`, `renderPlaceholderCards` from `./arena-lobby.cards.ts`

## Agent 05

1. comment — `// arena-lobby.ts — Lobby rendering, feed, power-up shop`
2. comment — `// Part of the arena.ts monolith split`
3. comment — `// Card renders extracted to arena-lobby.cards.ts (Session 254 track).`
4. blank
5. import — `safeRpc`, `getSupabaseClient`, `getCurrentUser`, `getCurrentProfile`, `toggleModerator` from `../auth.ts`
6. import — `showToast` from `../config.ts`
7. import — `buy as buyPowerUp`, `renderShop` from `../powerups.ts`
8. import — `removeShieldIndicator` from `../powerups.ts`
9. import — `navigateTo` from `../navigation.ts`
10. import — `screenEl`, `selectedRuleset`, `selectedRanked`, `privateLobbyPollTimer`, `privateLobbyDebateId`, `activatedPowerUps`, `shieldActive`, `silenceTimer`, `set_view`, `set_selectedMode`, `set_selectedModerator`, `set_selectedRanked`, `set_selectedRuleset`, `set_selectedCategory`, `set_selectedWantMod`, `set_privateLobbyPollTimer`, `set_privateLobbyDebateId`, `set_shieldActive`, `set_equippedForDebate`, `set_silenceTimer` from `./arena-state.ts`
11. import — type `ArenaView` from `./arena-types.ts`
12. import — type `ArenaFeedItem`, `AutoDebateItem` from `./arena-types-feed-list.ts`
13. import — `isPlaceholder`, `pushArenaState` from `./arena-core.ts`
14. import — `showRankedPicker` from `./arena-config-settings.ts`
15. import — `showPrivateLobbyPicker` from `./arena-private-picker.ts`
16. import — `showModQueue` from `./arena-mod-queue.ts`
17. import — `joinWithCode` from `./arena-private-lobby.join.ts`
18. import — `loadPendingChallenges` from `./arena-pending-challenges.ts`
19. import — `stopReferencePoll` from `./arena-mod-refs.ts`
20. import — `enterFeedRoomAsSpectator` from `./arena-feed-room.ts`
21. import — `renderArenaFeedCard`, `renderAutoDebateCard`, `renderPlaceholderCards` from `./arena-lobby.cards.ts`
22. blank
23. comment — `// ============================================================`
24. comment — `// LOBBY`
25. comment — `// ============================================================`
26. blank
27. bind name to function definition — `renderLobby` (exported)
28. blank
29. bind name to function definition — `loadLobbyFeed` (exported, async)
30. blank
31. comment — `// ============================================================`
32. comment — `// POWER-UP SHOP`
33. comment — `// ============================================================`
34. blank
35. bind name to function definition — `showPowerUpShop` (exported, async)
36. blank
37. comment — `// Re-export card renderers for backward compat (importers that use dynamic import('./arena-lobby.ts'))`
38. re-export — `renderArenaFeedCard`, `renderAutoDebateCard`, `renderPlaceholderCards` from `./arena-lobby.cards.ts`
