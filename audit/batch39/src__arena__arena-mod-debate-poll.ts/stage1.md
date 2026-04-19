# Stage 1 Outputs — arena-mod-debate-poll.ts

## Agent 01
1. import (safeRpc, getCurrentProfile from '../auth.ts')
2. import (DEBATE from '../config.ts')
3. import (view, modDebatePollTimer, set_modDebatePollTimer, set_modDebateId from './arena-state.ts')
4. import type (ArenaView, CurrentDebate, DebateMode, DebateRole from './arena-types.ts')
5. import type (ModDebateCheckResult from './arena-types-moderator.ts')
6. import (enterRoom from './arena-room-enter.ts')
7. import (showMatchFound from './arena-match-found.ts')
8. comment
9. comment
10. comment
11. blank
12. bind name to function definition (startModDebatePoll — exported)
13. bind name to function definition (stopModDebatePoll — exported)
14. bind name to function definition (onModDebateReady — exported)
15. bind name to function definition (cancelModDebate — exported)

## Agent 02
1. import (safeRpc, getCurrentProfile from '../auth.ts')
2. import (DEBATE from '../config.ts')
3. import (view, modDebatePollTimer, set_modDebatePollTimer, set_modDebateId from './arena-state.ts')
4. import type (ArenaView, CurrentDebate, DebateMode, DebateRole from './arena-types.ts')
5. import type (ModDebateCheckResult from './arena-types-moderator.ts')
6. import (enterRoom from './arena-room-enter.ts')
7. import (showMatchFound from './arena-match-found.ts')
8. comment (LANDMINE [LM-MODDEBATE-001] regarding dynamic import of showModQueue)
9. bind name to function definition (startModDebatePoll), exported
10. bind name to function definition (stopModDebatePoll), exported
11. bind name to function definition (onModDebateReady), exported
12. bind name to function definition (cancelModDebate), exported
13. blank line at end of file

## Agent 03
1. import (named: safeRpc, getCurrentProfile)
2. import (named: DEBATE)
3. import (named: view, modDebatePollTimer, set_modDebatePollTimer, set_modDebateId)
4. import (type-only, named: ArenaView, CurrentDebate, DebateMode, DebateRole)
5. import (type-only, named: ModDebateCheckResult)
6. import (named: enterRoom)
7. import (named: showMatchFound)
8. comment
9. blank
10. bind name to function definition `startModDebatePoll` (exported)
11. bind name to function definition `stopModDebatePoll` (exported)
12. blank
13. bind name to function definition `onModDebateReady` (exported)
14. blank
15. bind name to function definition `cancelModDebate` (exported)

## Agent 04
1. import (safeRpc, getCurrentProfile from '../auth.ts')
2. import (DEBATE from '../config.ts')
3. import (view, modDebatePollTimer, set_modDebatePollTimer, set_modDebateId from './arena-state.ts')
4. import type (ArenaView, CurrentDebate, DebateMode, DebateRole from './arena-types.ts')
5. import type (ModDebateCheckResult from './arena-types-moderator.ts')
6. import (enterRoom from './arena-room-enter.ts')
7. import (showMatchFound from './arena-match-found.ts')
8. comment
9. comment
10. comment
11. bind name to function definition (startModDebatePoll) — exported
12. [NOTE: Agent 04 misclassified function body statements as top-level statements — these are inside startModDebatePoll's body]
13. bind name to function definition (stopModDebatePoll) — exported
14. bind name to function definition (onModDebateReady) — exported
15. bind name to function definition (cancelModDebate) — exported

## Agent 05
1. import (safeRpc, getCurrentProfile from '../auth.ts')
2. import (DEBATE from '../config.ts')
3. import (view, modDebatePollTimer, set_modDebatePollTimer, set_modDebateId from './arena-state.ts')
4. import type (ArenaView, CurrentDebate, DebateMode, DebateRole from './arena-types.ts')
5. import type (ModDebateCheckResult from './arena-types-moderator.ts')
6. import (enterRoom from './arena-room-enter.ts')
7. import (showMatchFound from './arena-match-found.ts')
8. comment
9. comment
10. bind name to function definition (startModDebatePoll, exported)
11. bind name to function definition (stopModDebatePoll, exported)
12. bind name to function definition (onModDebateReady, exported)
13. bind name to function definition (cancelModDebate, exported)
