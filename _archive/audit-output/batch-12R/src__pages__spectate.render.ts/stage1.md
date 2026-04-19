# Stage 1 Outputs — spectate.render.ts

## Agent 01

1. **comment** — JSDoc block (lines 1–5): module header
2. **blank** — line 6
3. **import** — `state` from `./spectate.state.ts`
4. **import** — `escHtml`, `renderAvatar`, `modeLabel`, `statusBadge` from `./spectate.utils.ts`
5. **import** — `wireVoteButtons`, `updateVoteBar` from `./spectate.vote.ts`
6. **import** — `wireChatUI`, `renderChatMessages` from `./spectate.chat.ts`
7. **import** — `wireShareButtons` from `./spectate.share.ts`
8. **import** (type-only) — `SpectateDebate`, `DebateMessage`, `ReplayPowerUp`, `ReplayReference`, `ReplayPointAward`, `ReplaySpeechEvent`, `TimelineEntry`, `AISideScores` from `./spectate.types.ts`
9. **blank** — line 13
10. **bind name to function definition** — `showError` (exported)
11. **blank** — line 18
12. **bind name to function definition** — `renderMessages` (exported)
13. **blank** — line 43
14. **comment** — JSDoc block (lines 44–54): `formatPointBadge` documentation
15. **bind name to function definition** — `formatPointBadge`
16. **blank** — line 69
17. **bind name to function definition** — `renderTimeline`
18. **blank** — line 257
19. **bind name to function definition** — `renderSpectateView` (exported)

## Agent 02

1. **comment** — JSDoc block (lines 1–5): file header
2. **blank** — line 6
3. **import** — `state` from `./spectate.state.ts`
4. **import** — `escHtml`, `renderAvatar`, `modeLabel`, `statusBadge` from `./spectate.utils.ts`
5. **import** — `wireVoteButtons`, `updateVoteBar` from `./spectate.vote.ts`
6. **import** — `wireChatUI`, `renderChatMessages` from `./spectate.chat.ts`
7. **import** — `wireShareButtons` from `./spectate.share.ts`
8. **import** (type-only) — `SpectateDebate`, `DebateMessage`, `ReplayPowerUp`, `ReplayReference`, `ReplayPointAward`, `ReplaySpeechEvent`, `TimelineEntry`, `AISideScores` from `./spectate.types.ts`
9. **blank** — line 13
10. **bind name to function definition** — `showError` (exported)
11. **blank** — line 18
12. **bind name to function definition** — `renderMessages` (exported)
13. **blank** — line 43
14. **comment** — JSDoc block (lines 44–54): `formatPointBadge` description
15. **bind name to function definition** — `formatPointBadge` (not exported)
16. **blank** — line 69
17. **bind name to function definition** — `renderTimeline` (not exported)
18. **blank** — line 257
19. **bind name to function definition** — `renderSpectateView` (exported)

## Agent 03

1. **comment** — lines 1–5: block comment describing the module (THE MODERATOR — Spectator View Rendering).
2. **blank** — line 6.
3. **import** — line 7: `import { state } from './spectate.state.ts'`.
4. **import** — line 8: `import { escHtml, renderAvatar, modeLabel, statusBadge } from './spectate.utils.ts'`.
5. **import** — line 9: `import { wireVoteButtons, updateVoteBar } from './spectate.vote.ts'`.
6. **import** — line 10: `import { wireChatUI, renderChatMessages } from './spectate.chat.ts'`.
7. **import** — line 11: `import { wireShareButtons } from './spectate.share.ts'`.
8. **import** — line 12: `import type { SpectateDebate, DebateMessage, ReplayPowerUp, ReplayReference, ReplayPointAward, ReplaySpeechEvent, TimelineEntry, AISideScores } from './spectate.types.ts'` (type-only import).
9. **blank** — line 13.
10. **bind name to function definition** — lines 14–17: `showError`, exported.
11. **blank** — line 18.
12. **bind name to function definition** — lines 19–42: `renderMessages`, exported.
13. **blank** — line 43.
14. **comment** — lines 44–54: block comment describing `formatPointBadge` (F-05 format spec).
15. **bind name to function definition** — lines 55–68: `formatPointBadge`.
16. **blank** — line 69.
17. **bind name to function definition** — lines 70–256: `renderTimeline`.
18. **blank** — line 257.
19. **bind name to function definition** — lines 258–490: `renderSpectateView`, exported.
20. **blank** — line 491 (end of file).

## Agent 04

1. comment — JSDoc block header (lines 1–5)
2. blank
3. import — `state` from `./spectate.state.ts`
4. import — `escHtml`, `renderAvatar`, `modeLabel`, `statusBadge` from `./spectate.utils.ts`
5. import — `wireVoteButtons`, `updateVoteBar` from `./spectate.vote.ts`
6. import — `wireChatUI`, `renderChatMessages` from `./spectate.chat.ts`
7. import — `wireShareButtons` from `./spectate.share.ts`
8. import (type-only) — `SpectateDebate`, `DebateMessage`, `ReplayPowerUp`, `ReplayReference`, `ReplayPointAward`, `ReplaySpeechEvent`, `TimelineEntry`, `AISideScores` from `./spectate.types.ts`
9. blank
10. bind name to function definition — `showError` (exported)
11. blank
12. bind name to function definition — `renderMessages` (exported)
13. blank
14. comment — JSDoc block for `formatPointBadge` (lines 44–54)
15. bind name to function definition — `formatPointBadge`
16. blank
17. bind name to function definition — `renderTimeline`
18. blank
19. bind name to function definition — `renderSpectateView` (exported)

## Agent 05

1. **comment** — JSDoc block (lines 1–5): module description
2. **blank** — line 6
3. **import** — `state` from `./spectate.state.ts`
4. **import** — `escHtml`, `renderAvatar`, `modeLabel`, `statusBadge` from `./spectate.utils.ts`
5. **import** — `wireVoteButtons`, `updateVoteBar` from `./spectate.vote.ts`
6. **import** — `wireChatUI`, `renderChatMessages` from `./spectate.chat.ts`
7. **import** — `wireShareButtons` from `./spectate.share.ts`
8. **import** (type-only) — `SpectateDebate`, `DebateMessage`, `ReplayPowerUp`, `ReplayReference`, `ReplayPointAward`, `ReplaySpeechEvent`, `TimelineEntry`, `AISideScores` from `./spectate.types.ts`
9. **blank** — line 13
10. **bind name to function definition** — `showError` (exported)
11. **blank** — line 18
12. **bind name to function definition** — `renderMessages` (exported)
13. **blank** — line 43
14. **comment** — JSDoc block (lines 44–54): `formatPointBadge` description
15. **bind name to function definition** — `formatPointBadge`
16. **blank** — line 69
17. **bind name to function definition** — `renderTimeline`
18. **blank** — line 257
19. **bind name to function definition** — `renderSpectateView` (exported)
