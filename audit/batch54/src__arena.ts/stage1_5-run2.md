# Anchor List — arena.ts

1. showPowerUpShop  (line 41)

## Resolution notes
Single function confirmed. All re-exports are pass-throughs with no new binding. Side-effect import triggers arena-core.ts at module load but defines no callable function here.
