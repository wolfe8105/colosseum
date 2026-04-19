# Stage 1 Outputs — cards.helpers.ts

## Agent 01
- `truncLabel` (line 20) — Truncates an unknown value to a string of at most `max` characters, appending an ellipsis if trimmed.
- `roundRect` (line 24) — Draws a rounded rectangle path on a 2D canvas context using the given coordinates, dimensions, and corner radius.
- `wrapText` (line 46) — Splits a text string into word-wrapped lines capped at 3, truncating the last line with an ellipsis if needed.
- `validateSize` (line 68) — Returns the input string as a `CardSize` if it is a valid size key, otherwise falls back to `'og'`.

## Agent 02
- `truncLabel` (line 13) — Converts a value to string and truncates it to `max` characters, appending an ellipsis if too long.
- `roundRect` (line 18) — Draws a rounded rectangle path on a Canvas 2D context using arc/line commands.
- `wrapText` (line 45) — Splits text into word-wrapped lines capped at 3, appending an ellipsis to the last line if truncated.
- `validateSize` (line 66) — Validates a size string against known card sizes and returns it as `CardSize`, falling back to `'og'`.

## Agent 03
- `truncLabel` (line 10) — Truncates an unknown value to a string of at most `max` characters, appending an ellipsis if trimmed.
- `roundRect` (line 15) — Draws a rounded rectangle path on a Canvas 2D context using the given position, dimensions, and corner radius.
- `wrapText` (line 38) — Splits a text string into word-wrapped lines constrained by `maxWidth`, capping output at 3 lines with a trailing ellipsis if needed.
- `validateSize` (line 57) — Returns the given size string as a `CardSize` if it is valid, otherwise falls back to `'og'`.

## Agent 04
- `truncLabel` (line 6) — Truncates an unknown value to a string of at most `max` characters, appending an ellipsis if trimmed.
- `roundRect` (line 11) — Draws a rounded rectangle path on a canvas 2D context using the given position, dimensions, and corner radius.
- `wrapText` (line 28) — Splits a text string into at most 3 wrapped lines based on a max pixel width, truncating the last line with an ellipsis if overflow occurs.
- `validateSize` (line 49) — Validates a size string against known sizes and returns it as a `CardSize`, falling back to `'og'` if invalid or absent.

## Agent 05
- `truncLabel` (line 11) — Truncates an unknown value to a string of at most `max` characters, appending an ellipsis if needed.
- `roundRect` (line 16) — Draws a rounded rectangle path on a Canvas 2D context using the given position, dimensions, and corner radius.
- `wrapText` (line 38) — Splits a text string into wrapped lines respecting a max pixel width, capping output at 3 lines with trailing ellipsis.
- `validateSize` (line 63) — Returns the input as a `CardSize` if it is a valid size key, otherwise falls back to `'og'`.

## Note
Line numbers vary due to different comment density in agent prompts. Actual source line numbers: truncLabel (19), roundRect (24), wrapText (44), validateSize (69).
