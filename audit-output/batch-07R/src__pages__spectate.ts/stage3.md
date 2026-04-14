# Stage 3 Outputs — spectate.ts

## Agent 01

Now I have all the material needed. Let me produce the verdict by checking each claim against the source.

---

## Verification Report: `src/pages/spectate.ts`

The source file (`spectate.ts`) contains exactly three functions: `startPolling` (line 22), `loadDebate` (line 90), and the IIFE `init` (line 224). All five agents described all three functions. Below are the verdicts.

---

### startPolling (line 22)

**Verification**: PASS

**Findings**:

All five agents described this function accurately. Specific cross-agent claims verified against source:

- **Async, returns `Promise<void>`**: PASS. Declaration is `async function startPolling(): Promise<void>` (line 22).
- **Clears existing timer on entry**: PASS. `if (state.pollTimer) clearInterval(state.pollTimer);` (line 23).
- **Assigns new interval to `state.pollTimer` at 5000ms**: PASS. `state.pollTimer = setInterval(async () => { ... }, 5000);` (lines 24/87).
- **Awaits `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`**: PASS (line 27).
- **RPC error/null-data fallback to direct PostgREST query on `arena_debates` via `state.sb`, `.select('*').eq(...).single()`**: PASS (line 29).
- **Fallback constructs `SpectateDebate` with debater names from `state.debateData` or `'Side A'`/`'Side B'`**: PASS (lines 31-32).
- **Returns early if `freshDebate` is still null**: PASS (line 36).
- **Writes `String(Number(freshDebate.spectator_count) || 1)` to `#spectator-count` textContent**: PASS (lines 39-40).
- **Reads `vote_count_a` / `vote_count_b`, calls `updateVoteBar` and `updatePulse` if either is nonzero/truthy**: PASS (lines 43-48). The condition is `if (freshVA || freshVB)` (line 45) — agents variously said "nonzero" or "truthy"; both are accurate characterizations of the same JS truthiness check.
- **Message fetch via `safeRpc('get_debate_messages')`, catch falls back to direct query on `debate_messages` ordered by `round` then `created_at`, limit 100**: PASS (lines 52-58). Agent 01 specified `order('round').order('created_at')` without `ascending` flags — the source at line 56 uses `.order('round').order('created_at')` with no options, consistent with default ordering. All other agents said "ordered by round then created_at"; PASS.
- **New message rendering logic: slices from `state.lastRenderedMessageCount`, calls `renderMessages`, checks 80px scroll threshold, `insertAdjacentHTML('beforeend', ...)`, updates `state.lastRenderedMessageCount`, smooth scroll if at bottom**: PASS (lines 63-69).
- **Terminal status check for `'complete'`, `'completed'`, `'cancelled'`, `'canceled'`**: PASS (line 75).
- **On terminal status: clears `state.pollTimer`, nulls it, clears `state.chatPollTimer` if set, writes `state.debateData`, calls `renderSpectateView(freshDebate, allMessages)`, fire-and-forgets `import('../onboarding-drip.ts').then(triggerDripDay(3)).catch(() => {})`**: PASS (lines 76-83).
- **Outer `try/catch` logs warning, does not rethrow**: PASS (lines 84-86, `console.warn('[Spectate] Poll error:', err)`).

**Unverifiable claims**: None.

---

### loadDebate (line 90)

**Verification**: PARTIAL

**Findings**:

- **Async, returns `Promise<void>`, entire body in `try/catch`**: PASS (lines 90-219).
- **Outer catch calls `console.error` and `showError` with error message**: PASS (lines 216-218). All agents stated this; confirmed.
- **Awaits `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`**: PASS (line 93).
- **RPC error triggers three-level fallback chain**: PASS (lines 95-132). All agents described this accurately.
- **First fallback: direct PostgREST with profile joins via foreign key aliases**: PASS (lines 97-101).
- **Second fallback (bare `select('*')`) if first fails; calls `showError` and returns if also fails**: PASS (lines 105-114).
- **Bare query success: builds `SpectateDebate` with `'Side A'`/`'Side B'` and elo 1200**: PASS (lines 115-119).
- **Profile-joined success: extracts `display_name || username || 'Side A'` etc.**: PASS (lines 121-131).
- **null rpcData (no error): calls `showError('Debate not found or has been removed.')` and returns**: PASS (lines 133-135).
- **Writes `state.debateData = debate`**: PASS (line 140).
- **Checks `debate.status === 'live'`, redirects to `'/?spectate=' + encodeURIComponent(state.debateId!)` and returns**: PASS (lines 143-146).
- **Sets `document.title`, updates `og:title` and `og:description` meta elements**: PASS (lines 149-154).
- **Three fire-and-forget `safeRpc` calls: `bump_spectator_count`, `log_debate_watch`, `log_event` (type `'spectate_view'`), each with `.catch` warning log**: PASS (lines 157-163).
- **Message load via `safeRpc('get_debate_messages')`, catch fallback to direct `debate_messages` query with ascending `round` and `created_at`, limit 100**: PARTIAL for Agent 03 only. Agent 03 stated the fallback direct query is "ordered ascending by `round` and `created_at`". The source at line 175-176 specifies `{ ascending: true }` on both orders, which is consistent. However, in `startPolling`'s fallback (line 56), no `ascending` option is provided. The `loadDebate` fallback (lines 171-178) does use explicit ascending options. Agent 03's description of `loadDebate`'s fallback is accurate. Agents 01/02/04/05 said "ordered by round then created_at" without specifying direction; this is also accurate for `loadDebate`. PASS for all five on this point.
- **Spectator chat load via `safeRpc('get_spectator_chat', { p_debate_id: ..., p_limit: 100 })`, sets `state.chatMessages`, sets `state.lastChatMessageAt` to last element's `created_at` if non-empty, catch sets `state.chatMessages = []`**: PASS (lines 182-190).
- **Replay data load if `debate.status === 'complete'` or `'completed'`**: PARTIAL. The source checks `const isComplete = debate.status === 'complete' || debate.status === 'completed';` (line 193). All agents described only these two statuses. This is PASS — the source does not check `'cancelled'`/`'canceled'` here. Confirmed accurate.
- **`renderSpectateView(debate, messages)` called after all data loading**: PASS (line 206).
- **Live-status check for `'live'`, `'pending'`, `'round_break'`, `'voting'` calls `startPolling()` and `startChatPolling()` (not awaited); otherwise calls `nudge('replay_entry', '...')`**: PASS (lines 209-215).

  - PARTIAL finding: Agents 01, 02, 03, 04, and 05 all described `startPolling()` and `startChatPolling()` as "neither awaited" / "fire-and-forget." This is accurate. However, none of the agents noted that the nudge string contains a Unicode emoji (`'\uD83D\uDC41\uFE0F Watching the replay...'`). This is a minor omission in description rather than an inaccuracy; not a FAIL.

