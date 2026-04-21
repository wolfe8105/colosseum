# Stage 3 — Verification Report: async.wiring.ts

Source: src/async.wiring.ts (171 lines)
Anchors verified: 3
Agents: 5 (independent, parallel)
Verdict: **15 PASS · 1 PARTIAL · 0 FAIL**

---

## Agent 1

### _wireTakeDelegation (line 41)
- AW-1 (become-mod missing requireAuth): PASS — no guard before `toggleModerator(true)` confirmed
- No innerHTML writes: PASS — only `.style.*`, `.remove()`, `window.location.href`
- `encodeURIComponent` + `/u/` prefix on profile: PASS — `'/u/' + encodeURIComponent(btn.dataset['username'])` confirmed
- AW-2 (dataset IDs to react/challenge without isUUID): PASS — `btn.dataset['id'] ?? ''` passed raw confirmed

### _wirePredictionDelegation (line 89)
- No innerHTML writes: PASS — `.value`, `.disabled`, `.style.opacity` only
- `requireAuth('place predictions')` gates predict: PASS — first statement in branch confirmed
- `parseInt(input.value, 10)`: PASS — radix 10 confirmed in wager-confirm and input handler
- `amount >= 1 && amount <= 500 && debateId && pick` guard before `placePrediction`: PASS — confirmed
- Balance check before RPC: PASS — `if (bal != null && amount > bal) { ...; return; }` confirmed
- `standalone-pick` → `pickStandaloneQuestion` internal `requireAuth`: PARTIAL — callee is in another module; call site has no guard; internal gate claimed by Stage 2 Agent 5 cannot be verified from this source alone

### _wireRivalDelegation (line 147)
- AW-3 (accept-rival missing requireAuth): PASS — no guard before `respondRival()` confirmed
- AW-2 (respondRival gets raw dataset ID): PASS — `btn.dataset['id'] ?? ''` confirmed
- No innerHTML: PASS
- `encodeURIComponent` + `/u/` prefix: PASS — same pattern as take delegation

**10 PASS / 1 PARTIAL / 0 FAIL**

---

## Agent 2

### _wireTakeDelegation (line 41)
- AW-1: PASS — `become-mod` calls `toggleModerator(true)` directly; no requireAuth before it
- AW-2: PASS — `react(btn.dataset['id'] ?? '')`, `challenge(btn.dataset['id'] ?? '')` — no isUUID confirmed
- No innerHTML: PASS
- encodeURIComponent + /u/ prefix: PASS
- parseInt radix 10: PASS (both wager-confirm and input handler)
- confirmBtn DOM writes: PASS — `.disabled` and `.style.opacity` only

### _wirePredictionDelegation (line 89)
- requireAuth on predict: PASS — `if (!requireAuth('place predictions')) return;` confirmed
- wager-confirm guards: PASS — `parseInt` → `[1,500]` → `bal` check → `placePrediction` order confirmed
- AW-4 client-side-only bounds: PASS — guards are JS only; server enforcement unverifiable from this file
- standalone-pick callee internal requireAuth: PARTIAL — call site has no guard; callee module not provided

### _wireRivalDelegation (line 147)
- AW-3: PASS — no requireAuth before `respondRival()` confirmed
- AW-2: PASS — raw dataset ID to respondRival confirmed
- encodeURIComponent + /u/: PASS

**9 PASS / 1 PARTIAL / 0 FAIL**

---

## Agent 3 (note: used FAIL to mean "the code has the security gap" — these are confirmations of findings, not contradictions)

### _wireTakeDelegation (line 41)
- T1 (no innerHTML): PASS — only `.style.*` and `.remove()` found
- T2 (AW-1 become-mod): CONFIRMED — no requireAuth before toggleModerator (agent labeled FAIL = gap confirmed)
- T3 (encodeURIComponent + /u/): PASS — confirmed
- T4 (expand style-only): PASS — confirmed

### _wirePredictionDelegation (line 89)
- P1 (no innerHTML): PASS
- P2 (requireAuth on predict): PASS — `if (!requireAuth('place predictions')) return;` confirmed
- P3 (parseInt radix 10): PASS
- P4 (amount guards before placePrediction): PASS
- P5 (balance check before RPC): PASS
- P6 (input handler writes): PASS
- P7 (standalone-pick no wiring guard): PASS — no gate at call site; callee internal auth acknowledged

