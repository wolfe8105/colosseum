# Anchor List — arena-feed-wiring.ts (Arbiter Run 1)

1. renderControls  (line 26)

## Resolution notes

- `renderControls` (line 26): Exported function declaration. Sets `controlsEl.innerHTML` to one of 3 HTML template branches (mod/spectator/debater) and calls the corresponding wire function. Sole top-level named callable defined in this file.
- All import bindings (lines 12–23): Excluded — `escapeHTML`, `challengesRemaining`, `FEED_SCORE_BUDGET`, `FEED_MAX_CHALLENGES`, `wireDebaterControls`, `wireSpectatorTipButtons`, `wireModControls`, `CurrentDebate` (type import) — none defined here.
- Inline wire-function call sites inside renderControls body: Excluded — invocations, not definitions.
- No module-level side effects (no addEventListener, no auto-init call).
- No interfaces, type aliases, enums, or const value/function bindings at module scope.
