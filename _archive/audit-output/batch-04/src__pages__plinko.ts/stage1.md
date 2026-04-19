# Stage 1 — Primitive Inventory · plinko.ts

Source: src/pages/plinko.ts
Agents: 5 parallel runs

---

## Agent 01

1. import, `oauthLogin, signUp, getCurrentUser, getIsPlaceholderMode, getSupabaseClient, toggleModerator, ready` from `../auth.ts`, line 13
2. import, `isAnyPlaceholder` from `../config.ts`, line 14
3. import, `nudge` from `../nudge.ts`, line 15
4. type-alias, `SignupMethod`, line 21
5. let-binding, `currentStep`, line 27
6. let-binding, `signupMethod`, line 28
7. let-binding, `signupEmail`, line 29
8. let-binding, `signupPassword`, line 30
9. let-binding, `signupDob`, line 31
10. let-binding, `_isMinor`, line 32
11. const-binding, `TOTAL_STEPS`, line 34
12. const-binding, `isPlaceholder`, line 36
13. top-level-statement, `if (isPlaceholder) { ... }` (placeholder banner display), line 38
14. function-declaration, `getReturnTo`, line 47
15. function-declaration, `updateProgress`, line 54
16. function-declaration, `goToStep`, line 59
17. function-declaration, `showMsg`, line 70
18. function-declaration, `clearMsg`, line 77
19. async-function-declaration, `injectInviteNudge`, line 84
20. event-listener, anonymous click handler on `#plinko-invite-copy` (inside `injectInviteNudge`), line 118
21. function-declaration, `validatePasswordComplexity`, line 134
22. async-function-declaration, `checkHIBP`, line 143
23. function-declaration, `getAge`, line 173
24. const-binding, `daySelect`, line 183
25. top-level-statement, `if (daySelect) { for loop populating day options }`, line 184
26. const-binding, `yearSelect`, line 192
27. top-level-statement, `if (yearSelect) { for loop populating year options }`, line 193
28. function-declaration, `handleOAuth`, line 203
29. event-listener, anonymous click handler on `#btn-google`, line 210
30. event-listener, anonymous click handler on `#btn-apple`, line 211
31. event-listener, anonymous click handler on `#email-toggle` (with `this` context), line 214
32. event-listener, anonymous async click handler on `#btn-email-next`, line 225
33. event-listener, anonymous click handler on `#btn-age-next`, line 255
34. event-listener, anonymous async click handler on `#btn-create`, line 278
35. event-listener, anonymous click handler on anonymous resend button (inside `#btn-create` handler), line 335
36. top-level-statement, `import('../onboarding-drip.ts').then(...).catch(...)` (inside `#btn-create` handler, oauth branch), line 381
37. event-listener, anonymous async click handler on `#btn-enable-mod`, line 393
38. event-listener, anonymous click handler on `#btn-skip-mod`, line 401
39. event-listener, anonymous click handler on `#btn-enter`, line 408
40. event-listener, `DOMContentLoaded` anonymous handler on `window`, line 414
41. top-level-statement, `supabaseClient.auth.onAuthStateChange(...)` call (inside DOMContentLoaded), line 419
42. top-level-statement, hash-based auth callback block `if (hash && hash.includes('access_token'))` (inside DOMContentLoaded), line 445
43. top-level-statement, `ready.then(...)` call (inside DOMContentLoaded), line 473

---

## Agent 02

