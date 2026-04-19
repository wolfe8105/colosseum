# Stage 1 Outputs — home.nav.ts

## Agent 01
1. comment (line 1)
2. imports (lines 4-15: 12 named imports)
3. blank (line 16)
4. bind name to value — VALID_SCREENS (line 17)
5. blank (line 18)
6. bind name to function definition (exported) — navigateTo (line 19)
7. top-level statement — bottom-nav-btn forEach (line 52-54)
8. blank
9. top-level statement — registerNavigate call (line 55)
10. blank
11. top-level statement — data-action click listener (line 58-82)

## Agent 02
1. import (destroy as destroyArena, showPowerUpShop from '../arena.ts')
2. import (registerNavigate from '../navigation.ts')
3. import (shareProfile, inviteFriend from '../share.ts')
4. import (subscribe from '../payments.ts')
5. import (getCurrentProfile, getCurrentUser from '../auth.ts')
6. import (ModeratorAsync from '../async.ts')
7. import (renderFeed from './home.feed.ts')
8. import (loadArsenalScreen from './home.arsenal.ts')
9. import (loadInviteScreen, cleanupInviteScreen from './home.invite.ts')
10. import (loadFollowCounts from './home.profile.ts')
11. import (loadDebateArchive from '../profile-debate-archive.ts')
12. import (state from './home.state.ts')
13. bind name to value (VALID_SCREENS)
14. bind name to function definition (navigateTo) — exported
15. top-level statement (document.querySelectorAll('.bottom-nav-btn').forEach(...))
16. top-level statement (registerNavigate(navigateTo))
17. top-level statement (document.addEventListener('click', ...))

## Agent 03
1. Comment
2-13. Import (12 imports)
14. Bind name to value (VALID_SCREENS)
15. Bind name to function definition (exported: navigateTo)
16. Top-level statement (bottom nav wiring)
17. Top-level statement (registerNavigate call)
18. Comment
19. Top-level statement (data-action wiring)

## Agent 04
1. import (destroyArena, showPowerUpShop from '../arena.ts')
2. import (registerNavigate from '../navigation.ts')
3. import (shareProfile, inviteFriend from '../share.ts')
4. import (subscribe from '../payments.ts')
5. import (getCurrentProfile, getCurrentUser from '../auth.ts')
6. import (ModeratorAsync from '../async.ts')
7. import (renderFeed from './home.feed.ts')
8. import (loadArsenalScreen from './home.arsenal.ts')
9. import (loadInviteScreen, cleanupInviteScreen from './home.invite.ts')
10. import (loadFollowCounts from './home.profile.ts')
11. import (loadDebateArchive from '../profile-debate-archive.ts')
12. import (state from './home.state.ts')
13. bind name to value (VALID_SCREENS)
14. bind name to function definition (navigateTo), exported
15. top-level statement (document.querySelectorAll('.bottom-nav-btn').forEach(...))
16. top-level statement (registerNavigate(navigateTo))
17. top-level statement (document.addEventListener('click', ...))

## Agent 05
1. Comment (lines 1-3)
2. Import (line 4: destroy as destroyArena, showPowerUpShop)
3. Import (line 5: registerNavigate)
4. Import (line 6: shareProfile, inviteFriend)
5. Import (line 7: subscribe)
6. Import (line 8: getCurrentProfile, getCurrentUser)
7. Import (line 9: ModeratorAsync)
8. Import (line 10: renderFeed)
9. Import (line 11: loadArsenalScreen)
10. Import (line 12: loadInviteScreen, cleanupInviteScreen)
11. Import (line 13: loadFollowCounts)
12. Import (line 14: loadDebateArchive)
13. Import (line 15: state)
14. Blank (line 16)
15. Bind name to value (line 17: VALID_SCREENS)
16. Blank (line 18)
17. Bind name to function definition, exported (line 19: navigateTo)
18. Comment (line 51)
19. Top-level statement (lines 52-54: event listener setup)
20. Top-level statement (line 55: registerNavigate(navigateTo))
21. Blank (line 56)
22. Comment (line 57)
23. Top-level statement (lines 58-82: event listener setup)
