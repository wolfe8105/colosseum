# Stage 1 Outputs — home.arsenal.ts

## Agent 01
1. comment (lines 1–3)
2. comment (line 4)
3. import (line 6)
4. import type (line 7)
5. import (line 8)
6. import (line 9)
7. bind name to function definition; exported — `loadArsenalScreen` (lines 11–21)
8. bind name to function definition — `loadMyArsenal` (lines 23–26)
9. bind name to function definition — `loadArmory` (lines 28–30)
10. bind name to function definition — `loadForge` (lines 32–54)
11. bind name to function definition — `wireArsenalButtons` (lines 56–79)
12. comment (line 81)
13. top-level statement (lines 82–99)

## Agent 02
1. comment (lines 1-4)
2. import (line 6)
3. import type (line 7)
4. import (line 8)
5. import (line 9)
6. bind name to function definition, exported (line 11: `loadArsenalScreen`)
7. bind name to function definition (line 23: `loadMyArsenal`)
8. bind name to function definition (line 28: `loadArmory`)
9. bind name to function definition (line 32: `loadForge`)
10. bind name to function definition (line 56: `wireArsenalButtons`)
11. comment (line 81)
12. top-level statement (lines 82-99: document.querySelectorAll tab event listener setup)

## Agent 03
1. Comment (lines 1–3: block comment)
2. Comment (line 4: line comment)
3. Import (line 6: named import from `../reference-arsenal.ts`)
4. Import (line 7: type-only named import from `../reference-arsenal.ts`)
5. Import (line 8: named import from `./home.state.ts`)
6. Import (line 9: named import from `./home.arsenal-shop.ts`)
7. Bind name to function definition (line 11: `loadArsenalScreen`, exported)
8. Bind name to function definition (line 23: `loadMyArsenal`)
9. Bind name to function definition (line 28: `loadArmory`)
10. Bind name to function definition (line 32: `loadForge`)
11. Bind name to function definition (line 56: `wireArsenalButtons`)
12. Top-level statement (lines 82–99: `document.querySelectorAll...` with event listener)
13. Blank (line 100)

## Agent 04
1. comment
2. comment
3. import (side-effect-free): `showForgeForm, renderArsenal, renderArmory` from `'../reference-arsenal.ts'`
4. import (type-only): `ArsenalReference` from `'../reference-arsenal.ts'`
5. import (side-effect-free): `state` from `'./home.state.ts'`
6. import (side-effect-free): `loadShopScreen, cleanupShopScreen` from `'./home.arsenal-shop.ts'`
7. bind name to function definition (exported): `loadArsenalScreen`
8. bind name to function definition: `loadMyArsenal`
9. bind name to function definition: `loadArmory`
10. bind name to function definition: `loadForge`
11. bind name to function definition: `wireArsenalButtons`
12. comment
13. top-level statement (event listener registration)
14. blank

## Agent 05
1. comment (lines 1-4)
2. import (line 6: showForgeForm, renderArsenal, renderArmory from '../reference-arsenal.ts')
3. import (line 7, type-only: ArsenalReference from '../reference-arsenal.ts')
4. import (line 8: state from './home.state.ts')
5. import (line 9: loadShopScreen, cleanupShopScreen from './home.arsenal-shop.ts')
6. bind name to function definition, exported (line 11: loadArsenalScreen)
7. bind name to function definition (line 23: loadMyArsenal)
8. bind name to function definition (line 28: loadArmory)
9. bind name to function definition (line 32: loadForge)
10. bind name to function definition (line 56: wireArsenalButtons)
11. comment (line 81)
12. top-level statement (lines 82-99: document.querySelectorAll event listener registration)
13. blank (line 100)
