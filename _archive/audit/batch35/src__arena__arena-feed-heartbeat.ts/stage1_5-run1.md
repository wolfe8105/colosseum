# Anchor List — arena-feed-heartbeat.ts

1. setParticipantGoneCallback (line 30)
2. startHeartbeat (line 34)
3. stopHeartbeat (line 73)
4. sendGoodbye (line 82)
5. checkStaleness (line 94)

## Resolution notes
No candidates excluded. sendBeat (line 55) is an inner arrow fn inside startHeartbeat — excluded. setInterval callback at line 69 is an inline callback — excluded.
