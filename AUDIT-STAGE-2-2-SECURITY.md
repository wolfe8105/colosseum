# STAGE 2.2 — ADVERSARIAL SECURITY SCAN
### Attack Plan Stage 2.2 | Run as a standalone CC session. Do NOT mix with 2.1 or 2.3.

---

## YOUR JOB

Put on the black hat. You are an attacker with full access to the source code and direct Supabase client access. Your goal is to find exploitable vulnerabilities, privilege escalation paths, XSS vectors, race conditions, and dormant vulnerabilities waiting to go live.

Run all 6 sub-steps below plus the LM hunting list. One combined report at the end.

Key files: `src/*.ts`, `src/pages/*.ts`, `src/arena/*.ts`, `api/*.js`, `supabase/functions/*/index.ts`

---

## 6 SUB-STEPS

**Step 1 — Attack surface map**
Read every file. List:
- Every `safeRpc()` / `supabase.rpc()` call: RPC name + which params come from user input (URL, localStorage, form, DOM)
- Every `.from().insert()`, `.from().update()`, `.from().delete()` — what data goes in, where it comes from
- Every place user input enters the system: forms, URL params, localStorage, postMessage, query strings
- Every place data renders into HTML: innerHTML, template literals, img src, href, data attributes set from Supabase data

**Step 2 — RPC security**
For every RPC call:
- Is the user verified logged-in before calling?
- Can params be tampered via DOM manipulation, URL params, or localStorage?
- Is the button disabled synchronously before the await?
- What happens on error — does the UI get stuck, or recover cleanly?

**Step 3 — XSS**
For every HTML render point:
- Is `escapeHTML()` called on all user-supplied strings before insertion?
- Are avatar URLs validated to `https://` only before rendering in `<img src>`?
- Are URL params reflected into HTML without sanitization?
- Is any `innerHTML` set with unescaped Supabase data?
- Check `api/challenge.html.js` and `api/profile.html.js` separately — these are server-rendered HTML, higher risk.

**Step 4 — Privilege escalation**
- Can an authenticated non-moderator call moderator-only RPCs?
- Can a group member call leader/co-leader RPCs?
- Can any client code reach `credit_tokens()`?
- Can User A affect User B's data (tokens, ELO, profile, debate scores)?
- Can a non-ranked user enter a ranked queue?
- Can a user below 25% profile depth enter a ranked debate?

**Step 5 — Race conditions**
For every RPC that modifies balances, counts, or status:
- Does the DB-side function use `FOR UPDATE` or `SELECT ... FOR UPDATE`?
- Can two browser tabs double-spend tokens?
- Can two users both win a single-winner operation (match accept, bounty claim)?
- Can `settle_stakes` / `settle_sentiment_tips` be called twice?

**Step 6 — Open redirects and injection**
- Any `returnTo` / `redirect` / `next` URL param validated before use?
- Any `window.location` set from user-controlled input?
- Is `?spectate=` UUID validated before it enters a Supabase query?
- Is `?id=` on any page validated before use?
- Any hardcoded API keys, tokens, or secrets in source files?

---

## LM HUNTING LIST — CHECK EVERY ONE OF THESE

**LM-010:** `arena_votes` — find where the vote button is rendered. Is it disabled synchronously on the first click before the await? If it can be clicked twice before response, flag as HIGH.

**LM-011:** `credit_tokens` — search entire `src/` for any direct call to `credit_tokens`. There must be zero. Only Stripe Edge Function (service_role) may call it.

**LM-012:** `debit_tokens` — for every token-spending action in the UI, confirm `token_balance` is read from `currentProfile` and checked against the cost BEFORE the RPC is called. If the RPC is called without a prior balance check in the client, flag it.

**LM-015:** `react_hot_take` — find the reaction button handler. Confirm: (a) button is disabled during RPC, (b) handler is debounced or has a guard variable, (c) toggling back-and-forth rapidly cannot desync the count.

