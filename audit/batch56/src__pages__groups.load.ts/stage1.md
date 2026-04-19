# Stage 1 Outputs — groups.load.ts

## Agent 01
1. comment (lines 1–4: JSDoc module documentation)
2. import (line 6: `safeRpc` from `../auth.ts`)
3. import (line 7: `activeCategory`, `currentUser` from `./groups.state.ts`)
4. import (line 8: `renderEmpty`, `renderGroupList` from `./groups.utils.ts`)
5. comment (line 10: explanation for _openGroup variable)
6. value binding (line 11: `_openGroup` — let, null initialized)
7. bind name to function definition (line 12: `setLoadOpenGroupCallback`) — exported
8. bind name to function definition (lines 14–24: `loadDiscover`) — exported async
9. bind name to function definition (lines 26–44: `loadMyGroups`) — exported async
10. bind name to function definition (lines 46–56: `loadLeaderboard`) — exported async

## Agent 02
1. Comment block (lines 1-4: JSDoc-style file description)
2. Import statement (line 6: `safeRpc` from '../auth.ts')
3. Import statement (line 7: `activeCategory`, `currentUser` from './groups.state.ts')
4. Import statement (line 8: `renderEmpty`, `renderGroupList` from './groups.utils.ts')
5. Comment (line 10: single-line comment about openGroup injection)
6. Variable binding (line 11: `let _openGroup` with type annotation and null initialization)
7. Export function declaration (line 12: `setLoadOpenGroupCallback`)
8. Export async function declaration (lines 14-24: `loadDiscover`)
9. Export async function declaration (lines 26-44: `loadMyGroups`)
10. Export async function declaration (lines 46-56: `loadLeaderboard`)

## Agent 03
1. block comment (lines 1–4: module documentation)
2. import (line 6: `safeRpc` from `../auth.ts`)
3. import (line 7: `activeCategory`, `currentUser` from `./groups.state.ts`)
4. import (line 8: `renderEmpty`, `renderGroupList` from `./groups.utils.ts`)
5. line comment (line 10: circular dependency explanation)
6. variable declaration (line 11: `_openGroup`)
7. function declaration (line 12: `setLoadOpenGroupCallback`) — exported
8. function declaration (lines 14–24: `loadDiscover`) — exported async
9. function declaration (lines 26–44: `loadMyGroups`) — exported async
10. function declaration (lines 46–56: `loadLeaderboard`) — exported async

## Agent 04
1. Module docblock (lines 1-4)
2. Import statement (line 6: `safeRpc` from '../auth.ts')
3. Import statement (line 7: `activeCategory`, `currentUser` from './groups.state.ts')
4. Import statement (line 8: `renderEmpty`, `renderGroupList` from './groups.utils.ts')
5. Line comment (line 10)
6. Variable declaration (line 11: `_openGroup`)
7. Function declaration (line 12: `setLoadOpenGroupCallback`) — exported
8. Function declaration (lines 14-24: `loadDiscover`) — exported async
9. Function declaration (lines 26-44: `loadMyGroups`) — exported async
10. Function declaration (lines 46-56: `loadLeaderboard`) — exported async

## Agent 05
1. Comment block (lines 1–4)
2. Import statement (line 6: `{ safeRpc }` from '../auth.ts')
3. Import statement (line 7: `{ activeCategory, currentUser }` from './groups.state.ts')
4. Import statement (line 8: `{ renderEmpty, renderGroupList }` from './groups.utils.ts')
5. Comment (line 10)
6. Variable declaration (line 11: `_openGroup` let, type `((id: string) => void) | null`)
7. Function declaration (line 12: `setLoadOpenGroupCallback`) — exported
8. Function declaration (lines 14–24: `loadDiscover`) — exported async
9. Function declaration (lines 26–44: `loadMyGroups`) — exported async
10. Function declaration (lines 46–56: `loadLeaderboard`) — exported async
