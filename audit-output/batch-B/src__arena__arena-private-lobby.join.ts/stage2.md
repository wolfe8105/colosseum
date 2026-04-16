# Stage 2 Outputs — arena-private-lobby.join.ts

## Agent 01

### joinWithCode (line 19)

**Signature:** `export async function joinWithCode(code: string): Promise<void>`

**Parameter:** `code: string` — user-provided join code.

**Guard clause (lines 20–23):** If `isPlaceholder()` returns true, calls `showToast('Join code not available in preview mode')` and returns early.

**Primary try block (lines 24–47) — `join_private_lobby` RPC:**
- Lines 25–28: Calls `safeRpc<JoinPrivateLobbyResult>('join_private_lobby', { p_debate_id: null, p_join_code: code })`; destructures `{ data, error }`.
- Line 29: If `error`, throws it (falls through to outer catch).
- Line 30: Casts `data as JoinPrivateLobbyResult`.
- Line 31: State mutation — `set_selectedMode(result.mode as DebateMode)`.
- Lines 32–46: Constructs `CurrentDebate` object:
  - `id`: `result.debate_id`
  - `topic`: `result.topic || randomFrom(AI_TOPICS)`
  - `role`: `'b'` (hardcoded)
  - `mode`: `result.mode as DebateMode`
  - `round`: `1` (hardcoded)
  - `totalRounds`: `result.total_rounds ?? DEBATE.defaultRounds`
  - `opponentName`: `result.opponent_name` (no fallback)
  - `opponentId`: `result.opponent_id` (no fallback)
  - `opponentElo`: `result.opponent_elo` (no fallback)
  - `ranked`: `false` (hardcoded)
  - `ruleset`: `(result.ruleset as 'amplified' | 'unplugged') || 'amplified'`
  - `language`: `result.language ?? 'en'`
  - `messages`: `[]`
- Line 47: Calls `showMatchFound(debateData)`.

**Outer catch block (lines 48–84) — fallback to `join_mod_debate`:**
- Lines 51–53: Calls `safeRpc<ModDebateJoinResult>('join_mod_debate', { p_join_code: code })`; destructures `{ data: modData, error: modError }`.
- Line 54: If `modError`, throws it (falls through to inner catch).
- Line 55: Casts `modData as ModDebateJoinResult`.
- Line 56: State mutation — `set_selectedMode(modResult.mode as DebateMode)`.
- Lines 58–80: Branch on `modResult.role`:
  - **Role `'b'`:** Constructs `CurrentDebate` with `opponentName: modResult.opponent_name || 'Debater A'`, `opponentElo: modResult.opponent_elo || 1200`, `ranked: modResult.ranked` (from result, not hardcoded false). Calls `showMatchFound(debateData)` (line 75).
  - **Else (role `'a'`):** State mutation — `set_modDebateId(modResult.debate_id)` (line 78). Calls `showModDebateWaitingDebater(modResult.debate_id, modResult.topic, modResult.mode as DebateMode, modResult.ranked)` (line 79).

**Inner catch block (lines 81–83):** Calls `showToast(friendlyError(modErr) || 'Code not found or already taken')`.

**Error strategy:** Cascading fallback — primary RPC failure silently triggers secondary RPC; secondary failure shows friendly toast. No error rethrows to caller.

---

## Agent 02

### joinWithCode (line 19)

**Signature:** `export async function joinWithCode(code: string): Promise<void>`

**Guard clause (lines 20–23):** `if (isPlaceholder())` → `showToast('Join code not available in preview mode')` + `return`.

