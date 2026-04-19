# Stage 1 Outputs — settings.ts

## Agent 01
1. Comment (lines 1-8: multi-line documentation header)
2. Import (line 10-12: named imports from '../auth.ts')
3. Import (line 13: named import from './settings.load.ts')
4. Import (line 14: named imports from './settings.moderator.ts')
5. Import (line 15: named imports from './settings.wiring.ts')
6. Import (line 16: named import from './settings.helpers.ts')
7. Comment (line 18-19: LANDMINE annotation)
8. Top-level statement (line 20-66: window.addEventListener call with async handler)

## Agent 02
1. comment (lines 1-8: file header comment)
2. import (lines 10-12: named imports from '../auth.ts')
3. import (line 13: named import from './settings.load.ts')
4. import (line 14: named imports from './settings.moderator.ts')
5. import (line 15: named imports from './settings.wiring.ts')
6. import (line 16: named import from './settings.helpers.ts')
7. comment (lines 18-19: LANDMINE annotation)
8. top-level statement (lines 20-66: window.addEventListener call with async callback)

## Agent 03
1. comment (lines 1-8: block comment documenting the file)
2. import (line 10-12: `ready`, `getCurrentUser`, `getIsPlaceholderMode`, `getSupabaseClient` from `../auth.ts`)
3. import (line 13: `loadSettings` from `./settings.load.ts`)
4. import (line 14: `loadModeratorSettings`, `wireModeratorToggles` from `./settings.moderator.ts`)
5. import (line 15: `wireSettings`, `wireIntroMusicRow` from `./settings.wiring.ts`)
6. import (line 16: `setChecked` from `./settings.helpers.ts`)
7. comment (line 18-19: line comment about LANDMINE)
8. top-level statement (line 20-66: `window.addEventListener('DOMContentLoaded', async () => { ... })`)
9. blank (line 67: end of file)

## Agent 04
1. Comment (lines 1–8): multi-line documentation comment
2. Directive (line 10): opening of import block
3. Import (lines 10–12): import from '../auth.ts'
4. Import (line 13): import from './settings.load.ts'
5. Import (line 14): import from './settings.moderator.ts'
6. Import (line 15): import from './settings.wiring.ts'
7. Import (line 16): import from './settings.helpers.ts'
8. Blank (line 17)
9. Comment (lines 18–19): multi-line comment (LANDMINE note)
10. Top-level statement (lines 20–66): `window.addEventListener('DOMContentLoaded', async () => { ... })`

## Agent 05
1. Comment (lines 1-8: block comment)
2. Import (line 10-12: `ready`, `getCurrentUser`, `getIsPlaceholderMode`, `getSupabaseClient` from `../auth.ts`)
3. Import (line 13: `loadSettings` from `./settings.load.ts`)
4. Import (line 14: `loadModeratorSettings`, `wireModeratorToggles` from `./settings.moderator.ts`)
5. Import (line 15: `wireSettings`, `wireIntroMusicRow` from `./settings.wiring.ts`)
6. Import (line 16: `setChecked` from `./settings.helpers.ts`)
7. Comment (lines 18-19: block comment)
8. Top-level statement (lines 20-66: `window.addEventListener('DOMContentLoaded', async () => { ... })`)
