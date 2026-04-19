# THE MODERATOR — ISSUE-HUNTING ATTACK PLAN
### Ordered for maximum issue capture using the Tactics Inventory
### Compiled: Session 259 (April 10, 2026)

---

## THE CORE INSIGHT

The Playbook's biggest stat: multi-pass specialized audits outperform one-shot "review everything" by **153%**. That number drives the shape of this plan. The plan is not "run every tactic." It's "run specific tactics in a specific order so each stage sets up the next and the three-pass audit hits maximum effectiveness."

Two variables matter per stage:
1. **What it catches** (which class of issue, which failure mode)
2. **What it enables** (which later stage depends on this being done first)

Dependencies drive the order. If you skip Stage 1, every finding in Stage 2 is suspect. If you run Stage 2 as one mixed prompt, you lose the 153%.

---

## HALLUCINATION MATH — WHAT YOU'RE HUNTING

Per the July 2025 ISSTA taxonomy (Playbook Group B1, Group H references):

| Class | Frequency | What it looks like | Catches it |
|---|---|---|---|
| Task Requirement Conflicts | **42%** | Code doesn't do what was asked. Wrong logic, missing requirements. | Stage 2.1 wiring check, Stage 4.1 smoke test |
| Factual Knowledge Conflicts | **32%** | Invented function names, wrong params, nonexistent methods. | Stage 1.1 schema drift, Stage 2.1 wiring, Stage 3.3 contract verify |
| Project Context Conflicts | **26%** | Uses project vars or patterns incorrectly. `debate.totalRounds` vs `total_rounds`. | Stage 1.2 bible drift, Stage 2.1 wiring, Stage 3.2 regression |

**No single stage catches all three.** That's why this plan is ordered — each stage targets different categories. By the end, all 100% have been hunted by at least one stage, most by two.

---

# STAGE 0 — ALWAYS RUNNING (the passive rails)

These never stop. They are not steps; they are the posture every other step operates in. If any of these slip during a step, that step's output is compromised and has to be redone.

- **A1 / Rule 7** — "I need to verify that" instead of guessing. Any factual claim without a tool call is invalid and must be redone.
- **A2 / Rule 8** — Zero inference about how Supabase/Stripe/Vercel/etc. "probably works." Bible docs + tool calls only.
- **D2 / Rule 2** — STATEMENTS/QUESTIONS parse on every Pat message. Prevents Claude from generating work from non-questions.
- **D4 / Rule 4** — Stop after answering. No follow-up offers between stages.
- **D5 / Rule 6** — Direct honesty. If a stage's output is weak, say so. Don't paper over gaps to look complete.
- **F1** — Full files, not patches. Every output is copy-paste ready.
- **F2** — Verify before claiming done. No "should work" — prove it with a tool call.

These rails are not rhetorical. They are the reason the 153% number is achievable. Drop Rule 7 for one stage and that stage's findings are contaminated.

---

# STAGE 1 — FOUNDATION INTEGRITY

**Goal:** Make sure the audit's reference material is not lying. If bibles or schema are drifted, every later stage operates from a false base and produces false findings.

