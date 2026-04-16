# Stage 3 Outputs — arena-lobby.cards.ts

Source: src/arena/arena-lobby.cards.ts
Anchors: renderArenaFeedCard (line 11), renderAutoDebateCard (line 40), renderPlaceholderCards (line 54)

---

## Agent 01

### renderArenaFeedCard — PASS

Stage 2 correctly describes the function. It derives `isAuto` and `isLive` from `d.debate_type`, builds `rulesetBadge`, `roundsBadge`, `badge`, `cardClass`, and `cardAttr` from `d` fields. `votes` is `(d.vote_count_a || 0) + (d.vote_count_b || 0)`. `cardAttr` is `data-debate-id` when live, else `data-link`. The score span is conditional on `d.score_a != null`. All user-supplied string fields pass through `escapeHTML`.

### renderAutoDebateCard — PASS

Stage 2 correctly describes the function. No conditionals. Always uses `data-link` pointing to `moderator-auto-debate.html`. Score is always rendered without a null guard. All label fields pass through `escapeHTML`.

### renderPlaceholderCards — PARTIAL

Stage 2 description says escapeHTML is intentionally omitted. This is an editorial inference — the source simply does not call escapeHTML because the mapped objects contain hardcoded string literals, not user data. Framing it as "intentional" adds a judgment the description cannot support from source reading alone. Additionally, Stage 2 does not note that placeholder cards lack an action button (`<button>`) element present in the other two card renderers.

**needs_review:**
1. `renderPlaceholderCards`: "intentionally omitted" characterization of escapeHTML is editorial inference — the source contains no comment or guard confirming intent; description should state "not called" not "intentionally omitted"
2. `renderPlaceholderCards`: Stage 2 does not note that placeholder cards have no action button, unlike `renderArenaFeedCard` and `renderAutoDebateCard`
3. `renderArenaFeedCard`: Stage 2 says "five local variables" but the count depends on how badge/cardClass/cardAttr chains are counted — ambiguous and could be clarified

---

## Agent 02

### renderArenaFeedCard — PASS

Stage 2 accurately describes all behavior. `isAuto` and `isLive` derivation, badge construction, vote summation, conditional `cardAttr`, conditional score span, escapeHTML on all user content — all confirmed against source.

### renderAutoDebateCard — PASS

Stage 2 accurately describes all behavior. Unconditional data-link, score always rendered, escapeHTML on labels — all confirmed against source.

### renderPlaceholderCards — PASS

Stage 2 accurately describes all behavior. Early return for `type === 'live'`, three hardcoded objects mapped to card strings, joined with empty string, no escapeHTML needed — all confirmed against source.

**needs_review:** none

---

## Agent 03

### renderArenaFeedCard — PASS

Stage 2 description is accurate. Conditional `cardAttr` (debate-id vs data-link), conditional score span, badge composition, vote summation, escapeHTML on user fields — all verified against source lines 11–38.

### renderAutoDebateCard — PASS

Stage 2 description is accurate. Hardcoded data-link target, unconditional score rendering, escapeHTML on all label fields — all verified against source lines 40–52.

### renderPlaceholderCards — PASS

Stage 2 description is accurate. `type === 'live'` early return returns arena-empty div. Three static objects mapped to card template literals joined with empty string — verified against source lines 54–72.

**needs_review:** none

---

## Agent 04

### renderArenaFeedCard — PASS

All Stage 2 claims verified. `isAuto = d.debate_type === 'auto'`, `isLive = d.debate_type === 'live'`. Badge values constructed from `d.ruleset`, `d.rounds_per_side`. `cardAttr` branches on `isLive`. Score span gated on `d.score_a != null`. `escapeHTML` called on `d.topic`, `d.participants`, and other user string fields.

### renderAutoDebateCard — PASS

All Stage 2 claims verified. No type branching. `data-link` always targets auto-debate page. Score always present. `escapeHTML` on `d.topic` and label fields.

### renderPlaceholderCards — PASS

All Stage 2 claims verified. Early return on `type === 'live'`. Static objects array has three elements. Mapped and joined. No escapeHTML calls — source data is all string literals.

**needs_review:** none

---

## Agent 05

### renderArenaFeedCard — PASS

Stage 2 description confirmed. One clarification: Stage 2 describes the score separator as an "em dash" but the source template literal contains `\u2013`, which is an **en dash**, not an em dash. This is a terminology error in the Stage 2 description, not a behavioral inaccuracy.

### renderAutoDebateCard — PASS

Stage 2 description confirmed. Same en-dash note applies: separator is `\u2013` (en dash), described in Stage 2 as "em dash."

### renderPlaceholderCards — PASS

Stage 2 description confirmed. Same en-dash note applies to the score separator character in the placeholder card template.

**needs_review:**
1. All three functions: Stage 2 describes the score separator as "em dash" but source uses `\u2013` (en dash) — terminology error across all three function descriptions