**Primary try (lines 24–47):**
- `safeRpc<JoinPrivateLobbyResult>('join_private_lobby', { p_debate_id: null, p_join_code: code })` → destructure `{ data, error }`.
- `if (error) throw error` → to outer catch.
- `const result = data as JoinPrivateLobbyResult`.
- `set_selectedMode(result.mode as DebateMode)` (line 31).
- Build `CurrentDebate`:
  - `topic: result.topic || randomFrom(AI_TOPICS)`
  - `role: 'b'`, `round: 1`, `ranked: false` (all hardcoded)
  - `totalRounds: result.total_rounds ?? DEBATE.defaultRounds`
  - `opponentName: result.opponent_name` (no default)
  - `opponentId: result.opponent_id` (no default)
  - `opponentElo: result.opponent_elo` (no default)
  - `ruleset: (result.ruleset as 'amplified' | 'unplugged') || 'amplified'`
  - `language: result.language ?? 'en'`
  - `messages: []`
- `showMatchFound(debateData)` (line 47).

**Outer catch (lines 48–84):**
- `safeRpc<ModDebateJoinResult>('join_mod_debate', { p_join_code: code })` → `{ data: modData, error: modError }`.
- `if (modError) throw modError` → to inner catch.
- `set_selectedMode(modResult.mode as DebateMode)` (line 56).
- Branch on `modResult.role`:
  - `'b'`: Build `CurrentDebate` with `opponentName: modResult.opponent_name || 'Debater A'`, `opponentElo: modResult.opponent_elo || 1200`, `ranked: modResult.ranked`. Call `showMatchFound(debateData)`.
  - else: `set_modDebateId(modResult.debate_id)` + `showModDebateWaitingDebater(modResult.debate_id, modResult.topic, modResult.mode as DebateMode, modResult.ranked)`.

**Inner catch (lines 81–83):** `showToast(friendlyError(modErr) || 'Code not found or already taken')`.

---

## Agent 03

### joinWithCode (line 19)

**Signature:** `export async function joinWithCode(code: string): Promise<void>`

**Guard (lines 20–23):** `isPlaceholder()` check → toast + early return.

**Primary path (lines 24–47):**
- RPC `join_private_lobby` with `{ p_debate_id: null, p_join_code: code }`.
- Error → throw → outer catch.
- `set_selectedMode(result.mode as DebateMode)` (line 31).
- `CurrentDebate` construction with:
  - `topic: result.topic || randomFrom(AI_TOPICS)`
  - `role: 'b'`, `round: 1`, `ranked: false`
  - `totalRounds: result.total_rounds ?? DEBATE.defaultRounds`
  - `opponentName/Id/Elo`: direct from result (no fallbacks)
  - `ruleset: ... || 'amplified'`, `language: ... ?? 'en'`, `messages: []`
- `showMatchFound(debateData)`.

**Fallback path (lines 48–84):**
- RPC `join_mod_debate` with `{ p_join_code: code }`.
- Error → throw → inner catch.
- `set_selectedMode(modResult.mode as DebateMode)`.
- Role branch:
  - `'b'`: `opponentName: modResult.opponent_name || 'Debater A'`, `opponentElo: modResult.opponent_elo || 1200`, `ranked: modResult.ranked`. `showMatchFound(debateData)`.
  - `'a'`: `set_modDebateId(modResult.debate_id)`. `showModDebateWaitingDebater(modResult.debate_id, modResult.topic, modResult.mode as DebateMode, modResult.ranked)`.

**Inner catch:** `showToast(friendlyError(modErr) || 'Code not found or already taken')`.

**Error strategy:** Two-tier nested try-catch. Private lobby → mod debate → toast. No rethrows.

---

## Agent 04

### joinWithCode (line 19)

**Signature:** `export async function joinWithCode(code: string): Promise<void>`

**Guard clause (lines 20–23):** `isPlaceholder()` → `showToast('Join code not available in preview mode')` → `return`.

