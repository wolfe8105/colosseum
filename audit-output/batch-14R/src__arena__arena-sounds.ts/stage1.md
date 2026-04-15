# Stage 1 Outputs — src/arena/arena-sounds.ts

## Agent 01

1. comment — block comment (lines 1–8)
2. blank
3. comment — section heading comment (lines 10–12)
4. blank
5. bind name to value — `_ctx` (let, `AudioContext | null`, initialized to `null`)
6. blank
7. bind name to function definition — `getCtx`
8. blank
9. comment — section heading comment (lines 30–32)
10. blank
11. bind name to function definition — `sfxEnabled`
12. blank
13. comment — section heading comment (lines 45–47)
14. blank
15. bind name to function definition — `osc`
16. blank
17. bind name to function definition — `noise`
18. blank
19. comment — section heading comment (lines 78–80)
20. blank
21. comment — JSDoc for `sndRoundStart` (line 82)
22. bind name to function definition — `sndRoundStart`
23. blank
24. comment — JSDoc for `sndTurnSwitch` (line 89)
25. bind name to function definition — `sndTurnSwitch`
26. blank
27. comment — JSDoc for `sndPointsAwarded` (line 95)
28. bind name to function definition — `sndPointsAwarded`
29. blank
30. comment — JSDoc for `sndReferenceDrop` (line 103)
31. bind name to function definition — `sndReferenceDrop`
32. blank
33. comment — JSDoc for `sndChallenge` (line 110)
34. bind name to function definition — `sndChallenge`
35. blank
36. comment — JSDoc for `sndTimerWarning` (line 117)
37. bind name to function definition — `sndTimerWarning`
38. blank
39. comment — JSDoc for `sndDebateEnd` (line 123)
40. bind name to function definition — `sndDebateEnd`
41. blank
42. comment — section heading comment (lines 132–134)
43. blank
44. bind name to value — `SOUNDS` (const, `Record<string, (ctx: AudioContext) => void>`)
45. blank
46. bind name to type — `SoundName` (exported type alias)
47. blank
48. bind name to function definition — `playSound` (exported)
49. blank
50. comment — JSDoc for `vibrate` (line 156)
51. bind name to function definition — `vibrate` (exported)
52. blank
53. comment — section heading comment (lines 164–167)
54. blank
55. comment — JSDoc for `IntroTrack` (line 169)
56. bind name to type — `IntroTrack` (exported interface)
57. blank
58. bind name to value — `INTRO_TRACKS` (exported const, `readonly IntroTrack[]`)
59. blank
60. comment — section heading comment (line 190)
61. blank
62. bind name to function definition — `introGladiator`
63. blank
64. bind name to function definition — `introThunder`
65. blank
66. bind name to function definition — `introScholar`
67. blank
68. bind name to function definition — `introPhantom`
69. blank
70. bind name to function definition — `introPhoenix`
71. blank
72. bind name to function definition — `introColossus`
73. blank
74. bind name to function definition — `introViper`
75. blank
76. bind name to function definition — `introOracle`
77. blank
78. bind name to function definition — `introChampion`
79. blank
80. bind name to function definition — `introGhost`
81. blank
82. bind name to value — `INTRO_SYNTHS` (const, `Record<string, (ctx: AudioContext) => void>`)
83. blank
84. bind name to value — `_introAudioEl` (let, `HTMLAudioElement | null`, initialized to `null`)
85. blank
86. comment — JSDoc for `playIntroMusic` (lines 318–322)
87. bind name to function definition — `playIntroMusic` (exported)
88. blank
89. comment — JSDoc for `stopIntroMusic` (line 342)
90. bind name to function definition — `stopIntroMusic` (exported)

## Agent 02

