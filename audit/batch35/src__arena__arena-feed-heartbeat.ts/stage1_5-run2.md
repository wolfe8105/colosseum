# Anchor List — arena-feed-heartbeat.ts

1. setParticipantGoneCallback (line 30)
2. startHeartbeat (line 34)
3. stopHeartbeat (line 73)
4. sendGoodbye (line 82)
5. checkStaleness (line 94)

## Resolution notes
All five agents unanimously identified the five top-level function definitions. sendBeat (line 55) excluded as inner helper inside startHeartbeat. setInterval callback excluded as inline callback.