1. import, `{ oauthLogin, signUp, getCurrentUser, getIsPlaceholderMode, getSupabaseClient, toggleModerator, ready }` from `../auth.ts`, line 6
2. import, `{ isAnyPlaceholder }` from `../config.ts`, line 7
3. import, `{ nudge }` from `../nudge.ts`, line 8
4. type-alias, `SignupMethod`, line 10
5. let-binding, `currentStep`, line 12
6. let-binding, `signupMethod`, line 13
7. let-binding, `signupEmail`, line 14
8. let-binding, `signupPassword`, line 15
9. let-binding, `signupDob`, line 16
10. let-binding, `_isMinor`, line 17
11. const-binding, `TOTAL_STEPS`, line 19
12. const-binding, `isPlaceholder`, line 20
13. top-level-statement, `if (isPlaceholder)` block (placeholder banner display), line 22
14. function-declaration, `getReturnTo`, line 47
15. function-declaration, `updateProgress`, line 54
16. function-declaration, `goToStep`, line 59
17. function-declaration, `showMsg`, line 72
18. function-declaration, `clearMsg`, line 79
19. async-function-declaration, `injectInviteNudge`, line 88
20. function-declaration, `validatePasswordComplexity`, line 134
21. async-function-declaration, `checkHIBP`, line 144
22. function-declaration, `getAge`, line 171
23. const-binding, `daySelect`, line 184
24. top-level-statement, `if (daySelect)` block (for loop populating day options), line 185
25. const-binding, `yearSelect`, line 194
26. top-level-statement, `if (yearSelect)` block (for loop populating year options), line 195
27. function-declaration, `handleOAuth`, line 209
28. event-listener, `btn-google` click → `handleOAuth('google')`, line 218
29. event-listener, `btn-apple` click → `handleOAuth('apple')`, line 219
30. event-listener, `email-toggle` click (anonymous function, `this`-bound), line 222
31. event-listener, `btn-email-next` click (async anonymous arrow), line 235
32. event-listener, `btn-age-next` click (anonymous arrow), line 269
33. event-listener, `btn-create` click (async anonymous arrow), line 294
34. event-listener, `btn-enable-mod` click (async anonymous arrow), line 456
35. event-listener, `btn-skip-mod` click (anonymous arrow), line 465
36. event-listener, `btn-enter` click (anonymous arrow), line 473
37. event-listener, `window` DOMContentLoaded (anonymous arrow), line 481

---

## Agent 03

1. import, `{ isAnyPlaceholder }` from config.ts, line 1
2. import, `{ ... }` from auth.ts, line 2
3. import, `{ ... }` from config.ts, line 3
4. import, `{ ... }` from nudge.ts, line 4
5. type-alias, `SignupMethod`, line 20
6. let-binding, `currentStep`, line 26
7. let-binding, `signupMethod`, line 27
8. let-binding, `signupEmail`, line 28
9. let-binding, `signupPassword`, line 29
10. let-binding, `signupDob`, line 30
11. let-binding, `_isMinor`, line 31
12. const-binding, `TOTAL_STEPS`, line 33
13. const-binding, `isPlaceholder`, line 35
14. top-level-statement, `if` block — placeholder banner display, line 37
15. function-declaration, `getReturnTo`, line 47
16. function-declaration, `updateProgress`, line 54
17. function-declaration, `goToStep`, line 59
18. function-declaration, `showMsg`, line 72
19. function-declaration, `clearMsg`, line 79
20. async-function-declaration, `injectInviteNudge`, line 88
21. function-declaration, `validatePasswordComplexity`, line 134
22. async-function-declaration, `checkHIBP`, line 144
23. function-declaration, `getAge`, line 171
24. const-binding, `daySelect`, line 184
25. top-level-statement, `if` block — day option population loop, line 185
26. const-binding, `yearSelect`, line 194
27. top-level-statement, `if` block — year option population loop, line 195
28. function-declaration, `handleOAuth`, line 209
29. event-listener, `btn-google` click, line 218
30. event-listener, `btn-apple` click, line 219
31. event-listener, `email-toggle` click, line 222
32. event-listener, `btn-email-next` click (async), line 235
33. event-listener, `btn-age-next` click, line 269
34. event-listener, `btn-create` click (async), line 294
35. event-listener, `btn-enable-mod` click (async), line 456
36. event-listener, `btn-skip-mod` click, line 465
37. event-listener, `btn-enter` click, line 473
38. event-listener, `DOMContentLoaded`, line 481

---

## Agent 04