**Why first:** If Stage 1 is skipped, Stages 2-5 are suspect. A wiring check against a stale NT will flag false positives (code referencing things the NT claims don't exist but actually do). A security audit against a drifted schema will miss real vulnerabilities (the audit looks at columns the RLS policy no longer protects).

## 1.1 Schema drift check — tactic B3

**Action:** Run `supabase db diff` if available, or `SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;`

**What it catches:**
- Columns that exist in migrations but not in production (failed migrations)
- Columns in production that no migration added (hand-edits)
- Default values that changed after the fact
- NOT NULL constraints that drifted
- This is the #1 cheapest catch for the biggest silent-bug class. "$35k per incident" per industry research.

**What it enables:** Every subsequent stage can now trust the schema as a reference. Without this, Stage 2.1 wiring check produces false findings every time a client calls a column that the code assumes exists.

**Fail condition:** If drift exists, **stop the entire plan.** Fix drift first. Do not proceed with audits on a drifted foundation.

## 1.2 Bible drift check — tactic G4

**Action:** Pick 5 random claims from NT, Wiring Manifest, and Land Mine Map. Verify each against actual code and live behavior via tool calls. If a bible claim is wrong, flag it before the audit uses it.

**What it catches:**
- Stale function signatures in the Wiring Manifest
- LM Map entries that reference columns that no longer exist
- NT claims about which RPCs are wired vs. dead
- Specifically: "supabase-deployed-functions-export.sql last re-synced Sxxx" claims that are false (this was LM-210 in S249)

**What it enables:** The audit's reference documents become trustable. Every subsequent stage can quote them as authoritative.

**Fail condition:** If bibles drifted, do a bible refresh mini-cycle before proceeding. Don't audit against lies.

## 1.3 Land Mine Map hunting list — tactic G2

**Action:** Before running the three-pass audit, extract from the LM Map every entry tagged to a feature or subsystem in the audit scope. Build a "specifically hunt for these" checklist.

**What it catches:**
- Known pitfalls that a generic audit prompt might miss
- Patterns that repeat (LM entries that say "same class of bug as LM-XXX")
- Historical burns that the audit should test for recurrence

**What it enables:** The three-pass audit in Stage 2 runs with a targeted checklist, not just generic prompts. This is the difference between "review the code" and "review the code AND specifically check these 15 things we know have bitten us before."

## 1.4 Phantom blocker sweep — tactics G8, G9, D7

**Action:** Scan the Punch List for any feature marked "NOT WALKED," "unknown," "TBD," "undefined," or with a description that doesn't match verified code. For each phantom, walk it using questionnaire mode (tactic D7) — ask every question up front, resolve the feature into one of four states: **specced-and-pending / shipped-and-documented / deleted / scratched**.

**What it catches:**
- Phantom blockers (features that block downstream work but turn out not to exist, F-32 pattern)
- Misnamed features (punch list says "AI Coach," code shipped an "AI scorecard rubric" — same thing, wrong label for 30+ sessions)
- Features that shipped without documentation (walk them to discover, then document)
- Features that were specced but never built (walk them to confirm the spec)
- Features that were deleted but still listed (scratch them)

**Why here:** You can't audit a feature whose actual state you don't know. Every phantom blocker on the list skews the audit's scope estimate and either wastes later-phase effort (auditing something that doesn't exist) or misses real coverage gaps (not auditing something that does). **Never trust punch-list row text for unwalked features** — verify against code and Product Vision first (tactic G9).

**What it enables:** Every later stage operates on a verified feature list. Stage 2.1 wiring check doesn't waste cycles on deleted screens. Stage 2.2 security pass doesn't audit RPCs that were scratched. Stage 5.3 triage has a clean feature inventory.

**Expected resolution rate:** 3-10 phantoms in a 200+ session project. F-32 alone was a 30-session phantom.

---

# STAGE 2 — THE THREE-PASS AUDIT (the core)

**Goal:** Run the specialized-prompt audit. Three separate passes. Never mixed. Each pass has its own standardized output format so findings are directly comparable and rankable.

**Why the order matters:** Wiring before security because you can't attack what you haven't mapped. Security before timing because exploits are higher severity and finding them changes the timing audit's focus. Timing last because it's the most runtime-dependent and least catchable statically.

**Why specialized prompts and not one combined prompt:** Playbook anti-pattern. "One-shot review everything catches style nits and misses architectural problems. Multi-pass with specialized prompts outperforms single-pass by 153%." The 153% is the reason this stage is three steps, not one.

## 2.1 Pass A — Wiring check — tactics H1, H5

**Action:** For every numbered element in THE-MODERATOR-UI-INTERACTION-MAP.md, verify four things: EXISTS (DOM or TS creates it), WIRED (handler attached, data-action handled), WORKS (handler calls the right function with right params), REACHABLE (user can actually get to it via navigation). Output: ✅/⚠️/❌ per element plus a summary block.

