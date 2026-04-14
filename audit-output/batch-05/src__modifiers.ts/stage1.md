# Stage 1 Outputs — modifiers.ts

## Agent 01
1. comment — block comment (file header, lines 1–9)
2. blank
3. import — `safeRpc` from `./auth.ts`
4. import — `escapeHTML`, `showToast` from `./config.ts`
5. blank
6. comment — section divider `TYPE DEFINITIONS`
7. blank
8. bind name to type — `ModifierTiming` (exported type alias)
9. blank
10. bind name to type — `ModifierCategory` (exported type alias)
11. blank
12. bind name to type — `RarityTier` (exported type alias)
13. blank
14. bind name to type — `ModifierEffect` (exported interface)
15. blank
16. bind name to type — `OwnedModifier` (exported interface)
17. blank
18. bind name to type — `PowerUpStock` (exported interface)
19. blank
20. bind name to type — `EquippedLoadoutEntry` (exported interface)
21. blank
22. bind name to type — `UserInventory` (exported interface)
23. blank
24. comment — section divider `CATALOG CACHE`
25. blank
26. bind name to value — `_catalogCache`
27. bind name to value — `_catalogFetchedAt`
28. bind name to value — `CATALOG_TTL_MS`
29. blank
30. bind name to function definition — `getModifierCatalog` (exported async function)
31. blank
32. comment — line comment on `getEffect`
33. bind name to function definition — `getEffect` (exported async function)
34. blank
35. comment — line comment on `getEndOfDebateEffects`
36. bind name to function definition — `getEndOfDebateEffects` (exported async function)
37. blank
38. bind name to function definition — `getInDebateEffects` (exported async function)
39. blank
40. comment — section divider `BUY`
41. blank
42. comment — block comment on `buyModifier`
43. bind name to function definition — `buyModifier` (exported async function)
44. blank
45. comment — block comment on `buyPowerup`
46. bind name to function definition — `buyPowerup` (exported async function)
47. blank
48. comment — section divider `SOCKET`
49. blank
50. comment — block comment on `socketModifier`
51. bind name to function definition — `socketModifier` (exported async function)
52. blank
53. comment — section divider `EQUIP`
54. blank
55. comment — block comment on `equipPowerupForDebate`
56. bind name to function definition — `equipPowerupForDebate` (exported async function)
57. blank
58. comment — section divider `INVENTORY READ`
59. blank
60. comment — block comment on `getUserInventory`
61. bind name to function definition — `getUserInventory` (exported async function)
62. blank
63. comment — section divider `RENDER HELPERS`
64. blank
65. comment — line comment on `tierLabel`
66. bind name to function definition — `tierLabel` (exported function)
67. blank
68. comment — line comment on `timingLabel`
69. bind name to function definition — `timingLabel` (exported function)
70. blank
71. comment — line comment on `categoryLabel`
72. bind name to function definition — `categoryLabel` (exported function)
73. blank
74. comment — block comment on `rarityClass`
75. bind name to function definition — `rarityClass` (exported function)
76. blank
77. comment — block comment on `renderEffectCard`
78. bind name to function definition — `renderEffectCard` (exported function)
79. blank
80. comment — block comment on `renderModifierRow`
81. bind name to function definition — `renderModifierRow` (exported function)
82. blank
83. comment — block comment on `renderPowerupRow`
84. bind name to function definition — `renderPowerupRow` (exported function)
85. blank
86. comment — block comment on `handleBuyModifier`
87. bind name to function definition — `handleBuyModifier` (exported async function)
88. blank
89. bind name to function definition — `handleBuyPowerup` (exported async function)
90. blank
91. bind name to function definition — `handleEquip` (exported async function)

