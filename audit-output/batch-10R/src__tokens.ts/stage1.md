# Stage 1 Outputs — src/tokens.ts

## Agent 01
1. comment — block comment (file header, lines 1–8)
2. blank
3. import — `showToast`, `escapeHTML` from `./config.ts`
4. import — `safeRpc`, `getCurrentUser`, `getCurrentProfile`, `getIsPlaceholderMode`, `onChange` from `./auth.ts`
5. import — type-only import of `Profile` from `./auth.ts`
6. import — `nudge` from `./nudge.ts`
7. blank
8. comment — section divider + "TYPE DEFINITIONS"
9. blank
10. bind name to type — `MilestoneKey` (exported type alias, union of string literals)
11. blank
12. bind name to type — `MilestoneDefinition` (exported interface)
13. blank
14. bind name to type — `ClaimResult` (exported interface)
15. blank
16. bind name to type — `MilestoneListItem` (exported interface)
17. blank
18. bind name to type — `TokenSummary` (exported interface)
19. blank
20. comment — section divider + "MODULE STATE"
21. blank
22. bind name to value — `lastKnownBalance`
23. bind name to value — `milestoneClaimed`
24. bind name to value — `dailyLoginClaimed`
25. bind name to value — `_dailyLoginInFlight`
26. bind name to value — `_bc`
27. blank
28. comment — section divider + "MILESTONE DEFINITIONS"
29. blank
30. bind name to value — `MILESTONES` (exported)
31. blank
32. comment — section divider + "CSS INJECTION"
33. blank
34. bind name to value — `cssInjected`
35. blank
36. bind name to function definition — `_injectCSS`
37. blank
38. comment — section divider + "ANIMATIONS"
39. blank
40. bind name to function definition — `_coinFlyUp`
41. blank
42. bind name to function definition — `_tokenToast`
43. blank
44. bind name to function definition — `_milestoneToast`
45. blank
46. comment — section divider + "BALANCE DISPLAY"
47. blank
48. bind name to function definition — `_updateBalanceDisplay`
49. blank
50. comment — JSDoc comment
51. bind name to function definition — `updateBalance` (exported)
52. blank
53. comment — section divider + "SAFE RPC HELPER …"
54. blank
55. bind name to function definition — `_rpc`
56. blank
57. comment — section divider + "TOKEN GATE"
58. blank
59. bind name to function definition — `requireTokens` (exported)
60. blank
61. comment — section divider + "MILESTONE CLAIM"
62. blank
63. bind name to function definition — `claimMilestone` (exported)
64. blank
65. bind name to function definition — `_loadMilestones` (exported)
66. blank
67. bind name to function definition — `_checkStreakMilestones`
68. blank
69. comment — section divider + "PUBLIC CLAIM FUNCTIONS"
70. blank
71. bind name to function definition — `claimDailyLogin` (exported)
72. blank
73. bind name to function definition — `claimHotTake` (exported)
74. blank
75. bind name to function definition — `claimReaction` (exported)
76. blank
77. bind name to function definition — `claimVote` (exported)
78. blank
79. bind name to function definition — `claimDebate` (exported)
80. blank
81. bind name to function definition — `claimAiSparring` (exported)
82. blank
83. bind name to function definition — `claimPrediction` (exported)
84. blank
85. bind name to function definition — `checkProfileMilestones` (exported)
86. blank
87. bind name to function definition — `getSummary` (exported)
88. blank
89. bind name to function definition — `getMilestoneList` (exported)
90. blank
91. comment — section divider + "GETTERS"
92. blank
93. bind name to function definition — `getBalance` (exported)
94. blank
95. comment — section divider + "CROSS-TAB BALANCE SYNC"
96. blank
97. bind name to function definition — `_initBroadcast`
98. blank
99. comment — section divider + "INIT …"
100. blank
101. bind name to function definition — `init` (exported)
102. blank
103. comment — section divider + "DEFAULT EXPORT"
104. blank
105. bind name to value — `tokens`
106. blank
107. top-level statement — `export default tokens`
108. blank
109. comment — section divider (closing)
110. blank
111. comment — section divider + "AUTO-INIT …"
112. blank
113. top-level statement — `if (document.readyState === 'loading') { … } else { init(); }`