**What it catches:**
- **42% Task Requirement Conflicts** — missing handlers, wrong function calls, unreachable screens, buttons wired to functions that no longer exist, data-action values with no delegation handler
- Some 32% Factual Knowledge Conflicts — references to RPCs/columns/functions that don't exist (found at the call site)
- Some 26% Project Context Conflicts — references to correctly-named but wrong-purposed functions
- CSP violations (inline scripts, unsafe-inline)
- Dead screens (exist in code but no navigation path reaches them)

**What it enables:** Stage 2.2 security pass now knows what's actually connected vs. dead code. You can only attack live paths. Dead paths still matter (see "immature vulnerabilities" below) but they're handled differently.

**Claude Code is the right tool here.** This is grep-intensive across 50+ files with a focused prompt. Feed it CLAUDE-CODE-UI-AUDIT-PROMPT.md or CLAUDE-CODE-FULL-AUDIT.md Pass 1.

## 2.2 Pass B — Adversarial security scan — tactics C2, H2, H5

**Action:** Put on the black hat. Six sub-steps from CLAUDE-CODE-FULL-AUDIT.md:

1. **Attack surface map** — list every RPC call with params that come from user input, every .from().insert/update/delete, every place user input enters (forms/URL/localStorage/postMessage), every place data renders into HTML.
2. **RPC security** — for each RPC: auth check, param tampering, button disabled on first click, error handling.
3. **XSS** — escapeHTML() on all user strings, avatar URL validation, URL param reflection, innerHTML with unescaped data.
4. **Privilege escalation** — can non-moderators call mod functions, can members call leader functions, can anyone reach credit_tokens, can User A affect User B.
5. **Race conditions** — FOR UPDATE on balance/count/status updates, double-spend, single-winner ops.
6. **Open redirects** — returnTo/redirect/next param validation, window.location from user input, UUID validation.

**Crucially:** hunt immature vulnerabilities — dead code with dangerous permissions, unfinished features with open auth, RPCs that exist but nothing calls yet. These become critical the moment someone wires them up.

**Output format (standardized):**
```
SEC-XX: [CRITICAL/HIGH/MEDIUM/LOW]
FILE: filename.ts:line
WHAT: One sentence
EXPLOIT: How an attacker uses this
CHAIN: What other findings combine with this
FIX: Specific fix
```

**What it catches:**
- Exploitable vulnerabilities (guard trigger bypass, self-voting, forged wins — the ADV-1 through ADV-8 class from Sessions 211-214)
- Chained exploits (one exploit enables another)
- Dormant vulnerabilities waiting to become live
- CORS misconfigurations, hardcoded credentials, missing RLS

**What the CHAIN field enables:** Stage 3 can rank findings by which ones combine into catastrophic chains, not just by individual severity. A self-voting bypass alone is annoying. Chained with a forged-win exploit and a leaderboard corruption, it's catastrophic.

## 2.3 Pass C — Failure and timing — tactics H3, H5

**Action:** Seven sub-checks from CLAUDE-CODE-FULL-AUDIT.md, run as a **separate prompt** from Pass A and B. Mixing them produces noise — this is documented.

1. **Double-tap** — every button click handler disabled immediately before await? Sync guard variable? Focus on: vote buttons, queue join, token-spending, match accept/decline, follow/rival, modal buttons.
2. **Polling leaks** — every setInterval/polling setTimeout/.subscribe() has matching clearInterval/unsubscribe? Cleanup on nav away? Can be started twice?
3. **Async error handling** — every await rpc/fetch checked? User sees what on failure? Loading state cleaned up in error path? Retry possible or UI stuck?
4. **WebRTC failures** — TURN fetch failure, peer connection timeout, ICE restart exhaustion, mid-debate disconnect, track/stream cleanup.
5. **Realtime subscription cleanup** — every .channel()/.subscribe() has matching removeChannel/unsubscribe? setAuth() before private channels? Double-subscribe prevention?
6. **Navigation state corruption** — back button during async, back from debate room, manual URL change mid-state, tab background/foreground.
7. **Balance timing** — read-then-write gaps, optimistic UI rollback on RPC failure.

**Output format (standardized):**
```
TIMING-XX: [CRITICAL/HIGH/MEDIUM/LOW]
FILE: filename.ts:line
CATEGORY: (double-tap | polling-leak | async-error | webrtc | realtime-sub | nav-corruption | balance-timing)
WHAT: One sentence
SCENARIO: How this fails in real use
FIX: Specific fix
```