## Agent 02
1. comment — block comment (file header, lines 1–9)
2. blank — line 10
3. import — `safeRpc` from `./auth.ts`
4. import — `escapeHTML`, `showToast` from `./config.ts`
5. blank — line 13
6. comment — section heading `TYPE DEFINITIONS` (lines 14–16)
7. blank — line 17
8. bind name to type — `ModifierTiming` (exported type alias)
9. blank — line 19
10. bind name to type — `ModifierCategory` (exported type alias)
11. blank — line 24
12. bind name to type — `RarityTier` (exported type alias)
13. blank — line 26
14. bind name to type — `ModifierEffect` (exported interface)
15. blank — line 38
16. bind name to type — `OwnedModifier` (exported interface)
17. blank — line 50
18. bind name to type — `PowerUpStock` (exported interface)
19. blank — line 61
20. bind name to type — `EquippedLoadoutEntry` (exported interface)
21. blank — line 72
22. bind name to type — `UserInventory` (exported interface)
23. blank — line 77
24. comment — section heading `CATALOG CACHE` (lines 78–80)
25. blank — line 81
26. bind name to value — `_catalogCache`
27. bind name to value — `_catalogFetchedAt`
28. bind name to value — `CATALOG_TTL_MS`
29. blank — line 85
30. bind name to function definition — `getModifierCatalog` (exported async function)
31. blank — line 102
32. comment — JSDoc for `getEffect` (line 103)
33. bind name to function definition — `getEffect` (exported async function)
34. blank — line 108
35. comment — JSDoc for `getEndOfDebateEffects` (line 109)
36. bind name to function definition — `getEndOfDebateEffects` (exported async function)
37. blank — line 114
38. bind name to function definition — `getInDebateEffects` (exported async function)
39. blank — line 119
40. comment — section heading `BUY` (lines 120–122)
41. blank — line 123
42. comment — JSDoc for `buyModifier` (lines 124–127)
43. bind name to function definition — `buyModifier` (exported async function)
44. blank — line 140
45. comment — JSDoc for `buyPowerup` (lines 141–144)
46. bind name to function definition — `buyPowerup` (exported async function)
47. blank — line 160
48. comment — section heading `SOCKET` (lines 161–163)
49. blank — line 164
50. comment — JSDoc for `socketModifier` (lines 165–168)
51. bind name to function definition — `socketModifier` (exported async function)
52. blank — line 184
53. comment — section heading `EQUIP` (lines 185–187)
54. blank — line 188
55. comment — JSDoc for `equipPowerupForDebate` (lines 189–192)
56. bind name to function definition — `equipPowerupForDebate` (exported async function)
57. blank — line 206
58. comment — section heading `INVENTORY READ` (lines 207–209)
59. blank — line 210
60. comment — JSDoc for `getUserInventory` (lines 211–214)
61. bind name to function definition — `getUserInventory` (exported async function)
62. blank — line 225
63. comment — section heading `RENDER HELPERS` (lines 226–228)
64. blank — line 229
65. comment — JSDoc for `tierLabel` (line 230)
66. bind name to function definition — `tierLabel` (exported function)
67. blank — line 234
68. comment — JSDoc for `timingLabel` (line 235)
69. bind name to function definition — `timingLabel` (exported function)
70. blank — line 239
71. comment — JSDoc for `categoryLabel` (line 240)
72. bind name to function definition — `categoryLabel` (exported function)
73. blank — line 258
74. comment — JSDoc for `rarityClass` (lines 259–262)
75. bind name to function definition — `rarityClass` (exported function)
76. blank — line 266
77. comment — JSDoc for `renderEffectCard` (lines 267–270)
78. bind name to function definition — `renderEffectCard` (exported function)
79. blank — line 314
80. comment — JSDoc for `renderModifierRow` (lines 315–317)
81. bind name to function definition — `renderModifierRow` (exported function)
82. blank — line 343
83. comment — JSDoc for `renderPowerupRow` (lines 344–346)
84. bind name to function definition — `renderPowerupRow` (exported function)
85. blank — line 373
86. comment — JSDoc for `handleBuyModifier` (lines 374–377)
87. bind name to function definition — `handleBuyModifier` (exported async function)
88. blank — line 387
89. bind name to function definition — `handleBuyPowerup` (exported async function)
90. blank — line 401
91. bind name to function definition — `handleEquip` (exported async function)

