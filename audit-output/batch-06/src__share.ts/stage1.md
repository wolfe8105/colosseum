# Stage 1 Outputs — src/share.ts

## Agent 01

1. comment — block comment (file header, lines 1–11)
2. import — `APP`, `showToast`, `FEATURES` from `./config.ts`
3. import — `getCurrentUser`, `ready` from `./auth.ts`
4. import — `navigateTo` from `./navigation.ts`
5. comment — section divider
6. comment — section label `TYPE DEFINITIONS`
7. comment — section divider
8. blank
9. bind name to type — `ShareResultParams` (exported interface)
10. blank
11. bind name to type — `ShareProfileParams` (exported interface)
12. blank
13. bind name to type — `ShareData` (interface, not exported)
14. blank
15. comment — section divider
16. comment — section label `INTERNAL STATE`
17. comment — section divider
18. blank
19. comment — inline doc comment for `_pendingShareResult`
20. bind name to value — `_pendingShareResult`
21. blank
22. comment — section divider
23. comment — section label `HELPERS`
24. comment — section divider
25. blank
26. bind name to function definition — `getBaseUrl`
27. blank
28. comment — inline doc comment for `_cachedRefCode` and `_cachedInviteUrl`
29. bind name to value — `_cachedRefCode`
30. bind name to value — `_cachedInviteUrl`
31. blank
32. bind name to function definition — `getStableInviteUrl`
33. blank
34. blank
35. bind name to function definition — `share`
36. blank
37. comment — section divider
38. comment — section label `PUBLIC API`
39. comment — section divider
40. blank
41. bind name to function definition — `shareResult` (exported)
42. blank
43. bind name to function definition — `shareProfile` (exported)
44. blank
45. bind name to function definition — `inviteFriend` (exported)
46. blank
47. bind name to function definition — `shareTake` (exported)
48. blank
49. bind name to function definition — `showPostDebatePrompt` (exported)
50. blank
51. comment — section divider
52. comment — section label `DEEP LINK HANDLER`
53. comment — section divider
54. blank
55. bind name to function definition — `handleDeepLink` (exported)
56. blank
57. comment — section divider
58. bind name to value — `ModeratorShare` (exported `const`, object literal `as const`)
59. blank
60. blank
61. comment — section divider
62. comment — section label `AUTO-INIT`
63. comment — section divider
64. blank
65. top-level statement — `ready.then(() => handleDeepLink())`

## Agent 02

1. comment — block comment (lines 1–11)
2. import — `APP`, `showToast`, `FEATURES` from `./config.ts`
3. import — `getCurrentUser`, `ready` from `./auth.ts`
4. import — `navigateTo` from `./navigation.ts`
5. comment — section divider comment
6. comment — section label comment
7. comment — section divider comment
8. blank
9. bind name to type — `ShareResultParams` (exported interface)
10. blank
11. bind name to type — `ShareProfileParams` (exported interface)
12. blank
13. bind name to type — `ShareData` (interface)
14. blank
15. comment — section divider comment
16. comment — section label comment
17. comment — section divider comment
18. blank
19. comment — inline comment
20. bind name to value — `_pendingShareResult`
21. blank
22. comment — section divider comment
23. comment — section label comment
24. comment — section divider comment
25. blank
26. bind name to function definition — `getBaseUrl`
27. blank
28. comment — inline comment
29. bind name to value — `_cachedRefCode`
30. bind name to value — `_cachedInviteUrl`
31. blank
32. bind name to function definition — `getStableInviteUrl`
33. blank
34. blank
35. bind name to function definition — `share`
36. blank
37. comment — section divider comment
38. comment — section label comment
39. comment — section divider comment
40. blank
41. bind name to function definition — `shareResult` (exported)
42. blank
43. bind name to function definition — `shareProfile` (exported)
44. blank
45. bind name to function definition — `inviteFriend` (exported)
46. blank
47. bind name to function definition — `shareTake` (exported)
48. blank
49. bind name to function definition — `showPostDebatePrompt` (exported)
50. blank
51. comment — section divider comment
52. comment — section label comment
53. comment — section divider comment
54. blank
55. bind name to function definition — `handleDeepLink` (exported)
56. blank
57. comment — section divider comment
58. bind name to value — `ModeratorShare` (exported `as const` object)
59. blank
60. blank
61. comment — section divider comment
62. comment — section label comment
63. comment — section divider comment
64. blank
65. top-level statement — `ready.then(() => handleDeepLink())`

## Agent 03

