# Stage 2 Outputs — arena-pending-challenges.ts

## Agent 01

### loadPendingChallenges (line 17)

**Signature:** `export async function loadPendingChallenges(): Promise<void>`. Zero parameters.

**Outer wrapper (lines 18–99):** Entire function body wrapped in try-catch. Line 99 catches silently: `/* silent — challenges are optional */`.

**Phase 1 — RPC fetch (lines 19–20):**
- Line 19: `safeRpc<PendingChallenge[]>('get_pending_challenges')` — no params. Destructures `{ data, error }`.
- Line 20: Three-part guard: `if (error || !data || (data as unknown[]).length === 0) return;` — exits on RPC error, null data, or empty array.

**Phase 2 — DOM validation (lines 22–25):**
- Line 22: `const challenges = data as PendingChallenge[];`
- Line 23: `document.getElementById('arena-pending-challenges-section')` → `section`
- Line 24: `document.getElementById('arena-pending-challenges-feed')` → `feed`
- Line 25: `if (!section || !feed) return;`

**Phase 3 — Render cards (lines 27–45):**
- Line 27: `section.style.display = ''` (reveal section)
- Lines 28–45: `feed.innerHTML = challenges.map(c => ...).join('')`
  - Each card: div with class `arena-card card-live`, `border-left-color:var(--mod-accent)`, `data-debate-id="${escapeHTML(c.debate_id)}"`.
  - Badge: `\u2694\uFE0F CHALLENGE`. Mode: `escapeHTML(c.mode.toUpperCase())`.
  - Topic: `c.topic ? escapeHTML(c.topic) : 'Topic: Challenger\'s choice'`.
  - Challenger info: `escapeHTML(c.challenger_name)` + `\u00B7` + `c.challenger_elo` (raw number, no escape).
  - Accept button (`.challenge-accept-btn`) data attributes:
    - `data-debate-id="${escapeHTML(c.debate_id)}"`, `data-mode="${escapeHTML(c.mode)}"`,
    - `data-topic="${escapeHTML(c.topic || '')}"`, `data-opp-id="${escapeHTML(c.challenger_id)}"`,
    - `data-opp-name="${escapeHTML(c.challenger_name)}"`, `data-opp-elo="${c.challenger_elo}"` (no escape on elo).
  - Decline button (`.challenge-decline-btn`) with `data-debate-id="${escapeHTML(c.debate_id)}"`.

**Phase 4 — Accept button wiring (lines 48–83):**
- `feed.querySelectorAll('.challenge-accept-btn').forEach(btn => btn.addEventListener('click', async () => {...}))`
- Click handler:
  - Lines 51–52: `el.disabled = true`; `el.textContent = '\u23F3'` (hourglass).
  - Line 54: `safeRpc<JoinPrivateLobbyResult>('join_private_lobby', { p_debate_id: el.dataset.debateId, p_join_code: null })` → `{ data: joinData, error: joinErr }`.
  - Line 58: `if (joinErr) throw joinErr`.
  - Line 60: State mutation — `set_selectedMode(el.dataset.mode as DebateMode)`.
  - Lines 61–75: Build `CurrentDebate`:
    - `id: result.debate_id`
    - `topic: result.topic || el.dataset.topic || randomFrom(AI_TOPICS)`
    - `role: 'b'`, `round: 1`, `ranked: false` (hardcoded)
    - `mode: el.dataset.mode as DebateMode`
    - `totalRounds: result.total_rounds ?? DEBATE.defaultRounds`
    - `opponentName: el.dataset.oppName || 'Challenger'`
    - `opponentId: el.dataset.oppId || null`
    - `opponentElo: Number(el.dataset.oppElo) || 1200`
    - `ruleset: (result.ruleset as 'amplified' | 'unplugged') || 'amplified'`
    - `language: result.language ?? 'en'`
    - `messages: []`
  - Line 76: `showMatchFound(debateData)`.
  - Inner catch (lines 77–81): `showToast(friendlyError(err) || 'Could not accept challenge')`; `el.disabled = false`; `el.textContent = 'ACCEPT'`.

**Phase 5 — Decline button wiring (lines 86–98):**
- `feed.querySelectorAll('.challenge-decline-btn').forEach(btn => btn.addEventListener('click', async () => {...}))`
- Click handler:
  - Line 89: `const debateId = el.dataset.debateId!` (non-null assertion).
  - Line 90: `el.disabled = true`.
  - Line 92: `safeRpc('cancel_private_lobby', { p_debate_id: debateId })` (response discarded).
  - Line 93: Inner catch — `/* silent */` — errors silently discarded.
  - Line 95: `el.closest('.arena-card')?.remove()`.
  - Line 96: `if (!feed.querySelector('.arena-card')) section.style.display = 'none'`.

---

## Agent 02

### loadPendingChallenges (line 17)

**Signature:** `export async function loadPendingChallenges(): Promise<void>`. No parameters.