1. import, `oauthLogin, signUp, getCurrentUser, getIsPlaceholderMode, getSupabaseClient, toggleModerator, ready`, line 12
2. import, `isAnyPlaceholder`, line 13
3. import, `nudge`, line 14
4. type-alias, `SignupMethod = 'oauth' | 'email' | null`, line 20
5. let-binding, `currentStep = 1`, line 26
6. let-binding, `signupMethod: SignupMethod = null`, line 27
7. let-binding, `signupEmail = ''`, line 28
8. let-binding, `signupPassword = ''`, line 29
9. let-binding, `signupDob = ''`, line 30
10. let-binding, `_isMinor = false`, line 31
11. const-binding, `TOTAL_STEPS = 5`, line 33
12. const-binding, `isPlaceholder: boolean = isAnyPlaceholder`, line 35
13. top-level-statement, `if (isPlaceholder) block — shows placeholder banner`, line 37
14. function-declaration, `getReturnTo(): string`, line 47
15. function-declaration, `updateProgress(): void`, line 54
16. function-declaration, `goToStep(n: number): void`, line 59
17. function-declaration, `showMsg(id: string, text: string, type: 'success'|'error'): void`, line 72
18. function-declaration, `clearMsg(id: string): void`, line 79
19. async-function-declaration, `injectInviteNudge(): Promise<void>`, line 88
20. function-declaration, `validatePasswordComplexity(password: string): string | null`, line 134
21. async-function-declaration, `checkHIBP(password: string): Promise<boolean>`, line 144
22. function-declaration, `getAge(month: number, day: number, year: number): number`, line 171
23. const-binding, `daySelect = document.getElementById('dob-day')`, line 184
24. top-level-statement, `if (daySelect) block — populates day dropdown options`, line 185
25. const-binding, `yearSelect = document.getElementById('dob-year')`, line 194
26. top-level-statement, `if (yearSelect) block — populates year dropdown options`, line 195
27. function-declaration, `handleOAuth(provider: string): void`, line 209
28. event-listener, `btn-google click → handleOAuth('google')`, line 218
29. event-listener, `btn-apple click → handleOAuth('apple')`, line 219
30. event-listener, `email-toggle click (function with this)`, line 222
31. event-listener, `btn-email-next click (async arrow)`, line 235
32. event-listener, `btn-age-next click (arrow)`, line 269
33. event-listener, `btn-create click (async arrow)`, line 294
34. event-listener, `btn-enable-mod click (async arrow)`, line 456
35. event-listener, `btn-skip-mod click (arrow)`, line 465
36. event-listener, `btn-enter click (arrow)`, line 473
37. event-listener, `window DOMContentLoaded (arrow)`, line 481

---

## Agent 05

1. import — auth.ts (oauthLogin, signUp, getCurrentUser, getIsPlaceholderMode, getSupabaseClient, toggleModerator, ready) — line 12
2. import — config.ts (isAnyPlaceholder) — line 13
3. import — nudge.ts (nudge) — line 14
4. type-alias — SignupMethod — line 20
5. let-binding — currentStep — line 26
6. let-binding — signupMethod — line 27
7. let-binding — signupEmail — line 28
8. let-binding — signupPassword — line 29
9. let-binding — signupDob — line 30
10. let-binding — _isMinor — line 31
11. const-binding — TOTAL_STEPS — line 33
12. const-binding — isPlaceholder — line 35
13. top-level-statement — if (isPlaceholder) placeholder banner display — line 37
14. function-declaration — getReturnTo — line 47
15. function-declaration — updateProgress — line 54
16. function-declaration — goToStep — line 59
17. function-declaration — showMsg — line 72
18. function-declaration — clearMsg — line 79
19. async-function-declaration — injectInviteNudge — line 88
20. function-declaration — validatePasswordComplexity — line 134
21. async-function-declaration — checkHIBP — line 144
22. function-declaration — getAge — line 171
23. const-binding — daySelect — line 184
24. top-level-statement — if (daySelect) day options loop — line 185
25. const-binding — yearSelect — line 194
26. top-level-statement — if (yearSelect) year options loop — line 195
27. function-declaration — handleOAuth — line 209
28. event-listener — btn-google click — line 218
29. event-listener — btn-apple click — line 219
30. event-listener — email-toggle click — line 222
31. event-listener — btn-email-next click (async) — line 235
32. event-listener — btn-age-next click — line 269
33. event-listener — btn-create click (async) — line 294
34. event-listener — btn-enable-mod click (async) — line 456
35. event-listener — btn-skip-mod click — line 465
36. event-listener — btn-enter click — line 473
37. event-listener — window DOMContentLoaded — line 481
