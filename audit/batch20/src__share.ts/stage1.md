# Stage 1 Outputs — src/share.ts

## Agent 01
Read 204 lines of 204 total.

1. comment (lines 1–11) — JSDoc module header
2. blank (line 12)
3. import (line 13) — `APP`, `showToast` from `./config.ts`
4. import (line 14) — `getCurrentUser`, `ready` from `./auth.ts`
5. import (line 15) — `navigateTo` from `./navigation.ts`
6. blank (line 16)
7. comment (lines 17–19) — "TYPE DEFINITIONS" banner
8. blank (line 20)
9. bind name to type (lines 21–29) — `ShareResultParams` interface (exported)
10. blank (line 30)
11. bind name to type (lines 31–39) — `ShareProfileParams` interface (exported)
12. blank (line 40)
13. bind name to type (lines 41–45) — `ShareData` interface
14. blank (line 46)
15. comment (lines 47–49) — "HELPERS" banner
16. blank (line 50)
17. bind name to function definition (lines 51–53) — `getBaseUrl`
18. blank (line 54)
19. comment (line 55) — F-59 note
20. bind name to value (line 56) — `_cachedInviteUrl` (let, initialized to null)
21. blank (line 57)
22. bind name to function definition (lines 58–71) — `getStableInviteUrl`
23. blank (lines 72–73)
24. bind name to function definition (lines 74–99) — `share`
25. blank (line 100)
26. comment (lines 101–103) — "PUBLIC API" banner
27. blank (line 104)
28. bind name to function definition (lines 105–117) — `shareResult` (exported)
29. blank (line 118)
30. bind name to function definition (lines 119–132) — `shareProfile` (exported)
31. blank (line 133)
32. bind name to function definition (lines 134–139) — `inviteFriend` (exported)
33. blank (line 140)
34. bind name to function definition (lines 141–146) — `shareTake` (exported)
35. blank (line 147)
36. comment (lines 148–150) — "DEEP LINK HANDLER" banner
37. blank (line 151)
38. bind name to function definition (lines 152–188) — `handleDeepLink` (exported)
39. blank (line 189)
40. comment (line 190) — separator banner
41. bind name to value (lines 191–197) — `ModeratorShare` const object (exported)
42. blank (lines 198–199)
43. comment (lines 200–202) — "AUTO-INIT" banner
44. blank (line 203)
45. top-level statement (line 204) — `ready.then(() => handleDeepLink())`

## Agent 02
Read 204 lines of 204 total.

1. L1-11: comment (JSDoc module header)
2. L12: blank
3. L13: import (`APP`, `showToast` from `./config.ts`)
4. L14: import (`getCurrentUser`, `ready` from `./auth.ts`)
5. L15: import (`navigateTo` from `./navigation.ts`)
6. L16: blank
7. L17-19: comment (section banner TYPE DEFINITIONS)
8. L20: blank
9. L21-29: bind name to type — `ShareResultParams` (interface, exported)
10. L30: blank
11. L31-39: bind name to type — `ShareProfileParams` (interface, exported)
12. L40: blank
13. L41-45: bind name to type — `ShareData` (interface)
14. L46: blank
15. L47-49: comment (section banner HELPERS)
16. L50: blank
17. L51-53: bind name to function definition — `getBaseUrl`
18. L54: blank
19. L55: comment (F-59 note)
20. L56: bind name to value — `_cachedInviteUrl`
21. L57: blank
22. L58-71: bind name to function definition — `getStableInviteUrl`
23. L72-73: blank
24. L74-99: bind name to function definition — `share`
25. L100: blank
26. L101-103: comment (section banner PUBLIC API)
27. L104: blank
28. L105-117: bind name to function definition — `shareResult` (exported)
29. L118: blank
30. L119-132: bind name to function definition — `shareProfile` (exported)
31. L133: blank
32. L134-139: bind name to function definition — `inviteFriend` (exported)
33. L140: blank
34. L141-146: bind name to function definition — `shareTake` (exported)
35. L147: blank
36. L148-150: comment (section banner DEEP LINK HANDLER)
37. L151: blank
38. L152-188: bind name to function definition — `handleDeepLink` (exported)
39. L189: blank
40. L190: comment (section banner delimiter)
41. L191-197: bind name to value — `ModeratorShare` (exported const object literal)
42. L198-199: blank
43. L200-202: comment (section banner AUTO-INIT)
44. L203: blank
45. L204: top-level statement (`ready.then(() => handleDeepLink())`)

## Agent 03
Read 204 lines of 204 total.