**Full function in outer try-catch (lines 18–99); catch at line 99 silences all errors.**

**Data fetch (lines 19–20):**
- `safeRpc<PendingChallenge[]>('get_pending_challenges')` — no arguments.
- Guard: `if (error || !data || (data as unknown[]).length === 0) return;`

**DOM setup (lines 22–25):**
- `section = document.getElementById('arena-pending-challenges-section')`
- `feed = document.getElementById('arena-pending-challenges-feed')`
- Guard: `if (!section || !feed) return;`

**Render (lines 27–45):**
- `section.style.display = ''` (reveal).
- `feed.innerHTML = challenges.map(c => ...).join('')` — per-card HTML:
  - Outer div: `arena-card card-live`, `border-left-color:var(--mod-accent)`, `data-debate-id` escaped.
  - Badge: `\u2694\uFE0F CHALLENGE`. Mode: `escapeHTML(c.mode.toUpperCase())`.
  - Topic: conditional, falling back to `"Topic: Challenger's choice"`.
  - Challenger: escaped name + raw elo number.
  - Accept button: all data attributes escaped except `data-opp-elo` (raw number). Text: `ACCEPT`.
  - Decline button: only `data-debate-id` escaped. Text: `DECLINE`.

**Accept wiring (lines 48–83):**
- `querySelectorAll('.challenge-accept-btn').forEach(...)` → `addEventListener('click', async)`
- On click: disable + hourglass → `join_private_lobby` RPC with `{ p_debate_id: el.dataset.debateId, p_join_code: null }` → throw on error → `set_selectedMode(el.dataset.mode as DebateMode)` → build `CurrentDebate` → `showMatchFound(debateData)`.
- `debateData` key fallbacks: `topic: result.topic || el.dataset.topic || randomFrom(AI_TOPICS)`, `opponentName: el.dataset.oppName || 'Challenger'`, `opponentId: el.dataset.oppId || null`, `opponentElo: Number(el.dataset.oppElo) || 1200`.
- Catch: toast + restore button.

**Decline wiring (lines 86–98):**
- `querySelectorAll('.challenge-decline-btn').forEach(...)` → `addEventListener('click', async)`
- On click: disable → `cancel_private_lobby` RPC with `{ p_debate_id: debateId }` (non-null asserted from dataset) → silent catch → `el.closest('.arena-card')?.remove()` → if no cards remain, `section.style.display = 'none'`.

---

## Agent 03

### loadPendingChallenges (line 17)

**Signature:** `export async function loadPendingChallenges(): Promise<void>`. Zero parameters.

**Outer try-catch (lines 18–99):** Entire function body. Catch silences all errors.

**Fetch (line 19):** `safeRpc<PendingChallenge[]>('get_pending_challenges')` — no params.
**Guard (line 20):** Return early if error, no data, or empty array.

**DOM queries (lines 23–24):**
- `document.getElementById('arena-pending-challenges-section')` → `section`
- `document.getElementById('arena-pending-challenges-feed')` → `feed`
- Guard (line 25): return if either missing.

**Render (lines 27–45):** `section.style.display = ''`; `feed.innerHTML` set to mapped card HTML.
- Per card: outer div with `arena-card card-live`, escaped `data-debate-id`.
- Topic conditional: `escapeHTML(c.topic)` or `'Topic: Challenger\'s choice'`.
- Accept button stores all required data in `data-*` attributes (all escaped except `data-opp-elo`).
- Decline button stores only `data-debate-id`.

**Accept click handler (lines 49–82):**
- Disable + hourglass.
- `join_private_lobby` RPC: `{ p_debate_id: el.dataset.debateId, p_join_code: null }`.
- `set_selectedMode(el.dataset.mode as DebateMode)` (state mutation).
- Build `CurrentDebate` — `topic` chain: `result.topic || el.dataset.topic || randomFrom(AI_TOPICS)`. `opponentName: el.dataset.oppName || 'Challenger'`. `opponentId: el.dataset.oppId || null`. `opponentElo: Number(el.dataset.oppElo) || 1200`. `totalRounds: result.total_rounds ?? DEBATE.defaultRounds`. `ruleset: ... || 'amplified'`. `language: ... ?? 'en'`. `role: 'b'`, `round: 1`, `ranked: false` (hardcoded).
- `showMatchFound(debateData)`.
- Catch: `showToast(friendlyError(err) || 'Could not accept challenge')` + restore button.

**Decline click handler (lines 87–97):**
- `debateId = el.dataset.debateId!` (non-null assertion, line 89).
- `el.disabled = true`.
- `cancel_private_lobby` RPC with `{ p_debate_id: debateId }` — response ignored.
- Silent catch.
- `el.closest('.arena-card')?.remove()`.
- If no cards remain: `section.style.display = 'none'`.

---

## Agent 04

### loadPendingChallenges (line 17)

**Signature:** `export async function loadPendingChallenges(): Promise<void>`. No parameters.

**All code in outer try-catch. Line 99 catch: `/* silent — challenges are optional */`.**

