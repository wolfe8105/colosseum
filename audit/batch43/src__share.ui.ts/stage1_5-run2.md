# Anchor List — share.ui.ts

1. showPostDebatePrompt  (line 23)

## Resolution notes
- _pendingShareResult (line 17): module-level let binding to null, not callable
- anonymous callbacks (lines 69–87): inner callbacks passed to addEventListener, not top-level named callables