**Outer try (lines 24–47):**
- `safeRpc<JoinPrivateLobbyResult>('join_private_lobby', { p_debate_id: null, p_join_code: code })` — `p_debate_id` is explicitly passed as `null`.
- Error check → throw if error.
- `set_selectedMode(result.mode as DebateMode)` (line 31).
- Build `debateData`:
  - `topic: result.topic || randomFrom(AI_TOPICS)` — external call if topic falsy
  - `role: 'b'`, `round: 1`, `ranked: false` (hardcoded)
  - `totalRounds: result.total_rounds ?? DEBATE.defaultRounds`
  - `opponentName: result.opponent_name`, `opponentId: result.opponent_id`, `opponentElo: result.opponent_elo` — no fallbacks in primary path
  - `ruleset: (result.ruleset as 'amplified' | 'unplugged') || 'amplified'`
  - `language: result.language ?? 'en'`
  - `messages: []`
- `showMatchFound(debateData)`.

**Outer catch (lines 48–84):**
- Inner try: `safeRpc<ModDebateJoinResult>('join_mod_debate', { p_join_code: code })` — only `p_join_code` (no `p_debate_id`).
- Error check → throw if error.
- `set_selectedMode(modResult.mode as DebateMode)` (line 56).
- `if (modResult.role === 'b')`:
  - `opponentName: modResult.opponent_name || 'Debater A'`
  - `opponentElo: modResult.opponent_elo || 1200`
  - `ranked: modResult.ranked` (direct, not hardcoded false)
  - `showMatchFound(debateData)`.
- `else`:
  - `set_modDebateId(modResult.debate_id)` (line 78).
  - `showModDebateWaitingDebater(modResult.debate_id, modResult.topic, modResult.mode as DebateMode, modResult.ranked)`.

**Inner catch (lines 81–83):** `showToast(friendlyError(modErr) || 'Code not found or already taken')`.

---

## Agent 05

### joinWithCode (line 19)

**Signature:** `export async function joinWithCode(code: string): Promise<void>`

**Guard (lines 20–23):** `isPlaceholder()` → toast `'Join code not available in preview mode'` → early return.

**Primary try (lines 24–47):**
- `safeRpc('join_private_lobby', { p_debate_id: null, p_join_code: code })`.
- `if (error) throw error`.
- `set_selectedMode(result.mode as DebateMode)` (line 31).
- Build `CurrentDebate`:
  - `topic: result.topic || randomFrom(AI_TOPICS)`
  - `role: 'b'`, `round: 1`, `ranked: false` (hardcoded)
  - `totalRounds: result.total_rounds ?? DEBATE.defaultRounds`
  - `opponentName: result.opponent_name` — no default
  - `opponentId: result.opponent_id` — no default
  - `opponentElo: result.opponent_elo` — no default
  - `ruleset: (result.ruleset as 'amplified' | 'unplugged') || 'amplified'`
  - `language: result.language ?? 'en'`
  - `messages: []`
- `showMatchFound(debateData)` (line 47).

**Outer catch (lines 48–84):**
- Inner try: `safeRpc('join_mod_debate', { p_join_code: code })`.
- `if (modError) throw modError`.
- `set_selectedMode(modResult.mode as DebateMode)` (line 56).
- `if (modResult.role === 'b')`:
  - `opponentName: modResult.opponent_name || 'Debater A'` (line 67)
  - `opponentElo: modResult.opponent_elo || 1200` (line 69)
  - `ranked: modResult.ranked` (line 70, not hardcoded)
  - `showMatchFound(debateData)` (line 75).
- `else` (role `'a'`):
  - `set_modDebateId(modResult.debate_id)` (line 78).
  - `showModDebateWaitingDebater(modResult.debate_id, modResult.topic, modResult.mode as DebateMode, modResult.ranked)` (line 79).

**Inner catch (lines 81–83):** `showToast(friendlyError(modErr) || 'Code not found or already taken')`.

**`void modDebateId` (line 88):** Top-level void expression; accesses imported `modDebateId` to satisfy linter; no runtime effect.

**Error handling:** No errors rethrown; all exceptions converted to UI feedback or silently swallowed by fallback path.
