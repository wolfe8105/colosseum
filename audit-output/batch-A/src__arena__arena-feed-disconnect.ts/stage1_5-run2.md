# Anchor List — arena-feed-disconnect.ts

1. handleParticipantGone  (line 33)
2. handleDebaterDisconnect  (line 65)
3. handleDebaterDisconnectAsViewer  (line 105)
4. handleModDisconnect  (line 123)
5. modNullDebate  (line 141)
6. showDisconnectBanner  (line 176)

## Resolution notes
All 6 entries confirmed. The two `void` side-effect statements at lines 187-188 are not function definitions and are correctly excluded. Anonymous setTimeout callbacks inside function bodies are inner scope and excluded. All imports at lines 15-31 are defined elsewhere and excluded. Export status is irrelevant to inclusion — both exported and non-exported top-level function declarations qualify. No top-level const/let arrow-function bindings are present to add. The Stage 1 consensus list is accurate and complete.
