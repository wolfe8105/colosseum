# Anchor List — arena-room-live-input.ts (Run 1)

1. renderInputControls (line 9)

## Resolution notes
- No other top-level function definitions present in the file
- Inner callbacks passed to addEventListener (lines ~27-39, 51) are excluded — not top-level named bindings
- const bindings inside function body (inputArea, input, sendBtn, charCount) are excluded — not callable bindings
