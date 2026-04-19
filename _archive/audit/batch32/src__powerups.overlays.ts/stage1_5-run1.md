# Anchor List — powerups.overlays.ts

1. renderSilenceOverlay (line 13)
2. renderRevealPopup (line 35)
3. renderShieldIndicator (line 66)
4. removeShieldIndicator (line 75)
5. hasMultiplier (line 79)

## Resolution notes

No candidates excluded. All five are confirmed top-level exported function declarations. Inner callbacks (e.g., arrow function in popup.addEventListener line 60, setInterval callback line 25, .map callback line 38) correctly excluded.
