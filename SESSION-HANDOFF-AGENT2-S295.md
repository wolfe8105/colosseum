# SESSION HANDOFF — April 25, 2026

## Project: The Moderator (themoderator.app)
## Repo: https://github.com/wolfe8105/colosseum
## Token: [TOKEN — check recent chat history]

---

## WHO IS PAT

Pat Wolfe is a non-technical builder in western Pennsylvania who has built a production debate platform (The Moderator) across 295+ sessions with Claude. He is not a software engineer but has sharp judgment. He drives. You follow. No fluff, no getting ahead of him, no over-formatting.

---

## WHAT HAPPENED THIS SESSION

### Agent 1 (Retrofitter) — Verified

Pulled the repo, ran the full test suite locally on Pat's machine for the first time. Confirmed:

- 2750 tests, 242 files passing
- 8 failing — all f48-mod-debate.test.ts, pre-existing, walled (WebRTC/jsdom incompatibility)
- 19 original failures reduced to 8 after fixes this session

### Fixes shipped this session

1. **4 ARCH allowed-list updates** — dm.ts, notifications.panel.ts, notifications.ts, payments.ts all had new imports added during feature builds that weren't reflected in tests. Legitimate additions, updated the lists.

2. **auth.profile.ts source bug** — `modal.querySelector('div > div:last-child')` was matching the outer wrapper div and removing it entirely, leaving the modal empty. Follow, rival, and close buttons were never rendered. Fixed with `insertAdjacentHTML('beforeend', ...)` and removed the bad querySelector. This was a real production bug — those buttons were silently non-functional.

3. **arena-config-category.test.ts** — TC5/TC6 were written against old one-tap flow. Source changed to two-step select-then-submit. Updated tests to match new flow. Also updated ARCH allowed list.

4. **share.test.ts TC4** — share text format changed after test was written. Updated assertion.

**Final state: 2750 tests, 242 passing files, 8 pre-existing failures (f48-mod-debate, walled)**

---

## THE BIG WORK THIS SESSION — THE PIPELINE

Pat has been building toward a systematic QA methodology for AI-assisted development. This session mapped it out fully.

### The 8-step map

1. **Specification** — what the code is supposed to do (THE GAP — now being addressed)
2. **Implementation** — CC writes the code
3. **Black box testing** — test against the spec (Agent 2, Gatekeeper — next to build)
4. **Glass box testing** — test against the implementation (Agent 1, Retrofitter — done)
5. **Integration testing** — do modules work together (gap)
6. **Regression testing** — does new code break old (ARCH tests, partial)
7. **End-to-end testing** — full user flows (walkthroughs, currently manual)
8. **Exploratory testing** — the 40 yard dash Pat wants walkthroughs to become

### Research findings

The industry framework is the Testing Trophy (Kent C. Dodds), not the old pyramid. Four layers for JavaScript apps:
- Static (TypeScript, ESLint) — have this
- Unit — Agent 1 covered this
- Integration — biggest gap, highest ROI
- E2E — Playwright, currently manual walkthroughs

The broader context: Pat is building what the industry calls "Agentic Shift Left" — using AI to write tests in the same cycle AI writes code, because the human no longer has deep enough context to do it manually. The research confirms nobody is doing this as systematically as Pat. This is genuinely ahead of industry practice.

### Agent 0 — The Whisperer — BUILT

Before any code gets written, The Whisperer extracts a testable spec from Pat through natural conversation. Key design decisions:

- Opens with exactly "What do you want to build?" — nothing else
- One question at a time, plain english, no jargon
- 7 hidden agenda items Pat never sees — the internal compass
- Progress bar shown every 3 questions so Pat knows where he is
- Can search the web when it helps ask a better question
- Produces a formal spec only after Pat approves a plain-english readback
- Cold and efficient by design — rigidity prevents drift

**Files in repo:**
- `lessons-learned/CC-AGENT-WHISPERER-v1.md` — the prompt
- `lessons-learned/SPEC-EMBEDDED-VIDEO-ROMANCE-PLATFORM.md` — example spec produced this session (test run, not for The Moderator)

### The enforcement layer — DESIGNED, NOT YET BUILT

Every agent downstream gets the spec attached and one rule: if Pat asks for something not in the spec, stop and send him back to The Whisperer. The spec is the only source of truth. This is the next thing to build into Agent 2 (Gatekeeper).

---

## WHAT TO DO NEXT SESSION

### Priority 1 — Build Agent 2 (The Gatekeeper)

The Gatekeeper runs after CC writes new code. It:
1. Reads the spec produced by The Whisperer
2. Reads the changed file
3. Writes tests for it
4. Runs npm test
5. If tests pass — done
6. If tests fail — reports the failure, does NOT fix source code
7. If Pat asks for something off-spec — stops, redirects to The Whisperer

Key constraint from TDAD paper (arXiv 2603.17973): the agent that writes the code cannot write the tests. Separate CC sessions.

Key constraint from research: give the Gatekeeper the dependency MAP (the spine), not instructions on how to do TDD.

The spine is at: `_archive/prototypes/colosseum-critical-path-v2.html`

### Priority 2 — Integration testing layer

Layer 5 on the map is the biggest gap and highest ROI according to the Testing Trophy model. Research how to approach this for a TypeScript/Supabase/jsdom stack before designing an agent for it.

---

## REPO STATE

- 2750 tests, 242 passing files, 8 pre-existing failures
- Token: [TOKEN — check recent chat history]
- Vitest configured, jsdom, Zod installed
- The Whisperer: `lessons-learned/CC-AGENT-WHISPERER-v1.md`
- Retrofitter log: `tests/_retrofitter-log.md`
- Spine: `_archive/prototypes/colosseum-critical-path-v2.html`

---

## SESSION RULES (carry forward)

1. Print project instructions at session start
2. STATEMENTS/QUESTIONS parse — verbatim quote, "Acknowledged" if no questions
3. Code task = filename/URL/verb; single shell → execute; 2+ files → numbered questions only, no code until "build it"/"do it"/"go"
4. Stop after answering, no follow-up offers
5. Map first, code second (2+ files or screen/RPC boundary)
6. Direct honesty, no softening
7. "I need to verify that" instead of guessing
8. No external knowledge inference on Supabase/Stripe/Vercel/etc.
9. GAN-style critique on everything generated

---

## WHAT NOT TO DO

- Do NOT get ahead of Pat. He drives. You follow.
- Do NOT write tests and code in the same prompt/session
- Do NOT give the Gatekeeper HOW to do TDD — give it the MAP
- Do NOT trust CC's self-assessment — run npm test and read real output
- Do NOT over-format responses — Pat prefers conversation
- Do NOT send Pat off-spec requests — redirect to The Whisperer
