# Stage 1 Outputs — arena-core.ts

## Agent 01

1. comment
2. comment
3. blank
4. import (safeRpc, getSupabaseClient, getCurrentUser, getCurrentProfile from '../auth.ts')
5. import (isAnyPlaceholder, FEATURES from '../config.ts')
6. import (leaveDebate from '../webrtc.ts')
7. import (ready from '../auth.ts')
8. import (view, currentDebate, roundTimer, _rulingCountdownTimer, matchFoundDebate, screenEl, queueElapsedTimer, queuePollTimer, vmTimer, referencePollTimer, set_matchFoundDebate, set_screenEl, set_queueElapsedTimer, set_queuePollTimer, set_roundTimer, set_vmTimer, set_referencePollTimer, set__rulingCountdownTimer, resetState from './arena-state.ts')
9. import type (ArenaView, CurrentDebate from './arena-types.ts')
10. import (clearQueueTimers from './arena-queue.ts')
11. import (clearMatchAcceptTimers from './arena-match.ts')
12. import (stopOpponentPoll from './arena-room-live.ts')
13. import (stopReferencePoll from './arena-mod-refs.ts')
14. import (stopModStatusPoll from './arena-mod-queue.ts')
15. blank
16. import (joinWithCode from './arena-private-lobby.ts')
17. import (injectCSS from './arena-css.ts')
18. import (cleanupPendingRecording from '../voicememo.ts')
19. import (cleanupFeedRoom, enterFeedRoomAsSpectator from './arena-feed-room.ts')
20. blank
21. comment
22. comment
23. blank
24. bind name to function definition: isPlaceholder (exported)
25. blank
26. bind name to function definition: formatTimer (exported)
27. blank
28. bind name to function definition: randomFrom (exported)
29. blank
30. comment
31. comment
32. blank
33. bind name to function definition: pushArenaState (exported)
34. blank
35. bind name to function definition: _onPopState (exported)
36. top-level statement (window.addEventListener)
37. blank
38. comment
39. comment
40. blank
41. bind name to function definition: init (exported)
42. blank
43. comment
44. comment
45. blank
46. bind name to function definition: getView (exported)
47. blank
48. bind name to function definition: getCurrentDebate (exported)
49. blank
50. comment
51. comment
52. blank
53. bind name to function definition: destroy (exported)
54. blank
55. comment
56. comment
57. blank
58. top-level statement (ready.then().catch())

## Agent 02

1. Comment (lines 1–2)
2. Import `safeRpc`, `getSupabaseClient`, `getCurrentUser`, `getCurrentProfile` from `../auth.ts`
3. Import `isAnyPlaceholder`, `FEATURES` from `../config.ts`
4. Import `leaveDebate` from `../webrtc.ts`
5. Import `ready` from `../auth.ts`
6. Import (view, currentDebate, roundTimer, etc.) from `./arena-state.ts`
7. Import type `ArenaView`, `CurrentDebate` from `./arena-types.ts`
8. Import `clearQueueTimers` from `./arena-queue.ts`
9. Import `clearMatchAcceptTimers` from `./arena-match.ts`
10. Import `stopOpponentPoll` from `./arena-room-live.ts`
11. Import `stopReferencePoll` from `./arena-mod-refs.ts`
12. Import `stopModStatusPoll` from `./arena-mod-queue.ts`
13. Import `joinWithCode` from `./arena-private-lobby.ts`
14. Import `injectCSS` from `./arena-css.ts`
15. Import `cleanupPendingRecording` from `../voicememo.ts`
16. Import `cleanupFeedRoom`, `enterFeedRoomAsSpectator` from `./arena-feed-room.ts`
17. Comment (lines 32–34)
18. Bind name `isPlaceholder` to function definition (exported)
19. Bind name `formatTimer` to function definition (exported)
20. Bind name `randomFrom` to function definition (exported)
21. Comment (lines 50–52)
22. Bind name `pushArenaState` to function definition (exported)
23. Bind name `_onPopState` to function definition (exported)
24. Top-level statement: `window.addEventListener('popstate', _onPopState)` (line 90)
25. Comment (lines 92–94)
26. Bind name `init` to function definition (exported)
27. Comment (lines 135–137)
28. Bind name `getView` to function definition (exported)
29. Bind name `getCurrentDebate` to function definition (exported)
30. Comment (lines 147–149)
31. Bind name `destroy` to function definition (exported)
32. Comment (lines 169–171)
33. Top-level statement: `ready.then(() => init()).catch(() => init())` (line 173)

## Agent 03

1. Comment
2. Comment
3. Blank
4. Import (safeRpc, getSupabaseClient, getCurrentUser, getCurrentProfile)
5. Import (isAnyPlaceholder, FEATURES)
6. Import (leaveDebate)
7. Import (ready)
8. Import (view, currentDebate, roundTimer, _rulingCountdownTimer, matchFoundDebate, screenEl, queueElapsedTimer, queuePollTimer, vmTimer, referencePollTimer, set_matchFoundDebate, set_screenEl, set_queueElapsedTimer, set_queuePollTimer, set_roundTimer, set_vmTimer, set_referencePollTimer, set__rulingCountdownTimer, resetState)
9. Import type (ArenaView, CurrentDebate)
10. Import (clearQueueTimers)
11. Import (clearMatchAcceptTimers)
12. Import (stopOpponentPoll)
13. Import (stopReferencePoll)
14. Import (stopModStatusPoll)
15. Blank
16. Import (joinWithCode)
17. Import (injectCSS)
18. Import (cleanupPendingRecording)
19. Import (cleanupFeedRoom, enterFeedRoomAsSpectator)
20. Blank
21. Comment
22. Comment
23. Comment
24. Blank
25. Bind name to function definition (isPlaceholder) — exported
26. Blank
27. Bind name to function definition (formatTimer) — exported
28. Blank
29. Bind name to function definition (randomFrom) — exported
30. Blank
31. Comment
32. Comment
33. Blank
34. Bind name to function definition (pushArenaState) — exported
35. Blank
36. Bind name to function definition (_onPopState) — exported
37. Top-level statement (window.addEventListener)
38. Blank
39. Comment
40. Comment
41. Blank
42. Bind name to function definition (init) — exported
43. Blank
44. Comment
45. Comment
46. Blank
47. Bind name to function definition (getView) — exported
48. Blank
49. Bind name to function definition (getCurrentDebate) — exported
50. Blank
51. Comment
52. Comment
53. Blank
54. Bind name to function definition (destroy) — exported
55. Blank
56. Comment
57. Comment
58. Blank
59. Top-level statement (ready.then)