1. comment — block comment (file header, lines 1–8)
2. comment — section banner (AUDIO CONTEXT, lines 10–12)
3. blank
4. bind name to value — `_ctx` (let, `AudioContext | null`, initialized to `null`)
5. blank
6. bind name to function definition — `getCtx`
7. blank
8. comment — section banner (SETTINGS CHECK, lines 30–32)
9. blank
10. bind name to function definition — `sfxEnabled`
11. blank
12. comment — section banner (CORE HELPERS, lines 46–48)
13. blank
14. bind name to function definition — `osc`
15. blank
16. bind name to function definition — `noise`
17. blank
18. comment — section banner (7 SOUNDS, lines 78–80)
19. blank
20. comment — doc comment for `sndRoundStart`
21. bind name to function definition — `sndRoundStart`
22. blank
23. comment — doc comment for `sndTurnSwitch`
24. bind name to function definition — `sndTurnSwitch`
25. blank
26. comment — doc comment for `sndPointsAwarded`
27. bind name to function definition — `sndPointsAwarded`
28. blank
29. comment — doc comment for `sndReferenceDrop`
30. bind name to function definition — `sndReferenceDrop`
31. blank
32. comment — doc comment for `sndChallenge`
33. bind name to function definition — `sndChallenge`
34. blank
35. comment — doc comment for `sndTimerWarning`
36. bind name to function definition — `sndTimerWarning`
37. blank
38. comment — doc comment for `sndDebateEnd`
39. bind name to function definition — `sndDebateEnd`
40. blank
41. comment — section banner (PUBLIC API, lines 132–134)
42. blank
43. bind name to value — `SOUNDS` (const, `Record<string, (ctx: AudioContext) => void>`)
44. blank
45. bind name to type — `SoundName` (exported type alias)
46. blank
47. bind name to function definition — `playSound` (exported)
48. blank
49. comment — doc comment for `vibrate`
50. bind name to function definition — `vibrate` (exported)
51. blank
52. comment — section banner (INTRO MUSIC — F-21, lines 164–167)
53. blank
54. comment — doc comment for `IntroTrack`
55. bind name to type — `IntroTrack` (exported interface)
56. blank
57. bind name to value — `INTRO_TRACKS` (exported const, `readonly IntroTrack[]`)
58. blank
59. comment — section banner (Track synthesizers, line 190)
60. blank
61. bind name to function definition — `introGladiator`
62. blank
63. bind name to function definition — `introThunder`
64. blank
65. bind name to function definition — `introScholar`
66. blank
67. bind name to function definition — `introPhantom`
68. blank
69. bind name to function definition — `introPhoenix`
70. blank
71. bind name to function definition — `introColossus`
72. blank
73. bind name to function definition — `introViper`
74. blank
75. bind name to function definition — `introOracle`
76. blank
77. bind name to function definition — `introChampion`
78. blank
79. bind name to function definition — `introGhost`
80. blank
81. bind name to value — `INTRO_SYNTHS` (const, `Record<string, (ctx: AudioContext) => void>`)
82. blank
83. bind name to value — `_introAudioEl` (let, `HTMLAudioElement | null`, initialized to `null`)
84. blank
85. comment — doc comment for `playIntroMusic`
86. bind name to function definition — `playIntroMusic` (exported)
87. blank
88. comment — doc comment for `stopIntroMusic`
89. bind name to function definition — `stopIntroMusic` (exported)
90. blank

## Agent 03

