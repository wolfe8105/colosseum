# Anchor List — arena-lobby.cards.ts

1. renderArenaFeedCard  (line 11)
2. renderAutoDebateCard  (line 40)
3. renderPlaceholderCards  (line 54)

## Resolution notes
All five Stage 1 agents reached identical findings. The file contains exactly three exported top-level function declarations at the listed lines. The anonymous arrow function at line 63 is inner scope (inside a `.map()` call within `renderPlaceholderCards`) and is correctly excluded from the anchor list. No disagreements to resolve.