- **Agent 01 specific**: States `startPolling()` and `startChatPolling()` are called "as synchronous calls (both return promises that are not awaited — fire-and-forget)." This is slightly misleading phrasing ("synchronous calls" is not quite right — they're async functions being called without `await`) but the functional characterization ("promises not awaited") is accurate. PARTIAL on wording, not substance.

**Unverifiable claims**: None.

---

### init (line 224)

**Verification**: PARTIAL

**Findings**:

- **Async IIFE, pattern `(async function init() { ... })()`**: PASS (line 224).
- **Not externally callable**: PASS. The function name `init` is scoped to the IIFE expression only.
- **Awaits `ready` imported from `auth.ts`**: PASS (line 227).
- **Sets `state.sb = getSupabaseClient()`**: PASS (line 228).
- **Sets `state.app = document.getElementById('app')`**: PASS (line 229).
- **Sets `state.loading = document.getElementById('loading')`**: PASS (lines 229/254-255 — confirmed both are set at lines 229-230).
- **Sets `state.isLoggedIn = !!(getCurrentUser() && !getIsPlaceholderMode())`**: PASS (line 231).
- **Attaches click listener to `#back-btn`; checks `document.referrer` for `location.host`, calls `history.back()` or navigates to `'/'`**: PASS (lines 234-240).
- **Calls `getCurrentUser()` a second time; if truthy, finds `#join-btn` and sets `display = 'none'`**: PASS (lines 243-246).
- **Reads `id` param from `URLSearchParams(window.location.search)`**: PASS (lines 249-250).
- **UUID regex validation on `debateId` if present**: PASS (line 253, pattern `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`).
- **UUID failure: writes `'<div class="error-state">Invalid debate link.</div>'` to `state.app.innerHTML`, hides `state.loading`, returns**: PASS (lines 254-257). All five agents described this correctly.
- **null/absent `debateId`: writes different error message with home link to `state.app.innerHTML`, hides `state.loading`, returns**: PASS (lines 259-263). The source uses `state.app.innerHTML = '<div class="error-state">No debate ID provided.<br><a href="/" style="color:var(--gold);">Back to Home</a></div>'`.
- **Writes `state.debateId = debateId`**: PASS (line 265).
- **Registers `beforeunload` listener on `window` that calls `clearInterval` on both `state.pollTimer` and `state.chatPollTimer` if either is set**: PASS (lines 268-271).
- **Calls `loadDebate()` without awaiting**: PASS (line 274). Source shows `loadDebate();` with no `await`.

  PARTIAL: Agents 01 and 02 describe `loadDebate()` as running "concurrently" from `init`'s perspective. This is accurate — the call is not awaited. However, `init` itself has no more code after `loadDebate()`, so it immediately returns void. The framing as "concurrent" is technically accurate but no other work is racing it. This is not a FAIL.

**Unverifiable claims**: None.

---

## Cross-Agent Consensus Summary

**Overall verdicts by function:**

| Function | Verdict | Notes |
|---|---|---|
| `startPolling` | PASS | All five agents fully accurate. No substantive discrepancies. |
| `loadDebate` | PARTIAL | One minor wording issue (Agent 01 calls `startPolling`/`startChatPolling` "synchronous calls," which mischaracterizes async functions invoked without await). All structural, control-flow, and data claims are correct. |
| `init` | PARTIAL | Minor only: no agent flagged that the UUID-check block and null-check block run in sequential `if` / `if` form (not `if`/`else if`), but the described order of evaluation is still accurate since the null check cannot fire if the UUID check already returned. |

**Counts:**
- PASS: 1 function (startPolling)
- PARTIAL: 2 functions (loadDebate, init)
- FAIL: 0 functions

**Cross-agent disagreements:** None. All five agents agreed on all substantive facts for all three functions. The only differences were in phrasing depth (e.g., Agent 01 was more verbose on `startPolling`'s inner logic) and minor framing choices ("synchronous call" vs. "not awaited"). No agent contradicted another on any factual point.

---

## needs_review

The following source behaviors were not described by any Stage 2 agent and may be worth flagging:

1. **`startPolling` fallback direct query lacks ascending options** (line 56): The `debate_messages` fallback in `startPolling`'s interval callback uses `.order('round').order('created_at')` with no `{ ascending: true }` flag (unlike the same fallback in `loadDebate` at lines 175-176). This could produce different sort behavior between the two call sites. No agent noted this discrepancy.

2. **`loadDebate` live-redirect runs before OG/title update and before fire-and-forget RPCs** (lines 143-146): When `debate.status === 'live'`, the function redirects and returns immediately — it never fires `bump_spectator_count`, `log_debate_watch`, or `log_event`. All agents described the redirect accurately but did not explicitly call out the consequence that these three RPCs are skipped on live debates.

3. **`init` does not guard `state.app.innerHTML` write for UUID failure if `state.app` is null** (line 254): The guard is `if (state.app) state.app.innerHTML = ...`. This is correct guarding, but `state.loading` is also conditionally guarded at line 255. Agents 02 and 04 noted the conditional guard; agents 01, 03, and 05 did not explicitly mention it.

---

## Agent 02

Here is the full verification against `/src/pages/spectate.ts` (276 lines).

---

## Verification

### startPolling (line 22)

**Verification**: PASS

**Findings**:
- All five agents agree on the function signature (`async`, returns `Promise<void>`). PASS — line 22: `async function startPolling(): Promise<void>`.
- All agents claim: reads `state.pollTimer`, clears it if truthy, then writes a new interval ID. PASS — lines 23–24.
- All agents claim: interval fires every 5000ms. PASS — line 87: `, 5000)`.
- All agents claim: awaits `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`. PASS — line 27.
- All agents claim: on RPC error or null data, falls back to direct `state.sb!.from('arena_debates').select('*').eq(...).single()`. PASS — lines 28–29.
- All agents claim: on fallback success, constructs `SpectateDebate` with `debater_a_name`/`debater_b_name` from `state.debateData` or `'Side A'`/`'Side B'`. PASS — lines 31.
- All agents claim: if `freshDebate` still null, returns early. PASS — line 36.
- All agents claim: reads `#spectator-count` DOM element, sets `textContent` to `String(Number(freshDebate.spectator_count) || 1)`. PASS — lines 39–40.
- All agents claim: reads `vote_count_a` and `vote_count_b`, calls `updateVoteBar` and `updatePulse` if either is truthy. PASS — lines 43–48.
- All agents claim: awaits `safeRpc('get_debate_messages', ...)` for messages, with catch fallback to direct query on `debate_messages` ordered by `round` then `created_at`, limit 100. PASS — lines 52–58. (Agent 01 uniquely and correctly notes the direct fallback orders by `round` then `created_at` — line 56 confirms this with two `.order()` chains, though without explicit `ascending` option unlike `loadDebate`.)
- All agents claim: if new messages, slices, calls `renderMessages`, checks scroll within 80px, `insertAdjacentHTML('beforeend', ...)`, updates `state.lastRenderedMessageCount`, conditionally scrolls smooth. PASS — lines 60–69.
- All agents claim: on status `'complete'`/`'completed'`/`'cancelled'`/`'canceled'`: clears `pollTimer`, clears `chatPollTimer` if set, writes `state.debateData`, calls `renderSpectateView`, dynamic imports `onboarding-drip.ts` calling `triggerDripDay(3)`. PASS — lines 75–82.
- All agents claim: outer `try/catch` logs warning. PASS — lines 84–86.

**Unverifiable claims**: None.

---

### loadDebate (line 90)

**Verification**: PARTIAL

**Findings**:
- All agents agree: `async`, returns `Promise<void>`, entire body in `try/catch`. PASS.
- All agents agree: outer catch calls `console.error` and `showError`. PASS — lines 216–218.
- All agents agree: initial `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`. PASS — line 93.
- All agents agree: on `rpcErr` truthy, falls back to profile-joined query, then bare query, then `showError` + return. PASS — lines 95–119.
- All agents agree: on `rpcData` null (no error), calls `showError('Debate not found or has been removed.')` and returns. PASS — lines 133–135.
- All agents agree: after obtaining `debate`, writes `state.debateData = debate`. PASS — line 140.
- All agents agree: checks `debate.status === 'live'`, redirects to `'/?spectate=' + encodeURIComponent(state.debateId!)` and returns. PASS — lines 143–146.
- All agents agree: updates `document.title`, `og:title`, `og:description`. PASS — lines 149–154.
- All agents agree: three fire-and-forget `safeRpc` calls: `bump_spectator_count`, `log_debate_watch`, `log_event`. PASS — lines 157–163.
- Agent 03 says only two fire-and-forget RPC calls initially ("two fire-and-forget `safeRpc` calls — `bump_spectator_count` and `log_debate_watch`"), then separately mentions the third. The source clearly has all three in a row (lines 157–163). This is a PARTIAL for Agent 03 only — the description is ultimately complete but the two/three split is slightly misleading structure-wise.
- All agents agree: message load via `safeRpc('get_debate_messages', ...)` with direct fallback ordered by `round` ascending, `created_at` ascending, limit 100. PASS — lines 167–179. (The source explicitly includes `ascending: true` on both orders, lines 175–176.)
- All agents agree: spectator chat loaded via `safeRpc('get_spectator_chat', { p_debate_id: state.debateId, p_limit: 100 })`. PASS — line 183.
- All agents agree: on chat success, writes `state.chatMessages`, sets `state.lastChatMessageAt` from last element if array non-empty. PASS — lines 184–187.
- All agents agree: on chat catch, sets `state.chatMessages = []`. PASS — line 189.
- All agents agree: checks `debate.status` for `'complete'` or `'completed'` to load replay data. PASS — lines 193–204.
- **PARTIAL — all agents**: The `isComplete` check at line 193 uses `debate.status === 'complete' || debate.status === 'completed'` with a local variable `isComplete`. Stage 2 agents all correctly describe the two status values checked, but none mentions the `isComplete` local variable binding — this is a minor structural omission rather than a substantive error.
- All agents agree: calls `renderSpectateView(debate, messages)`. PASS — line 206.
- All agents agree: status check for `'live'`/`'pending'`/`'round_break'`/`'voting'` → `startPolling()` + `startChatPolling()` vs `nudge(...)`. PASS — lines 209–215.
- Agent 01 says `startPolling()` and `startChatPolling()` are "synchronous calls (both return promises that are not awaited)". The source shows them called without `await` — PASS, both are called without awaiting.
- `nudge` string: All agents describe it with a fixed string. The source at line 214 uses `'\uD83D\uDC41\uFE0F Watching the replay. Judge for yourself.'` (the eye emoji + text). Agents that quote the text are accurate. Agents that say "a fixed string" without quoting it are technically correct if imprecise — not a FAIL.

**Unverifiable claims**: None.

---

### init (line 224)

**Verification**: PARTIAL

**Findings**:
- All agents agree: async IIFE declared as `(async function init() { ... })()`. PASS — line 224.
- All agents agree: awaits `ready` from `auth.ts` first. PASS — line 227.
- All agents agree: writes `state.sb = getSupabaseClient()`, `state.app`, `state.loading`, `state.isLoggedIn`. PASS — lines 228–231.
- All agents agree: attaches `click` listener to `#back-btn`. PASS — line 234.
- All agents agree: `back-btn` handler checks `document.referrer` for `location.host`, calls `history.back()` or navigates to `'/'`. PASS — lines 235–239.
- All agents agree: `getCurrentUser()` called a second time; if truthy, hides `#join-btn`. PASS — lines 243–246.
- All agents agree: reads `id` query parameter from `window.location.search` via `URLSearchParams`. PASS — lines 249–250.
- All agents agree: UUID regex tested on `debateId` if present; failure → writes error to `state.app.innerHTML`, hides `state.loading`, returns. PASS — lines 253–257.
- **PARTIAL — all agents on UUID-invalid path**: Source code at lines 254–257 checks `if (state.app)` before writing to `state.app.innerHTML` and `if (state.loading)` before hiding it. Agents 01 and 02 say "writes an error message to `state.app.innerHTML`, sets `state.loading.style.display = 'none'` on each **if those elements exist**" — PASS for Agents 01 and 02. Agents 03, 04, and 05 do not explicitly call out the conditional guard: PARTIAL for those three.
- All agents agree: if `debateId` absent → writes different error (with home link) to `state.app.innerHTML`, hides loading, returns. PASS — lines 259–263.
- All agents agree: writes `state.debateId = debateId`. PASS — line 265.
- All agents agree: registers `beforeunload` on `window` clearing both `pollTimer` and `chatPollTimer`. PASS — lines 268–271.
- All agents agree: calls `loadDebate()` without awaiting. PASS — line 274.
- Agent 05 states `init` is "declared at line 224." PASS — confirmed line 224.
- **PARTIAL — Agents 03/04/05 on `back-btn` listener**: All agents note the click listener is only attached if the element exists (optional chaining `?.addEventListener`). Source line 234: `document.getElementById('back-btn')?.addEventListener(...)` — this is optional chaining, so the listener is silently skipped if the element is absent. Agents 01 and 02 explicitly note "if present" / "if it exists". Agents 03, 04, and 05 omit this conditionality — PARTIAL for those three.

**Unverifiable claims**: None.

---

## Cross-Agent Consensus Summary

| Function | Overall Verdict | Notes |
|---|---|---|
| `startPolling` | PASS | All 5 agents: complete and accurate. No disagreements between agents. |
| `loadDebate` | PARTIAL | All 5 agents accurate on logic; minor omissions: Agent 03's framing of 2-then-1 fire-and-forget RPC calls vs. 3-in-sequence; no agent mentions the `isComplete` local variable binding. |
| `init` | PARTIAL | Agents 01 and 02 more precise about the conditional guards on `state.app` / `state.loading` and the optional chaining on `back-btn`; Agents 03/04/05 omit both. |

**Counts across all 15 function-agent pairs** (5 agents × 3 functions):
- PASS: 5 (`startPolling` for all 5 agents)
- PARTIAL: 10 (`loadDebate` × 5 agents, `init` × 5 agents)
- FAIL: 0

No agent made a claim directly contradicted by the source. All discrepancies were omissions or imprecision rather than wrong assertions.

---

## needs_review

The following source behaviors were not described by any Stage 2 agent:

1. **`startPolling` direct-fallback message query lacks explicit `ascending` option** (line 56): The `debate_messages` fallback inside `startPolling` calls `.order('round').order('created_at')` with no `ascending` option, whereas the equivalent fallback in `loadDebate` (line 175–176) explicitly passes `{ ascending: true }` to both orders. No agent noted this inconsistency. Depending on the DB default sort, this could produce different orderings between the initial load and polling updates.

2. **`loadDebate` `isComplete` variable** (line 193): The status check for replay data uses a local `const isComplete = debate.status === 'complete' || debate.status === 'completed'`. No agent mentioned this variable; all described the logic as an inline check. Functionally equivalent but structurally distinct.

3. **`init` UUID-invalid path uses conditional guards** (lines 254–257): `if (state.app)` and `if (state.loading)` guard the error writes. Agents 03, 04, and 05 do not mention these guards. If `state.app` or `state.loading` are null (e.g., DOM not yet ready or wrong page), the UUID-invalid error message is silently swallowed. Worth noting as a robustness gap.

---

## Agent 03

Now I have all the material needed. Let me produce the verdict by checking each claim against the source.

---

## Verification Report: `src/pages/spectate.ts`

---

### startPolling (line 22)

**Verification**: PASS
**Findings**:

All five agents described this function in substantial agreement with the source. Specific claims verified:

- PASS: Async, returns `Promise<void>`. Source: `async function startPolling(): Promise<void>` (line 22).
- PASS: Reads `state.pollTimer`; calls `clearInterval` on it if set before reassigning. Source lines 23-24.
- PASS: Assigns new interval to `state.pollTimer` via `setInterval(..., 5000)`. Source line 24.
- PASS: First tries `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`. Source line 27.
- PASS: On RPC error or null data, falls back to direct PostgREST query on `arena_debates` via `state.sb`, selecting `'*'`, filtered by `state.debateId`, using `.single()`. Source lines 29-31.
- PASS: Fallback constructs `SpectateDebate` with `debater_a_name`/`debater_b_name` from `state.debateData` or `'Side A'`/`'Side B'` defaults. Source line 31.
- PASS: If `freshDebate` still null, returns early. Source line 36.
- PASS: Reads DOM element `spectator-count`, sets `textContent` to `String(Number(freshDebate.spectator_count) || 1)`. Source lines 39-40.
- PASS: Reads `vote_count_a` and `vote_count_b`, calls `updateVoteBar` and `updatePulse` if either is truthy. Source lines 43-48.
- PASS: Fetches messages with `safeRpc('get_debate_messages', ...)` inside nested try/catch; catch falls back to direct `debate_messages` query ordered by `round` then `created_at`, limit 100. Source lines 52-58.
- PASS: If `allMessages.length > state.lastRenderedMessageCount`, slices new messages, calls `renderMessages`, checks 80px scroll threshold, calls `insertAdjacentHTML('beforeend', ...)`, updates `state.lastRenderedMessageCount`, conditionally calls `scrollTo` with smooth behavior. Source lines 63-69.
- PASS: Checks status against `'complete'`, `'completed'`, `'cancelled'`, `'canceled'`. Source line 75.
- PASS: On terminal status: clears `state.pollTimer`, nulls it, clears `state.chatPollTimer` if set, writes `state.debateData = freshDebate`, calls `renderSpectateView(freshDebate, allMessages)`, fires dynamic import of `'../onboarding-drip.ts'` calling `triggerDripDay(3)` fire-and-forget. Source lines 76-82.
- PASS: Outer `catch` logs a warning (`console.warn`). Source lines 84-86.

**Unverifiable claims**: None.

---

### loadDebate (line 90)

**Verification**: PARTIAL
**Findings**:

- PASS: Async, returns `Promise<void>`. Source: `async function loadDebate(): Promise<void>` (line 90).
- PASS: Entire body wrapped in `try/catch`; catch calls `console.error` and `showError` with the error message. Source lines 216-219.
- PASS: Awaits `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`. Source line 93.
- PASS: If `rpcErr` truthy, falls back to direct PostgREST query joining both debater profiles via foreign-key aliases. Source lines 97-100.
- PASS: If that query also errors or returns no data, second fallback issues bare `select('*')` on `arena_debates`. Source lines 104-109.
- PASS: If bare query fails, calls `showError` and returns early. Source lines 111-113.
- PASS: If bare query succeeds, builds `SpectateDebate` with placeholder names and elo 1200. Source lines 115-119.
- PASS: If profile-joined query succeeds, extracts `display_name || username || 'Side A/B'`, elo, avatar. Source lines 121-131.
- PASS: If `rpcData` is null with no error, calls `showError('Debate not found or has been removed.')` and returns. Source lines 133-135.
- PASS: If RPC succeeded with data, `debate = rpcData`. Source line 137.
- PASS: Writes `state.debateData = debate`. Source line 140.
- PASS: Checks `debate.status === 'live'`, redirects to `'/?spectate=' + encodeURIComponent(state.debateId!)` and returns. Source lines 143-146.
- PASS: Updates `document.title`, `og:title`, and `og:description` meta elements. Source lines 149-154.
- PASS: Fires three fire-and-forget `safeRpc` calls: `bump_spectator_count`, `log_debate_watch`, `log_event` with `p_event_type: 'spectate_view'`. Each has `.catch(...)` logging a warning. Source lines 157-163.
- PASS: Loads messages via `safeRpc('get_debate_messages', ...)` in try/catch, falling back to direct `debate_messages` query ordered ascending by `round` then `created_at`, limit 100. Source lines 167-179.
- PASS: Loads chat via `safeRpc('get_spectator_chat', { p_debate_id: state.debateId, p_limit: 100 })` in try/catch; writes `state.chatMessages`, sets `state.lastChatMessageAt` from last element's `created_at` if non-empty; on catch sets `state.chatMessages = []`. Source lines 182-190.
- PASS: Checks `debate.status` for `'complete'` or `'completed'` to load replay data. Source line 193.
- **PARTIAL — all agents**: The `isComplete` check at line 193 uses `debate.status === 'complete' || debate.status === 'completed'` with a local variable `isComplete`. Stage 2 agents all correctly describe the two status values checked, but none mentions the `isComplete` local variable binding — this is a minor structural omission rather than a substantive error.
- PASS: If complete, awaits `safeRpc('get_debate_replay_data', { p_debate_id: state.debateId })` in try/catch, writes `state.replayData` on success; on catch logs warning and sets `state.replayData = null`. Source lines 195-203.
- PASS: Calls `renderSpectateView(debate, messages)`. Source line 206.
- PASS: Checks status against `'live'`, `'pending'`, `'round_break'`, `'voting'`; calls `startPolling()` and `startChatPolling()` (not awaited) if true; calls `nudge('replay_entry', ...)` otherwise. Source lines 209-214.

- PARTIAL: Agent 01 and Agent 02 describe `startPolling()` and `startChatPolling()` as "fire-and-forget" at this call site. This is accurate — neither is awaited (lines 211-212). However all agents omit that the live redirect (line 143-146) occurs **before** `bump_spectator_count` is called, meaning for live debates the spectator count is **not** bumped and messages/chat are **not** loaded via this path. Only Agents 01 and 02 mention this redirect structure at all; agents 03-05 describe it but none call out the consequence. This is a minor incompleteness, not a factual error, so PARTIAL rather than FAIL.

- PARTIAL (Agent 03 only): Agent 03 writes "It then issues **two** fire-and-forget `safeRpc` calls — `bump_spectator_count` and `log_debate_watch`… A third fire-and-forget `safeRpc('log_event', ...)`". This is factually complete but the phrasing segregates the third call oddly, implying it may differ structurally. All three are `.catch()`-guarded fire-and-forgets on lines 157–163. No real inaccuracy, but slightly misleading framing.

**Unverifiable claims**: None.

---

### init (line 224)

**Verification**: PASS
**Findings**:

All five agents described this function in substantial agreement with the source. Specific claims verified:

- PASS: Async IIFE, `(async function init() { ... })()`. Source line 224.
- PASS: Awaits `ready` promise imported from `auth.ts`. Source line 227.
- PASS: Writes `state.sb = getSupabaseClient()`, `state.app = document.getElementById('app')`, `state.loading = document.getElementById('loading')`, `state.isLoggedIn` via `getCurrentUser()` and `getIsPlaceholderMode()`. Source lines 228-231.
- PASS: Attaches `click` listener to `#back-btn`; listener checks `document.referrer` for `location.host`, calls `history.back()` or navigates to `'/'`. Source lines 234-240.
- PASS: Calls `getCurrentUser()` a second time; if truthy, reads `#join-btn` and sets `display = 'none'`. Source lines 243-246.
- PASS: Reads `id` parameter from `window.location.search` via `URLSearchParams`. Source lines 249-250.
- PASS: If `debateId` present but fails UUID regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`, writes `'<div class="error-state">Invalid debate link.</div>'` to `state.app.innerHTML`, hides loading, returns. Source lines 253-257.
- PASS: If `debateId` absent, writes different error message with home link to `state.app.innerHTML`, hides loading, returns. Source lines 259-263.
- PASS: Writes `state.debateId = debateId`. Source line 265.
- PASS: Attaches `beforeunload` listener that clears both `pollTimer` and `chatPollTimer` if set. Source lines 268-271.
- PASS: Calls `loadDebate()` without awaiting. Source line 274.

**Unverifiable claims**: None.

---

## Cross-Agent Consensus Summary

| Function | PASS | PARTIAL | FAIL |
|---|---|---|---|
| `startPolling` | All claims PASS | — | — |
| `loadDebate` | Most claims PASS | 2 minor gaps | — |
| `init` | All claims PASS | — | — |

**Total verdicts across all functions:**
- PASS: ~45 individual claims
- PARTIAL: 2 (both in `loadDebate`)
- FAIL: 0

**Agent disagreements noted:**
- All five agents agreed closely on all three functions with no substantive disagreements. The only divergence was Agent 03's phrasing of the fire-and-forget RPC calls in `loadDebate` (split as "two then a third" rather than "three"), which is stylistically different but factually equivalent.
- Agents 01-04 all correctly identified both `startPolling()` and `startChatPolling()` as not awaited at their call site in `loadDebate`. Agent 05 also correctly describes them as not awaited.

---

## needs_review

1. **`loadDebate` live-redirect short-circuits all subsequent operations** (lines 143-146): When `debate.status === 'live'`, the function sets `window.location.href` and returns immediately. This means `bump_spectator_count`, `log_debate_watch`, `log_event`, message loading, chat loading, and polling are all skipped for live debates. No agent called this out explicitly as a behavioral consequence, though all described the redirect itself. This is a substantive runtime branch worth noting.

2. **`startPolling` fallback direct query omits ascending sort** (lines 29, 56): The fallback in `startPolling` for `arena_debates` uses `.select('*').eq('id', ...).single()` with no explicit sort. The fallback for `debate_messages` in `startPolling` uses `.order('round').order('created_at')` with no `ascending` argument, whereas `loadDebate`'s equivalent fallback explicitly passes `{ ascending: true }` (lines 175-176). No agent flagged this discrepancy. The omission of `ascending: true` in `startPolling`'s message fallback means sort order relies on Postgres defaults rather than an explicit ascending guarantee.

3. **`init` UUID validation uses `state.app.innerHTML` and `state.loading.style.display`** (lines 254-256): Both elements are written using optional-chaining guard (`if (state.app)` / `if (state.loading)`) rather than unconditional access. Agents described this correctly in substance; this is a confirmation of no missed guard clause.

---

## Agent 04

Here are the verdicts, function by function, across all five agents.

---

### startPolling (line 22)

**Verification**: PASS (with one minor cross-agent note — see below)
**Findings**:

- **Async, returns `Promise<void>`**: PASS. Source line 22: `async function startPolling(): Promise<void>`.
- **Clears existing `state.pollTimer` on entry if set**: PASS. Line 23: `if (state.pollTimer) clearInterval(state.pollTimer);`.
- **Assigns new interval ID to `state.pollTimer`, 5000ms period**: PASS. Lines 24–88: `state.pollTimer = setInterval(async () => { ... }, 5000);`.
- **Awaits `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`**: PASS. Line 27.
- **Falls back to direct PostgREST `select('*')` on `arena_debates` if RPC errors or returns no data**: PASS. Lines 29–31.
- **Constructs `SpectateDebate` with `state.debateData` name fallbacks or `'Side A'`/`'Side B'`**: PASS. Line 31.
- **Early return if `freshDebate` remains null**: PASS. Line 36: `if (!freshDebate) return;`.
- **Updates `#spectator-count` textContent to `String(Number(freshDebate.spectator_count) || 1)`**: PASS. Lines 39–40.
- **Reads `vote_count_a`/`vote_count_b`; calls `updateVoteBar` and `updatePulse` if either is truthy**: PASS. Lines 43–48.
- **Message fetch: tries `safeRpc('get_debate_messages', ...)`, falls back to direct `debate_messages` query ordered `round` then `created_at`, limit 100, on throw**: PASS. Lines 52–58. Note: the fallback is triggered by `catch(e)` (thrown exception), not by an error return value — Agents 01/02/04 say "if that throws" which is correct. Agent 03 says "falls back to a direct PostgREST query … if that throws" — also correct.
- **New-message rendering: slice, `renderMessages`, scroll-proximity check (80px), `insertAdjacentHTML('beforeend', ...)`, update `state.lastRenderedMessageCount`, conditional smooth scroll**: PASS. Lines 63–69.
- **Terminal-status check: `'complete'`, `'completed'`, `'cancelled'`, `'canceled'`**: PASS. Line 75.
- **On terminal status: clears both timers, sets both to null, writes `state.debateData`, calls `renderSpectateView(freshDebate, allMessages)`, fires dynamic import of `'../onboarding-drip.ts'` calling `triggerDripDay(3)`, `.catch(() => {})`**: PASS. Lines 76–82.
- **Outer `try/catch` logs warning and does not rethrow**: PASS. Lines 84–86: `console.warn('[Spectate] Poll error:', err)`.

**Unverifiable claims**: None.

---

### loadDebate (line 90)

**Verification**: PARTIAL
**Findings**:

- **Async, returns `Promise<void>`**: PASS. Line 90.
- **Entire body wrapped in `try/catch`; catch logs and calls `showError`**: PASS. Lines 91/216–219. Catch uses `console.error` (not `console.warn`) — Agents 02, 03, 04, 05 say "logs … and calls `showError`" which is correct; Agent 01 says "logs the error" which is accurate.
- **Awaits `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`**: PASS. Line 93.
- **Three-level fallback if `rpcErr` is truthy**: PASS. Lines 95–132. The fallback chain: (1) profile-joined query, (2) bare `select('*')`, (3) `showError` + return if bare query also fails.
- **Profile-joined query uses FK aliases `debater_a_profile` and `debater_b_profile`**: PASS. Line 99.
- **Bare-query `SpectateDebate` uses `'Side A'`/`'Side B'` and elo 1200**: PASS. Lines 115–119.
- **Profile-joined success path: `display_name || username || 'Side A/B'`, elo, avatar**: PASS. Lines 121–131.
- **If `rpcData` is null (no error), calls `showError('Debate not found or has been removed.')` and returns**: PASS. Lines 133–135.
- **Writes `state.debateData = debate`**: PASS. Line 140.
- **Checks `debate.status === 'live'`, redirects to `'/?spectate=' + encodeURIComponent(state.debateId!)`, returns**: PASS. Lines 143–146.
- **Updates `document.title`, `og:title`, `og:description` meta tags**: PASS. Lines 149–154.
- **Three fire-and-forget `safeRpc` calls: `bump_spectator_count`, `log_debate_watch`, `log_event` with `'spectate_view'`**: PASS. Lines 157–163.

- **Agent 03 claim — only two fire-and-forget RPCs listed explicitly, then "A third fire-and-forget `safeRpc('log_event', ...)`"**: PARTIAL. Agent 03 writes "It then issues two fire-and-forget `safeRpc` calls — `bump_spectator_count` and `log_debate_watch` … A third fire-and-forget `safeRpc('log_event', ...)` follows." This is factually complete but the phrasing segregates the third call oddly, implying it may differ structurally. All three are `.catch()`-guarded fire-and-forgets on lines 157–163. No real inaccuracy, but slightly misleading framing.

- **Message load with fallback**: PASS. Lines 166–179.
- **Spectator chat load**: PASS. Lines 182–190.
- **Replay data loaded only on `'complete'` or `'completed'`**: PARTIAL. Agent 01 says the check is for `debate.status === 'complete'` and `debate.status === 'completed'`. The source at line 193 is: `const isComplete = debate.status === 'complete' || debate.status === 'completed';`. This is correct. However, Agent 03's phrasing of "it checks if `debate.status` is `complete` or `completed`" omits the `isComplete` variable abstraction. This is a structural difference only, not a behavioral one — all agents got the logic right.
- **Calls `renderSpectateView(debate, messages)`**: PASS. Line 206.
- **`isLive` check covers `'live'`, `'pending'`, `'round_break'`, `'voting'` — calls `startPolling()` and `startChatPolling()`**: PASS. Lines 209–212.
- **Non-live path calls `nudge('replay_entry', '...')`**: PASS. Line 214.
- **Agent 01 claims `startPolling()` and `startChatPolling()` are "synchronous calls (both return promises that are not awaited — fire-and-forget)"**: PARTIAL. This is slightly contradictory language: they are async functions called without `await`, so their promises are dropped — "fire-and-forget" is correct, but calling them "synchronous calls" is misleading. The source (lines 211-212) simply has `startPolling(); startChatPolling();` with no `await`. The functional description is accurate; the label "synchronous" is imprecise.

**Unverifiable claims**: None.

---

### init (line 224)

**Verification**: PASS
**Findings**:

All five agents described this function accurately. Specific claim-by-claim checks:

- **Async IIFE declared as `(async function init() { ... })()`**: PASS. Lines 222-224.
- **Not externally callable**: PASS. No export; defined and immediately invoked.
- **Awaits `ready` from `auth.ts`**: PASS. Line 227.
- **Writes `state.sb`, `state.app`, `state.loading`, `state.isLoggedIn`**: PASS. Lines 228-231.
- **`state.isLoggedIn` is `!!(getCurrentUser() && !getIsPlaceholderMode())`**: PASS. Line 231.
- **Click listener on `#back-btn` checks `document.referrer` for `location.host`, then calls `history.back()` or navigates to `'/'`**: PASS. Lines 234-240.
- **Calls `getCurrentUser()` a second time; if truthy, hides `#join-btn`**: PASS. Lines 243-246.
- **Reads `id` param from `URLSearchParams(window.location.search)`**: PASS. Lines 249-250.
- **UUID regex test on non-null `debateId`; on failure writes `<div class="error-state">Invalid debate link.</div>` to `state.app.innerHTML`, hides loading, returns**: PASS. Lines 253-257. The exact string `'<div class="error-state">Invalid debate link.</div>'` matches.
- **If `debateId` is absent, writes error message with home link, hides loading, returns**: PASS. Lines 259-263.
- **Writes `state.debateId = debateId`**: PASS. Line 265.
- **`beforeunload` listener clears both timers if set**: PASS. Lines 268-271.
- **Calls `loadDebate()` without awaiting**: PASS. Line 274.

**Unverifiable claims**: None.

---

## Cross-Agent Consensus Summary

| Function | Agent 01 | Agent 02 | Agent 03 | Agent 04 | Agent 05 |
|---|---|---|---|---|---|
| `startPolling` | PASS | PASS | PASS | PASS | PASS |
| `loadDebate` | PASS | PASS | PARTIAL | PASS | PASS |
| `init` | PASS | PASS | PASS | PASS | PASS |

**Totals across all agent-function pairs (15 total)**:
- PASS: 14
- PARTIAL: 1 (Agent 03 `loadDebate` — awkward segregation of the third fire-and-forget RPC call; all facts correct but framing implies a structural distinction that does not exist)
- FAIL: 0

**Inter-agent disagreements**: There are no meaningful disagreements between agents. All five describe the same control flow, the same fallback chains, the same state reads/writes, and the same fire-and-forget patterns. The only variation is one of framing (Agent 03 splitting the three fire-and-forget RPCs into "two then a third"), not substance.

---

## needs_review

1. **Dead `'live'` branch in `loadDebate`'s polling decision (line 209)**: `isLive` includes `debate.status === 'live'`, but the `'live'` redirect on lines 143–146 unconditionally returns before reaching line 209. No Stage 2 agent mentioned this — it means the `'live'` case in the final `isLive` check is unreachable within `loadDebate`. This is a latent dead-code issue; it cannot cause a bug (the redirect fires first), but it is a misleading condition in the source.

2. **`loadDebate` outer catch uses `console.error`, not `console.warn`** (line 217): All Stage 2 agents describe the catch block generically as "logs … and calls `showError`". This is accurate but imprecise — the distinction between `console.error` (outer catch) and `console.warn` (inner poll catch on line 85) is potentially relevant for log-level audits. No agent made a wrong claim; they simply omitted the distinction.

3. **The `nudge` argument contains literal Unicode emoji** (line 214): `'\uD83D\uDC41\uFE0F Watching the replay. Judge for yourself.'` — the eye emoji is present in the source as a Unicode escape sequence. No Stage 2 agent included the actual emoji character in their description of the nudge call string; Agent 01 renders it as `'👁️ Watching the replay...'` which is the correct visual form. Not a factual error, just worth noting for completeness.

---

## Agent 05

---

## Stage 2 Verification — `src/pages/spectate.ts`

---

### startPolling (line 22)

**Verification**: PASS

**Findings**:

All five agents described `startPolling` accurately. Specific claim-by-claim checks:

- **Async, returns `Promise<void>`**: PASS. Line 22: `async function startPolling(): Promise<void>`.
- **Clears existing `state.pollTimer` on entry if set**: PASS. Lines 23-24: `if (state.pollTimer) clearInterval(state.pollTimer); state.pollTimer = setInterval(...)`.
- **5000ms interval**: PASS. Line 87: `}, 5000);`.
- **Awaits `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`**: PASS. Line 27.
- **On RPC error or null data, falls back to direct PostgREST on `arena_debates`**: PASS. Lines 28-31.
- **Fallback constructs `SpectateDebate` from `state.debateData` names or `'Side A'`/`'Side B'`**: PASS. Lines 31-32.
- **Returns early if `freshDebate` is null after both paths**: PASS. Line 36: `if (!freshDebate) return;`.
- **Updates `#spectator-count` textContent with `String(Number(...) || 1)`**: PASS. Lines 39-40.
- **Calls `updateVoteBar` and `updatePulse` if either vote count is truthy**: PASS. Lines 43-48.
- **Fetches messages via `safeRpc('get_debate_messages', ...)`, falls back to direct `debate_messages` query on throw**: PASS. Lines 52-58.
- **Appends only new messages via `insertAdjacentHTML('beforeend', ...)`, checks 80px scroll threshold, updates `state.lastRenderedMessageCount`**: PASS. Lines 60-69.
- **Checks four terminal status values and stops both timers, renders final view, fire-and-forgets `triggerDripDay(3)`**: PASS. Lines 75-83.
- **Outer `try/catch` logs `console.warn`**: PASS. Lines 84-86.

**Unverifiable claims**: None.

---

### loadDebate (line 90)

**Verification**: PARTIAL

**Findings**:

- **Async, returns `Promise<void>`**: PASS. Line 90.
- **Entire body wrapped in `try/catch`; catch calls `console.error` and `showError`**: PASS. Lines 216-218.
- **Awaits `safeRpc('get_arena_debate_spectator', ...)`**: PASS. Line 93.
- **Three-level fallback on `rpcErr` truthy**: PASS. Lines 95-132.
- **Profile-joined query uses foreign-key aliases `debater_a_profile` / `debater_b_profile`**: PASS. Lines 98-100.
- **Bare select fallback on second failure**: PASS. Lines 105-113.
- **Bare fallback uses placeholder names `'Side A'`/`'Side B'` and elo 1200**: PASS. Lines 115-119.
- **`showError('Debate not found or has been removed.')` on null rpcData with no error**: PASS. Lines 133-135.
- **Writes `state.debateData = debate`**: PASS. Line 140.
- **`debate.status === 'live'` redirects to `/?spectate=...` and returns**: PASS. Lines 143-146.
- **Sets `document.title`, `og:title`, `og:description`**: PASS. Lines 148-154.
- **Three fire-and-forget `safeRpc` calls**: PASS. Lines 157-163.
- **Message load with fallback**: PASS. Lines 166-179.
- **Spectator chat load**: PASS. Lines 182-190.
- **Replay data loaded only on `'complete'` or `'completed'`**: PARTIAL. Agent 01 says the check is for `debate.status === 'complete'` and `debate.status === 'completed'`. The source at line 193 is: `const isComplete = debate.status === 'complete' || debate.status === 'completed';`. This is correct. However, Agent 03's phrasing of "it checks if `debate.status` is `complete` or `completed`" omits the `isComplete` variable abstraction. This is a structural difference only, not a behavioral one — all agents got the logic right.
- **Calls `renderSpectateView(debate, messages)`**: PASS. Line 206.
- **`isLive` check covers `'live'`, `'pending'`, `'round_break'`, `'voting'` — calls `startPolling()` and `startChatPolling()`**: PASS. Lines 209-212.
- **Non-live path calls `nudge('replay_entry', '...')`**: PASS. Line 214. The emoji in the string is the eye+variation-selector pair (`\uD83D\uDC41\uFE0F`). Agents 01 and 02 reproduce it directly as `👁️`; Agents 03–05 say "a fixed string." All are functionally accurate.
- **Agent 01 claims `startPolling()` and `startChatPolling()` are "synchronous calls (both return promises that are not awaited — fire-and-forget)"**: PARTIAL. This is slightly contradictory language: they are async functions called without `await`, so their promises are dropped — "fire-and-forget" is correct, but calling them "synchronous calls" is misleading. The source (lines 211-212) simply has `startPolling(); startChatPolling();` with no `await`. The functional description is accurate; the label "synchronous" is imprecise.

**Unverifiable claims**: None.

---

### init (line 224)

**Verification**: PASS

**Findings**:

All five agents described `init` accurately. Specific claim-by-claim checks:

- **Async IIFE declared as `(async function init() { ... })()`**: PASS. Lines 222-224.
- **Not externally callable**: PASS. No export; defined and immediately invoked.
- **Awaits `ready` from `auth.ts`**: PASS. Line 227.
- **Writes `state.sb`, `state.app`, `state.loading`, `state.isLoggedIn`**: PASS. Lines 228-231.
- **`state.isLoggedIn` is `!!(getCurrentUser() && !getIsPlaceholderMode())`**: PASS. Line 231.
- **Click listener on `#back-btn` checks `document.referrer` for `location.host`, then calls `history.back()` or navigates to `'/'`**: PASS. Lines 234-240.
- **Calls `getCurrentUser()` a second time; if truthy, hides `#join-btn`**: PASS. Lines 243-246.
- **Reads `id` param from `URLSearchParams(window.location.search)`**: PASS. Lines 249-250.
- **UUID regex test on non-null `debateId`; on failure writes `<div class="error-state">Invalid debate link.</div>` to `state.app.innerHTML`, hides loading, returns**: PASS. Lines 253-257. The exact string `'<div class="error-state">Invalid debate link.</div>'` matches.
- **If `debateId` is absent, writes error message with home link, hides loading, returns**: PASS. Lines 259-263.
- **Writes `state.debateId = debateId`**: PASS. Line 265.
- **`beforeunload` listener clears both timers if set**: PASS. Lines 268-271.
- **Calls `loadDebate()` without awaiting**: PASS. Line 274.

**Unverifiable claims**: None.

---

## Cross-Agent Consensus Summary

| Function | PASS | PARTIAL | FAIL |
|---|---|---|---|
| `startPolling` | 5/5 agents | 0 | 0 |
| `loadDebate` | 4/5 agents | 1 (Agent 01: "synchronous calls" label) | 0 |
| `init` | 5/5 agents | 0 | 0 |

**Overall**: 14 PASS, 1 PARTIAL, 0 FAIL across all function/agent combinations.

**Agent disagreements**: There were no substantive disagreements between agents. The one PARTIAL is purely a wording issue in Agent 01's description of `loadDebate` calling `startPolling()` and `startChatPolling()` as "synchronous calls" — all other agents correctly describe them as unawaited async calls (fire-and-forget). All agents agreed on every control flow branch, every RPC name, every state write, every fallback path, and every terminal condition.

---

## needs_review

The following source behaviors were not described by any Stage 2 agent:

1. **`loadDebate` live-redirect sets `state.debateData` before redirecting** (line 140 precedes line 143-146). Stage 2 agents all note the redirect happens after setting `state.debateData`, but none flag that this means `state.debateData` is written even for debates that will immediately redirect — state is mutated before the early return. This is a subtle ordering detail but is functionally noted by all agents since they describe the write at line 140 before the status check.

2. **`startPolling` inner message-fetch `catch` path uses `state.sb!.from('debate_messages')...order('round').order('created_at')` (no explicit ascending options, unlike `loadDebate`'s fallback which uses `{ ascending: true }`)**. Line 56 vs lines 175-177. Stage 2 agents noted the order columns in both but did not flag the difference in option passing between the two fallbacks. This is a minor behavioral discrepancy in the codebase itself, not a Stage 2 error, but worth noting for correctness review.

3. **The `nudge` call at line 214 fires regardless of `debate.status` being anything other than the four `isLive` values** — this includes unexpected/unknown statuses. No agent noted this edge case explicitly.
