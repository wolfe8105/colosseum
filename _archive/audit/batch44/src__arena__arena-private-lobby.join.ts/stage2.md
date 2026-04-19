# Stage 2 Outputs — arena-private-lobby.join.ts

Anchor: `joinWithCode` (line 19)

---

## Agent 01

### joinWithCode (line 19)

**Signature:** `export async function joinWithCode(code: string): Promise<void>`

**Guard (lines 20-23):** Calls `isPlaceholder()`. If true, shows toast `'Join code not available in preview mode'` and returns early.

**Outer try (lines 24-48):**
- Calls `safeRpc<JoinPrivateLobbyResult>('join_private_lobby', { p_debate_id: null, p_join_code: code })`.
- If `error`, throws immediately.
- Casts `data` to `JoinPrivateLobbyResult`.
- Calls `set_selectedMode(result.mode as DebateMode)`.
- Constructs `CurrentDebate` object:
  - `id`: `result.debate_id`
  - `topic`: `result.topic || randomFrom(AI_TOPICS)`
  - `role`: `'b'` (hardcoded)
  - `mode`: `result.mode as DebateMode`
  - `round`: `1`
  - `totalRounds`: `result.total_rounds ?? DEBATE.defaultRounds`
  - `opponentName`: `result.opponent_name` (no fallback)
  - `opponentId`: `result.opponent_id` (no fallback)
  - `opponentElo`: `result.opponent_elo` (no fallback)
  - `ranked`: `false` (hardcoded)
  - `ruleset`: `(result.ruleset as 'amplified' | 'unplugged') || 'amplified'`
  - `language`: `result.language ?? 'en'`
  - `messages`: `[]`
- Calls `showMatchFound(debateData)`.

**Outer catch (lines 48-84):** No error variable bound. Enters inner try.

**Inner try (lines 50-80):**
- Calls `safeRpc<ModDebateJoinResult>('join_mod_debate', { p_join_code: code })`.
- If `modError`, throws.
- Casts `modData` to `ModDebateJoinResult`.
- Calls `set_selectedMode(modResult.mode as DebateMode)`.
- Branches on `modResult.role`:
  - `'b'`: constructs `CurrentDebate` with `opponentName: modResult.opponent_name || 'Debater A'`, `opponentElo: modResult.opponent_elo || 1200`, `ranked: modResult.ranked`. Calls `showMatchFound(debateData)`.
  - else (`'a'`): calls `set_modDebateId(modResult.debate_id)`, then `showModDebateWaitingDebater(modResult.debate_id, modResult.topic, modResult.mode as DebateMode, modResult.ranked)`.

**Inner catch (lines 81-83):** Binds `modErr`. Calls `showToast(friendlyError(modErr) || 'Code not found or already taken')`.

**Line 88:** `void modDebateId` — top-level linter-silencer, not part of function body.

---

## Agent 02

### joinWithCode (line 19)

**Signature:** `export async function joinWithCode(code: string): Promise<void>`

**Placeholder guard (lines 20-23):** `isPlaceholder()` → toast + return.

**Primary path — outer try (lines 24-47):**
- `safeRpc('join_private_lobby', { p_debate_id: null, p_join_code: code })` — awaited.
- `error` → throw.
- `set_selectedMode(result.mode as DebateMode)`.
- Builds `CurrentDebate`:
  - `opponentName: result.opponent_name` — raw, no default string fallback.
  - `opponentId: result.opponent_id` — raw.
  - `opponentElo: result.opponent_elo` — raw, no numeric fallback.
  - `ranked: false` — hardcoded, does not read `result.ranked`.
  - `totalRounds: result.total_rounds ?? DEBATE.defaultRounds`.
- `showMatchFound(debateData)`.

**Fallback path — inner try (lines 50-80):**
- `safeRpc('join_mod_debate', { p_join_code: code })` — awaited.
- `modError` → throw.
- `set_selectedMode(modResult.mode as DebateMode)`.
- `modResult.role === 'b'`:
  - Builds `CurrentDebate` with `opponentName: modResult.opponent_name || 'Debater A'`, `opponentElo: modResult.opponent_elo || 1200`, `ranked: modResult.ranked` (reads from result, not hardcoded).
  - `showMatchFound(debateData)`.
- else:
  - `set_modDebateId(modResult.debate_id)`.
  - `showModDebateWaitingDebater(modResult.debate_id, modResult.topic, modResult.mode as DebateMode, modResult.ranked)`.

**Inner catch:** `showToast(friendlyError(modErr) || 'Code not found or already taken')`.

**Note:** Primary path hardcodes `ranked: false`; mod-debate path reads `ranked: modResult.ranked`.

---

## Agent 03

### joinWithCode (line 19)

**Signature:** `async function joinWithCode(code: string): Promise<void>` (exported)

**Entry guard (lines 20-23):** `isPlaceholder()` check. If true: `showToast('Join code not available in preview mode')`, return.

