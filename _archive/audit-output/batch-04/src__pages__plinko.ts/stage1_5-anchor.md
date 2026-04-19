# Anchor List — plinko.ts

Source: src/pages/plinko.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. getReturnTo  (line 47)
2. updateProgress  (line 54)
3. goToStep  (line 59)
4. showMsg  (line 72)
5. clearMsg  (line 79)
6. injectInviteNudge  (line 88)
7. validatePasswordComplexity  (line 134)
8. checkHIBP  (line 144)
9. getAge  (line 171)
10. handleOAuth  (line 209)

## Resolution notes

- All event listener callbacks (btn-google, btn-apple, email-toggle, btn-email-next, btn-age-next, btn-create, btn-enable-mod, btn-skip-mod, btn-enter, DOMContentLoaded): excluded — anonymous callbacks, not top-level named bindings.
- Inner anonymous click callback inside `injectInviteNudge`: excluded — defined inside function body, not module scope.
- `daySelect`, `yearSelect`: excluded — const bindings holding DOM element references, not callable.
- `TOTAL_STEPS`, `isPlaceholder`, `currentStep`, `signupMethod`, `signupEmail`, `signupPassword`, `signupDob`, `_isMinor`: excluded — primitive values or mutable state slots, not function definitions.
- `SignupMethod`: excluded — type alias.
- Both arbiter runs agreed on the same 10 functions in the same order. No reconciliation run needed.