1. comment — JSDoc block (lines 1-11): module header describing share module
2. blank — line 12
3. import — `APP, showToast` from `./config.ts` (line 13)
4. import — `getCurrentUser, ready` from `./auth.ts` (line 14)
5. import — `navigateTo` from `./navigation.ts` (line 15)
6. blank — line 16
7. comment — section divider "TYPE DEFINITIONS" (lines 17-19)
8. blank — line 20
9. bind name to type — `ShareResultParams` interface (exported) (lines 21-29)
10. blank — line 30
11. bind name to type — `ShareProfileParams` interface (exported) (lines 31-39)
12. blank — line 40
13. bind name to type — `ShareData` interface (lines 41-45)
14. blank — line 46
15. comment — section divider "HELPERS" (lines 47-49)
16. blank — line 50
17. bind name to function definition — `getBaseUrl` (lines 51-53)
18. blank — line 54
19. comment — F-59 note (line 55)
20. bind name to value — `_cachedInviteUrl` (let, initialized to null) (line 56)
21. blank — line 57
22. bind name to function definition — `getStableInviteUrl` (async) (lines 58-71)
23. blank — line 72
24. blank — line 73
25. bind name to function definition — `share` (async) (lines 74-99)
26. blank — line 100
27. comment — section divider "PUBLIC API" (lines 101-103)
28. blank — line 104
29. bind name to function definition — `shareResult` (exported) (lines 105-117)
30. blank — line 118
31. bind name to function definition — `shareProfile` (exported) (lines 119-132)
32. blank — line 133
33. bind name to function definition — `inviteFriend` (exported) (lines 134-139)
34. blank — line 140
35. bind name to function definition — `shareTake` (exported) (lines 141-146)
36. blank — line 147
37. comment — section divider "DEEP LINK HANDLER" (lines 148-150)
38. blank — line 151
39. bind name to function definition — `handleDeepLink` (exported) (lines 152-188)
40. blank — line 189
41. comment — separator (line 190)
42. bind name to value — `ModeratorShare` (exported const object with `as const`) (lines 191-197)
43. blank — line 198-199
44. comment — "AUTO-INIT" banner (lines 200-202)
45. blank — line 203
46. top-level statement — `ready.then(() => handleDeepLink());` (line 204)

## Agent 04
Read 204 lines of 204 total.

1. comment (lines 1–11, JSDoc module header)
2. blank (line 12)
3. import `APP`, `showToast` from `./config.ts` (line 13)
4. import `getCurrentUser`, `ready` from `./auth.ts` (line 14)
5. import `navigateTo` from `./navigation.ts` (line 15)
6. blank (line 16)
7. comment (lines 17–19, section banner "TYPE DEFINITIONS")
8. blank (line 20)
9. bind name `ShareResultParams` to type (interface, exported) (lines 21–29)
10. blank (line 30)
11. bind name `ShareProfileParams` to type (interface, exported) (lines 31–39)
12. blank (line 40)
13. bind name `ShareData` to type (interface) (lines 41–45)
14. blank (line 46)
15. comment (lines 47–49, section banner "HELPERS")
16. blank (line 50)
17. bind name `getBaseUrl` to function definition (lines 51–53)
18. blank (line 54)
19. comment (line 55, F-59 note)
20. bind name `_cachedInviteUrl` to value (line 56)
21. blank (line 57)
22. bind name `getStableInviteUrl` to function definition (lines 58–71)
23. blank (lines 72–73)
24. bind name `share` to function definition (lines 74–99)
25. blank (line 100)
26. comment (lines 101–103, section banner "PUBLIC API")
27. blank (line 104)
28. bind name `shareResult` to function definition (exported) (lines 105–117)
29. blank (line 118)
30. bind name `shareProfile` to function definition (exported) (lines 119–132)
31. blank (line 133)
32. bind name `inviteFriend` to function definition (exported) (lines 134–139)
33. blank (line 140)
34. bind name `shareTake` to function definition (exported) (lines 141–146)
35. blank (line 147)
36. comment (lines 148–150, section banner "DEEP LINK HANDLER")
37. blank (line 151)
38. bind name `handleDeepLink` to function definition (exported) (lines 152–188)
39. blank (line 189)
40. comment (line 190, section banner)
41. bind name `ModeratorShare` to value (exported const object) (lines 191–197)
42. blank (lines 198–199)
43. comment (lines 200–202, section banner "AUTO-INIT")
44. blank (line 203)
45. top-level statement: `ready.then(() => handleDeepLink())` (line 204)

## Agent 05
Read 204 lines of 204 total.

1. comment (lines 1–11: JSDoc header block)
2. blank (line 12)
3. import `APP`, `showToast` from `./config.ts` (line 13)
4. import `getCurrentUser`, `ready` from `./auth.ts` (line 14)
5. import `navigateTo` from `./navigation.ts` (line 15)
6. blank (line 16)
7. comment (lines 17–19: TYPE DEFINITIONS banner)
8. blank (line 20)
9. bind name `ShareResultParams` to type (interface) — exported (lines 21–29)
10. blank (line 30)
11. bind name `ShareProfileParams` to type (interface) — exported (lines 31–39)
12. blank (line 40)
13. bind name `ShareData` to type (interface) (lines 41–45)
14. blank (line 46)
15. comment (lines 47–49: HELPERS banner)
16. blank (line 50)
17. bind name `getBaseUrl` to function definition (lines 51–53)
18. blank (line 54)
19. comment (line 55: F-59 note)
20. bind name `_cachedInviteUrl` to value (line 56)
21. blank (line 57)
22. bind name `getStableInviteUrl` to function definition (lines 58–71)
23. blank (line 72)
24. blank (line 73)
25. bind name `share` to function definition (lines 74–99)
26. blank (line 100)
27. comment (lines 101–103: PUBLIC API banner)
28. blank (line 104)
29. bind name `shareResult` to function definition — exported (lines 105–117)
30. blank (line 118)
31. bind name `shareProfile` to function definition — exported (lines 119–132)
32. blank (line 133)
33. bind name `inviteFriend` to function definition — exported (lines 134–139)
34. blank (line 140)
35. bind name `shareTake` to function definition — exported (lines 141–146)
36. blank (line 147)
37. comment (lines 148–150: DEEP LINK HANDLER banner)
38. blank (line 151)
39. bind name `handleDeepLink` to function definition — exported (lines 152–188)
40. blank (line 189)
41. comment (line 190: banner separator)
42. bind name `ModeratorShare` to value (const object) — exported (lines 191–197)
43. blank (line 198)
44. blank (line 199)
45. comment (lines 200–202: AUTO-INIT banner)
46. top-level statement `ready.then(() => handleDeepLink())` (line 204)