## Agent 03
1. comment — block comment (file header, lines 1–9)
2. blank — line 10
3. import — `safeRpc` from `./auth.ts`
4. import — `escapeHTML`, `showToast` from `./config.ts`
5. blank — line 13
6. comment — section divider "TYPE DEFINITIONS" (lines 14–16)
7. blank — line 17
8. bind name to type — `ModifierTiming` (exported type alias)
9. blank — line 19
10. bind name to type — `ModifierCategory` (exported type alias, lines 20–23)
11. blank — line 24
12. bind name to type — `RarityTier` (exported type alias)
13. blank — line 26
14. bind name to type — `ModifierEffect` (exported interface, lines 27–37)
15. blank — line 38
16. bind name to type — `OwnedModifier` (exported interface, lines 39–49)
17. blank — line 50
18. bind name to type — `PowerUpStock` (exported interface, lines 51–60)
19. blank — line 61
20. bind name to type — `EquippedLoadoutEntry` (exported interface, lines 62–71)
21. blank — line 72
22. bind name to type — `UserInventory` (exported interface, lines 73–76)
23. blank — line 77
24. comment — section divider "CATALOG CACHE" (lines 78–80)
25. blank — line 81
26. bind name to value — `_catalogCache`
27. bind name to value — `_catalogFetchedAt`
28. bind name to value — `CATALOG_TTL_MS`
29. blank — line 85
30. bind name to function definition — `getModifierCatalog` (exported async function, lines 86–101)
31. blank — line 102
32. comment — JSDoc for `getEffect` (line 103)
33. bind name to function definition — `getEffect` (exported async function, lines 104–107)
34. blank — line 108
35. comment — JSDoc for `getEndOfDebateEffects` (line 109)
36. bind name to function definition — `getEndOfDebateEffects` (exported async function, lines 110–113)
37. blank — line 114
38. bind name to function definition — `getInDebateEffects` (exported async function, lines 115–118)
39. blank — line 119
40. comment — section divider "BUY" (lines 120–122)
41. blank — line 123
42. comment — JSDoc for `buyModifier` (lines 124–127)
43. bind name to function definition — `buyModifier` (exported async function, lines 128–139)
44. blank — line 140
45. comment — JSDoc for `buyPowerup` (lines 141–143)
46. bind name to function definition — `buyPowerup` (exported async function, lines 144–159)
47. blank — line 160
48. comment — section divider "SOCKET" (lines 161–163)
49. blank — line 164
50. comment — JSDoc for `socketModifier` (lines 165–168)
51. bind name to function definition — `socketModifier` (exported async function, lines 169–183)
52. blank — line 184
53. comment — section divider "EQUIP" (lines 185–187)
54. blank — line 188
55. comment — JSDoc for `equipPowerupForDebate` (lines 189–192)
56. bind name to function definition — `equipPowerupForDebate` (exported async function, lines 193–205)
57. blank — line 206
58. comment — section divider "INVENTORY READ" (lines 207–209)
59. blank — line 210
60. comment — JSDoc for `getUserInventory` (lines 211–213)
61. bind name to function definition — `getUserInventory` (exported async function, lines 215–224)
62. blank — line 225
63. comment — section divider "RENDER HELPERS" (lines 226–228)
64. blank — line 229
65. comment — JSDoc for `tierLabel` (line 230)
66. bind name to function definition — `tierLabel` (exported function, lines 231–233)
67. blank — line 234
68. comment — JSDoc for `timingLabel` (line 235)
69. bind name to function definition — `timingLabel` (exported function, lines 236–238)
70. blank — line 239
71. comment — JSDoc for `categoryLabel` (line 240)
72. bind name to function definition — `categoryLabel` (exported function, lines 241–257)
73. blank — line 258
74. comment — JSDoc for `rarityClass` (lines 259–262)
75. bind name to function definition — `rarityClass` (exported function, lines 263–265)
76. blank — line 266
77. comment — JSDoc for `renderEffectCard` (lines 267–270)
78. bind name to function definition — `renderEffectCard` (exported function, lines 271–313)
79. blank — line 314
80. comment — JSDoc for `renderModifierRow` (lines 315–317)
81. bind name to function definition — `renderModifierRow` (exported function, lines 318–342)
82. blank — line 343
83. comment — JSDoc for `renderPowerupRow` (lines 344–346)
84. bind name to function definition — `renderPowerupRow` (exported function, lines 347–372)
85. blank — line 373
86. comment — JSDoc for `handleBuyModifier` (lines 374–377)
87. bind name to function definition — `handleBuyModifier` (exported async function, lines 378–386)
88. blank — line 387
89. bind name to function definition — `handleBuyPowerup` (exported async function, lines 388–400)
90. blank — line 401
91. bind name to function definition — `handleEquip` (exported async function, lines 402–414)
92. blank — line 415 (end of file)

