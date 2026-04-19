You are auditing a web app codebase. The file THE-MODERATOR-UI-INTERACTION-MAP.md in the repo root lists every screen (lettered A–BI) and every interactive element (numbered) in the app. Your job is to verify each one.

For EVERY numbered element in the map, do these checks:

1. **EXISTS** — Find the DOM element in the HTML or the JS/TS that creates it. Confirm the ID, class, or data-attribute matches.
2. **WIRED** — Confirm an addEventListener or event handler is attached. If using delegated events (data-action pattern), confirm the action string is handled in the delegation listener.
3. **WORKS** — Trace what the handler does. Does it call the right function? Does that function exist? Does it pass the right parameters?
4. **REACHABLE** — Can the user actually get to this element? Is the parent screen/overlay reachable via navigation? Is there a code path that shows/renders it?

Output format — for each screen letter, produce:
- ✅ Element # — one line summary (if all 4 checks pass)
- ⚠️ Element # — what's wrong (if any check fails)
- ❌ Element # — missing or completely broken

At the end, produce a summary:
- Total elements checked
- Total passing (✅)
- Total warnings (⚠️) with list
- Total broken (❌) with list

Key files to check:
- HTML pages: index.html, moderator-go.html, moderator-auto-debate.html, moderator-debate-landing.html, moderator-login.html, moderator-plinko.html, moderator-settings.html, moderator-profile-depth.html, moderator-groups.html, moderator-spectate.html, moderator-cosmetics.html, moderator-terms.html, moderator-privacy.html
- TypeScript modules: src/pages/*.ts, src/arena/*.ts, src/*.ts
- The UI map: THE-MODERATOR-UI-INTERACTION-MAP.md

Rules:
- Do NOT guess. If you can't find an element, say so.
- Do NOT skip screens. Go A through BI in order.
- If a handler calls an RPC, note the RPC name but don't verify Supabase — just confirm the client-side call exists.
- CSP is strict: no inline scripts, no unsafe-inline in script-src. Flag any inline JS you find.
- Flag any addEventListener on an element ID that doesn't exist in the HTML.
- Flag any data-action value that has no handler in the delegation listener.

Start with screen A and work through to BI. Take your time. Be thorough.