**RPC + early guards (lines 19–20):**
- `safeRpc<PendingChallenge[]>('get_pending_challenges')` — no second argument.
- `if (error || !data || (data as unknown[]).length === 0) return;`

**DOM lookup + guard (lines 22–25):**
- `getElementById('arena-pending-challenges-section')`, `getElementById('arena-pending-challenges-feed')`.
- `if (!section || !feed) return;`

**HTML generation (lines 27–45):**
- `section.style.display = ''`.
- `feed.innerHTML` set to challenge cards. Per card:
  - Accept button data attributes: `data-debate-id`, `data-mode`, `data-topic` (topic or empty string), `data-opp-id`, `data-opp-name`, `data-opp-elo` (raw `c.challenger_elo`, not escaped).
  - `c.challenger_elo` also rendered in display span without escape.

**Accept click handler (lines 49–82):**
- Disable + `'\u23F3'`.
- `join_private_lobby` RPC: `{ p_debate_id: el.dataset.debateId, p_join_code: null }`.
- On error: throw → inner catch.
- `set_selectedMode(el.dataset.mode as DebateMode)`.
- `CurrentDebate` construction:
  - `topic`: 3-level fallback (`result.topic || el.dataset.topic || randomFrom(AI_TOPICS)`)
  - `opponentName: el.dataset.oppName || 'Challenger'`
  - `opponentId: el.dataset.oppId || null`
  - `opponentElo: Number(el.dataset.oppElo) || 1200`
  - `totalRounds: result.total_rounds ?? DEBATE.defaultRounds`
  - `ruleset: (result.ruleset as 'amplified' | 'unplugged') || 'amplified'`
  - `language: result.language ?? 'en'`
  - `role: 'b'`, `round: 1`, `ranked: false`, `messages: []`
- `showMatchFound(debateData)`.
- Catch: toast fallback `'Could not accept challenge'`; restore `disabled = false` and `textContent = 'ACCEPT'`.

**Decline click handler (lines 87–97):**
- `el.dataset.debateId!` (non-null assert) → `debateId`.
- `el.disabled = true`.
- `cancel_private_lobby` RPC: `{ p_debate_id: debateId }`.
- Silent catch.
- `el.closest('.arena-card')?.remove()`.
- `if (!feed.querySelector('.arena-card')) section.style.display = 'none';`

---

## Agent 05

### loadPendingChallenges (line 17)

**Signature:** `export async function loadPendingChallenges(): Promise<void>`. Zero parameters.

**Outer try-catch wraps lines 18–98; line 99 catch silences all errors with comment `/* silent — challenges are optional */`.**

**Stage A — Fetch (line 19):** `safeRpc<PendingChallenge[]>('get_pending_challenges')`, no params. Destructure `{ data, error }`.

**Stage B — Early returns (line 20):** Three conditions joined with `||`: error, null data, or zero-length array. Any true → return.

**Stage C — DOM (lines 23–25):** `getElementById` for both `section` and `feed`. Guard returns if either null.

**Stage D — Render (lines 27–45):**
- `section.style.display = ''` (unhide).
- `feed.innerHTML` = mapped challenge cards joined.
- Notable: `c.challenger_elo` used raw (no `escapeHTML`) in both the display span and the `data-opp-elo` attribute. All other user strings are passed through `escapeHTML`.
- Topic ternary: `c.topic ? escapeHTML(c.topic) : 'Topic: Challenger\'s choice'`.
- `data-topic` on accept button: `escapeHTML(c.topic || '')` (empty string fallback ensures no `undefined` in attribute).

**Stage E — Accept wiring (lines 48–83):**
- `querySelectorAll('.challenge-accept-btn').forEach(btn => addEventListener('click', async))`.
- Handler: disable + `'\u23F3'` → `join_private_lobby` RPC `{ p_debate_id: el.dataset.debateId, p_join_code: null }` → throw on joinErr → `set_selectedMode(el.dataset.mode as DebateMode)` → build `CurrentDebate` → `showMatchFound(debateData)`.
- Three-level topic chain: `result.topic || el.dataset.topic || randomFrom(AI_TOPICS)`.
- `opponentElo: Number(el.dataset.oppElo) || 1200` — explicit `Number()` coercion (dataset values are always strings).
- Catch: `showToast(friendlyError(err) || 'Could not accept challenge')` + `disabled = false` + `textContent = 'ACCEPT'`.

**Stage F — Decline wiring (lines 86–98):**
- `querySelectorAll('.challenge-decline-btn').forEach(btn => addEventListener('click', async))`.
- Handler: `debateId = el.dataset.debateId!` → `disabled = true` → `cancel_private_lobby` RPC `{ p_debate_id: debateId }` → silent catch → `el.closest('.arena-card')?.remove()` → if no cards remain, `section.style.display = 'none'`.
- Decline always removes card from DOM regardless of RPC outcome (silent catch ensures card is removed even if cancel RPC fails).
