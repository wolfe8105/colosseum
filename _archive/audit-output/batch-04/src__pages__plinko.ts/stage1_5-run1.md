# Anchor List — plinko.ts

1. `getReturnTo` — line 47
2. `updateProgress` — line 54
3. `goToStep` — line 59
4. `showMsg` — line 72
5. `clearMsg` — line 79
6. `injectInviteNudge` — line 88
7. `validatePasswordComplexity` — line 134
8. `checkHIBP` — line 144
9. `getAge` — line 171
10. `handleOAuth` — line 209

## Resolution notes

- All ten are named, callable (function declarations or async function declarations), defined at module scope, and non-type constructs.
- `injectInviteNudge` qualifies despite containing an inner anonymous click callback — the inner callback is excluded, but the outer named async function is itself a top-level named callable.
- `daySelect` (line 184) and `yearSelect` (line 194): const bindings holding DOM element references, not callable.
- All `addEventListener` callbacks (lines 218–481): anonymous arrow functions or anonymous function expressions — excluded.
- `SignupMethod` (line 4): type alias — excluded.
- All let/const module-level primitives: non-function values — excluded.
- The top-level `if (isPlaceholder)` block: not a named callable binding.
