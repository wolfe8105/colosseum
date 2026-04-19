# Anchor List — rivals-presence-popup.ts

1. destroy  (line 29)
2. dismissPopup  (line 38)
3. showNext  (line 57)
4. queueAlert  (line 107)

## Resolution notes
- `setTimeout` callback inside `dismissPopup` (line 46): excluded — anonymous arrow, nested inside setTimeout
- `setTimeout` callback inside `dismissPopup` (line 52): excluded — anonymous arrow, doubly nested
- `setTimeout` callback inside `showNext` (line 85): excluded — anonymous auto-dismiss arrow
- `addEventListener` callback for rap-dismiss-btn (line 87): excluded — anonymous event handler
- `addEventListener` callback for rap-challenge-btn (line 92): excluded — anonymous event handler
- `.then()` callback inside challenge handler (line 100): excluded — anonymous, nested inside excluded callback
- `.catch()` callback inside challenge handler (line 102): excluded — anonymous, nested inside excluded callback
