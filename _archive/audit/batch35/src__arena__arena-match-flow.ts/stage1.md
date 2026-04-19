# Stage 1 Outputs — arena-match-flow.ts

## Agent 01
1. comment
2. comment
3. comment
4. comment
5. comment
6. comment
7. blank
8. import (safeRpc from '../auth.ts')
9. import (matchFoundDebate, matchAcceptTimer, selectedWantMod, set_matchAcceptTimer, set_matchAcceptPollTimer, set_selectedWantMod from './arena-state.ts')
10. import type (MatchAcceptResponse from './arena-types-match.ts')
11. import (MATCH_ACCEPT_POLL_TIMEOUT_SEC from './arena-constants.ts')
12. import (isPlaceholder from './arena-core.utils.ts')
13. import (showPreDebate from './arena-room-predebate.ts')
14. import (clearMatchAcceptTimers from './arena-match-timers.ts')
15. import (returnToQueueAfterDecline from './arena-match-found.ts')
16. blank
17. bind name to function definition (onMatchAccept, exported)
18. blank
19. bind name to function definition (onMatchConfirmed, exported)
20. blank
21. bind name to function definition (onOpponentDeclined, exported)

## Agent 02
1. comment
2. comment
3. comment
4. comment
5. comment
6. comment
7. blank
8. import safeRpc (named)
9. import matchFoundDebate, matchAcceptTimer, selectedWantMod, set_matchAcceptTimer, set_matchAcceptPollTimer, set_selectedWantMod (named)
10. import type MatchAcceptResponse
11. import MATCH_ACCEPT_POLL_TIMEOUT_SEC (named)
12. import isPlaceholder (named)
13. import showPreDebate (named)
14. import clearMatchAcceptTimers (named)
15. import returnToQueueAfterDecline (named)
16. blank
17. bind name to function definition onMatchAccept (exported)
18. blank
19. bind name to function definition onMatchConfirmed (exported)
20. blank
21. bind name to function definition onOpponentDeclined (exported)

## Agent 03
1–7. comments + blank
8. import (safeRpc from '../auth.ts')
9. import (matchFoundDebate, matchAcceptTimer, selectedWantMod, set_matchAcceptTimer, set_matchAcceptPollTimer, set_selectedWantMod from './arena-state.ts')
10. import type (MatchAcceptResponse from './arena-types-match.ts')
11. import (MATCH_ACCEPT_POLL_TIMEOUT_SEC from './arena-constants.ts')
12. import (isPlaceholder from './arena-core.utils.ts')
13. import (showPreDebate from './arena-room-predebate.ts')
14. import (clearMatchAcceptTimers from './arena-match-timers.ts')
15. import (returnToQueueAfterDecline from './arena-match-found.ts')
16. blank
17. bind name to function definition (onMatchAccept) — exported
18. blank
19. bind name to function definition (onMatchConfirmed) — exported
20. blank
21. bind name to function definition (onOpponentDeclined) — exported

## Agent 04
1. Comment (lines 1-3)
2. Comment (lines 4-6)
3. Import: safeRpc from '../auth.ts'
4. Import: matchFoundDebate, matchAcceptTimer, selectedWantMod, set_matchAcceptTimer, set_matchAcceptPollTimer, set_selectedWantMod from './arena-state.ts'
5. Import (type-only): MatchAcceptResponse from './arena-types-match.ts'
6. Import: MATCH_ACCEPT_POLL_TIMEOUT_SEC from './arena-constants.ts'
7. Import: isPlaceholder from './arena-core.utils.ts'
8. Import: showPreDebate from './arena-room-predebate.ts'
9. Import: clearMatchAcceptTimers from './arena-match-timers.ts'
10. Import: returnToQueueAfterDecline from './arena-match-found.ts'
11. Bind name to function definition (exported): onMatchAccept
12. Bind name to function definition (exported): onMatchConfirmed
13. Bind name to function definition (exported): onOpponentDeclined

## Agent 05
1–6. Comments
7. Blank
8. Import (safeRpc from '../auth.ts')
9. Import (matchFoundDebate, matchAcceptTimer, selectedWantMod, set_matchAcceptTimer, set_matchAcceptPollTimer, set_selectedWantMod from './arena-state.ts')
10. Import type (MatchAcceptResponse from './arena-types-match.ts')
11. Import (MATCH_ACCEPT_POLL_TIMEOUT_SEC from './arena-constants.ts')
12. Import (isPlaceholder from './arena-core.utils.ts')
13. Import (showPreDebate from './arena-room-predebate.ts')
14. Import (clearMatchAcceptTimers from './arena-match-timers.ts')
15. Import (returnToQueueAfterDecline from './arena-match-found.ts')
16. Blank
17. Bind name to function definition (onMatchAccept, exported)
18. Blank
19. Bind name to function definition (onMatchConfirmed, exported)
20. Blank
21. Bind name to function definition (onOpponentDeclined, exported)