## Agent 02
1. comment — block comment (lines 1–8)
2. blank (line 9)
3. import — `showToast`, `escapeHTML` from `./config.ts` (line 10)
4. import — `safeRpc`, `getCurrentUser`, `getCurrentProfile`, `getIsPlaceholderMode`, `onChange` from `./auth.ts` (line 11)
5. import — type-only `Profile` from `./auth.ts` (line 12)
6. import — `nudge` from `./nudge.ts` (line 13)
7. blank (line 14)
8. comment (line 15)
9. comment (line 16)
10. comment (line 17)
11. blank (line 18)
12. bind name to type — `MilestoneKey` (exported type alias, lines 19–32)
13. blank (line 33)
14. bind name to type — `MilestoneDefinition` (exported interface, lines 34–39)
15. blank (line 40)
16. bind name to type — `ClaimResult` (exported interface, lines 41–55)
17. blank (line 56)
18. bind name to type — `MilestoneListItem` (exported interface, lines 57–60)
19. blank (line 61)
20. bind name to type — `TokenSummary` (exported interface, lines 62–66)
21. blank (line 67)
22. comment (line 68)
23. comment (line 69)
24. comment (line 70)
25. blank (line 71)
26. bind name to value — `lastKnownBalance` (line 72)
27. bind name to value — `milestoneClaimed` (line 73)
28. bind name to value — `dailyLoginClaimed` (line 74)
29. bind name to value — `_dailyLoginInFlight` (line 75)
30. bind name to value — `_bc` (line 76)
31. blank (line 77)
32. comment (line 78)
33. comment (line 79)
34. comment (line 80)
35. blank (line 81)
36. bind name to value — `MILESTONES` (exported `const`, lines 82–96)
37. blank (line 97)
38. comment (line 98)
39. comment (line 99)
40. comment (line 100)
41. blank (line 101)
42. bind name to value — `cssInjected` (line 102)
43. blank (line 103)
44. bind name to function definition — `_injectCSS` (lines 104–148)
45. blank (line 149)
46. comment (line 150)
47. comment (line 151)
48. comment (line 152)
49. blank (line 153)
50. bind name to function definition — `_coinFlyUp` (lines 154–169)
51. blank (line 170)
52. bind name to function definition — `_tokenToast` (lines 171–177)
53. blank (line 178)
54. bind name to function definition — `_milestoneToast` (lines 179–196)
55. blank (line 197)
56. comment (line 198)
57. comment (line 199)
58. comment (line 200)
59. blank (line 201)
60. bind name to function definition — `_updateBalanceDisplay` (lines 202–213)
61. blank (line 214)
62. comment (line 215)
63. bind name to function definition — `updateBalance` (exported, lines 216–220)
64. blank (line 221)
65. comment (line 222)
66. comment (line 223)
67. comment (line 224)
68. blank (line 225)
69. bind name to function definition — `_rpc` (lines 226–240)
70. blank (line 241)
71. comment (line 242)
72. comment (line 243)
73. comment (line 244)
74. blank (line 245)
75. bind name to function definition — `requireTokens` (exported, lines 246–255)
76. blank (line 256)
77. comment (line 257)
78. comment (line 258)
79. comment (line 259)
80. blank (line 260)
81. bind name to function definition — `claimMilestone` (exported, lines 261–275)
82. blank (line 276)
83. bind name to function definition — `_loadMilestones` (exported, lines 277–284)
84. blank (line 285)
85. bind name to function definition — `_checkStreakMilestones` (lines 286–291)
86. blank (line 292)
87. comment (line 293)
88. comment (line 294)
89. comment (line 295)
90. blank (line 296)
91. bind name to function definition — `claimDailyLogin` (exported, lines 297–326)
92. blank (line 327)
93. bind name to function definition — `claimHotTake` (exported, lines 328–338)
94. blank (line 339)
95. bind name to function definition — `claimReaction` (exported, lines 340–348)
96. blank (line 349)
97. bind name to function definition — `claimVote` (exported, lines 350–360)
98. blank (line 361)
99. bind name to function definition — `claimDebate` (exported, lines 362–383)
100. blank (line 384)
101. bind name to function definition — `claimAiSparring` (exported, lines 385–393)
102. blank (line 394)
103. bind name to function definition — `claimPrediction` (exported, lines 395–403)
104. blank (line 404)
105. bind name to function definition — `checkProfileMilestones` (exported, lines 405–415)
106. blank (line 416)
107. bind name to function definition — `getSummary` (exported, lines 417–422)
108. blank (line 423)
109. bind name to function definition — `getMilestoneList` (exported, lines 424–430)
110. blank (line 431)
111. comment (line 432)
112. comment (line 433)
113. comment (line 434)
114. blank (line 435)
115. bind name to function definition — `getBalance` (exported, lines 436–438)
116. blank (line 439)
117. comment (line 440)
118. comment (line 441)
119. comment (line 442)
120. blank (line 443)
121. bind name to function definition — `_initBroadcast` (lines 444–453)
122. blank (line 454)
123. comment (line 455)
124. comment (line 456)
125. comment (line 457)
126. blank (line 458)
127. bind name to function definition — `init` (exported, lines 459–474)
128. blank (line 475)
129. comment (line 476)
130. comment (line 477)
131. comment (line 478)
132. blank (line 479)
133. bind name to value — `tokens` (lines 480–496)
134. blank (line 497)
135. re-export — `export default tokens` (line 498)
136. blank (line 499)
137. comment (line 500)
138. blank (line 501)
139. comment (line 502)
140. comment (line 503)
141. comment (line 504)
142. blank (line 505)
143. top-level statement — conditional `document.addEventListener` or `init()` call (lines 506–510)

