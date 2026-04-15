# Stage 1 Outputs — spectate.types.ts

## Agent 01
1. comment — block comment: "THE MODERATOR — Spectator View Types …" (lines 1–8)
2. blank (line 9)
3. comment — line comment (line 10)
4. bind name to type — `SpectateDebate` (exported interface, lines 11–34)
5. blank (line 35)
6. comment — line comment (line 36)
7. bind name to type — `AICriterion` (exported interface, lines 37–40)
8. blank (line 41)
9. comment — line comment (line 42)
10. bind name to type — `AISideScores` (exported interface, lines 43–48)
11. blank (line 49)
12. comment — line comment (line 50)
13. bind name to type — `AIScorecard` (exported interface, lines 51–56)
14. blank (line 57)
15. comment — line comment (line 58)
16. bind name to type — `ReplayPowerUp` (exported interface, lines 59–67)
17. blank (line 68)
18. comment — line comment (line 69)
19. bind name to type — `ReplayReference` (exported interface, lines 70–83)
20. blank (line 84)
21. comment — line comment (line 85)
22. bind name to type — `ReplayModScore` (exported interface, lines 86–92)
23. blank (line 93)
24. comment — block comment (lines 94–98)
25. bind name to type — `PointAwardMeta` (exported interface, lines 99–107)
26. blank (line 108)
27. comment — block comment (lines 109–112)
28. bind name to type — `ReplayPointAward` (exported interface, lines 113–120)
29. blank (line 121)
30. comment — block comment (lines 122–126)
31. bind name to type — `ReplaySpeechEvent` (exported interface, lines 127–135)
32. blank (line 136)
33. comment — line comment (line 137)
34. bind name to type — `ReplayData` (exported interface, lines 138–146)
35. blank (line 147)
36. comment — block comment (lines 148–155)
37. bind name to type — `TimelineEntry` (exported interface, lines 156–162)
38. blank (line 163)
39. comment — line comment (line 164)
40. bind name to type — `DebateMessage` (exported interface, lines 165–171)
41. blank (line 172)
42. comment — line comment (line 173)
43. bind name to type — `SpectatorChatMessage` (exported interface, lines 174–179)

## Agent 02
1. comment — block comment (file header: "THE MODERATOR — Spectator View Types …")
2. blank
3. comment — line comment ("Debate shape returned by get_arena_debate_spectator RPC or direct query")
4. bind name to type — `SpectateDebate` (exported interface)
5. blank
6. comment — line comment ("AI scorecard criterion (Logic/Evidence/Delivery/Rebuttal)")
7. bind name to type — `AICriterion` (exported interface)
8. blank
9. comment — line comment ("AI scorecard side scores")
10. bind name to type — `AISideScores` (exported interface)
11. blank
12. comment — line comment ("AI scorecard persisted in arena_debates.ai_scorecard")
13. bind name to type — `AIScorecard` (exported interface)
14. blank
15. comment — line comment ("Power-up activation event from replay data")
16. bind name to type — `ReplayPowerUp` (exported interface)
17. blank
18. comment — line comment ("Reference citation from replay data")
19. bind name to type — `ReplayReference` (exported interface)
20. blank
21. comment — line comment ("Moderator score from replay data")
22. bind name to type — `ReplayModScore` (exported interface)
23. blank
24. comment — block comment ("F-05: Modifier math carried in a point_award event's metadata …")
25. bind name to type — `PointAwardMeta` (exported interface)
26. blank
27. comment — block comment ("F-05: Point award event from get_debate_replay_data point_awards bucket …")
28. bind name to type — `ReplayPointAward` (exported interface)
29. blank
30. comment — block comment ("F-05: Speech event from get_debate_replay_data speech_events bucket …")
31. bind name to type — `ReplaySpeechEvent` (exported interface)
32. blank
33. comment — line comment ("Combined replay enrichment data (all 5 buckets from get_debate_replay_data)")
34. bind name to type — `ReplayData` (exported interface)
35. blank
36. comment — block comment ("Unified timeline entry for rendering …")
37. bind name to type — `TimelineEntry` (exported interface)
38. blank
39. comment — line comment ("Single debate message (argument in a round)")
40. bind name to type — `DebateMessage` (exported interface)
41. blank
42. comment — line comment ("Spectator chat message")
43. bind name to type — `SpectatorChatMessage` (exported interface)

