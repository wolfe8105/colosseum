# Stage 2 Outputs — arena-room-ai-response.ts

## Agent 01

### handleAIResponse
This async function accepts a `CurrentDebate` object and a `userText` string. It first checks `FEATURES.aiSparring` and returns immediately if false. It reads `document.getElementById('arena-messages')` from the DOM, creates a `<div>` element with class `arena-typing` and id `arena-ai-typing`, sets its innerHTML to three dot divs, appends it to the messages container (if non-null) via optional chaining, and calls `scrollTo` on the container to smooth-scroll to the bottom. It reads `document.getElementById('arena-text-input')` and `document.getElementById('arena-send-btn')` from the DOM, casting both. If non-null, it disables both the input and the send button. It then awaits `generateAIDebateResponse` with `debate.topic`, `userText`, `debate.round`, and `debate.totalRounds`, storing the result in `aiText`. After that resolves, it removes the typing indicator by calling `.remove()` on `document.getElementById('arena-ai-typing')` (optional chaining). It calls `addMessage('b', aiText, debate.round, true)` — this is not awaited. It then checks `!isPlaceholder()` AND `!debate.id.startsWith('ai-local-')`. If both conditions are true, it enters a try block and awaits `safeRpc('submit_debate_message', {...})` with `p_debate_id: debate.id`, `p_round: debate.round`, `p_side: 'b'`, `p_content: aiText`, `p_is_ai: true`. The catch block is empty (`/* warned */` comment, no actual logging or re-throw). After the try/catch, it re-enables the input field (if non-null). Finally it calls `advanceRound()` — not awaited.

### getUserJwt
This synchronous function takes no parameters. It calls and returns the value of `getAccessToken()` imported from `auth.ts`. Returns `string | null`.

### generateAIDebateResponse
This async function accepts `topic: string`, `_userArg: string` (the leading underscore flags it as intentionally unused in the fallback path), `round: number`, and `totalRounds: number`. It checks `FEATURES.aiSparring` and returns an empty string `''` if false. It reads `currentDebate` from module state, maps its `.messages` array (defaulting to `[]` via `??`) to an array of `{role, content}` objects using `m.role` and `m.text`. It enters a try block. It reads `SUPABASE_URL` from module scope; if falsy it throws `'No supabase URL'`. It constructs `edgeUrl` by stripping a trailing slash from `supabaseUrl` and appending `/functions/v1/ai-sparring`. It calls `getUserJwt()` for the JWT; if falsy it throws `'Not authenticated'`. It awaits a `fetch` POST to `edgeUrl` with JSON body `{topic, userArg: _userArg, round, totalRounds, messageHistory}` and headers `Content-Type: application/json` and `Authorization: Bearer <jwt>`. If the response is not ok, it throws `'Edge Function error: ' + res.status`. It awaits `res.json()` cast to `{response?: string}`. If `data.response` is truthy it returns it. Otherwise it throws `'Empty response'`. The catch block (catches any error from the try) awaits a delay of `1200 + Math.random() * 1800` ms. Then it selects the appropriate template array from `AI_RESPONSES`: `opening` for round 1, `closing` for round >= totalRounds, otherwise `rebuttal` — all accessed with non-null assertions (`!`). It calls `randomFrom(templates)` to get an opener, picks a random entry from a hardcoded `fillers` array (5 strings, some interpolating `topic`), and returns `opener + ' ' + randomFrom(fillers)`.

### generateSimulatedResponse
This synchronous function accepts `_round: number` (unused). It defines a local `responses` array of 4 hardcoded strings. It calls and returns `randomFrom(responses)`.

## Agent 02

### handleAIResponse
Reads `FEATURES.aiSparring` — returns immediately if false. Reads `document.getElementById('arena-messages')` from DOM. Creates a typing indicator div with id `arena-ai-typing`, appends it optionally, scrolls the container. Reads input and button DOM elements, disables both. Awaits `generateAIDebateResponse(debate.topic, userText, debate.round, debate.totalRounds)`. Removes the typing indicator via `getElementById('arena-ai-typing')?.remove()`. Calls `addMessage('b', aiText, debate.round, true)` — synchronously, no await. Checks `!isPlaceholder() && !debate.id.startsWith('ai-local-')` — if true, awaits `safeRpc('submit_debate_message', ...)` with five params inside try/catch (empty catch). Re-enables `input` (if non-null). Calls `advanceRound()` — no await.

### getUserJwt
No parameters. Returns `getAccessToken()` — a string or null from auth module.

### generateAIDebateResponse
Returns `''` if `FEATURES.aiSparring` is false. Reads `currentDebate?.messages ?? []` and maps to `{role, content}` message history. Tries: validates `SUPABASE_URL`, builds Edge Function URL, calls `getUserJwt()`, checks for null JWT. Sends fetch POST with JSON payload including `topic`, `userArg` (_userArg), `round`, `totalRounds`, `messageHistory`. Checks `res.ok`, parses JSON, returns `data.response` if present. Catches all errors: waits 1200–3000ms random delay, picks template from `AI_RESPONSES` based on round position with non-null assertions, picks a random filler from 5 hardcoded strings interpolating topic, returns opener + filler.

### generateSimulatedResponse
Accepts `_round` (unused). Returns a random entry from a local array of 4 hardcoded response strings via `randomFrom(responses)`.