## Agent 03
Here is the flat numbered inventory of every primitive language operation in `/src/tokens.ts`, in source order:

1. comment — block comment (file header, lines 1–8)
2. blank — line 9
3. import — named import of `showToast`, `escapeHTML` from `./config.ts`
4. import — named import of `safeRpc`, `getCurrentUser`, `getCurrentProfile`, `getIsPlaceholderMode`, `onChange` from `./auth.ts`
5. import — type-only import of `Profile` from `./auth.ts`
6. import — named import of `nudge` from `./nudge.ts`
7. blank — line 14
8. comment — section divider (lines 15–17)
9. blank — line 18
10. bind name to type — `MilestoneKey` (exported type alias, union of string literals)
11. blank — line 33
12. bind name to type — `MilestoneDefinition` (exported interface)
13. blank — line 39
14. bind name to type — `ClaimResult` (exported interface)
15. blank — line 55
16. bind name to type — `MilestoneListItem` (exported interface)
17. blank — line 61
18. bind name to type — `TokenSummary` (exported interface)
19. blank — line 67
20. comment — section divider (lines 68–70)
21. blank — line 71
22. bind name to value — `lastKnownBalance` (`let`, `number | null`)
23. bind name to value — `milestoneClaimed` (`const`, `new Set<string>()`)
24. bind name to value — `dailyLoginClaimed` (`let`, `false`)
25. bind name to value — `_dailyLoginInFlight` (`let`, `false`)
26. bind name to value — `_bc` (`let`, `BroadcastChannel | null`)
27. blank — line 77
28. comment — section divider (lines 78–80)
29. blank — line 81
30. bind name to value — `MILESTONES` (exported `const`, `Readonly<Record<MilestoneKey, MilestoneDefinition>>`)
31. blank — line 97
32. comment — section divider (lines 98–100)
33. blank — line 101
34. bind name to value — `cssInjected` (`let`, `false`)
35. blank — line 103
36. bind name to function definition — `_injectCSS`
37. blank — line 149
38. comment — section divider (lines 150–152)
39. blank — line 153
40. bind name to function definition — `_coinFlyUp`
41. blank — line 170
42. bind name to function definition — `_tokenToast`
43. blank — line 178
44. bind name to function definition — `_milestoneToast`
45. blank — line 197
46. comment — section divider (lines 198–200)
47. blank — line 201
48. bind name to function definition — `_updateBalanceDisplay`
49. blank — line 213
50. comment — line 215 (JSDoc comment)
51. bind name to function definition — `updateBalance` (exported)
52. blank — line 221
53. comment — section divider (lines 222–224)
54. blank — line 225
55. bind name to function definition — `_rpc`
56. blank — line 241
57. comment — section divider (lines 242–244)
58. blank — line 245
59. bind name to function definition — `requireTokens` (exported)
60. blank — line 256
61. comment — section divider (lines 257–259)
62. blank — line 260
63. bind name to function definition — `claimMilestone` (exported)
64. blank — line 276
65. bind name to function definition — `_loadMilestones` (exported)
66. blank — line 284
67. bind name to function definition — `_checkStreakMilestones`
68. blank — line 292
69. comment — section divider (lines 293–295)
70. blank — line 296
71. bind name to function definition — `claimDailyLogin` (exported)
72. blank — line 327
73. bind name to function definition — `claimHotTake` (exported)
74. blank — line 339
75. bind name to function definition — `claimReaction` (exported)
76. blank — line 349
77. bind name to function definition — `claimVote` (exported)
78. blank — line 361
79. bind name to function definition — `claimDebate` (exported)
80. blank — line 384
81. bind name to function definition — `claimAiSparring` (exported)
82. blank — line 394
83. bind name to function definition — `claimPrediction` (exported)
84. blank — line 403
85. bind name to function definition — `checkProfileMilestones` (exported)
86. blank — line 416
87. bind name to function definition — `getSummary` (exported)
88. blank — line 422
89. bind name to function definition — `getMilestoneList` (exported)
90. blank — line 430
91. comment — section divider (lines 431–433)
92. blank — line 434
93. bind name to function definition — `getBalance` (exported)
94. blank — line 438
95. comment — section divider (lines 439–441)
96. blank — line 442
97. bind name to function definition — `_initBroadcast`
98. blank — line 453
99. comment — section divider (lines 454–457)
100. blank — line 458
101. bind name to function definition — `init` (exported)
102. blank — line 474
103. comment — section divider (lines 475–477)
104. blank — line 478
105. bind name to value — `tokens` (`const`, object literal with inline getters; exported as default)
106. blank — line 497
107. re-export — `export default tokens`
108. blank — line 499
109. comment — section divider (line 500)
110. blank — line 501
111. comment — section divider (lines 502–504)
112. blank — line 505
113. top-level statement — `if (document.readyState === 'loading')` block: registers `DOMContentLoaded` listener calling `init`, else calls `init()` directly

