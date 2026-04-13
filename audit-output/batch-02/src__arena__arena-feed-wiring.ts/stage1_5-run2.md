# Anchor List — arena-feed-wiring.ts (Arbiter Run 2)

1. renderControls  (line 45)
2. wireDebaterControls  (line 120)
3. wireSpectatorTipButtons  (line 179)
4. handleTip  (line 212)
5. wireModControls  (line 276)
6. submitDebaterMessage  (line 389)
7. submitModComment  (line 421)
8. handlePinClick  (line 449)

## Resolution notes

- All top-level named callable bindings confirmed by source scan.
- Imported names (safeRpc, getCurrentProfile, escapeHTML, etc.) are not defined in this file — excluded.
- Inner callbacks (event listeners, .forEach, .then lambdas) are not top-level named bindings — excluded.
- No classes, enums, or type aliases defined at top level in this file.
