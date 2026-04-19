# Stage 1 Outputs — reference-arsenal.forge-wiring.ts

## Agent 01
1. import — showToast from ./config.ts
2. import — _submitForge from ./reference-arsenal.forge-submit.ts
3. import — ForgeFormState type from ./reference-arsenal.forge-submit.ts
4. import — ArsenalReference, SourceType, ReferenceCategory types from ./reference-arsenal.types.ts
5. bind name to function definition — _wireForgeSheet (exported)
6. bind name to function definition — _validateStep

## Agent 02
1. import (side-effect) - showToast
2. import - _submitForge
3. import (type-only) - ForgeFormState
4. import (type-only) - ArsenalReference, SourceType, ReferenceCategory
5. blank
6. bind name to function definition (exported) - _wireForgeSheet
7. comment
8-27. top-level statements within _wireForgeSheet body
28. blank
29. bind name to function definition - _validateStep

## Agent 03
1. import — showToast from ./config.ts
2. import — _submitForge from ./reference-arsenal.forge-submit.ts
3. import — type ForgeFormState from ./reference-arsenal.forge-submit.ts
4. import — types ArsenalReference, SourceType, ReferenceCategory from ./reference-arsenal.types.ts
5. blank
6. bind name to function definition (exported) — _wireForgeSheet
7-30. comments, values, and statements within _wireForgeSheet body
31. bind name to function definition — _validateStep
32. blank

## Agent 04
1. Import: showToast
2. Import: _submitForge
3. Import: ForgeFormState type
4. Import: ArsenalReference, SourceType, ReferenceCategory types
5. Blank line
6. Bind name to function definition (exported): _wireForgeSheet
7-30. Comments and top-level statements within _wireForgeSheet body
31. Bind name to function definition: _validateStep
32-33. Top-level statement (function body of _validateStep) + blank

## Agent 05
1. import – showToast from './config.ts'
2. import – _submitForge from './reference-arsenal.forge-submit.ts'
3. import (type) – ForgeFormState from './reference-arsenal.forge-submit.ts'
4. import (type) – ArsenalReference, SourceType, ReferenceCategory from './reference-arsenal.types.ts'
5. blank
6. bind name to function definition – _wireForgeSheet (exported)
7-23. top-level statements and comments within _wireForgeSheet body
24. blank
25. bind name to function definition – _validateStep