**Outer try block (lines 24-48):**
1. `await safeRpc<JoinPrivateLobbyResult>('join_private_lobby', { p_debate_id: null, p_join_code: code })` → `{ data, error }`.
2. `if (error) throw error`.
3. Cast data → `result: JoinPrivateLobbyResult`.
4. `set_selectedMode(result.mode as DebateMode)`.
5. Construct `debateData: CurrentDebate`:
   - topic: `result.topic || randomFrom(AI_TOPICS)`
   - role: `'b'`
   - totalRounds: `result.total_rounds ?? DEBATE.defaultRounds`
   - opponentName: `result.opponent_name` (undefined if server omits)
   - opponentId: `result.opponent_id` (undefined if server omits)
   - opponentElo: `result.opponent_elo` (undefined if server omits)
   - ranked: `false`
   - ruleset: `(result.ruleset as ...) || 'amplified'`
   - language: `result.language ?? 'en'`
6. `showMatchFound(debateData)`.

**Outer catch (no binding):** falls through to inner try.

**Inner try block (lines 50-80):**
1. `await safeRpc<ModDebateJoinResult>('join_mod_debate', { p_join_code: code })` → `{ data: modData, error: modError }`.
2. `if (modError) throw modError`.
3. Cast → `modResult: ModDebateJoinResult`.
4. `set_selectedMode(modResult.mode as DebateMode)`.
5. Branch `modResult.role === 'b'`:
   - Construct `debateData` with `opponentName: modResult.opponent_name || 'Debater A'`, `opponentElo: modResult.opponent_elo || 1200`, `ranked: modResult.ranked`.
   - `showMatchFound(debateData)`.
6. Else (`role === 'a'`):
   - `set_modDebateId(modResult.debate_id)`.
   - `showModDebateWaitingDebater(modResult.debate_id, modResult.topic, modResult.mode as DebateMode, modResult.ranked)`.

**Inner catch (`modErr`):** `showToast(friendlyError(modErr) || 'Code not found or already taken')`.

---

## Agent 04

### joinWithCode (line 19)

**Signature:** `export async function joinWithCode(code: string): Promise<void>`

**Lines 20-23 — Guard:** `isPlaceholder()` → toast → early return.

**Lines 24-48 — Primary attempt:**
- RPC: `join_private_lobby` with `{ p_debate_id: null, p_join_code: code }`.
- On error: rethrow to outer catch.
- On success: `set_selectedMode` then build `CurrentDebate`:
  - `topic`: server value or `randomFrom(AI_TOPICS)`.
  - `opponentName`: `result.opponent_name` — no `|| 'Debater A'` guard.
  - `opponentId`: `result.opponent_id` — no fallback.
  - `opponentElo`: `result.opponent_elo` — no `|| 1200` guard.
  - `ranked`: hardcoded `false`.
  - `totalRounds`: `?? DEBATE.defaultRounds`.
  - `ruleset`: `|| 'amplified'`.
  - `language`: `?? 'en'`.
- Calls `showMatchFound(debateData)`.

**Lines 48-84 — Outer catch (unbound):**
- Inner RPC: `join_mod_debate` with `{ p_join_code: code }`.
- On inner error: rethrow to inner catch.
- On success:
  - `set_selectedMode`.
  - `role === 'b'`: builds `CurrentDebate` with `opponentName || 'Debater A'`, `opponentElo || 1200`, `ranked: modResult.ranked` → `showMatchFound`.
  - `role === 'a'`: `set_modDebateId(modResult.debate_id)` → `showModDebateWaitingDebater(...)`.
- Inner catch (`modErr`): `showToast(friendlyError(modErr) || 'Code not found or already taken')`.

**Line 88:** `void modDebateId` — bare expression, linter-silencer.

---

## Agent 05

### joinWithCode (line 19)

**Signature:** `export async function joinWithCode(code: string): Promise<void>`

**Placeholder check (lines 20-23):** Exits early with toast if `isPlaceholder()` returns true.

**Outer try (lines 24-48):**
- Awaits `safeRpc<JoinPrivateLobbyResult>('join_private_lobby', { p_debate_id: null, p_join_code: code })`.
- Throws `error` if present.
- Sets mode via `set_selectedMode`.
- Assembles `CurrentDebate`:
  - `opponentName: result.opponent_name` — no string default.
  - `opponentId: result.opponent_id` — no default.
  - `opponentElo: result.opponent_elo` — no numeric default.
  - `ranked: false` — hardcoded regardless of server value.
  - `topic`, `totalRounds`, `ruleset`, `language` all have server-or-default fallbacks.
- `showMatchFound(debateData)`.

**Outer catch (unbound, lines 48-84):**

Inner try:
- Awaits `safeRpc<ModDebateJoinResult>('join_mod_debate', { p_join_code: code })`.
- Throws `modError` if present.
- `set_selectedMode(modResult.mode as DebateMode)`.
- `role === 'b'` branch: `opponentName || 'Debater A'`, `opponentElo || 1200`, `ranked: modResult.ranked` → `showMatchFound`.
- else branch: `set_modDebateId` + `showModDebateWaitingDebater`.

Inner catch:
- `showToast(friendlyError(modErr) || 'Code not found or already taken')`.

**Asymmetry observed:** Primary `join_private_lobby` path omits fallbacks on opponent fields and hardcodes `ranked: false`. Mod-debate fallback path includes `|| 'Debater A'` and `|| 1200` guards and reads `ranked` from server response.
