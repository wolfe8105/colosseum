# Anchor List — arena-css-queue-match.ts

1. injectQueueMatchCSS  (line 5)

## Resolution notes
- No other top-level function definitions exist in this file. The module contains a single exported function that injects a `<style>` element; the inner statements (`const style = document.createElement(...)`, assignments, `document.head.appendChild(...)`) are inside the function body and are excluded per the rule against inner helpers/statements.