1. comment — block comment (lines 1–11)
2. blank
3. import — `APP`, `showToast`, `FEATURES` from `./config.ts`
4. import — `getCurrentUser`, `ready` from `./auth.ts`
5. import — `navigateTo` from `./navigation.ts`
6. blank
7. comment — section divider `TYPE DEFINITIONS`
8. blank
9. bind name to type — `ShareResultParams` (exported interface)
10. blank
11. bind name to type — `ShareProfileParams` (exported interface)
12. blank
13. bind name to type — `ShareData` (interface)
14. blank
15. comment — section divider `INTERNAL STATE`
16. blank
17. comment — inline comment on pending share result
18. bind name to value — `_pendingShareResult`
19. blank
20. comment — section divider `HELPERS`
21. blank
22. bind name to function definition — `getBaseUrl`
23. blank
24. comment — inline comment on stable ref code caching
25. bind name to value — `_cachedRefCode`
26. bind name to value — `_cachedInviteUrl`
27. blank
28. bind name to function definition — `getStableInviteUrl`
29. blank
30. blank
31. bind name to function definition — `share`
32. blank
33. comment — section divider `PUBLIC API`
34. blank
35. bind name to function definition — `shareResult` (exported)
36. blank
37. bind name to function definition — `shareProfile` (exported)
38. blank
39. bind name to function definition — `inviteFriend` (exported)
40. blank
41. bind name to function definition — `shareTake` (exported)
42. blank
43. bind name to function definition — `showPostDebatePrompt` (exported)
44. blank
45. comment — section divider `DEEP LINK HANDLER`
46. blank
47. bind name to function definition — `handleDeepLink` (exported)
48. blank
49. comment — section divider (bare `// ====`)
50. bind name to value — `ModeratorShare` (exported `as const` object)
51. blank
52. blank
53. comment — section divider `AUTO-INIT`
54. blank
55. top-level statement — `ready.then(() => handleDeepLink())`

## Agent 04

1. comment — block comment (file header, lines 1–11)
2. import — `APP`, `showToast`, `FEATURES` from `./config.ts`
3. import — `getCurrentUser`, `ready` from `./auth.ts`
4. import — `navigateTo` from `./navigation.ts`
5. comment — section divider
6. comment — section label "TYPE DEFINITIONS"
7. comment — section divider
8. blank
9. bind name to type — `ShareResultParams` (exported interface)
10. blank
11. bind name to type — `ShareProfileParams` (exported interface)
12. blank
13. bind name to type — `ShareData` (interface)
14. blank
15. comment — section divider
16. comment — section label "INTERNAL STATE"
17. comment — section divider
18. blank
19. comment — inline doc for `_pendingShareResult`
20. bind name to value — `_pendingShareResult`
21. blank
22. comment — section divider
23. comment — section label "HELPERS"
24. comment — section divider
25. blank
26. bind name to function definition — `getBaseUrl`
27. blank
28. comment — F-59 note for `_cachedRefCode` / `_cachedInviteUrl`
29. bind name to value — `_cachedRefCode`
30. bind name to value — `_cachedInviteUrl`
31. blank
32. bind name to function definition — `getStableInviteUrl`
33. blank
34. blank
35. bind name to function definition — `share`
36. blank
37. comment — section divider
38. comment — section label "PUBLIC API"
39. comment — section divider
40. blank
41. bind name to function definition — `shareResult` (exported)
42. blank
43. bind name to function definition — `shareProfile` (exported)
44. blank
45. bind name to function definition — `inviteFriend` (exported)
46. blank
47. bind name to function definition — `shareTake` (exported)
48. blank
49. bind name to function definition — `showPostDebatePrompt` (exported)
50. blank
51. comment — section divider
52. comment — section label "DEEP LINK HANDLER"
53. comment — section divider
54. blank
55. bind name to function definition — `handleDeepLink` (exported)
56. blank
57. comment — section divider
58. bind name to value — `ModeratorShare` (exported `const`)
59. blank
60. blank
61. comment — section divider
62. comment — section label "AUTO-INIT"
63. comment — section divider
64. blank
65. top-level statement — `ready.then(() => handleDeepLink())`

## Agent 05

1. comment — block comment (file header, lines 1–11)
2. import — `APP`, `showToast`, `FEATURES` from `./config.ts`
3. import — `getCurrentUser`, `ready` from `./auth.ts`
4. import — `navigateTo` from `./navigation.ts`
5. comment — section divider `TYPE DEFINITIONS`
6. bind name to type — `ShareResultParams` (exported interface)
7. bind name to type — `ShareProfileParams` (exported interface)
8. bind name to type — `ShareData` (interface, not exported)
9. comment — section divider `INTERNAL STATE`
10. comment — inline comment on `_pendingShareResult`
11. bind name to value — `_pendingShareResult` (`let`, initialized to `null`)
12. comment — section divider `HELPERS`
13. bind name to function definition — `getBaseUrl`
14. comment — inline comment on `_cachedRefCode` / `_cachedInviteUrl`
15. bind name to value — `_cachedRefCode` (`let`, initialized to `null`)
16. bind name to value — `_cachedInviteUrl` (`let`, initialized to `null`)
17. bind name to function definition — `getStableInviteUrl`
18. blank
19. bind name to function definition — `share`
20. comment — section divider `PUBLIC API`
21. bind name to function definition — `shareResult` (exported)
22. bind name to function definition — `shareProfile` (exported)
23. bind name to function definition — `inviteFriend` (exported)
24. bind name to function definition — `shareTake` (exported)
25. bind name to function definition — `showPostDebatePrompt` (exported)
26. comment — section divider `DEEP LINK HANDLER`
27. bind name to function definition — `handleDeepLink` (exported)
28. comment — section divider (line 266)
29. bind name to value — `ModeratorShare` (exported `const`, object literal `as const`)
30. blank
31. comment — section divider `AUTO-INIT`
32. top-level statement — `ready.then(() => handleDeepLink())` (bare expression executed at module load)
