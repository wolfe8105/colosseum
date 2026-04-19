# Anchor List — leaderboard.ts

1. init  (line 20)

## Resolution notes
- `ModeratorLeaderboard` (line 46): excluded — const bound to object literal with imported references, not a function definition.
- `document.addEventListener('click', ...)` callback (line 34): excluded — inline callback to addEventListener, not a named top-level binding.
- `ready.then(() => init())` arrow (line 48): excluded — inline callback to .then(), not a named top-level binding.
- `render`, `setTab`, `setTime`, `loadMore`, `showEloExplainer`, `fetchLeaderboard`: excluded — imported from sub-modules and re-exported; not defined in this file.