## Agent 03

### handleAIResponse
Async. Guard: if `!FEATURES.aiSparring` returns. Creates typing indicator element with id `arena-ai-typing`, appends to `#arena-messages` container with optional chaining, smooth-scrolls. Disables `#arena-text-input` and `#arena-send-btn` if present. Awaits `generateAIDebateResponse`. Removes typing indicator. Calls `addMessage('b', aiText, debate.round, true)` — fire-and-forget (no await, addMessage not declared async in this file). Guards on `!isPlaceholder() && !debate.id.startsWith('ai-local-')`: awaits `safeRpc('submit_debate_message', {...})` inside try/catch — catch is `{ /* warned */ }` — swallows all errors silently. Re-enables input. Calls `advanceRound()` — fire-and-forget. Note: `sendBtn` is disabled at line 30 but is never re-enabled after AI response returns — only `input` is re-enabled at line 52. Potential UX bug: send button stays disabled permanently.

### getUserJwt
Thin wrapper. Returns `getAccessToken()`.

### generateAIDebateResponse
Guard: returns `''` if `!FEATURES.aiSparring`. Reads module-level `currentDebate?.messages ?? []`, maps to `{role, content}`. Try path: checks SUPABASE_URL, constructs edge URL, gets JWT via `getUserJwt()`, throws if null, POSTs to edge function, checks `res.ok`, parses JSON, returns `data.response`. Catch path: random 1.2–3.0s delay, selects template from `AI_RESPONSES.opening/closing/rebuttal` (non-null asserted), selects random filler (5 hardcoded options including topic interpolation), returns `opener + ' ' + filler`.

### generateSimulatedResponse
Returns `randomFrom([...4 hardcoded strings])`. Ignores `_round`.

## Agent 04

### handleAIResponse
Async function. Early return if `FEATURES.aiSparring` is falsy. Appends typing indicator div (three dot children) to `#arena-messages`. Disables text input and send button. Awaits `generateAIDebateResponse(debate.topic, userText, debate.round, debate.totalRounds)`. Removes typing indicator by id. Calls `addMessage('b', aiText, debate.round, true)`. If not placeholder and debate id doesn't begin with 'ai-local-', awaits `safeRpc('submit_debate_message', ...)` inside try block — catch block empty (just comment). Re-enables input only (line 52 — `input.disabled = false`). Note: `sendBtn` disabled at line 30, but line 52-53 only re-enables `input`. `sendBtn` re-enable is missing. Calls `advanceRound()`.

### getUserJwt
Delegates to `getAccessToken()`, returns the result.

### generateAIDebateResponse
Returns empty string if `FEATURES.aiSparring` false. Maps `currentDebate?.messages ?? []` to `{role, content}` history. Try: validates `SUPABASE_URL`, builds edge URL, calls `getUserJwt()` and throws if null, POSTs to ai-sparring edge function, checks `res.ok`, parses JSON, returns `data.response` if truthy else throws. Catch (all errors): delays 1.2–3.0s, selects template bank from `AI_RESPONSES` with non-null assertion (opening/rebuttal/closing), picks opener via `randomFrom`, picks filler from inline array, returns concatenated string.

### generateSimulatedResponse
Ignores `_round`. Returns a random entry from 4-element local array via `randomFrom`.

## Agent 05

### handleAIResponse
Async. If `FEATURES.aiSparring` is false, returns immediately. Creates a typing indicator div with className `arena-typing` and id `arena-ai-typing`, innerHTML set to three dot divs. Appends to `#arena-messages` element (optional chaining on `messages`). Scrolls messages to bottom. Disables `#arena-text-input` (input) and `#arena-send-btn` (sendBtn). Awaits `generateAIDebateResponse` for the AI text. Removes typing indicator element. Calls `addMessage('b', aiText, debate.round, true)` — not awaited. If `!isPlaceholder() && !debate.id.startsWith('ai-local-')`, awaits `safeRpc('submit_debate_message', {...})` in try/catch (empty catch — swallowed). Re-enables `input` only — `sendBtn` is never re-enabled (line 52 sets `input.disabled = false` but there is no corresponding `sendBtn.disabled = false`). Calls `advanceRound()` — not awaited. Critical gap: if `generateAIDebateResponse` throws or rejects (which it shouldn't given its internal catch, but if it does), neither input nor button is re-enabled, and `advanceRound` is never called.

### getUserJwt
Returns `getAccessToken()` — passthrough to auth module.

### generateAIDebateResponse
If `!FEATURES.aiSparring` returns `''`. Reads `currentDebate` from state, maps `.messages ?? []` to `{role, content}` objects. Try block: reads `SUPABASE_URL`, throws if missing. Builds edge function URL. Gets JWT via `getUserJwt()`, throws if null. Fetches to edge function URL with POST, JSON body, auth header. On non-ok response throws. Parses JSON, returns `data.response` if present, else throws. Catch: random delay 1.2–3.0s, reads from `AI_RESPONSES.opening/rebuttal/closing` (non-null asserted `!`), random `opener` from templates, random `filler` from inline array of 5 strings (some interpolate `topic`), returns joined string.

### generateSimulatedResponse
Accepts `_round` (unused). Returns `randomFrom` of 4-item array of hardcoded response strings.
