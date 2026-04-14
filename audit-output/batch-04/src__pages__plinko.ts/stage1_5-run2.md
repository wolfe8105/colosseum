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

- Excluded — non-callable const bindings: `TOTAL_STEPS` (line 33), `isPlaceholder` (line 35), `daySelect` (line 184), `yearSelect` (line 194): all primitive values or DOM refs, not functions.
- Excluded — non-callable let bindings: `currentStep`, `signupMethod`, `signupEmail`, `signupPassword`, `signupDob`, `_isMinor`.
- Excluded — anonymous event listener callbacks (10 total): all callbacks passed to `addEventListener` at lines 218, 219, 222, 235, 269, 294, 456, 465, 473, 481 — anonymous inline functions, no named binding at module scope.
- Inner function exclusion: anonymous click callback inside `injectInviteNudge` (line ~113) is defined inside that function's body — excluded. `injectInviteNudge` itself is included as the module-scope named async function.
