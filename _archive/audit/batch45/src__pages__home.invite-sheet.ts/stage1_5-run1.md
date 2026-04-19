# Anchor List — home.invite-sheet.ts

1. openClaimSheet  (line 14)

## Resolution notes

`openClaimSheet` — top-level exported async function declaration at module scope. All inner arrow functions (`close`, overlay click handler, cancel click handler, forEach callback, async btn click handler) excluded as closure-scoped, not module-level. No interfaces, type aliases, enums, or plain constant declarations at module scope.
