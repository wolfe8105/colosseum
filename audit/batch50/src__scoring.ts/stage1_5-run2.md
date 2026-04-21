# Anchor List — scoring.ts (Run 2)

1. validateUUID (line 48)
2. castVote (line 65)
3. placePrediction (line 88)

## Resolution notes
- `isPlaceholder` (line 57) is a non-exported helper — excluded per scope rules.
- Interfaces (`CastVoteParams`, `CastVoteResult`, `PlacePredictionParams`, `PlacePredictionResult`) and the `scoring` default-export const are not function definitions — excluded.
