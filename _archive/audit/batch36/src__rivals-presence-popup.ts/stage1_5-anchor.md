# Anchor List — rivals-presence-popup.ts

Source: src/rivals-presence-popup.ts
Produced by: stage 1.5 (arbiter + reconciliation)
Unresolved items: 0

1. destroy  (line 29)
2. dismissPopup  (line 38)
3. showNext  (line 57)
4. queueAlert  (line 107)

## Resolution notes

- All setTimeout callbacks (lines 46, 52, 85): inner anonymous arrows — excluded.
- addEventListener callbacks for rap-dismiss-btn and rap-challenge-btn (lines 87, 92): inner event handlers — excluded.
- .then() and .catch() callbacks inside challenge handler (lines 100, 102): inner promise handlers — excluded.
