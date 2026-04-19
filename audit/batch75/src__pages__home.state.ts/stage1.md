# Stage 1 Outputs — home.state.ts

## Agent 01
Read 23 lines of 23 total.

1. comment — `// LM-HOME-002: All mutable module-level vars live here.`
2. comment — `// ES module imports are read-only bindings — direct let exports`
3. comment — `// cannot be reassigned from other files. All sibling files do state.foo = x.`
4. blank
5. import — `import type { Category } from './home.types.ts'`
6. import — `import type { ArsenalReference } from '../reference-arsenal.ts'`
7. blank
8. bind name to value — `CATEGORIES` (exported)
9. blank
10. bind name to value — `state` (exported)

## Agent 02
Read 23 lines of 23 total.

1. comment (line 1)
2. comment (lines 2–3)
3. blank
4. import — `import type { Category } from './home.types.ts'`
5. import — `import type { ArsenalReference } from '../reference-arsenal.ts'`
6. blank
7. bind name to value — `CATEGORIES` (exported, lines 8–15)
8. blank
9. bind name to value — `state` (exported, lines 17–23)

## Agent 03
Read 23 lines of 23 total.

1. comment — `// LM-HOME-002: All mutable module-level vars live here.`
2. comment — `// ES module imports are read-only bindings — direct let exports`
3. comment — `// cannot be reassigned from other files. All sibling files do state.foo = x.`
4. blank
5. import — `import type { Category } from './home.types.ts'`
6. import — `import type { ArsenalReference } from '../reference-arsenal.ts'`
7. blank
8. bind name to value — `CATEGORIES`, exported
9. blank
10. bind name to value — `state`, exported

## Agent 04
Read 23 lines of 23 total.

1. comment — `// LM-HOME-002: All mutable module-level vars live here.`
2. comment — `// ES module imports are read-only bindings — direct let exports`
3. comment — `// cannot be reassigned from other files. All sibling files do state.foo = x.`
4. blank
5. import — `import type { Category } from './home.types.ts'`
6. import — `import type { ArsenalReference } from '../reference-arsenal.ts'`
7. blank
8. bind name to value — `CATEGORIES` (exported, array literal spanning lines 8–15)
9. blank
10. bind name to value — `state` (exported, object literal spanning lines 17–23)

## Agent 05
Read 23 lines of 23 total.

1. comment — `// LM-HOME-002: All mutable module-level vars live here.`
2. comment — `// ES module imports are read-only bindings — direct let exports`
3. comment — `// cannot be reassigned from other files. All sibling files do state.foo = x.`
4. blank
5. import — `import type { Category } from './home.types.ts'`
6. import — `import type { ArsenalReference } from '../reference-arsenal.ts'`
7. blank
8. bind name to value — `CATEGORIES` (exported)
9. blank
10. bind name to value — `state` (exported)
