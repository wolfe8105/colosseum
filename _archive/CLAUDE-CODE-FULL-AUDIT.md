Read THE-MODERATOR-UI-INTERACTION-MAP.md in the repo root first. That file lists every screen (A–BI) and every interactive element. Then run these three passes in order against the full codebase. One combined report at the end.

Key files: index.html, moderator-*.html, src/*.ts, src/pages/*.ts, src/arena/*.ts.

---

PASS 1: WIRING CHECK

For EVERY numbered element in the UI Interaction Map:

1. EXISTS — Find the DOM element in HTML or the TS that creates it. Confirm ID, class, or data-attribute matches.
2. WIRED — Confirm an addEventListener or event handler is attached. For delegated events (data-action), confirm the action string is handled.
3. WORKS — Trace the handler. Does it call the right function? Does that function exist? Right parameters?
4. REACHABLE — Can the user get to this element? Is the parent screen reachable via navigation?

Also check:
- Any addEventListener on an element ID that doesn't exist in HTML
- Any data-action value with no handler in the delegation listener
- Any screen that exists in code but has no navigation path to reach it
- Any CSS that prevents scrolling (overflow:hidden on parents of scrollable content, height:100% chains trapping content)

---

PASS 2: ADVERSARIAL SECURITY SCAN

Step 1 — Attack surface: Read every file. List every supabase.rpc() / safeRpc() call (note RPC name + which params come from user input), every .from().insert/update/delete, every place user input enters (forms, URL params, localStorage, postMessage), every place data renders into HTML (innerHTML, template literals, img src, href).

Step 2 — RPC security: For every RPC call: Is the user verified logged in before calling? Could params be tampered (DOM, URL, localStorage)? Is the button disabled on first click? What happens on error?

Step 3 — XSS: For every HTML render point: Is escapeHTML() called on user strings? Avatar URLs validated (https:// only)? URL params reflected without sanitization? innerHTML with unescaped Supabase data?

Step 4 — Privilege escalation: Can non-moderators call mod functions? Can members call leader functions? Can anyone reach credit_tokens? Can User A affect User B?

Step 5 — Race conditions: For RPCs that modify balances/counts/status: Does it use FOR UPDATE? Could two tabs double-spend? Could two users both succeed at a single-winner operation?

Step 6 — Open redirects: Any returnTo/redirect/next URL params validated? Any window.location set from user input? Is ?spectate= UUID validated?

---

PASS 3: FAILURE AND TIMING

Check 1 — Double-tap: For every button click handler: Is the button disabled immediately before the await, or is there a synchronous guard variable? If neither, flag it. Focus on: vote buttons, queue join, token-spending, match accept/decline, follow/rival, modal buttons.

Check 2 — Polling leaks: For every setInterval, polling setTimeout, and Supabase .subscribe()/.on(): Is there a matching clearInterval/unsubscribe? Is cleanup called on navigation away? Can the interval be started twice (stacking)? Does a failed poll keep firing forever?

Check 3 — Async error handling: For every await rpc/fetch: Is the error checked? What does the user see on failure? Is loading state cleaned up in the error path? Can the user retry or is the UI stuck?

Check 4 — WebRTC failures: TURN credential fetch failure path? Peer connection timeout? ICE restart exhaustion? Mid-debate disconnect handling? Track/stream cleanup on call end?

Check 5 — Realtime subscription cleanup: Every .channel()/.subscribe() has matching removeChannel/unsubscribe? Cleanup on navigation? setAuth() before private channels? Double-subscribe prevention?

Check 6 — Navigation state corruption: Back button during async operation — does the response try to update removed DOM? Back from debate room — does endCurrentDebate fire? Manual URL change mid-state? Tab background/foreground — do polls resume, do connections survive?

Check 7 — Balance timing: Any read-then-write gaps where client checks balance then calls RPC (two tabs bypass)? Optimistic UI rollback on RPC failure?

---

OUTPUT FORMAT

One combined report with three sections:

WIRING FINDINGS
For each screen letter:
- ✅ Element # — one line (all checks pass)
- ⚠️ Element # — what's wrong
- ❌ Element # — missing or broken

SECURITY FINDINGS
SEC-XX: [CRITICAL/HIGH/MEDIUM/LOW]
FILE: filename.ts:line
WHAT: One sentence
EXPLOIT: How an attacker uses this
CHAIN: What other findings combine with this
FIX: Specific fix

TIMING FINDINGS
TIMING-XX: [CRITICAL/HIGH/MEDIUM/LOW]
FILE: filename.ts:line
CATEGORY: (double-tap | polling-leak | async-error | webrtc | realtime-sub | nav-corruption | balance-timing)
WHAT: One sentence
SCENARIO: How this fails in real use
FIX: Specific fix

SUMMARY
- Wiring: total checked, pass/warning/broken counts
- Security: Critical/High/Medium/Low counts, top 5 attack chains
- Timing: findings by category, top 5 most likely to hit a real user