1. comment — block comment (file header, lines 1–8)
2. comment — section banner (AUDIO CONTEXT, lines 10–12)
3. blank
4. bind name to value — `_ctx` (let, `AudioContext | null`, initialized to `null`)
5. blank
6. bind name to function definition — `getCtx`
7. blank
8. comment — section banner (SETTINGS CHECK, lines 30–32)
9. blank
10. bind name to function definition — `sfxEnabled`
11. blank
12. comment — section banner (CORE HELPERS, lines 45–47)
13. blank
14. bind name to function definition — `osc`
15. blank
16. bind name to function definition — `noise`
17. blank
18. comment — section banner (7 SOUNDS, lines 78–80)
19. blank
20. comment — doc comment for `sndRoundStart` (line 82)
21. bind name to function definition — `sndRoundStart`
22. blank
23. comment — doc comment for `sndTurnSwitch` (line 89)
24. bind name to function definition — `sndTurnSwitch`
25. blank
26. comment — doc comment for `sndPointsAwarded` (line 95)
27. bind name to function definition — `sndPointsAwarded`
28. blank
29. comment — doc comment for `sndReferenceDrop` (line 103)
30. bind name to function definition — `sndReferenceDrop`
31. blank
32. comment — doc comment for `sndChallenge` (line 110)
33. bind name to function definition — `sndChallenge`
34. blank
35. comment — doc comment for `sndTimerWarning` (line 117)
36. bind name to function definition — `sndTimerWarning`
37. blank
38. comment — doc comment for `sndDebateEnd` (line 123)
39. bind name to function definition — `sndDebateEnd`
40. blank
41. comment — section banner (PUBLIC API, lines 132–134)
42. blank
43. bind name to value — `SOUNDS` (const, `Record<string, (ctx: AudioContext) => void>`)
44. blank
45. bind name to type — `SoundName` (exported type alias)
46. blank
47. bind name to function definition — `playSound` (exported)
48. blank
49. comment — doc comment for `vibrate` (line 156)
50. bind name to function definition — `vibrate` (exported)
51. blank
52. comment — section banner (INTRO MUSIC, lines 164–167)
53. blank
54. comment — doc comment for `IntroTrack` (line 169)
55. bind name to type — `IntroTrack` (exported interface)
56. blank
57. bind name to value — `INTRO_TRACKS` (exported const, `readonly IntroTrack[]`)
58. blank
59. comment — section divider (line 190)
60. blank
61. bind name to function definition — `introGladiator`
62. blank
63. bind name to function definition — `introThunder`
64. blank
65. bind name to function definition — `introScholar`
66. blank
67. bind name to function definition — `introPhantom`
68. blank
69. bind name to function definition — `introPhoenix`
70. blank
71. bind name to function definition — `introColossus`
72. blank
73. bind name to function definition — `introViper`
74. blank
75. bind name to function definition — `introOracle`
76. blank
77. bind name to function definition — `introChampion`
78. blank
79. bind name to function definition — `introGhost`
80. blank
81. bind name to value — `INTRO_SYNTHS` (const, `Record<string, (ctx: AudioContext) => void>`)
82. blank
83. bind name to value — `_introAudioEl` (let, `HTMLAudioElement | null`, initialized to `null`)
84. blank
85. comment — doc comment for `playIntroMusic` (lines 318–321)
86. bind name to function definition — `playIntroMusic` (exported)
87. blank
88. comment — doc comment for `stopIntroMusic` (line 342)
89. bind name to function definition — `stopIntroMusic` (exported)

## Agent 04

1. **comment** — block comment (lines 1–8): file header describing purpose, constraints, and haptics policy
2. **comment** — section banner "AUDIO CONTEXT (lazy init)" (lines 10–12)
3. **bind name to value** — `_ctx` (line 14)
4. **bind name to function definition** — `getCtx` (lines 16–28)
5. **comment** — section banner "SETTINGS CHECK" (lines 30–32)
6. **bind name to function definition** — `sfxEnabled` (lines 34–43)
7. **comment** — section banner "CORE HELPERS" (lines 45–47)
8. **bind name to function definition** — `osc` (lines 49–60)
9. **bind name to function definition** — `noise` (lines 62–76)
10. **comment** — section banner "7 SOUNDS (spec §15)" (lines 78–80)
11. **comment** — doc comment for `sndRoundStart` (line 82)
12. **bind name to function definition** — `sndRoundStart` (lines 83–87)
13. **comment** — doc comment for `sndTurnSwitch` (line 89)
14. **bind name to function definition** — `sndTurnSwitch` (lines 90–93)
15. **comment** — doc comment for `sndPointsAwarded` (line 95)
16. **bind name to function definition** — `sndPointsAwarded` (lines 96–101)
17. **comment** — doc comment for `sndReferenceDrop` (line 103)
18. **bind name to function definition** — `sndReferenceDrop` (lines 104–108)
19. **comment** — doc comment for `sndChallenge` (line 110)
20. **bind name to function definition** — `sndChallenge` (lines 111–115)
21. **comment** — doc comment for `sndTimerWarning` (line 117)
22. **bind name to function definition** — `sndTimerWarning` (lines 118–121)
23. **comment** — doc comment for `sndDebateEnd` (line 123)
24. **bind name to function definition** — `sndDebateEnd` (lines 124–130)
25. **comment** — section banner "PUBLIC API" (lines 132–134)
26. **bind name to value** — `SOUNDS` (lines 136–144)
27. **bind name to type** — `SoundName` (exported) (line 146)
28. **bind name to function definition** — `playSound` (exported) (lines 148–154)
29. **comment** — doc comment for `vibrate` (line 156)
30. **bind name to function definition** — `vibrate` (exported) (lines 157–162)
31. **comment** — section banner "INTRO MUSIC — F-21" (lines 164–167)
32. **comment** — doc comment for `IntroTrack` (line 169)
33. **bind name to type** — `IntroTrack` (exported interface) (lines 170–175)
34. **bind name to value** — `INTRO_TRACKS` (exported) (lines 177–188)
35. **comment** — section banner "Track synthesizers" (line 190)
36. **bind name to function definition** — `introGladiator` (lines 192–201)
37. **bind name to function definition** — `introThunder` (lines 203–211)
38. **bind name to function definition** — `introScholar` (lines 213–220)
39. **bind name to function definition** — `introPhantom` (lines 222–228)
40. **bind name to function definition** — `introPhoenix` (lines 230–247)
41. **bind name to function definition** — `introColossus` (lines 249–258)
42. **bind name to function definition** — `introViper` (lines 260–269)
43. **bind name to function definition** — `introOracle` (lines 271–280)
44. **bind name to function definition** — `introChampion` (lines 282–290)
45. **bind name to function definition** — `introGhost` (lines 292–301)
46. **bind name to value** — `INTRO_SYNTHS` (lines 303–314)
47. **bind name to value** — `_introAudioEl` (line 316)
48. **comment** — doc comment for `playIntroMusic` (lines 318–322)
49. **bind name to function definition** — `playIntroMusic` (exported) (lines 323–340)
50. **comment** — doc comment for `stopIntroMusic` (line 342)
51. **bind name to function definition** — `stopIntroMusic` (exported) (lines 343–345)

