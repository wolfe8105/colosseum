## Arbiter Run 2 — arena-feed-disconnect.ts

Anchor list:
1. handleParticipantGone  (line 35)

Resolution notes:
- Lines 32–33: Re-exports (modNullDebate, showDisconnectBanner) are NOT local function definitions.
- Lines 68–69: Void expressions are statement expressions, NOT function definitions.
