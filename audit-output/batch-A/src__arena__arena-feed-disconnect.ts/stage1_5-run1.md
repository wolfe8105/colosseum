# Anchor List — arena-feed-disconnect.ts

1. handleParticipantGone  (line 33)
2. handleDebaterDisconnect  (line 65)
3. handleDebaterDisconnectAsViewer  (line 105)
4. handleModDisconnect  (line 123)
5. modNullDebate  (line 141)
6. showDisconnectBanner  (line 176)

## Resolution notes
All five Stage 1 agents produced identical lists. The anchor list is confirmed as-is.

Exclusions verified:
- Lines 186-188: `void feedRealtimeChannel;` and `void appendFeedEvent;` are side-effect statements, not callable bindings — correctly excluded.
- Anonymous setTimeout callbacks at lines ~102, ~114-118, ~137, ~173 are inner functions — correctly excluded.
- All imports (lines 15-31) are excluded per rules.
- No top-level const/let/var function-expression bindings exist in this file.

All six entries are top-level named function declarations (mix of exported and non-exported, sync and async) and satisfy the inclusion criteria.
