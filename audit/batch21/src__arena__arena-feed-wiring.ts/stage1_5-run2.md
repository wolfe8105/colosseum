# Anchor List — arena-feed-wiring.ts (Arbiter Run 2)

1. renderControls  (line 26)

## Resolution notes

- `renderControls` (line 26): Confirmed exported function declaration. Dispatches to mod, spectator, or debater template branch; sets `controlsEl.innerHTML` and calls corresponding wire function.
- All import bindings: Excluded — `escapeHTML`, `challengesRemaining`, `FEED_SCORE_BUDGET`, `FEED_MAX_CHALLENGES`, `wireDebaterControls`, `wireSpectatorTipButtons`, `wireModControls` — imported from other modules, not defined here.
- `CurrentDebate`: Type-only import — excluded.
- No anonymous callbacks at module scope.
- No const function bindings, IIFE, or module-level side effects.
- Both arbiter runs independently produced the same 1-entry anchor list.
