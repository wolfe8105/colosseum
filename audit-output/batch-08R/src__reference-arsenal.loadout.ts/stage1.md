# Stage 1 Outputs — src/reference-arsenal.loadout.ts

## Agent 01

1. comment — block comment (file header)
2. blank
3. import — `safeRpc` from `./auth.ts`
4. import — `escapeHTML` from `./config.ts`
5. import — `powerDisplay` from `./reference-arsenal.utils.ts`
6. import — `SOURCE_TYPES`, `RARITY_COLORS` from `./reference-arsenal.constants.ts`
7. import — `saveDebateLoadout` from `./reference-arsenal.debate.ts`
8. import — type `ArsenalReference` from `./reference-arsenal.types.ts`
9. blank
10. bind name to function definition — `renderLoadoutPicker` (exported, async)
11. bind name to function definition — `render` (inner function, defined inside `renderLoadoutPicker`)
12. top-level statement — `render()` call (bare call at bottom of `renderLoadoutPicker` body, executed when the enclosing function runs)

## Agent 02

1. comment — block comment: "THE MODERATOR — Reference Arsenal Loadout Picker ..."
2. blank
3. import — `safeRpc` from `'./auth.ts'`
4. import — `escapeHTML` from `'./config.ts'`
5. import — `powerDisplay` from `'./reference-arsenal.utils.ts'`
6. import — `SOURCE_TYPES`, `RARITY_COLORS` from `'./reference-arsenal.constants.ts'`
7. import — `saveDebateLoadout` from `'./reference-arsenal.debate.ts'`
8. import (type-only) — `ArsenalReference` from `'./reference-arsenal.types.ts'`
9. blank
10. bind name to function definition — `renderLoadoutPicker` (exported)

## Agent 03

1. comment — block comment (lines 1–6): module header
2. blank (line 7)
3. import — `safeRpc` from `./auth.ts`
4. import — `escapeHTML` from `./config.ts`
5. import — `powerDisplay` from `./reference-arsenal.utils.ts`
6. import — `SOURCE_TYPES`, `RARITY_COLORS` from `./reference-arsenal.constants.ts`
7. import — `saveDebateLoadout` from `./reference-arsenal.debate.ts`
8. import — type `ArsenalReference` from `./reference-arsenal.types.ts`
9. blank (line 14)
10. bind name `renderLoadoutPicker` to function definition — exported
11. bind name `arsenal` to value (local `let` declaration, line 22)
12. bind name `selected` to value (local `const`, `new Set<string>(...)`, lines 45–47)
13. bind name `render` to function definition (local `function render`, lines 49–91)
14. top-level statement — `render()` call (line 93)

## Agent 04

1. comment — block comment: "THE MODERATOR — Reference Arsenal Loadout Picker …"
2. blank
3. import — `safeRpc` from `./auth.ts`
4. import — `escapeHTML` from `./config.ts`
5. import — `powerDisplay` from `./reference-arsenal.utils.ts`
6. import — `SOURCE_TYPES`, `RARITY_COLORS` from `./reference-arsenal.constants.ts`
7. import — `saveDebateLoadout` from `./reference-arsenal.debate.ts`
8. import (type-only) — `ArsenalReference` from `./reference-arsenal.types.ts`
9. blank
10. bind name to function definition — `renderLoadoutPicker` (exported)

## Agent 05

1. comment — block comment: "THE MODERATOR — Reference Arsenal Loadout Picker …"
2. blank
3. import — `safeRpc` from `./auth.ts`
4. import — `escapeHTML` from `./config.ts`
5. import — `powerDisplay` from `./reference-arsenal.utils.ts`
6. import — `SOURCE_TYPES`, `RARITY_COLORS` from `./reference-arsenal.constants.ts`
7. import — `saveDebateLoadout` from `./reference-arsenal.debate.ts`
8. import — type `ArsenalReference` from `./reference-arsenal.types.ts`
9. blank
10. bind name to function definition — `renderLoadoutPicker` (exported, async)
11. blank (end of file)

The file contains exactly one exported binding: the async function `renderLoadoutPicker`. Everything inside its body (the `arsenal` variable, the `selected` Set, the inner `render` function, and the trailing `render()` call) are local to that function and do not constitute top-level operations.
