# Stage 1 Outputs — src/leaderboard.ts

## Agent 01

1. comment — block comment (lines 1–11)
2. blank (line 12)
3. import — named imports `escapeHTML`, `FEATURES` from `./config.ts` (line 13)
4. import — named import `vgBadge` from `./badge.ts` (line 14)
5. import — named import `bountyDot` from `./bounties.ts` (line 15)
6. import — named imports `safeRpc`, `getCurrentUser`, `getCurrentProfile`, `getIsPlaceholderMode`, `getSupabaseClient`, `ready` from `./auth.ts` (lines 16–23)
7. import — type-only named import `SafeRpcResult` from `./auth.ts` (line 24)
8. blank (line 25)
9. comment (line 26)
10. comment (line 27)
11. comment (line 28)
12. blank (line 29)
13. bind name to type — `LeaderboardTab` (exported type alias) (line 30)
14. bind name to type — `LeaderboardTimeFilter` (exported type alias) (line 31)
15. bind name to type — `LeaderboardTier` (exported type alias) (line 32)
16. blank (line 33)
17. bind name to type — `LeaderboardEntry` (exported interface) (lines 34–47)
18. blank (line 48)
19. bind name to type — `LeaderboardRpcRow` (interface) (lines 49–61)
20. blank (line 62)
21. comment (line 63)
22. comment (line 64)
23. comment (line 65)
24. blank (line 66)
25. bind name to value — `escHtml` (line 67)
26. blank (line 68)
27. comment (line 69)
28. comment (line 70)
29. comment (line 71)
30. blank (line 72)
31. bind name to value — `currentTab` (line 73)
32. bind name to value — `currentTime` (line 74)
33. bind name to value — `liveData` (line 75)
34. bind name to value — `myRank` (line 76)
35. bind name to value — `isLoading` (line 77)
36. bind name to value — `currentOffset` (line 78)
37. bind name to value — `hasMore` (line 79)
38. bind name to value — `PAGE_SIZE` (line 80)
39. blank (line 81)
40. comment (line 82)
41. comment (line 83)
42. comment (line 84)
43. blank (line 85)
44. bind name to value — `PLACEHOLDER_DATA` (lines 86–97)
45. blank (line 98)
46. comment (line 99)
47. comment (line 100)
48. comment (line 101)
49. blank (line 102)
50. bind name to function definition — `fetchLeaderboard` (lines 103–156)
51. blank (line 157)
52. bind name to function definition — `getData` (lines 158–160)
53. blank (line 161)
54. comment (line 162)
55. comment (line 163)
56. comment (line 164)
57. blank (line 165)
58. bind name to function definition — `renderShimmer` (lines 166–181)
59. blank (line 182)
60. comment (line 183)
61. comment (line 184)
62. comment (line 185)
63. blank (line 186)
64. bind name to function definition — `showEloExplainer` (exported) (lines 187–256)
65. blank (line 257)
66. comment (line 258)
67. comment (line 259)
68. comment (line 260)
69. blank (line 261)
70. bind name to function definition — `renderList` (lines 262–339)
71. blank (line 340)
72. comment (line 341)
73. comment (line 342)
74. comment (line 343)
75. blank (line 344)
76. bind name to function definition — `render` (exported) (lines 345–426)
77. blank (line 427)
78. comment (line 428)
79. comment (line 429)
80. comment (line 430)
81. blank (line 431)
82. bind name to function definition — `setTab` (exported) (lines 432–440)
83. blank (line 441)
84. bind name to function definition — `setTime` (exported) (lines 442–449)
85. blank (line 450)
86. bind name to function definition — `loadMore` (exported) (lines 451–457)
87. blank (line 458)
88. comment (line 459)
89. comment (line 460)
90. comment (line 461)
91. blank (line 462)
92. bind name to function definition — `init` (exported) (lines 463–478)
93. blank (line 479)
94. comment (line 480)
95. comment (line 481)
96. comment (line 482)
97. blank (line 483)
98. top-level statement — `document.addEventListener('click', ...)` (lines 484–505)
99. blank (line 506)
100. comment (line 507)
101. bind name to value — `ModeratorLeaderboard` (exported `as const`) (lines 508–514)
102. blank (line 515)
103. blank (line 516)
104. comment (line 517)
105. comment (line 518)
106. comment (line 519)
107. blank (line 520)
108. top-level statement — `ready.then(() => init())` (line 521)

## Agent 02