## Agent 04
1. comment — block comment (lines 1–8)
2. blank (line 9)
3. import — named import of `showToast`, `escapeHTML` from `./config.ts` (line 10)
4. import — named import of `safeRpc`, `getCurrentUser`, `getCurrentProfile`, `getIsPlaceholderMode`, `onChange` from `./auth.ts` (line 11)
5. import — type-only import of `Profile` from `./auth.ts` (line 12)
6. import — named import of `nudge` from `./nudge.ts` (line 13)
7. blank (line 14)
8. comment (line 15)
9. comment (line 16)
10. comment (line 17)
11. blank (line 18)
12. bind name to type — `MilestoneKey` (exported type alias, lines 19–32)
13. blank (line 33)
14. bind name to type — `MilestoneDefinition` (exported interface, lines 34–39)
15. blank (line 40)
16. bind name to type — `ClaimResult` (exported interface, lines 41–55)
17. blank (line 56)
18. bind name to type — `MilestoneListItem` (exported interface, lines 57–60)
19. blank (line 61)
20. bind name to type — `TokenSummary` (exported interface, lines 62–66)
21. blank (line 67)
22. comment (line 68)
23. comment (line 69)
24. comment (line 70)
25. blank (line 71)
26. bind name to value — `lastKnownBalance` (line 72)
27. bind name to value — `milestoneClaimed` (line 73)
28. bind name to value — `dailyLoginClaimed` (line 74)
29. bind name to value — `_dailyLoginInFlight` (line 75)
30. bind name to value — `_bc` (line 76)
31. blank (line 77)
32. comment (line 78)
33. comment (line 79)
34. comment (line 80)
35. blank (line 81)
36. bind name to value — `MILESTONES` (exported `const`, lines 82–96)
37. blank (line 97)
38. comment (line 98)
39. comment (line 99)
40. comment (line 100)
41. blank (line 101)
42. bind name to value — `cssInjected` (line 102)
43. blank (line 103)
44. bind name to function definition — `_injectCSS` (lines 104–148)
45. blank (line 149)
46. comment (line 150)
47. comment (line 151)
48. comment (line 152)
49. blank (line 153)
50. bind name to function definition — `_coinFlyUp` (lines 154–169)
51. blank (line 170)
52. bind name to function definition — `_tokenToast` (lines 171–177)
53. blank (line 178)
54. bind name to function definition — `_milestoneToast` (lines 179–196)
55. blank (line 197)
56. comment (line 198)
57. comment (line 199)
58. comment (line 200)
59. blank (line 201)
60. bind name to function definition — `_updateBalanceDisplay` (lines 202–213)
61. blank (line 214)
62. comment (line 215)
63. bind name to function definition — `updateBalance` (exported, lines 216–220)
64. blank (line 221)
65. comment (line 222)
66. comment (line 223)
67. comment (line 224)
68. blank (line 225)
69. bind name to function definition — `_rpc` (lines 226–240)
70. blank (line 241)
71. comment (line 242)
72. comment (line 243)
73. comment (line 244)
74. blank (line 245)
75. bind name to function definition — `requireTokens` (exported, lines 246–255)
76. blank (line 256)
77. comment (line 257)
78. comment (line 258)
79. comment (line 259)
80. blank (line 260)
81. bind name to function definition — `claimMilestone` (exported, lines 261–275)
82. blank (line 276)
83. bind name to function definition — `_loadMilestones` (exported, lines 277–284)
84. blank (line 285)
85. bind name to function definition — `_checkStreakMilestones` (lines 286–291)
86. blank (line 292)
87. comment (line 293)
88. comment (line 294)
89. comment (line 295)
90. blank (line 296)
91. bind name to function definition — `claimDailyLogin` (exported, lines 297–326)
92. blank (line 327)
93. bind name to function definition — `claimHotTake` (exported, lines 328–338)
94. blank (line 339)
95. bind name to function definition — `claimReaction` (exported, lines 340–348)
96. blank (line 349)
97. bind name to function definition — `claimVote` (exported, lines 350–360)
98. blank (line 361)
99. bind name to function definition — `claimDebate` (exported, lines 362–383)
100. blank (line 384)
101. bind name to function definition — `claimAiSparring` (exported, lines 385–393)
102. blank (line 394)
103. bind name to function definition — `claimPrediction` (exported, lines 395–403)
104. blank (line 404)
105. bind name to function definition — `checkProfileMilestones` (exported, lines 405–415)
106. blank (line 416)
107. bind name to function definition — `getSummary` (exported, lines 417–422)
108. blank (line 423)
109. bind name to function definition — `getMilestoneList` (exported, lines 424–430)
110. blank (line 431)
111. comment (line 432)
112. comment (line 433)
113. comment (line 434)
114. blank (line 435)
115. bind name to function definition — `getBalance` (exported, lines 436–438)
116. blank (line 439)
117. comment (line 440)
118. comment (line 441)
119. comment (line 442)
120. blank (line 443)
121. bind name to function definition — `_initBroadcast` (lines 444–453)
122. blank (line 454)
123. comment (line 455)
124. comment (line 456)
125. comment (line 457)
126. blank (line 458)
127. bind name to function definition — `init` (exported, lines 459–474)
128. blank (line 475)
129. comment (line 476)
130. comment (line 477)
131. comment (line 478)
132. blank (line 479)
133. bind name to value — `tokens` (lines 480–496)
134. blank (line 497)
135. re-export — `export default tokens` (line 498)
136. blank (line 499)
137. comment (line 500)
138. blank (line 501)
139. comment (line 502)
140. comment (line 503)
141. comment (line 504)
142. blank (line 505)
143. top-level statement — conditional `if (document.readyState === 'loading')` block registering `DOMContentLoaded` listener or calling `init()` directly (lines 506–510)