## Agent 03
1. comment — block comment (lines 1–8): JSDoc header
2. blank — line 9
3. comment — line 10
4. bind name to type — `SpectateDebate` (exported interface, lines 11–34)
5. blank — line 35
6. comment — line 36
7. bind name to type — `AICriterion` (exported interface, lines 37–40)
8. blank — line 41
9. comment — line 42
10. bind name to type — `AISideScores` (exported interface, lines 43–48)
11. blank — line 49
12. comment — line 50
13. bind name to type — `AIScorecard` (exported interface, lines 51–56)
14. blank — line 57
15. comment — line 58
16. bind name to type — `ReplayPowerUp` (exported interface, lines 59–67)
17. blank — line 68
18. comment — line 69
19. bind name to type — `ReplayReference` (exported interface, lines 70–83)
20. blank — line 84
21. comment — line 85
22. bind name to type — `ReplayModScore` (exported interface, lines 86–92)
23. blank — line 93
24. comment — block comment (lines 94–98)
25. bind name to type — `PointAwardMeta` (exported interface, lines 99–107)
26. blank — line 108
27. comment — block comment (lines 109–112)
28. bind name to type — `ReplayPointAward` (exported interface, lines 113–120)
29. blank — line 121
30. comment — block comment (lines 122–126)
31. bind name to type — `ReplaySpeechEvent` (exported interface, lines 127–135)
32. blank — line 136
33. comment — line 137
34. bind name to type — `ReplayData` (exported interface, lines 138–146)
35. blank — line 147
36. comment — block comment (lines 148–155)
37. bind name to type — `TimelineEntry` (exported interface, lines 156–162)
38. blank — line 163
39. comment — line 164
40. bind name to type — `DebateMessage` (exported interface, lines 165–171)
41. blank — line 172
42. comment — line 173
43. bind name to type — `SpectatorChatMessage` (exported interface, lines 174–179)

## Agent 04
1. comment — block comment (lines 1–8)
2. blank (line 9)
3. comment — line comment (line 10)
4. bind name to type — `SpectateDebate` (exported interface, lines 11–34)
5. blank (line 35)
6. comment — line comment (line 36)
7. bind name to type — `AICriterion` (exported interface, lines 37–40)
8. blank (line 41)
9. comment — line comment (line 42)
10. bind name to type — `AISideScores` (exported interface, lines 43–48)
11. blank (line 49)
12. comment — line comment (line 50)
13. bind name to type — `AIScorecard` (exported interface, lines 51–56)
14. blank (line 57)
15. comment — line comment (line 58)
16. bind name to type — `ReplayPowerUp` (exported interface, lines 59–67)
17. blank (line 68)
18. comment — line comment (line 69)
19. bind name to type — `ReplayReference` (exported interface, lines 70–83)
20. blank (line 84)
21. comment — line comment (line 85)
22. bind name to type — `ReplayModScore` (exported interface, lines 86–92)
23. blank (line 93)
24. comment — block comment (lines 94–98)
25. bind name to type — `PointAwardMeta` (exported interface, lines 99–107)
26. blank (line 108)
27. comment — block comment (lines 109–112)
28. bind name to type — `ReplayPointAward` (exported interface, lines 113–120)
29. blank (line 121)
30. comment — block comment (lines 122–126)
31. bind name to type — `ReplaySpeechEvent` (exported interface, lines 127–135)
32. blank (line 136)
33. comment — line comment (line 137)
34. bind name to type — `ReplayData` (exported interface, lines 138–146)
35. blank (line 147)
36. comment — block comment (lines 148–155)
37. bind name to type — `TimelineEntry` (exported interface, lines 156–162)
38. blank (line 163)
39. comment — line comment (line 164)
40. bind name to type — `DebateMessage` (exported interface, lines 165–171)
41. blank (line 172)
42. comment — line comment (line 173)
43. bind name to type — `SpectatorChatMessage` (exported interface, lines 174–179)

## Agent 05
1. comment — block comment (file header, lines 1–8)
2. blank — line 9
3. comment — line 10
4. bind name to type — `SpectateDebate` (exported interface, lines 11–34)
5. blank — line 35
6. comment — line 36
7. bind name to type — `AICriterion` (exported interface, lines 37–40)
8. blank — line 41
9. comment — line 42
10. bind name to type — `AISideScores` (exported interface, lines 43–48)
11. blank — line 49
12. comment — line 50
13. bind name to type — `AIScorecard` (exported interface, lines 51–56)
14. blank — line 57
15. comment — line 58
16. bind name to type — `ReplayPowerUp` (exported interface, lines 59–67)
17. blank — line 68
18. comment — line 69
19. bind name to type — `ReplayReference` (exported interface, lines 70–83)
20. blank — line 84
21. comment — line 85
22. bind name to type — `ReplayModScore` (exported interface, lines 86–92)
23. blank — line 93
24. comment — block comment (lines 94–98)
25. bind name to type — `PointAwardMeta` (exported interface, lines 99–107)
26. blank — line 108
27. comment — block comment (lines 109–112)
28. bind name to type — `ReplayPointAward` (exported interface, lines 113–120)
29. blank — line 121
30. comment — block comment (lines 122–126)
31. bind name to type — `ReplaySpeechEvent` (exported interface, lines 127–135)
32. blank — line 136
33. comment — line 137
34. bind name to type — `ReplayData` (exported interface, lines 138–146)
35. blank — line 147
36. comment — block comment (lines 148–155)
37. bind name to type — `TimelineEntry` (exported interface, lines 156–162)
38. blank — line 163
39. comment — line 164
40. bind name to type — `DebateMessage` (exported interface, lines 165–171)
41. blank — line 172
42. comment — line 173
43. bind name to type — `SpectatorChatMessage` (exported interface, lines 174–179)