## Agent 04
1. comment — block comment (file header, lines 1–9)
2. blank
3. import — `safeRpc` from `./auth.ts`
4. import — `escapeHTML`, `showToast` from `./config.ts`
5. blank
6. comment — section heading `TYPE DEFINITIONS`
7. blank
8. bind name to type — `ModifierTiming` (exported type alias)
9. blank
10. bind name to type — `ModifierCategory` (exported type alias)
11. blank
12. bind name to type — `RarityTier` (exported type alias)
13. blank
14. bind name to type — `ModifierEffect` (exported interface)
15. blank
16. bind name to type — `OwnedModifier` (exported interface)
17. blank
18. bind name to type — `PowerUpStock` (exported interface)
19. blank
20. bind name to type — `EquippedLoadoutEntry` (exported interface)
21. blank
22. bind name to type — `UserInventory` (exported interface)
23. blank
24. comment — section heading `CATALOG CACHE`
25. blank
26. bind name to value — `_catalogCache`
27. bind name to value — `_catalogFetchedAt`
28. bind name to value — `CATALOG_TTL_MS`
29. blank
30. bind name to function definition — `getModifierCatalog` (exported async function)
31. blank
32. comment — JSDoc for `getEffect`
33. bind name to function definition — `getEffect` (exported async function)
34. blank
35. comment — JSDoc for `getEndOfDebateEffects`
36. bind name to function definition — `getEndOfDebateEffects` (exported async function)
37. blank
38. bind name to function definition — `getInDebateEffects` (exported async function)
39. blank
40. comment — section heading `BUY`
41. blank
42. comment — JSDoc for `buyModifier`
43. bind name to function definition — `buyModifier` (exported async function)
44. blank
45. comment — JSDoc for `buyPowerup`
46. bind name to function definition — `buyPowerup` (exported async function)
47. blank
48. comment — section heading `SOCKET`
49. blank
50. comment — JSDoc for `socketModifier`
51. bind name to function definition — `socketModifier` (exported async function)
52. blank
53. comment — section heading `EQUIP`
54. blank
55. comment — JSDoc for `equipPowerupForDebate`
56. bind name to function definition — `equipPowerupForDebate` (exported async function)
57. blank
58. comment — section heading `INVENTORY READ`
59. blank
60. comment — JSDoc for `getUserInventory`
61. bind name to function definition — `getUserInventory` (exported async function)
62. blank
63. comment — section heading `RENDER HELPERS`
64. blank
65. comment — JSDoc for `tierLabel`
66. bind name to function definition — `tierLabel` (exported function)
67. blank
68. comment — JSDoc for `timingLabel`
69. bind name to function definition — `timingLabel` (exported function)
70. blank
71. comment — JSDoc for `categoryLabel`
72. bind name to function definition — `categoryLabel` (exported function)
73. blank
74. comment — JSDoc for `rarityClass`
75. bind name to function definition — `rarityClass` (exported function)
76. blank
77. comment — JSDoc for `renderEffectCard`
78. bind name to function definition — `renderEffectCard` (exported function)
79. blank
80. comment — JSDoc for `renderModifierRow`
81. bind name to function definition — `renderModifierRow` (exported function)
82. blank
83. comment — JSDoc for `renderPowerupRow`
84. bind name to function definition — `renderPowerupRow` (exported function)
85. blank
86. comment — JSDoc for `handleBuyModifier`
87. bind name to function definition — `handleBuyModifier` (exported async function)
88. blank
89. bind name to function definition — `handleBuyPowerup` (exported async function)
90. blank
91. bind name to function definition — `handleEquip` (exported async function)

