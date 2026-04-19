# Anchor List — rivals-presence-popup.ts

1. destroy  (line 29)
2. dismissPopup  (line 38)
3. showNext  (line 57)
4. queueAlert  (line 107)

## Resolution notes
- `setTimeout` callback at line 46 inside `dismissPopup`: excluded — anonymous, nested
- `setTimeout` callback at line 52 inside `dismissPopup` (inner showNext chain): excluded — anonymous, doubly nested
- `setTimeout` callback at line 85 inside `showNext` (auto-dismiss): excluded — anonymous
- `addEventListener('click')` at line 87 for rap-dismiss-btn: excluded — anonymous event handler
- `addEventListener('click')` at line 92 for rap-challenge-btn: excluded — anonymous event handler
- `.then()` callback at line 100 inside challenge handler: excluded — anonymous, nested inside excluded callback
- `.catch()` callback at line 102 inside challenge handler: excluded — anonymous, nested inside excluded callback