1. comment — block comment (lines 1–11)
2. blank
3. import — `escapeHTML`, `FEATURES` from `./config.ts`
4. import — `vgBadge` from `./badge.ts`
5. import — `bountyDot` from `./bounties.ts`
6. import — `safeRpc`, `getCurrentUser`, `getCurrentProfile`, `getIsPlaceholderMode`, `getSupabaseClient`, `ready` from `./auth.ts` (multiline)
7. import — type `SafeRpcResult` from `./auth.ts`
8. blank
9. comment — section divider
10. comment — `TYPE DEFINITIONS`
11. comment — section divider
12. blank
13. bind name to type — `LeaderboardTab` (exported type alias)
14. bind name to type — `LeaderboardTimeFilter` (exported type alias)
15. bind name to type — `LeaderboardTier` (exported type alias)
16. blank
17. bind name to type — `LeaderboardEntry` (exported interface)
18. blank
19. bind name to type — `LeaderboardRpcRow` (interface, not exported)
20. blank
21. comment — section divider
22. comment — `ESCAPE HELPER`
23. comment — section divider
24. blank
25. bind name to value — `escHtml`
26. blank
27. comment — section divider
28. comment — `STATE`
29. comment — section divider
30. blank
31. bind name to value — `currentTab`
32. bind name to value — `currentTime`
33. bind name to value — `liveData`
34. bind name to value — `myRank`
35. bind name to value — `isLoading`
36. bind name to value — `currentOffset`
37. bind name to value — `hasMore`
38. bind name to value — `PAGE_SIZE`
39. blank
40. comment — section divider
41. comment — `PLACEHOLDER DATA`
42. comment — section divider
43. blank
44. bind name to value — `PLACEHOLDER_DATA`
45. blank
46. comment — section divider
47. comment — `DATA FETCHING`
48. comment — section divider
49. blank
50. bind name to function definition — `fetchLeaderboard`
51. blank
52. bind name to function definition — `getData`
53. blank
54. comment — section divider
55. comment — `SHIMMER SKELETON`
56. comment — section divider
57. blank
58. bind name to function definition — `renderShimmer`
59. blank
60. comment — section divider
61. comment — `ELO EXPLAINER MODAL`
62. comment — section divider
63. blank
64. bind name to function definition — `showEloExplainer` (exported)
65. blank
66. comment — section divider
67. comment — `RENDER LIST`
68. comment — section divider
69. blank
70. bind name to function definition — `renderList`
71. blank
72. comment — section divider
73. comment — `MAIN RENDER`
74. comment — section divider
75. blank
76. bind name to function definition — `render` (exported)
77. blank
78. comment — section divider
79. comment — `TAB / TIME CONTROL`
80. comment — section divider
81. blank
82. bind name to function definition — `setTab` (exported)
83. blank
84. bind name to function definition — `setTime` (exported)
85. blank
86. bind name to function definition — `loadMore` (exported)
87. blank
88. comment — section divider
89. comment — `INIT`
90. comment — section divider
91. blank
92. bind name to function definition — `init` (exported)
93. blank
94. comment — section divider
95. comment — `EVENT DELEGATION`
96. comment — section divider
97. blank
98. top-level statement — `document.addEventListener('click', ...)` call
99. blank
100. comment — section divider
101. bind name to value — `ModeratorLeaderboard` (exported `const` object literal)
102. blank
103. blank
104. comment — section divider
105. comment — `AUTO-INIT`
106. comment — section divider
107. blank
108. top-level statement — `ready.then(() => init())` call

## Agent 03

