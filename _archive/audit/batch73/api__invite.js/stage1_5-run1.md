# Anchor List — invite.js

1. handler (line 19)

## Resolution notes

All five stage 1 agents unanimously identified the single exported async function handler at line 19 (`module.exports = async function handler(req, res)`). No other function definitions exist. Variable bindings (SUPABASE_URL, SUPABASE_ANON_KEY, APP_BASE, supabase) are correctly excluded as non-callable bindings.
