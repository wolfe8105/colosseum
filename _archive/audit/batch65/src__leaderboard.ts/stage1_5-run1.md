# Anchor List — leaderboard.ts

1. init  (line 20)

## Resolution notes
- `ModeratorLeaderboard` (line 46): excluded — const bound to an object literal, not a function definition.
- `document.addEventListener('click', ...)` callback (line 34): excluded — inline callback, not a named top-level binding.
- `ready.then(() => init())` arrow (line 48): excluded — inline callback, not a named top-level binding.
- All re-exported names: excluded — defined in sub-modules, not in this file.
