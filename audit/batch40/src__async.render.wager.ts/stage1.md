# Stage 1 Outputs — async.render.wager.ts

## Agent 01

1. comment (lines 1–5)
2. import (line 7: `state` from `./async.state.ts`)
3. import (line 8: `escapeHTML` from `./config.ts`)
4. import (line 9: `getCurrentProfile` from `./auth.ts`)
5. blank (line 10)
6. bind name to value (line 11: `esc` = `escapeHTML`)
7. blank (line 12)
8. bind name to value (line 13: `_activeWagerDebateId` = `null`)
9. blank (line 14)
10. bind name to function definition, exported (line 15: `_showWagerPicker`)
11. bind name to value (line 19: `balance`)
12. bind name to value (line 20: `pred`)
13. bind name to value (line 23: `sideLabel`)
14. bind name to value (line 24: `safeDebateId`)
15. bind name to value (line 25: `safeSide`)
16. bind name to value (line 27: `quickAmounts`)
17. bind name to value (line 29: `pickerHtml`)
18. comment (line 46)
19. bind name to value (line 47: `card`)
20. comment (line 50)
21. bind name to value (line 51: `_activeWagerDebateId`)
22. bind name to value (line 53: `pickerEl`)
23. top-level statement (line 54: `pickerEl.id = ...`)
24. top-level statement (line 55: `pickerEl.innerHTML = ...`)
25. top-level statement (line 56: `card.appendChild(pickerEl)`)
26. comment (line 58)
27. bind name to value (line 59: `input`)
28. blank (line 62)
29. bind name to function definition, exported (line 63: `_hideWagerPicker`)
30. bind name to value (line 64: `_activeWagerDebateId`)
31. bind name to value (line 65: `existing`)
32. top-level statement (line 66: `existing.remove()`)

## Agent 02

1. comment
2. import (state)
3. import (escapeHTML)
4. import (getCurrentProfile)
5. bind name to value (esc)
6. bind name to value (_activeWagerDebateId)
7. bind name to function definition, exported (_showWagerPicker)
8. bind name to function definition, exported (_hideWagerPicker)

## Agent 03

1. Comment (lines 1-5)
2. Import `state` from './async.state.ts'
3. Import `escapeHTML` from './config.ts'
4. Import `getCurrentProfile` from './auth.ts'
5. Bind name to value: `esc` = `escapeHTML`
6. Bind name to value: `_activeWagerDebateId` (null, mutable)
7. Bind name to function definition: `_showWagerPicker` (exported)
8. Bind name to function definition: `_hideWagerPicker` (exported)

## Agent 04

1. comment
2. comment
3. comment
4. comment
5. comment
6. blank
7. import (`state` from './async.state.ts')
8. import (`escapeHTML` from './config.ts')
9. import (`getCurrentProfile` from './auth.ts')
10. blank
11. bind name to value (`esc`)
12. blank
13. bind name to value (`_activeWagerDebateId`)
14. blank
15. bind name to function definition, exported (`_showWagerPicker`)
[...internal statements within function body...]
62. bind name to function definition, exported (`_hideWagerPicker`)
[...internal statements within function body...]
66. blank

## Agent 05

1. comment (lines 1–5)
2. import (line 7: `state` from `./async.state.ts`)
3. import (line 8: `escapeHTML` from `./config.ts`)
4. import (line 9: `getCurrentProfile` from `./auth.ts`)
5. blank (line 10)
6. bind name to value (line 11: `esc` bound to `escapeHTML`)
7. blank (line 12)
8. bind name to value (line 13: `_activeWagerDebateId` bound to `null`)
9. blank (line 14)
10. bind name to function definition, exported (line 15: `_showWagerPicker`)
11. top-level statement (line 17: call `_hideWagerPicker()`)
12. top-level statement (line 19: call `getCurrentProfile()` with property access)
13. top-level statement (line 20: call `state.predictions.find()`)
14. top-level statement (line 21: early return)
15. top-level statement (line 23–25: variable bindings in conditional expressions)
16. top-level statement (line 27: call `filter()` on array)
17. top-level statement (line 29–44: template literal assignment to `pickerHtml`)
18. top-level statement (line 47: call `document.querySelector()` and type assertion)
19. top-level statement (line 48: early return)
20. top-level statement (line 51: assignment to `_activeWagerDebateId`)
21. top-level statement (line 53–56: DOM manipulation statements)
22. top-level statement (line 59–60: DOM query and conditional call)
23. blank (line 62)
24. bind name to function definition, exported (line 63: `_hideWagerPicker`)
25. top-level statement (line 64: assignment to `_activeWagerDebateId`)
26. top-level statement (line 65: call `document.getElementById()`)
27. top-level statement (line 66: conditional call to `.remove()`)
28. blank (line 68)