**What it catches:**
- Runtime-only bugs that don't show in static review
- Memory leaks from orphaned polls/subscriptions
- Race conditions in user-visible paths (different from 2.2's DB-level races)
- Failure modes that only trigger under real network conditions
- The class of bugs the 75-finding cleanup caught last: double-tap, polling stacking, nav corruption

**What it enables:** By the end of Stage 2, you have three standardized finding lists: wiring (✅/⚠️/❌), security (SEC-XX), timing (TIMING-XX). They can be triaged together in Stage 3.

**GAN checkpoint after Stage 2:** Before moving to Stage 3, take the combined finding list and stress-test it. What did the audit miss? What assumptions did each pass make that could be wrong? What feature areas have zero findings and is that because they're clean or because they weren't actually audited? Apply C1 GAN critique to the audit itself, not just its outputs.

---

# STAGE 3 — DEEP VALIDATION

**Goal:** Validate the Stage 2 findings. Eliminate false positives. Find what Stage 2 missed because it operated on code and needs database/runtime context.

**Why here:** Stage 2 findings are suspect until validated against live state. And some issue classes (direct-call RPC exploits, recent regressions) only show up when you cross-reference multiple sources.

## 3.1 RPC/RLS audit — tactic I2

**Action:** For every new or changed DB function: auth (verifies caller?), authorization (can User A affect User B's data?), balance guards (can values go negative?), race conditions (uses FOR UPDATE or CHECK constraints?), input validation (rejects bad input?), idempotency (calling it twice causes double effects?). Every table checked for Row Level Security.

**Key question:** "Can someone who shouldn't be able to do this, do it anyway by calling the RPC directly?" Bypass the UI entirely. Assume an attacker has the RPC name and params and direct Supabase client access.

**What it catches that Stage 2.2 didn't:** Stage 2.2 operates on client code — it finds exploits reachable through the UI. Stage 3.1 operates on server code — it finds exploits reachable through direct RPC calls regardless of UI. These are two different surface areas. Something can be secure from the UI and catastrophic from direct call.

**What it enables:** A complete picture of both attack surfaces (client-side + server-side).

## 3.2 Regression spot-check — tactic H4

**Action:** Verify the 3-5 most recent prior fixes still hold. Changes in any recent batch may have silently undone a previous fix. Specifically check: stale audit findings marked "already done" that actually regressed, column names or function signatures that were corrected but got overwritten, integration points verified in a prior session but touched by new code.

**What it catches:**
- Silent regressions (fixes that got undone)
- 26% Project Context Conflicts where the code was fixed in one place but not propagated
- Stale "done" statuses on punch list items that are no longer done

**What it enables:** Trust in the recent-fix list. Without this, you don't know which "already fixed" items are actually fixed vs. silently broken again.

## 3.3 Contract verification on high-severity findings — tactic B1

**Action:** For every CRITICAL or HIGH finding from Stage 2, apply full contract verification: pull actual current values via tool calls, verify the exploit is real, confirm the fix doesn't break a dependency. Eliminate false positives.

**What it catches:**
- Audit false positives (findings that looked real but don't match the actual schema)
- Cascading effects of the proposed fixes
- Fixes that would create new issues

**What it eliminates:** The noise that wastes triage time. A CRITICAL finding that's actually a false positive burns hours of emergency work before someone realizes. Contract verification on every high-severity finding catches that before it happens.

**Why this comes after Stage 2 and not before:** Before Stage 2, you don't know what to verify. After Stage 2, you have a specific list of claims to verify. Running contract verification on specific findings is cheap; running it on "the whole codebase" is the same work as the audit itself.

---

# STAGE 4 — EXTERNAL PERSPECTIVE

**Goal:** Catch what everything above missed because it all operated from inside the project's assumptions.

**Why here:** The previous stages share the same context, the same bibles, the same map, the same Claude session. They have the same blind spots. External perspective is the only thing that catches what the internal perspective is structurally incapable of seeing.

## 4.1 Smoke test — tactic I1

**Action:** 10 flows on a real device, real network, 15-25 minutes. Phone in hand, not reading code. Click, tap, navigate, break. Covers: signup/login, core feature, navigation between every major screen, guest vs authenticated behavior, share/social, payment (if applicable), error states (disconnect wifi mid-action), mobile viewport edges.

**What it catches:**
- **The rest of the 42% Task Requirement Conflicts** that static analysis missed. Things that look fine in code but fail in a browser. Touch target issues. Scroll traps. Back button behavior. Things the user sees that the code review can't see.
- Performance under real network (cold cache, slow 4G)
- Mobile-specific failures (on-screen keyboard pushing layout, iOS safe area)

**What no tool replaces:** This is you, on the phone, with real fingers. No AI audit reproduces this.

## 4.2 Outside-in review — tactic J1 (run TWICE — once at start, once at end)

**Action:** Post the codebase or specific files to a **fresh Claude session with zero project context.** Ask: "What's wrong with this?" No bibles loaded. No session history. Read it like someone seeing it for the first time.

**Run it twice:**
- **First pass: BEFORE Stage 1.** Catches framing problems before the audit gets cognitively loaded. The things a fresh reader notices in the first 30 seconds that get invisible after you've stared at the code for 8 hours. If the first-pass review flags something architectural, that finding shapes every later stage.
- **Second pass: at this position (Stage 4.2), after all audits complete.** Catches what the audit team (you + me) missed because we loaded cognitive context during the deep work. Different findings, same technique.

The fresh-eyes multiplier is **twice, deliberately.** Once at the top sets framing; once at the bottom catches post-audit drift.

**What it catches:**
- Architectural problems invisible from inside the project (dual table debt, monolith trap, context drift)
- Assumptions baked in from session 1 that everyone stopped questioning
- Patterns that look idiomatic because you see them everywhere but are actually anti-patterns
- The "everyone who works on this project believes X but X is wrong" class of issue

**Why it's a separate stage and not part of 2 or 3:** A context-loaded Claude session is structurally incapable of catching these. The very thing that makes the main session good at everything else — rich context — is the thing that hides architectural drift. You need a naive reviewer. The Playbook calls this out: "Every major architectural problem was invisible from inside the project until an outside perspective made it obvious."

---

# STAGE 5 — CLOSE THE LOOP

**Goal:** Lock in the audit's output as institutional knowledge so the next audit starts from a higher baseline, and make sure the top findings get the right fixes.

## 5.1 Research-refined research on top findings — tactic C6

**Action:** For the top 5-10 findings (CRITICAL and HIGH from the combined Stage 2-4 output), do the research loop: broad web search for the issue class, then refined search using vocabulary from the first results. Validate that the proposed fix matches the industry's current best-known solution.

**What it catches:**
- Bad fixes before they get applied
- Outdated fix patterns (a 2021 StackOverflow answer that's now known to be wrong)
- Fixes that solve the symptom but miss the root cause
- Novel alternatives nobody on the audit team knew about

**Why at this point:** Before Stage 5, you had findings but no validated fix approach. Researching fixes earlier is wasted effort if the finding turns out to be a false positive (eliminated in Stage 3.3). After Stage 3.3, the finding list is clean enough to invest research time in.

## 5.2 Land Mine Map additions — tactic G2

**Action:** For every real issue the audit found, write an LM Map entry in the standard format: DECISION / PROTECTS / BITES WHEN / SYMPTOM / FIX / SESSIONS. Add to THE-MODERATOR-LAND-MINE-MAP.md.

**What it enables:** The next audit starts from a higher baseline. Every audit that runs this plan grows the LM Map, and every subsequent Stage 1.3 has a bigger hunting list. This is the compounding effect — audits get cheaper and more effective every time.

**This is the close-the-loop step that most audit plans skip.** Without it, the same issues get found and forgotten every audit cycle.

## 5.3 Triage into fix phases

**Action:** Group findings by severity AND blast radius, not just severity. Create fix phases:

- **Phase 0: Blocks launch / actively exploitable** — fix immediately, no discussion
- **Phase 1: Breaks core features** — fix this sprint
- **Phase 2: Systemic debt** — one fix covers many findings, do in a dedicated batch
- **Phase 3: Cosmetic / low-impact** — backlog

Group systemic findings into batches (the "31 missing RPCs" pattern from Session 214 — one pg_dump export fixed 31 findings).

**What this enables:** A fix sequence that matches Pat's foundation-up instinct from Session 214 — fix the layer 1 issues first because everything else depends on them. Random-order fixing creates merge conflicts and wasted work.

---

# COVERAGE MATRIX — which stage catches which issue class

Every issue class needs at least one primary catcher. Classes with only one catcher are the ones that slip through if that stage gets skipped — those are non-negotiable.

| Issue class | Primary catcher | Backup catcher |
|---|---|---|
| Schema drift | 1.1 | 3.3 |
| Doc-code drift | 1.2 | 5.2 |
| Known-pattern recurrences | 1.3 | 2.2 |
| Phantom blockers | **1.4 (only)** | — |
| Dead code / unreachable screens | 2.1 | 2.2 (immature vulns) |
| Task Requirement Conflicts (42%) | 2.1 | 4.1 |
| Factual Knowledge Conflicts (32%) | 2.1, 3.3 | 1.1 |
| Project Context Conflicts (26%) | 2.1, 3.2 | 1.2 |
| UI-reachable exploits | 2.2 | — |
| Attack path chains | **2.2 (only)** | — |
| Dormant vulnerabilities | 2.2 | — |
| Direct-RPC exploits | 3.1 | — |
| UI race conditions | 2.3 | 4.1 |
| Memory leaks / polling stacks | 2.3 | 4.1 |
| Real-network bugs | **4.1 (only)** | — |
| Architectural debt | **4.2 (only)** | — |
| Post-audit narrative drift | **4.2 second pass (only)** | — |
| Silent regressions during audit | 3.2 | 4.2 second pass |
| Bad fix choices | 5.1 | — |

**Stages with no backup (skip at your peril):** 1.4 phantom sweep, 2.2 adversarial, 4.1 smoke test, 4.2 outside-in. Everything else has at least one fallback.

---

# EXPECTED YIELD PER STAGE

Anchored to evidence from The Moderator (Sessions 211-214 produced 75 findings across 12 flows + adversarial + race conditions) and the PLAYBOOK's stats on 230+ sessions.

| Stage | Expected findings | Notes |
|---|---|---|
| 1.1 Schema drift | 5-15 | Low count, high severity — each invalidates downstream |
| 1.2 Bible drift | 10-30 | High count, low severity each |
| 1.3 LM hunting list | N/A (enables 2.2) | No direct findings, multiplies 2.2 accuracy |
| 1.4 Phantom sweep | 3-10 | Each phantom unlocks or deletes downstream work |
| 2.1 Wiring | 5-20 | Dead code dominates |
| 2.2 Adversarial | **15-75** | **Highest severity. Sessions 211-214 = 75.** |
| 2.3 Timing | 10-30 | Often entirely missed without a dedicated pass |
| 3.1 RPC/RLS | 5-20 | Direct-call surface — hidden from 2.2 |
| 3.2 Regression | 2-10 | Compounding drift catch |
| 3.3 Contract verify | Eliminates 10-30% of Stage 2 false positives | Filters, not adds |
| 4.1 Smoke test | 5-15 | UX-heavy, real-network bugs |
| 4.2 Outside-in (×2) | 5-20 | Architectural + post-audit drift |
| 5.1 Research fixes | Prevents bad fixes | Quality, not quantity |
| 5.2 LM additions | N/A (compounds future audits) | Institutional memory |

**Total expected:** 80-200 findings for a project this size with no prior systematic audit. Fresh run on current Moderator state (post-Session-214 cleanup): probably 20-50 additional findings, mostly drift, timing, and architectural.

---

# WHAT THIS PLAN DOES NOT CATCH

Rule 6 honesty. Any audit plan that claims to catch everything is lying. This plan specifically does not catch:

- **Business logic bugs.** Is the token economy balanced? Does the leveling curve feel fair? Does the debate format actually produce good debates? These need playtesting with real users, not audits. The plan will tell you the code works as written. It won't tell you whether "as written" is the right thing.

- **Pure UX problems.** Users find something confusing. The flow is technically correct but emotionally wrong. A wiring check says ✅ and a smoke test by the developer says ✅ but real users bounce. This is caught by user research, not by anything in this plan.

- **Performance under production load.** Smoke test on one device on home wifi doesn't reveal what 1000 concurrent users on 4G do to your Supabase connection pool. Only real traffic reveals this. The plan's Phase 4 partially covers it with real-device testing but can't simulate scale.

- **Novel attack vectors you didn't think to look for.** The adversarial pass only catches attacks that fit the six sub-categories in its prompt. A seventh attack class — something the industry hasn't documented yet — will pass through. Mitigate with outside-in review (Stage 4.2), but don't assume completeness.

- **Hallucinated plans.** This plan itself could be wrong. The order could be suboptimal. A tactic could be missing. GAN critique this plan before running it — that's C1 applied to the attack plan itself.

- **Issues in the tactics inventory.** If the inventory is missing a tactic, this plan is missing a stage. This plan is as good as its source document.

---

# EXECUTION NOTES

**Budget:** Realistic session budget for a full run on a codebase the size of The Moderator is 4-8 chat sessions plus 1-2 Claude Code sessions plus 30 minutes of smoke testing on a phone. Anyone claiming less is skipping stages.

**Tool distribution (from Playbook Tooling Map):**
- Stages 1.1, 1.2 → Terminal + Chat
- Stage 1.3 → Chat
- Stage 2.1 → Claude Code (grep-intensive)
- Stage 2.2 → Claude Code (scan) then Chat (chain analysis)
- Stage 2.3 → Claude Code (dedicated timing prompt)
- Stage 3.1 → Claude Code (SQL review)
- Stage 3.2 → Chat (needs session history)
- Stage 3.3 → Chat (needs bible context)
- Stage 4.1 → Pat, on phone
- Stage 4.2 → Fresh Claude session, no project loaded
- Stage 5.1 → Chat
- Stage 5.2, 5.3 → Chat

**When to stop mid-plan:** If Stage 1.1 finds major drift, stop the plan and do a drift-fix cycle first. If Stage 2.1 finds the codebase is already broken at the wiring level, fix that before running 2.2 and 2.3 — no point auditing security on code that doesn't connect. If Stage 2.2 finds CRITICAL exploits, fix those before proceeding — don't spend hours on timing analysis while actively exploitable holes exist.

**Parallelization:** Stages 2.1, 2.2, 2.3 can run in parallel if you have enough Claude Code sessions to spare, because each has an independent prompt and produces an independent finding list. Stages 3.1, 3.2, 3.3 can run in parallel after Stage 2 completes. Stages 4.1 and 4.2 are independent and can run simultaneously. Stage 5 must be sequential.

**Which stages cost the most per finding:** Stage 4.2 (outside-in) has the highest findings-per-effort ratio because a fresh-session review is cheap (15 minutes) and catches architectural problems worth dozens of line-level findings. Stage 5.1 (research on top findings) has the highest findings-per-fix-quality ratio because bad fixes create new findings. Stage 2.2 (adversarial) has the highest severity-per-finding ratio because security issues are usually CRITICAL.

**Which stages are the most skipped:** Stage 1 (foundation) — everyone wants to jump to the audit. Stage 5.2 (LM additions) — everyone wants to move to the next feature. Stage 3.3 (contract verification on findings) — everyone trusts their own audit output. All three of these have been skipped in past sessions and every skip produced wasted work downstream.

---

# THE ONE-SENTENCE VERSION

*Foundation → three specialized audit passes → validation → external perspective → close the loop, with Rule 7 and GAN critique running throughout, every finding cross-checked via contract verification before fix research begins.*

---

*Built from THE-MODERATOR-TACTICS-INVENTORY.md. Every stage references specific tactics by ID. This plan is only as good as the inventory it's built from — if a tactic is missing there, it's missing here.*