## Agent 05
1. comment — block comment (lines 1–8)
2. blank (line 9)
3. import — named import of `showToast`, `escapeHTML` from `./config.ts` (line 10)
4. import — named import of `safeRpc`, `getCurrentUser`, `getCurrentProfile`, `getIsPlaceholderMode`, `onChange` from `./auth.ts` (line 11)
5. import — type-only import of `Profile` from `./auth.ts` (line 12)
6. import — named import of `nudge` from `./nudge.ts` (line 13)
7. blank (line 14)
8. comment (line 15)
9. comment (line 16)
10. comment (line 17)
11. blank (line 18)
12. bind name to type — `MilestoneKey` (exported type alias, lines 19–33)
13. blank (line 34 area)
14. bind name to type — `MilestoneDefinition` (exported interface, lines 34–39)
15. blank (line 40)
16. bind name to type — `ClaimResult` (exported interface, lines 41–55)
17. blank (line 56)
18. bind name to type — `MilestoneListItem` (exported interface, lines 57–60)
19. blank (line 61)
20. bind name to type — `TokenSummary` (exported interface, lines 62–66)
21. blank (line 67)
22. comment (line 68)
23. comment (line 69)
24. comment (line 70)
25. blank (line 71)
26. bind name to value — `lastKnownBalance` (let, line 72)
27. bind name to value — `milestoneClaimed` (const, line 73)
28. bind name to value — `dailyLoginClaimed` (let, line 74)
29. bind name to value — `_dailyLoginInFlight` (let, line 75)
30. bind name to value — `_bc` (let, line 76)
31. blank (line 77)
32. comment (line 78)
33. comment (line 79)
34. comment (line 80)
35. blank (line 81)
36. bind name to value — `MILESTONES` (exported const, lines 82–96)
37. blank (line 97)
38. comment (line 98)
39. comment (line 99)
40. comment (line 100)
41. blank (line 101)
42. bind name to value — `cssInjected` (let, line 102)
43. blank (line 103)
44. bind name to function definition — `_injectCSS` (lines 104–148)
45. blank (line 149)
46. comment (line 150)
47. comment (line 151)
48. comment (line 152)
49. blank (line 153)
50. bind name to function definition — `_coinFlyUp` (lines 154–169)
51. blank (line 170)
52. bind name to function definition — `_tokenToast` (lines 171–177)
53. blank (line 178)
54. bind name to function definition — `_milestoneToast` (lines 179–196)
55. blank (line 197)
56. comment (line 198)
57. comment (line 199)
58. comment (line 200)
59. blank (line 201)
60. bind name to function definition — `_updateBalanceDisplay` (lines 202–213)
61. blank (line 214)
62. comment (line 215)
63. bind name to function definition — `updateBalance` (exported, lines 216–220)
64. blank (line 221)
65. comment (line 222)
66. comment (line 223)
67. comment (line 224)
68. blank (line 225)
69. bind name to function definition — `_rpc` (lines 226–240)
70. blank (line 241)
71. comment (line 242)
72. comment (line 243)
73. comment (line 244)
74. blank (line 245)
75. bind name to function definition — `requireTokens` (exported, lines 246–255)
76. blank (line 256)
77. comment (line 257)
78. comment (line 258)
79. comment (line 259)
80. blank (line 260)
81. bind name to function definition — `claimMilestone` (exported, lines 261–275)
82. blank (line 276)
83. bind name to function definition — `_loadMilestones` (exported, lines 277–284)
84. blank (line 285)
85. bind name to function definition — `_checkStreakMilestones` (lines 286–291)
86. blank (line 292)
87. comment (line 293)
88. comment (line 294)
89. comment (line 295)
90. blank (line 296)
91. bind name to function definition — `claimDailyLogin` (exported, lines 297–326)
92. blank (line 327)
93. bind name to function definition — `claimHotTake` (exported, lines 328–338)
94. blank (line 339)
95. bind name to function definition — `claimReaction` (exported, lines 340–348)
96. blank (line 349)
97. bind name to function definition — `claimVote` (exported, lines 350–360)
98. blank (line 361)
99. bind name to function definition — `claimDebate` (exported, lines 362–383)
100. blank (line 384)
101. bind name to function definition — `claimAiSparring` (exported, lines 385–393)
102. blank (line 394)
103. bind name to function definition — `claimPrediction` (exported, lines 395–403)
104. blank (line 404)
105. bind name to function definition — `checkProfileMilestones` (exported, lines 405–415)
106. blank (line 416)
107. bind name to function definition — `getSummary` (exported, lines 417–422)
108. blank (line 423)
109. bind name to function definition — `getMilestoneList` (exported, lines 424–430)
110. blank (line 431)
111. comment (line 432)
112. comment (line 433)
113. comment (line 434)
114. blank (line 435)
115. bind name to function definition — `getBalance` (exported, lines 436–438)
116. blank (line 439)
117. comment (line 440)
118. comment (line 441)
119. comment (line 442)
120. blank (line 443)
121. bind name to function definition — `_initBroadcast` (lines 444–453)
122. blank (line 454)
123. comment (line 455)
124. comment (line 456)
125. comment (line 457)
126. blank (line 458)
127. bind name to function definition — `init` (exported, lines 459–474)
128. blank (line 475)
129. comment (line 476)
130. comment (line 477)
131. comment (line 478)
132. blank (line 479)
133. bind name to value — `tokens` (const, lines 480–496)
134. blank (line 497)
135. re-export — `export default tokens` (line 498)
136. blank (line 499)
137. comment (line 500)
138. blank (line 501)
139. comment (line 502)
140. comment (line 503)
141. comment (line 504)
142. blank (line 505)
143. top-level statement — `if (document.readyState === 'loading')` conditional calling `document.addEventListener` or `init()` (lines 506–510)
