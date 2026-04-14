# Anchor List — api/invite.js

1. handler  (line 17)

## Resolution notes
- `createClient` (line 11): excluded — require import binding, not a function definition in this module.
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `APP_BASE` (lines 13–15): excluded — scalar constant bindings, not function definitions.
- Inline expressions inside handler body (createClient call, supabase.rpc call, ip resolution): excluded — inner logic, not top-level definitions.
- try/catch block and its contents: excluded — inner logic within the exported handler.