## Agent 04

1. Comment
2. Comment
3. Blank
4. Import (safeRpc, getSupabaseClient, getCurrentUser, getCurrentProfile from '../auth.ts')
5. Import (isAnyPlaceholder, FEATURES from '../config.ts')
6. Import (leaveDebate from '../webrtc.ts')
7. Import (ready from '../auth.ts')
8. Import (view, currentDebate, roundTimer, _rulingCountdownTimer, matchFoundDebate, screenEl, queueElapsedTimer, queuePollTimer, vmTimer, referencePollTimer, set_matchFoundDebate, set_screenEl, set_queueElapsedTimer, set_queuePollTimer, set_roundTimer, set_vmTimer, set_referencePollTimer, set__rulingCountdownTimer, resetState from './arena-state.ts')
9. Import type (ArenaView, CurrentDebate from './arena-types.ts')
10. Import (clearQueueTimers from './arena-queue.ts')
11. Import (clearMatchAcceptTimers from './arena-match.ts')
12. Import (stopOpponentPoll from './arena-room-live.ts')
13. Import (stopReferencePoll from './arena-mod-refs.ts')
14. Import (stopModStatusPoll from './arena-mod-queue.ts')
15. Blank
16. Import (joinWithCode from './arena-private-lobby.ts')
17. Import (injectCSS from './arena-css.ts')
18. Import (cleanupPendingRecording from '../voicememo.ts')
19. Import (cleanupFeedRoom, enterFeedRoomAsSpectator from './arena-feed-room.ts')
20. Blank
21. Comment
22. Comment
23. Comment
24. Blank
25. Bind name to function definition (isPlaceholder, exported)
26. Blank
27. Bind name to function definition (formatTimer, exported)
28. Blank
29. Bind name to function definition (randomFrom, exported)
30. Blank
31. Comment
32. Comment
33. Comment
34. Blank
35. Bind name to function definition (pushArenaState, exported)
36. Blank
37. Bind name to function definition (_onPopState, exported)
38. Blank
39. Top-level statement (window.addEventListener('popstate', _onPopState))
40. Blank
41. Comment
42. Comment
43. Comment
44. Blank
45. Bind name to function definition (init, exported)
46. Blank
47. Top-level statement (ready.then(() => init()).catch(() => init()))

## Agent 05

1. Comment
2. Comment
3. Blank
4. Import (safeRpc, getSupabaseClient, getCurrentUser, getCurrentProfile from '../auth.ts')
5. Import (isAnyPlaceholder, FEATURES from '../config.ts')
6. Import (leaveDebate from '../webrtc.ts')
7. Import (ready from '../auth.ts')
8. Import (view, currentDebate, roundTimer, _rulingCountdownTimer, matchFoundDebate, screenEl, queueElapsedTimer, queuePollTimer, vmTimer, referencePollTimer, set_matchFoundDebate, set_screenEl, set_queueElapsedTimer, set_queuePollTimer, set_roundTimer, set_vmTimer, set_referencePollTimer, set__rulingCountdownTimer, resetState from './arena-state.ts')
9. Type-only import (ArenaView, CurrentDebate from './arena-types.ts')
10. Import (clearQueueTimers from './arena-queue.ts')
11. Import (clearMatchAcceptTimers from './arena-match.ts')
12. Import (stopOpponentPoll from './arena-room-live.ts')
13. Import (stopReferencePoll from './arena-mod-refs.ts')
14. Import (stopModStatusPoll from './arena-mod-queue.ts')
15. Blank
16. Import (joinWithCode from './arena-private-lobby.ts')
17. Import (injectCSS from './arena-css.ts')
18. Import (cleanupPendingRecording from '../voicememo.ts')
19. Import (cleanupFeedRoom, enterFeedRoomAsSpectator from './arena-feed-room.ts')
20. Blank
21. Comment
22. Comment
23. Blank
24. Bind name to function definition: isPlaceholder (exported)
25. Blank
26. Bind name to function definition: formatTimer (exported)
27. Blank
28. Bind name to function definition: randomFrom (exported)
29. Blank
30. Comment
31. Comment
32. Blank
33. Bind name to function definition: pushArenaState (exported)
34. Blank
35. Bind name to function definition: _onPopState (exported)
36. Top-level statement (window.addEventListener call)
37. Blank
38. Comment
39. Comment
40. Blank
41. Bind name to function definition: init (exported)
42. Blank
43. Comment
44. Comment
45. Blank
46. Bind name to function definition: getView (exported)
47. Blank
48. Bind name to function definition: getCurrentDebate (exported)
49. Blank
50. Comment
51. Comment
52. Blank
53. Bind name to function definition: destroy (exported)
54. Blank
55. Comment
56. Comment
57. Blank
58. Top-level statement (ready.then call)