1. comment — block comment (lines 1–11)
2. blank (line 12)
3. import — `escapeHTML`, `FEATURES` from `./config.ts` (line 13)
4. import — `vgBadge` from `./badge.ts` (line 14)
5. import — `bountyDot` from `./bounties.ts` (line 15)
6. import — `safeRpc`, `getCurrentUser`, `getCurrentProfile`, `getIsPlaceholderMode`, `getSupabaseClient`, `ready` from `./auth.ts` (lines 16–23)
7. import — type-only `SafeRpcResult` from `./auth.ts` (line 24)
8. blank (line 25)
9. comment (line 26)
10. comment (line 27)
11. comment (line 28)
12. blank (line 29)
13. bind name to type — `LeaderboardTab` (exported) (line 30)
14. bind name to type — `LeaderboardTimeFilter` (exported) (line 31)
15. bind name to type — `LeaderboardTier` (exported) (line 32)
16. blank (line 33)
17. bind name to type — `LeaderboardEntry` interface (exported) (lines 34–47)
18. blank (line 48)
19. bind name to type — `LeaderboardRpcRow` interface (lines 49–61)
20. blank (line 62)
21. comment (line 63)
22. comment (line 64)
23. comment (line 65)
24. blank (line 66)
25. bind name to value — `escHtml` (line 67)
26. blank (line 68)
27. comment (line 69)
28. comment (line 70)
29. comment (line 71)
30. blank (line 72)
31. bind name to value — `currentTab` (line 73)
32. bind name to value — `currentTime` (line 74)
33. bind name to value — `liveData` (line 75)
34. bind name to value — `myRank` (line 76)
35. bind name to value — `isLoading` (line 77)
36. bind name to value — `currentOffset` (line 78)
37. bind name to value — `hasMore` (line 79)
38. bind name to value — `PAGE_SIZE` (line 80)
39. blank (line 81)
40. comment (line 82)
41. comment (line 83)
42. comment (line 84)
43. blank (line 85)
44. bind name to value — `PLACEHOLDER_DATA` (lines 86–97)
45. blank (line 98)
46. comment (line 99)
47. comment (line 100)
48. comment (line 101)
49. blank (line 102)
50. bind name to function definition — `fetchLeaderboard` (lines 103–156)
51. blank (line 157)
52. bind name to function definition — `getData` (lines 158–160)
53. blank (line 161)
54. comment (line 162)
55. comment (line 163)
56. comment (line 164)
57. blank (line 165)
58. bind name to function definition — `renderShimmer` (lines 166–181)
59. blank (line 182)
60. comment (line 183)
61. comment (line 184)
62. comment (line 185)
63. blank (line 186)
64. bind name to function definition — `showEloExplainer` (exported) (lines 187–256)
65. blank (line 257)
66. comment (line 258)
67. comment (line 259)
68. comment (line 260)
69. blank (line 261)
70. bind name to function definition — `renderList` (lines 262–339)
71. blank (line 340)
72. comment (line 341)
73. comment (line 342)
74. comment (line 343)
75. blank (line 344)
76. bind name to function definition — `render` (exported) (lines 345–426)
77. blank (line 427)
78. comment (line 428)
79. comment (line 429)
80. comment (line 430)
81. blank (line 431)
82. bind name to function definition — `setTab` (exported) (lines 432–440)
83. blank (line 441)
84. bind name to function definition — `setTime` (exported) (lines 442–449)
85. blank (line 450)
86. bind name to function definition — `loadMore` (exported) (lines 451–457)
87. blank (line 458)
88. comment (line 459)
89. comment (line 460)
90. comment (line 461)
91. blank (line 462)
92. bind name to function definition — `init` (exported) (lines 463–478)
93. blank (line 479)
94. comment (line 480)
95. comment (line 481)
96. comment (line 482)
97. blank (line 483)
98. top-level statement — `document.addEventListener('click', ...)` (lines 484–505)
99. blank (line 506)
100. comment (line 507)
101. bind name to value — `ModeratorLeaderboard` (exported) (lines 508–514)
102. blank (line 515)
103. blank (line 516)
104. comment (line 517)
105. comment (line 518)
106. comment (line 519)
107. blank (line 520)
108. top-level statement — `ready.then(() => init())` (line 521)

## Agent 04

1. comment — JSDoc block (lines 1–11)
2. import — named imports `escapeHTML`, `FEATURES` from `./config.ts`
3. import — named import `vgBadge` from `./badge.ts`
4. import — named import `bountyDot` from `./bounties.ts`
5. import — named imports `safeRpc`, `getCurrentUser`, `getCurrentProfile`, `getIsPlaceholderMode`, `getSupabaseClient`, `ready` from `./auth.ts`
6. import — type-only import `SafeRpcResult` from `./auth.ts`
7. comment — section divider and label `TYPE DEFINITIONS`
8. bind name to type — `LeaderboardTab` (exported type alias)
9. bind name to type — `LeaderboardTimeFilter` (exported type alias)
10. bind name to type — `LeaderboardTier` (exported type alias)
11. bind name to type — `LeaderboardEntry` (exported interface)
12. bind name to type — `LeaderboardRpcRow` (interface, not exported)
13. comment — section divider and label `ESCAPE HELPER`
14. bind name to value — `escHtml` bound to `escapeHTML`
15. comment — section divider and label `STATE`
16. bind name to value — `currentTab` (mutable `let`, initial value `'elo'`)
17. bind name to value — `currentTime` (mutable `let`, initial value `'all'`)
18. bind name to value — `liveData` (mutable `let`, initial value `null`)
19. bind name to value — `myRank` (mutable `let`, initial value `null`)
20. bind name to value — `isLoading` (mutable `let`, initial value `false`)
21. bind name to value — `currentOffset` (mutable `let`, initial value `0`)
22. bind name to value — `hasMore` (mutable `let`, initial value `false`)
23. bind name to value — `PAGE_SIZE` (`const`, value `50`)
24. comment — section divider and label `PLACEHOLDER DATA`
25. bind name to value — `PLACEHOLDER_DATA` (`const` array of `LeaderboardEntry`)
26. comment — section divider and label `DATA FETCHING`
27. bind name to function definition — `fetchLeaderboard` (async function)
28. bind name to function definition — `getData` (function)
29. comment — section divider and label `SHIMMER SKELETON`
30. bind name to function definition — `renderShimmer` (function)
31. comment — section divider and label `ELO EXPLAINER MODAL`
32. bind name to function definition — `showEloExplainer` (exported function)
33. comment — section divider and label `RENDER LIST`
34. bind name to function definition — `renderList` (function)
35. comment — section divider and label `MAIN RENDER`
36. bind name to function definition — `render` (exported function)
37. comment — section divider and label `TAB / TIME CONTROL`
38. bind name to function definition — `setTab` (exported async function)
39. bind name to function definition — `setTime` (exported function)
40. bind name to function definition — `loadMore` (exported async function)
41. comment — section divider and label `INIT`
42. bind name to function definition — `init` (exported function)
43. comment — section divider and label `EVENT DELEGATION`
44. top-level statement — `document.addEventListener('click', ...)` call executed at module load
45. comment — section divider (line 507)
46. bind name to value — `ModeratorLeaderboard` (exported `const` object literal)
47. comment — section divider and label `AUTO-INIT`
48. top-level statement — `ready.then(() => init())` call executed at module load

