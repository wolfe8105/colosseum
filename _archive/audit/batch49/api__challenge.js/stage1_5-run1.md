# Anchor List — challenge.js

1. handler  (line 27)

## Resolution notes

All five agents agreed: `module.exports = async function handler(req, res) { ... }` (lines 27–85) is the sole function definition. `buildChallengeHtml` and `buildExpiredHtml` are imported helpers. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `BASE_URL` are scalar const bindings. No inner functions qualify.
