# Stage 1 Outputs — arena-mod-debate-waiting.ts

## Agent 01
1. import (side-effect) - escapeHTML from '../config.ts'
2. import - screenEl, set_view from './arena-state.ts'
3. import (type-only) - DebateMode from './arena-types.ts'
4. import - startModDebatePoll, stopModDebatePoll, cancelModDebate from './arena-mod-debate-poll.ts'
5. bind name to function definition (exported) - showModDebateWaitingMod
6. bind name to function definition (exported) - showModDebateWaitingDebater
7. blank

## Agent 02
1. import `escapeHTML` from '../config.ts'
2. import `screenEl`, `set_view` from './arena-state.ts'
3. import type `DebateMode` from './arena-types.ts'
4. import `startModDebatePoll`, `stopModDebatePoll`, `cancelModDebate` from './arena-mod-debate-poll.ts'
5. bind name to function definition: `showModDebateWaitingMod` (exported)
6. top-level statement (function call: `set_view('modDebateWaiting')`)
7. top-level statement (function call: `history.pushState(...)`)
8. top-level statement (conditional: `if (screenEl)`)
9. top-level statement (variable assignment: `const container = ...`)
10. top-level statement (property assignment: `container.className = ...`)
11. top-level statement (property assignment: `container.innerHTML = ...`)
12. top-level statement (function call: `screenEl?.appendChild(container)`)
13. top-level statement (function call: `document.getElementById(...).addEventListener(...)`)
14. top-level statement (function call: `startModDebatePoll(...)`)
15. bind name to function definition: `showModDebateWaitingDebater` (exported)
16. top-level statement (function call: `set_view('modDebateWaiting')`)
17. top-level statement (function call: `history.pushState(...)`)
18. top-level statement (conditional: `if (screenEl)`)
19. top-level statement (variable assignment: `const container = ...`)
20. top-level statement (property assignment: `container.className = ...`)
21. top-level statement (property assignment: `container.innerHTML = ...`)
22. top-level statement (function call: `screenEl?.appendChild(container)`)
23. top-level statement (function call: `document.getElementById(...).addEventListener(...)`)
24. top-level statement (function call: `startModDebatePoll(...)`)

## Agent 03
1. import `escapeHTML` from '../config.ts'
2. import `screenEl, set_view` from './arena-state.ts'
3. import type `DebateMode` from './arena-types.ts'
4. import `startModDebatePoll, stopModDebatePoll, cancelModDebate` from './arena-mod-debate-poll.ts'
5. bind name to function definition `showModDebateWaitingMod` (exported)
6. bind name to function definition `showModDebateWaitingDebater` (exported)

## Agent 04
1. import (side-effect-free): `escapeHTML` from `../config.ts`
2. import (side-effect-free): `screenEl`, `set_view` from `./arena-state.ts`
3. import (type-only): `DebateMode` from `./arena-types.ts`
4. import (side-effect-free): `startModDebatePoll`, `stopModDebatePoll`, `cancelModDebate` from `./arena-mod-debate-poll.ts`
5. bind name to function definition (exported): `showModDebateWaitingMod`
6. top-level statement: function call to `set_view('modDebateWaiting')`
7. top-level statement: method call to `history.pushState()`
8. top-level statement: conditional statement and property assignment
9. top-level statement: variable assignment and DOM element creation/manipulation chain
10. top-level statement: method call to `addEventListener()` with arrow function callback
11. top-level statement: function call to `startModDebatePoll()`
12. bind name to function definition (exported): `showModDebateWaitingDebater`
13. top-level statement: function call to `set_view('modDebateWaiting')`
14. top-level statement: method call to `history.pushState()`
15. top-level statement: conditional statement and property assignment
16. top-level statement: variable assignment and DOM element creation/manipulation chain
17. top-level statement: method call to `addEventListener()` with async arrow function callback
18. top-level statement: function call to `stopModDebatePoll()`
19. top-level statement: dynamic import and variable destructuring
20. top-level statement: function call to `renderLobby()`
21. top-level statement: function call to `startModDebatePoll()`

## Agent 05
1. import (side-effect) — `escapeHTML` from `../config.ts`
2. import — `screenEl`, `set_view` from `./arena-state.ts`
3. import (type-only) — `DebateMode` from `./arena-types.ts`
4. import — `startModDebatePoll`, `stopModDebatePoll`, `cancelModDebate` from `./arena-mod-debate-poll.ts`
5. blank line
6. bind name to function definition (exported) — `showModDebateWaitingMod`
7. top-level statement — `set_view('modDebateWaiting')`
8. top-level statement — `history.pushState({ arenaView: 'modDebateWaiting' }, '')`
9. top-level statement — conditional `screenEl` check and `innerHTML` assignment
10. bind name to value — `container`
11. top-level statement — `container.className` assignment
12. top-level statement — `container.innerHTML` assignment
13. top-level statement — `screenEl?.appendChild(container)`
14. top-level statement — `document.getElementById('mod-debate-cancel-btn')?.addEventListener(...)`
15. top-level statement — `startModDebatePoll(debateId, mode, ranked)`
16. blank line
17. bind name to function definition (exported) — `showModDebateWaitingDebater`
18. top-level statement — `set_view('modDebateWaiting')`
19. top-level statement — `history.pushState({ arenaView: 'modDebateWaiting' }, '')`
20. top-level statement — conditional `screenEl` check and `innerHTML` assignment
21. bind name to value — `container`
22. top-level statement — `container.className` assignment
23. top-level statement — `container.innerHTML` assignment
24. top-level statement — `screenEl?.appendChild(container)`
25. top-level statement — `document.getElementById('mod-debate-debater-cancel-btn')?.addEventListener(...)`
26. top-level statement — `stopModDebatePoll()`
27. top-level statement — dynamic import and call to `renderLobby()`
28. top-level statement — `startModDebatePoll(debateId, mode, ranked)`
29. blank line (end of file)