## Agent 05

1. comment — block comment: "THE MODERATOR — Leaderboard Module (TypeScript) …"
2. blank
3. import — `escapeHTML`, `FEATURES` from `./config.ts`
4. import — `vgBadge` from `./badge.ts`
5. import — `bountyDot` from `./bounties.ts`
6. import — `safeRpc`, `getCurrentUser`, `getCurrentProfile`, `getIsPlaceholderMode`, `getSupabaseClient`, `ready` from `./auth.ts`
7. import — type-only import of `SafeRpcResult` from `./auth.ts`
8. blank
9. comment — section divider: "TYPE DEFINITIONS"
10. blank
11. bind name to type — `LeaderboardTab` (exported type alias)
12. bind name to type — `LeaderboardTimeFilter` (exported type alias)
13. bind name to type — `LeaderboardTier` (exported type alias)
14. blank
15. bind name to type — `LeaderboardEntry` (exported interface)
16. blank
17. bind name to type — `LeaderboardRpcRow` (interface)
18. blank
19. comment — section divider: "ESCAPE HELPER (imported from config.ts)"
20. blank
21. bind name to value — `escHtml`
22. blank
23. comment — section divider: "STATE"
24. blank
25. bind name to value — `currentTab`
26. bind name to value — `currentTime`
27. bind name to value — `liveData`
28. bind name to value — `myRank`
29. bind name to value — `isLoading`
30. bind name to value — `currentOffset`
31. bind name to value — `hasMore`
32. bind name to value — `PAGE_SIZE`
33. blank
34. comment — section divider: "PLACEHOLDER DATA"
35. blank
36. bind name to value — `PLACEHOLDER_DATA`
37. blank
38. comment — section divider: "DATA FETCHING"
39. blank
40. bind name to function definition — `fetchLeaderboard`
41. blank
42. bind name to function definition — `getData`
43. blank
44. comment — section divider: "SHIMMER SKELETON"
45. blank
46. bind name to function definition — `renderShimmer`
47. blank
48. comment — section divider: "ELO EXPLAINER MODAL"
49. blank
50. bind name to function definition — `showEloExplainer` (exported)
51. blank
52. comment — section divider: "RENDER LIST"
53. blank
54. bind name to function definition — `renderList`
55. blank
56. comment — section divider: "MAIN RENDER"
57. blank
58. bind name to function definition — `render` (exported)
59. blank
60. comment — section divider: "TAB / TIME CONTROL"
61. blank
62. bind name to function definition — `setTab` (exported)
63. blank
64. bind name to function definition — `setTime` (exported)
65. blank
66. bind name to function definition — `loadMore` (exported)
67. blank
68. comment — section divider: "INIT"
69. blank
70. bind name to function definition — `init` (exported)
71. blank
72. comment — section divider: "EVENT DELEGATION (replaces inline onclick handlers in innerHTML)"
73. blank
74. top-level statement — `document.addEventListener('click', ...)` call
75. blank
76. comment — section divider line
77. bind name to value — `ModeratorLeaderboard` (exported `as const` object)
78. blank
79. blank
80. comment — section divider: "AUTO-INIT (waits for auth ready, then wires MutationObserver)"
81. blank
82. top-level statement — `ready.then(() => init())` call
