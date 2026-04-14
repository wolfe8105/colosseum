# Anchor List — reference-arsenal.render.ts

1. rarityCardStyle  (line 22)
2. renderSocketDots  (line 29)
3. renderReferenceCard  (line 46)
4. renderArsenal  (line 89)
5. renderArmory  (line 132)
6. renderLibrary  (line 397)

## Resolution notes

All five agents identified the same six callable bindings. `rarityCardStyle` and `renderSocketDots` are module-private top-level function declarations. `renderReferenceCard`, `renderArsenal`, `renderArmory`, and `renderLibrary` are exported (three async). Inner helpers inside `renderArmory` (`closeSheet`, `loadCards`, `openSheet`, `updateBadge`) excluded as non-top-level. `ArmoryState` interface and `RARITY_SOCKET_COUNT` constant excluded as non-callable.
