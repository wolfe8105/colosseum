# Stage 1 Outputs — plinko-step4-step5.ts

## Agent 01
1. comment (lines 1-3)
2. blank (line 4)
3. import (line 5)
4. import (line 6)
5. blank (line 7)
6. bind name to function definition (exported, line 8-21: attachStep4)
7. blank (line 22)
8. bind name to function definition (exported, line 23-27: attachStep5)
9. blank (line 28)

## Agent 02
1. Comment (lines 1-3)
2. Blank (line 4)
3. Import (line 5: `import { toggleModerator } from '../auth.ts'`)
4. Import (line 6: `import { getReturnTo, goToStep } from './plinko-helpers.ts'`)
5. Blank (implicit before line 8)
6. Bind name to function definition, exported (line 8: `export function attachStep4()`)
7. Top-level statement (lines 9-21: event listener setup within attachStep4) [NOTE: misclassified, these are inside function body]
8. Blank (implicit before line 23)
9. Bind name to function definition, exported (line 23: `export function attachStep5()`)
10. Top-level statement (lines 24-26: event listener setup within attachStep5) [NOTE: misclassified, these are inside function body]
11. Blank (line 28)

## Agent 03
1. comment
2. blank
3. import (`toggleModerator` from `../auth.ts`)
4. import (`getReturnTo`, `goToStep` from `./plinko-helpers.ts`)
5. blank
6. bind name to function definition (`attachStep4`, exported)
7. top-level statement (event listener attachment at module load) [NOTE: misclassified, inside function body]
8. blank
9. bind name to function definition (`attachStep5`, exported)
10. top-level statement (event listener attachment at module load) [NOTE: misclassified, inside function body]
11. blank

## Agent 04
1. comment (block comment)
2. blank
3. import (`toggleModerator` from `../auth.ts`)
4. import (`getReturnTo`, `goToStep` from `./plinko-helpers.ts`)
5. blank
6. bind name to function definition; exported (`attachStep4`)
7. top-level statement (event listener attachment) [NOTE: misclassified, inside function body]
8. blank
9. bind name to function definition; exported (`attachStep5`)
10. top-level statement (event listener attachment) [NOTE: misclassified, inside function body]
11. blank

## Agent 05
1. Comment (lines 1-3: JSDoc block)
2. Import (line 5: `toggleModerator` from `'../auth.ts'`)
3. Import (line 6: `getReturnTo`, `goToStep` from `'./plinko-helpers.ts'`)
4. Bind name to function definition (line 8: `attachStep4`, exported)
5. Top-level statement (lines 9-16: `document.getElementById(...).addEventListener(...)`) [NOTE: misclassified, inside function body]
6. Top-level statement (lines 18-20: `document.getElementById(...).addEventListener(...)`) [NOTE: misclassified, inside function body]
7. Bind name to function definition (line 23: `attachStep5`, exported)
8. Top-level statement (lines 24-26: `document.getElementById(...).addEventListener(...)`) [NOTE: misclassified, inside function body]
