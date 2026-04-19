# Anchor List — reference-arsenal.render.ts

Source: src/reference-arsenal.render.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. rarityCardStyle  (line 22)
2. renderSocketDots  (line 29)
3. renderReferenceCard  (line 46)
4. renderArsenal  (line 89)
5. renderArmory  (line 132)
6. renderLibrary  (line 397)

## Resolution notes

All five Stage 1 agents and both arbiter runs agreed unanimously. Six top-level function definitions: two module-private (`rarityCardStyle`, `renderSocketDots`) and four exported (`renderReferenceCard` sync, `renderArsenal` async, `renderArmory` async, `renderLibrary` async). Inner helpers inside `renderArmory` (`closeSheet`, `loadCards`, `openSheet`, `updateBadge`) correctly excluded.
