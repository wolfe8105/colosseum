# Stage 1 Outputs — groups.nav.ts

## Agent 01
1. comment (lines 1-4)
2. blank
3. import safeRpc from '../auth.ts'
4. import (activeCategory, currentGroupId, callerRole, setActiveTab, setActiveDetailTab, setActiveCategory, setCurrentGroupId, setCallerRole) from './groups.state.ts'
5. import (renderEmpty, renderGroupList) from './groups.utils.ts'
6. import loadPendingAuditions from './groups.auditions.ts'
7. import (type-only) GroupListItem from './groups.types.ts'
8. blank
9. comment (lines 15-16)
10. bind name to value (exported) _openGroup
11. bind name to function definition (exported) setNavOpenGroupCallback
12. blank
13. bind name to function definition (exported) switchTab
14. blank
15. bind name to function definition (exported) switchDetailTab
16. blank
17. bind name to function definition (exported) filterCategory
18. blank
19. bind name to function definition (exported) showLobby

## Agent 02
1. Comment (lines 1-4)
2. Import `safeRpc` from '../auth.ts'
3. Import bindings from './groups.state.ts' (activeCategory, currentGroupId, callerRole, setActiveTab, setActiveDetailTab, setActiveCategory, setCurrentGroupId, setCallerRole)
4. Import `renderEmpty, renderGroupList` from './groups.utils.ts'
5. Import `loadPendingAuditions` from './groups.auditions.ts'
6. Type-only import `GroupListItem` from './groups.types.ts'
7. Comment (lines 15-16)
8. Bind name `_openGroup` to value (null initialized)
9. Bind name to function definition `setNavOpenGroupCallback` (exported)
10. Bind name to function definition `switchTab` (exported)
11. Bind name to function definition `switchDetailTab` (exported)
12. Bind name to function definition `filterCategory` (exported)
13. Bind name to function definition `showLobby` (exported)

## Agent 03
1. **comment** (lines 1–4: block documentation)
2. **import** (line 6: `safeRpc` from `../auth.ts`)
3. **import** (lines 7–10: named bindings from `./groups.state.ts`)
4. **import** (line 11: named bindings `renderEmpty`, `renderGroupList` from `./groups.utils.ts`)
5. **import** (line 12: named binding `loadPendingAuditions` from `./groups.auditions.ts`)
6. **import** (type-only, line 13: `GroupListItem` from `./groups.types.ts`)
7. **comment** (lines 15–16: block documentation)
8. **bind name to value** (line 17: `_openGroup` initialized to `null`)
9. **bind name to function definition** (line 18: exported function `setNavOpenGroupCallback`)
10. **bind name to function definition** (line 20: exported function `switchTab`)
11. **bind name to function definition** (line 32: exported function `switchDetailTab`)
12. **bind name to function definition** (line 45: exported function `filterCategory`)
13. **bind name to function definition** (line 52: exported function `showLobby`)

## Agent 04
1. Comment
2. Import: `safeRpc` from `'../auth.ts'`
3. Import: `activeCategory, currentGroupId, callerRole, setActiveTab, setActiveDetailTab, setActiveCategory, setCurrentGroupId, setCallerRole` from `'./groups.state.ts'`
4. Import: `renderEmpty, renderGroupList` from `'./groups.utils.ts'`
5. Import: `loadPendingAuditions` from `'./groups.auditions.ts'`
6. Type import: `GroupListItem` from `'./groups.types.ts'`
7. Comment
8. Comment
9. Bind name to value: `_openGroup` (initialized to `null`)
10. Bind name to function definition (exported): `setNavOpenGroupCallback`
11. Bind name to function definition (exported): `switchTab`
12. Bind name to function definition (exported): `switchDetailTab`
13. Bind name to function definition (exported): `filterCategory`
14. Bind name to function definition (exported): `showLobby`

## Agent 05
1. **comment** — lines 1-4 (block comment)
2. **import** — `{ safeRpc }` from `'../auth.ts'`
3. **import** — `{ activeCategory, currentGroupId, callerRole, setActiveTab, setActiveDetailTab, setActiveCategory, setCurrentGroupId, setCallerRole }` from `'./groups.state.ts'`
4. **import** — `{ renderEmpty, renderGroupList }` from `'./groups.utils.ts'`
5. **import** — `{ loadPendingAuditions }` from `'./groups.auditions.ts'`
6. **import** (type-only) — `type { GroupListItem }` from `'./groups.types.ts'`
7. **comment** — lines 15-16 (block comment)
8. **bind name to value** — `_openGroup` (initialized to `null`)
9. **bind name to function definition** (exported) — `setNavOpenGroupCallback`
10. **bind name to function definition** (exported) — `switchTab`
11. **bind name to function definition** (exported) — `switchDetailTab`
12. **bind name to function definition** (exported) — `filterCategory`
13. **bind name to function definition** (exported) — `showLobby`