### _wireRivalDelegation (line 147)
- R1 (no innerHTML): PASS
- R2 (AW-3 accept-rival): CONFIRMED — no requireAuth before respondRival (agent labeled FAIL = gap confirmed)
- R3 (encodeURIComponent + /u/): PASS

**11 PASS / 0 PARTIAL / 0 FAIL** (agent's "FAIL" labels = finding confirmations)

---

## Agent 4

- AW-1: PASS — `become-mod` → `toggleModerator(true)` with no guard confirmed
- AW-2: PASS — all 6 dataset ID callsites pass raw strings: `react`, `challenge`, `shareTake`, `debateId` (wager-confirm), `pickStandaloneQuestion`, `respondRival` — none have isUUID
- AW-3: PASS — `accept-rival` → `respondRival()` with no requireAuth confirmed
- AW-4: PARTIAL — client-side pattern confirmed; server enforcement not verifiable from this file
- No innerHTML: PASS — confirmed absent in all 3 functions
- encodeURIComponent before URL: PASS — both profile branches confirmed
- requireAuth on predict: PASS — first statement in predict branch confirmed
- standalone-pick no wiring guard, callee unverifiable: PASS — accurate; trust Agent 5's prior claim

**7 PASS / 1 PARTIAL / 0 FAIL**

---

## Agent 5 (most thorough — also raised new notes)

### _wireTakeDelegation (line 41)
- No innerHTML: PASS
- AW-1 (become-mod): PASS — confirmed
- encodeURIComponent + /u/: PASS
- expand style-only: PARTIAL — description accurate but `moreEl.textContent?.includes('tap')` reads user-rendered DOM content to gate `.remove()`; no exploit path, just incomplete description
- mod-signup hardcoded literal: PASS

### _wirePredictionDelegation (line 89)
- No innerHTML: PASS
- requireAuth on predict: PASS
- parseInt radix 10: PASS
- amount guards before placePrediction: PASS
- balance check before RPC: PASS
- standalone-pick no wiring guard: PASS — confirmed; callee internal gate noted
- input handler DOM writes: PASS — `.disabled` and `.style.opacity` confirmed

### _wireRivalDelegation (line 147)
- No innerHTML: PASS
- AW-3 (accept-rival): PASS — confirmed
- encodeURIComponent + /u/: PASS
- showUserProfile fallback: PASS — `showUserProfile(btn.dataset['userId'] ?? '')` confirmed

**Additional notes (not new findings — awareness only):**
- `challenge`, `react`, `share`, `create-prediction` actions also have no wiring-level `requireAuth()` — same pattern as AW-1/AW-3. These actions likely enforce auth in their callee functions. Consistent Low-category pattern across the module.
- `accept-rival` promise chain lacks `.catch()` — `refreshRivals()` fires even on rejection. Robustness gap, not security.

**13 PASS / 1 PARTIAL / 0 FAIL**

---

## Consolidated Verdict

| Stage 2 Claim | S3 Verdict | All 5 Agents |
|---|---|---|
| AW-1: become-mod missing requireAuth | CONFIRMED | Unanimous |
| AW-2: dataset IDs to RPCs without isUUID | CONFIRMED | Unanimous |
| AW-3: accept-rival missing requireAuth | CONFIRMED | Unanimous |
| AW-4: wager bounds client-side only | CONFIRMED | Unanimous (AW-4 is architectural note, not directly verifiable from this file) |
| No innerHTML in any function | PASS | Unanimous |
| encodeURIComponent + /u/ prefix | PASS | Unanimous |
| requireAuth gates predict action | PASS | Unanimous |
| parseInt with radix 10 | PASS | Unanimous |
| confirmBtn DOM writes only | PASS | Unanimous |
| pickStandaloneQuestion internal requireAuth | PARTIAL | Unanimous — callee unverifiable from this file; call site has no wiring-level guard |

**Total: 15 PASS · 1 PARTIAL · 0 FAIL**

**No new findings introduced by Stage 3. All 4 Low findings from Stage 2 confirmed.**

**PARTIAL note:** `pickStandaloneQuestion()` internal auth — Stage 2 Agent 5 claimed to have read the callee and found `requireAuth()` as its first statement. This cannot be re-confirmed from `async.wiring.ts` alone. Treat as unverified from this file; the call site itself is ungated at the wiring layer.