## Agent 05
1. comment — block comment (file header, lines 1–9)
2. blank
3. import — `safeRpc` from `./auth.ts`
4. import — `escapeHTML`, `showToast` from `./config.ts`
5. blank
6. comment — section divider `TYPE DEFINITIONS`
7. blank
8. bind name to type — `ModifierTiming` (exported)
9. blank
10. bind name to type — `ModifierCategory` (exported)
11. blank
12. bind name to type — `RarityTier` (exported)
13. blank
14. bind name to type — `ModifierEffect` (exported interface)
15. blank
16. bind name to type — `OwnedModifier` (exported interface)
17. blank
18. bind name to type — `PowerUpStock` (exported interface)
19. blank
20. bind name to type — `EquippedLoadoutEntry` (exported interface)
21. blank
22. bind name to type — `UserInventory` (exported interface)
23. blank
24. comment — section divider `CATALOG CACHE`
25. blank
26. bind name to value — `_catalogCache`
27. bind name to value — `_catalogFetchedAt`
28. bind name to value — `CATALOG_TTL_MS`
29. blank
30. bind name to function definition — `getModifierCatalog` (exported)
31. blank
32. comment — JSDoc for `getEffect`
33. bind name to function definition — `getEffect` (exported)
34. blank
35. comment — JSDoc for `getEndOfDebateEffects`
36. bind name to function definition — `getEndOfDebateEffects` (exported)
37. blank
38. bind name to function definition — `getInDebateEffects` (exported)
39. blank
40. comment — section divider `BUY`
41. blank
42. comment — JSDoc for `buyModifier`
43. bind name to function definition — `buyModifier` (exported)
44. blank
45. comment — JSDoc for `buyPowerup`
46. bind name to function definition — `buyPowerup` (exported)
47. blank
48. comment — section divider `SOCKET`
49. blank
50. comment — JSDoc for `socketModifier`
51. bind name to function definition — `socketModifier` (exported)
52. blank
53. comment — section divider `EQUIP (pre-debate loadout)`
54. blank
55. comment — JSDoc for `equipPowerupForDebate`
56. bind name to function definition — `equipPowerupForDebate` (exported)
57. blank
58. comment — section divider `INVENTORY READ`
59. blank
60. comment — JSDoc for `getUserInventory`
61. bind name to function definition — `getUserInventory` (exported)
62. blank
63. comment — section divider `RENDER HELPERS`
64. blank
65. comment — JSDoc for `tierLabel`
66. bind name to function definition — `tierLabel` (exported)
67. blank
68. comment — JSDoc for `timingLabel`
69. bind name to function definition — `timingLabel` (exported)
70. blank
71. comment — JSDoc for `categoryLabel`
72. bind name to function definition — `categoryLabel` (exported)
73. blank
74. comment — JSDoc for `rarityClass`
75. bind name to function definition — `rarityClass` (exported)
76. blank
77. comment — JSDoc for `renderEffectCard`
78. bind name to function definition — `renderEffectCard` (exported)
79. blank
80. comment — JSDoc for `renderModifierRow`
81. bind name to function definition — `renderModifierRow` (exported)
82. blank
83. comment — JSDoc for `renderPowerupRow`
84. bind name to function definition — `renderPowerupRow` (exported)
85. blank
86. comment — JSDoc for `handleBuyModifier`
87. bind name to function definition — `handleBuyModifier` (exported)
88. blank
89. bind name to function definition — `handleBuyPowerup` (exported)
90. blank
91. bind name to function definition — `handleEquip` (exported)
