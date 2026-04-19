# Stage 1 Outputs — auth.follows.ts

## Agent 01
1. Comment (lines 1-3)
2. Import (line 5)
3. Import (line 6)
4. Import type-only (line 7)
5. Bind name to function definition: `followUser` (exported, lines 9-20)
6. Bind name to function definition: `unfollowUser` (exported, lines 22-33)
7. Bind name to function definition: `getFollowers` (exported, lines 35-48)
8. Bind name to function definition: `getFollowing` (exported, lines 50-63)
9. Bind name to function definition: `getFollowCounts` (exported, lines 65-75)

## Agent 02
1. Comment (lines 1-3): Multi-line documentation comment
2. Import (line 5): Import named values from './auth.core.ts' — `getSupabaseClient`, `getIsPlaceholderMode`, `isUUID`
3. Import (line 6): Import named value from './auth.rpc.ts' — `safeRpc`
4. Import (line 7): Type-only import from './auth.types.ts' — `AuthResult`, `FollowRow`
5. Bind name to function definition (exported) (lines 9-20): `followUser`
6. Bind name to function definition (exported) (lines 22-33): `unfollowUser`
7. Bind name to function definition (exported) (lines 35-48): `getFollowers`
8. Bind name to function definition (exported) (lines 50-63): `getFollowing`
9. Bind name to function definition (exported) (lines 65-75): `getFollowCounts`

## Agent 03
1. comment (lines 1-3: documentation block)
2. import (line 5: `getSupabaseClient`, `getIsPlaceholderMode`, `isUUID` from `'./auth.core.ts'`)
3. import (line 6: `safeRpc` from `'./auth.rpc.ts'`)
4. import (line 7: type-only import `AuthResult`, `FollowRow` from `'./auth.types.ts'`)
5. bind name to function definition (line 9: `followUser`, exported)
6. bind name to function definition (line 22: `unfollowUser`, exported)
7. bind name to function definition (line 35: `getFollowers`, exported)
8. bind name to function definition (line 50: `getFollowing`, exported)
9. bind name to function definition (line 65: `getFollowCounts`, exported)
10. blank (line 76: end of file)

## Agent 04
1. comment (line 1-3)
2. import (line 5) - `getSupabaseClient`, `getIsPlaceholderMode`, `isUUID` from './auth.core.ts'
3. import (line 6) - `safeRpc` from './auth.rpc.ts'
4. import (line 7, type-only) - `AuthResult`, `FollowRow` from './auth.types.ts'
5. bind name to function definition (line 9, exported) - `followUser`
6. bind name to function definition (line 22, exported) - `unfollowUser`
7. bind name to function definition (line 35, exported) - `getFollowers`
8. bind name to function definition (line 50, exported) - `getFollowing`
9. bind name to function definition (line 65, exported) - `getFollowCounts`
10. blank (line 76)

## Agent 05
1. import (getSupabaseClient, getIsPlaceholderMode, isUUID from './auth.core.ts')
2. import (safeRpc from './auth.rpc.ts')
3. import type (AuthResult, FollowRow from './auth.types.ts')
4. bind name to function definition (followUser, exported)
5. bind name to function definition (unfollowUser, exported)
6. bind name to function definition (getFollowers, exported)
7. bind name to function definition (getFollowing, exported)
8. bind name to function definition (getFollowCounts, exported)
