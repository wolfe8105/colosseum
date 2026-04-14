# Anchor List — api/invite.js

1. handler  (line 17)

## Resolution notes
- `createClient` (line 11): import binding, not a function definition in this file — excluded.
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `APP_BASE` (lines 13–15): scalar constants, not function definitions — excluded.
- ip assignment with optional chaining (lines 27–29): inline expression, not a function definition — excluded.
- try/catch block contains no inner named function definitions — no further exclusions.