**LM-016:** `declare_rival` — find where the Rival button renders. Confirm rival count is checked against 5-cap before showing the button. If button shows regardless of cap, flag as MEDIUM.

**LM-055:** `follows` table — find the follow RPC call. Can a user follow themselves? Check the RPC params — is `follower_id === following_id` possible? Check if there's a client-side guard.

**LM-086:** `submit_reference` / `forge_reference` — the token cost escalates (1 → 2 → 4 → 8...). Can the escalation be bypassed by calling the RPC directly with a crafted param? Check the RPC signature — is cost calculated server-side or passed by client?

**LM-110:** `ai-moderator` Edge Function — find `supabase/functions/ai-moderator/index.ts`. What happens when Anthropic API errors? Does it default to ALLOW ruling? If an attacker can trigger API errors (e.g. by crafting a reference that exceeds token limits), can they guarantee favorable rulings?

**LM-112:** `ruleOnReference` — find where `ruled_by_type` is set. When the AI mod rules, is `ruled_by_type` explicitly set to `'ai'`? Can a client call the ruling RPC with `ruled_by_type = 'human'` to forge a human ruling?

**LM-128:** Ranked debate requires 25% profile completion — find where `join_debate_queue` is called with `ranked: true`. Is the 25% check done client-side only, or is it enforced in the RPC? Client-side only = bypassable.

**LM-141:** RLS on `group_members` self-references `group_members` — this can cause infinite recursion. Has it been resolved? Find the policy and confirm there's no circular reference that could cause a query timeout or stack overflow.

**LM-142:** `returnTo` parameter — grep for `returnTo`, `redirect=`, `?next=` in all source files. For every occurrence, trace where the value goes. Is it validated to only allow relative paths or known domains? An unvalidated returnTo is an open redirect.

**LM-158:** `avatar_url` rendering — find every place `avatar_url` from Supabase is rendered into HTML. Is it always inside `<img src="...">` with a validated `https://` prefix? Can a `javascript:alert(1)` URL be stored and rendered?

**LM-182:** Double `settle_stakes` call — find `settle_stakes` in `src/arena/arena-room-end*.ts`. Is there any code path where it can be called twice for the same debate? Check both the normal end path and the error/timeout path.

**LM-193:** Realtime private channels — grep for `.channel(` in `src/`. For every private channel: is `setAuth(session.access_token)` called before `.subscribe()`? Missing setAuth means the subscription has no auth context — messages may be readable by unauthenticated subscribers.

**LM-207:** Bot/AI cite block — find `cite_debate_reference` RPC call in client. Can a human debater mark `is_bot = true` on their citation to get the bot-block treatment? Or can they forge an AI's UUID as the submitter?

---

## OUTPUT FORMAT

**Per finding:**
```
SEC-XX: [CRITICAL/HIGH/MEDIUM/LOW]
FILE: filename.ts:line
WHAT: One sentence describing the vulnerability
EXPLOIT: Exact steps an attacker takes to use this
CHAIN: Which other SEC findings combine with this one
FIX: The specific code change needed
```

**Summary block:**
```
SECURITY SUMMARY
CRITICAL: N
HIGH: N
MEDIUM: N
LOW: N

TOP 3 ATTACK CHAINS (findings that combine into catastrophic outcomes):
1. SEC-XX + SEC-YY = [what the combined exploit achieves]
2. ...
3. ...

LM SUMMARY
✅ Clean: N — list them
❌ Broken: N — list them with SEC reference number
```

---

## RULES

- Do NOT fix anything. Report only.
- Do NOT run wiring or timing checks — those are 2.1 and 2.3.
- Hunt immature vulnerabilities too — dead code with dangerous permissions, unfinished RPCs with open auth, things that become critical the moment someone wires them up.
- If you find a CRITICAL, flag it clearly at the top of the output before the full findings list.
- When done, save full output to `AUDIT-RESULTS-2-2-SECURITY.md` in repo root and push to GitHub.
