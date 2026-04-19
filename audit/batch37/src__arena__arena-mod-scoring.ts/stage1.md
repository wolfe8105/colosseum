# Stage 1 Outputs — arena-mod-scoring.ts

## Agent 01
1. import (named imports: getCurrentProfile, scoreModerator from '../auth.ts')
2. import (named imports: escapeHTML, friendlyError from '../config.ts')
3. import (type-only import: CurrentDebate from './arena-types.ts')
4. import (named import: injectAdSlot from './arena-ads.ts')
5. bind name to function definition (renderModScoring), exported
6. top-level statement (if !debate.moderatorId || !debate.moderatorName return)
7. bind name to value (profile)
8. top-level statement (if !profile return)
9. bind name to value (isDebater)
10. bind name to value (isMod)
11. top-level statement (if isMod return)
12. bind name to value (section)
13. top-level statement (section.className assignment)
14. top-level statement (if isDebater section.innerHTML assignment)
15. top-level statement (else section.innerHTML assignment)
16. top-level statement (container.appendChild call)
17. top-level statement (injectAdSlot call)
18. top-level statement (section.querySelectorAll forEach with click listener)
19. bind name to value (score)
20. top-level statement (section.querySelectorAll forEach disable buttons)
21. bind name to value (result)
22. bind name to value (scoredEl)
23. top-level statement (if result?.error conditional updates)
24. top-level statement (else conditional updates)
25. bind name to value (slider)
26. bind name to value (valEl)
27. top-level statement (if slider && valEl addEventListener)
28. top-level statement (document.getElementById mod-score-submit addEventListener)
29. bind name to value (score)
30. bind name to value (submitBtn)
31. top-level statement (if submitBtn conditional updates)
32. bind name to value (result)
33. bind name to value (scoredEl)
34. top-level statement (if result?.error conditional updates)
35. top-level statement (else conditional updates)

## Agent 02
1. import (getCurrentProfile, scoreModerator from '../auth.ts')
2. import (escapeHTML, friendlyError from '../config.ts')
3. import type (CurrentDebate from './arena-types.ts')
4. import (injectAdSlot from './arena-ads.ts')
5. bind name to function definition: renderModScoring (exported)
6. top-level statement (function body: if statements, variable declarations, DOM manipulation)
7. blank
8. blank

## Agent 03
1. import (side-effect or regular) - getCurrentProfile, scoreModerator from ../auth.ts
2. import (side-effect or regular) - escapeHTML, friendlyError from ../config.ts
3. import (type-only) - CurrentDebate from ./arena-types.ts
4. import (side-effect or regular) - injectAdSlot from ./arena-ads.ts
5. blank
6. bind name to function definition (exported) - renderModScoring
7. top-level statement (bare expression or function call executed at module load)
8. top-level statement (bare expression or function call executed at module load)
9. blank
10. bind name to value - isDebater
11. bind name to value - isMod
12. top-level statement (bare expression or function call executed at module load)
13. blank
14. bind name to value - section
15. top-level statement (bare expression or function call executed at module load)
16. blank
17. top-level statement (bare expression or function call executed at module load)
18. top-level statement (bare expression or function call executed at module load)
19-29. top-level statement — contiguous block setting innerHTML
30-43. top-level statement — contiguous block in else branch setting innerHTML
44. blank
45. top-level statement (bare expression or function call executed at module load)
46. blank
47-48. comment and top-level statement — contiguous block with event listener setup and async callback
49. blank
50-63. comment and top-level statement — contiguous block with event listener setup and async callback
64. blank
65-70. comment and top-level statement — contiguous block binding slider/valEl and addEventListener
71-84. top-level statement — contiguous block with addEventListener for submit button
85. blank

## Agent 04
1. import (named: getCurrentProfile, scoreModerator from '../auth.ts')
2. import (named: escapeHTML, friendlyError from '../config.ts')
3. import (type-only: CurrentDebate from './arena-types.ts')
4. import (named: injectAdSlot from './arena-ads.ts')
5. bind name to function definition (exported: renderModScoring)

## Agent 05
1. import (default imports: getCurrentProfile, scoreModerator from '../auth.ts')
2. import (default imports: escapeHTML, friendlyError from '../config.ts')
3. import (type-only import: CurrentDebate from './arena-types.ts')
4. import (default imports: injectAdSlot from './arena-ads.ts')
5. bind name to function definition (exported): renderModScoring
6. blank line
7. top-level statement (debater button event listener setup)
8. blank line
9. blank line
10. top-level statement (spectator slider and submit button setup)