## Agent 05

1. comment — block comment (file header, lines 1–8)
2. blank
3. comment — section banner (AUDIO CONTEXT)
4. blank
5. bind name to value — `_ctx` (exported: no)
6. blank
7. bind name to function definition — `getCtx`
8. blank
9. comment — section banner (SETTINGS CHECK)
10. blank
11. bind name to function definition — `sfxEnabled`
12. blank
13. comment — section banner (CORE HELPERS)
14. blank
15. bind name to function definition — `osc`
16. blank
17. bind name to function definition — `noise`
18. blank
19. comment — section banner (7 SOUNDS)
20. blank
21. comment — JSDoc for `sndRoundStart`
22. bind name to function definition — `sndRoundStart`
23. blank
24. comment — JSDoc for `sndTurnSwitch`
25. bind name to function definition — `sndTurnSwitch`
26. blank
27. comment — JSDoc for `sndPointsAwarded`
28. bind name to function definition — `sndPointsAwarded`
29. blank
30. comment — JSDoc for `sndReferenceDrop`
31. bind name to function definition — `sndReferenceDrop`
32. blank
33. comment — JSDoc for `sndChallenge`
34. bind name to function definition — `sndChallenge`
35. blank
36. comment — JSDoc for `sndTimerWarning`
37. bind name to function definition — `sndTimerWarning`
38. blank
39. comment — JSDoc for `sndDebateEnd`
40. bind name to function definition — `sndDebateEnd`
41. blank
42. comment — section banner (PUBLIC API)
43. blank
44. bind name to value — `SOUNDS`
45. blank
46. bind name to type — `SoundName` (exported)
47. blank
48. bind name to function definition — `playSound` (exported)
49. blank
50. comment — JSDoc for `vibrate`
51. bind name to function definition — `vibrate` (exported)
52. blank
53. comment — section banner (INTRO MUSIC — F-21)
54. blank
55. comment — JSDoc for `IntroTrack`
56. bind name to type — `IntroTrack` (exported, interface)
57. blank
58. bind name to value — `INTRO_TRACKS` (exported)
59. blank
60. comment — section divider (Track synthesizers)
61. blank
62. bind name to function definition — `introGladiator`
63. blank
64. bind name to function definition — `introThunder`
65. blank
66. bind name to function definition — `introScholar`
67. blank
68. bind name to function definition — `introPhantom`
69. blank
70. bind name to function definition — `introPhoenix`
71. blank
72. bind name to function definition — `introColossus`
73. blank
74. bind name to function definition — `introViper`
75. blank
76. bind name to function definition — `introOracle`
77. blank
78. bind name to function definition — `introChampion`
79. blank
80. bind name to function definition — `introGhost`
81. blank
82. bind name to value — `INTRO_SYNTHS`
83. blank
84. bind name to value — `_introAudioEl`
85. blank
86. comment — JSDoc for `playIntroMusic`
87. bind name to function definition — `playIntroMusic` (exported)
88. blank
89. comment — JSDoc for `stopIntroMusic`
90. bind name to function definition — `stopIntroMusic` (exported)
