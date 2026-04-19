# Stage 1 Outputs — plinko-step2-age.ts

## Agent 01

1. comment (lines 1–3)
2. blank (line 4)
3. import (line 5: `clearMsg`, `getAge`, `goToStep`, `showMsg` from `'./plinko-helpers.ts'`)
4. import (line 6: `set_isMinor`, `set_signupDob` from `'./plinko-state.ts'`)
5. bind name to function definition; exported (line 8: `attachStep2`)
6. blank (line 30)

## Agent 02

1. comment (lines 1-3)
2. import (line 5: `clearMsg`, `getAge`, `goToStep`, `showMsg` from './plinko-helpers.ts')
3. import (line 6: `set_isMinor`, `set_signupDob` from './plinko-state.ts')
4. bind name to function definition, exported (line 8: `attachStep2()`)
5. top-level statement (line 9: event listener attachment)
6. top-level statement (line 10: `clearMsg` call)
7. top-level statement (line 11: variable declaration and assignment for `month`)
8. top-level statement (line 12: variable declaration and assignment for `day`)
9. top-level statement (line 13: variable declaration and assignment for `year`)
10. top-level statement (line 14: variable declaration and assignment for `tos`)
11. top-level statement (line 16: conditional check and early return)
12. top-level statement (line 17: conditional check and early return)
13. top-level statement (line 19: variable declaration and assignment for `age`)
14. top-level statement (line 20-23: conditional block)
15. top-level statement (line 25: `set_signupDob` call)
16. top-level statement (line 26: `set_isMinor` call)
17. top-level statement (line 27: `goToStep` call)
18. blank (line 30)

## Agent 03

1. comment (lines 1-3)
2. blank (line 4)
3. import (line 5: `clearMsg`, `getAge`, `goToStep`, `showMsg` from `./plinko-helpers.ts`)
4. import (line 6: `set_isMinor`, `set_signupDob` from `./plinko-state.ts`)
5. bind name to function definition (line 8: `attachStep2`, exported)
6. top-level statement (lines 9-28: function call to `addEventListener`)
7. blank (line 30)

## Agent 04

1. Comment (lines 1–3)
2. Blank (line 4)
3. Import (line 5): `clearMsg, getAge, goToStep, showMsg` from `./plinko-helpers.ts`
4. Import (line 6): `set_isMinor, set_signupDob` from `./plinko-state.ts`
5. Blank (line 7)
6. Bind name to function definition (exported): `attachStep2` (lines 8–29)
7. Blank (line 30)

## Agent 05

1. Directive — multi-line comment (lines 1–3)
2. Import — `clearMsg`, `getAge`, `goToStep`, `showMsg` from `'./plinko-helpers.ts'` (line 5)
3. Import — `set_isMinor`, `set_signupDob` from `'./plinko-state.ts'` (line 6)
4. Bind name to function definition, exported — `attachStep2` (line 8)
5. Top-level statement — call to `document.getElementById('btn-age-next')?.addEventListener(...)` within the function body (lines 9–28)
6. Blank — (line 30)
