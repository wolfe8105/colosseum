# THE MODERATOR — TACTICS INVENTORY
### Every tactic for keeping Claude in check, grouped by what it does
### Compiled: Session 259 (April 10, 2026)
### Sources: All repo docs + deep scan of all project chats

---

## HOW TO READ THIS

Each tactic has: **ID**, **Name**, **What it does**, **Where it came from** (doc or chat), and **Status** (active/superseded/evolved). Tactics that are the same idea in different clothes are grouped and cross-referenced.

---

# GROUP A: ANTI-HALLUCINATION — Stop Claude from making shit up

## A1. Rule 7 — "I need to verify that"
**What:** Explicit permission to admit uncertainty. When unsure about any schema name, column, RPC signature, file path, table, or function name, say "I need to verify that" instead of guessing.
**Source:** Derived from Anthropic's "reduce hallucinations" doc (Strategy 1: allow Claude to say "I don't know"). Drafted in chat 5fb59ed0, formalized as Rule 7 in project instructions.
**Status:** Active (project instructions rule 7).

## A2. Rule 8 — External knowledge restriction
**What:** Don't infer how Supabase/Stripe/PM2/Vercel/Cloudflare/DigitalOcean "probably works" from training knowledge. Use only bible docs + verified tool calls. If neither covers it, say so.
**Source:** Same session as A1 (chat 5fb59ed0). General knowledge about platform behavior had been wrong multiple times.
**Status:** Active (project instructions rule 8).

## A3. Information_schema query before RPC writes
**What:** Run `SELECT column_name FROM information_schema.columns WHERE table_name = 'X'` before writing any new RPC that touches a table. Mechanical enforcement of A1.
**Source:** LM-186 (Session 147). Caught wrong column names (`user_id`/`rival_id` vs actual `challenger_id`/`target_id`) before running migration.
**Status:** Active (embedded in LM-186 as a pattern rule).

## A4. Tool execution for deterministic answers
**What:** When math or exact values matter, write code and let the interpreter return the answer instead of predicting it token-by-token. "2+2 is still probabilistic when I answer inline."
**Source:** Chat 9b715f02 (Session 190 discussion about whether rules help).
**Status:** Active (implicit — used when math matters).

## A5. Hard research gate
**What:** Before any code or technical output, explicitly name what you're searching and why, run the searches, then present findings. No exceptions for "simple" tasks.
**Source:** Memory edit #2 (early sessions). One of the original three memory edits that survived the memory cleanup.
**Status:** Superseded by the research-refined-research loop (C6) which is more structured.

---

# GROUP B: PRE-CODE VERIFICATION — Catch problems before writing

## B1. Contract verification (Phase 1A)
**What:** Before any multi-file change, identify every file/RPC/column/function the change touches. Pull actual current values via tool calls — never from memory. Verify both sides of every interface agree on names, types, values, expected behavior. Flag mismatches before writing a line.
**Source:** THE-PLAYBOOK.md Phase 1A. Catches Factual Knowledge Conflicts (32%) and Project Context Conflicts (26%) per the ISSTA hallucination taxonomy.
**Status:** Active (PLAYBOOK Phase 1A).

## B2. Blast radius analysis (Phase 1B)
**What:** After verifying contracts, walk the dependency graph outward: what else depends on what you're changing? Check downstream files, not just the ones being directly modified. The Wiring Manifest has CALLED FROM / EXPECTS / BLAST RADIUS fields for this.
**Source:** THE-PLAYBOOK.md Phase 1B. Wiring Manifest structure.
**Status:** Active (PLAYBOOK Phase 1B).

## B3. Schema drift check (Phase 1C)
**What:** Before any code batch, verify the live database matches what the code expects. Run `supabase db diff` or query `information_schema.columns`. If output shows drift, stop — fix drift before writing new code.
**Source:** THE-PLAYBOOK.md Phase 1C. "$35k average cost per incident" stat cited.
**Status:** Active (PLAYBOOK Phase 1C).

## B4. Map first, code second (Rule 5)
**What:** Before any code change touching 2+ files or crossing screen/RPC boundaries: (a) trace full flow end-to-end with filenames + line numbers, (b) identify every failure/divergence point, (c) write numbered test plan with expected outcome at each step. Present map to Pat before writing code. No exceptions.
**Source:** The single most-repeated tactic in the project. Appears in: Role Constraints doc, project instructions rule 5, NT line, PLAYBOOK Phase 1, multiple chat sessions. First formalized around Session 111-121.
**Status:** Active (project instructions rule 5). **This is the most important rule in the project.**

## B5. "Show me what it touches and prove the values match"
**What:** Pat's casual shorthand for B1+B2+B4 combined. Same work, informal trigger.
**Source:** Chat 8bfcf288 (Sessions 211-214 reflection — "the 75-finding cleanup could have been 15-minute checks").
**Status:** Active (informal — same as B4).

## B6. Read-first rule for build briefs
**What:** Before writing any code, read specific listed files in the repo first. Don't skim. The build brief names which files, which line ranges, which LM entries. "Don't guess signatures — grep this file."
**Source:** F-55-BUILD-BRIEF-FOR-CLAUDE-CODE.md (Session 252). Also appears in CLAUDE-CODE-FULL-AUDIT.md ("Read THE-MODERATOR-UI-INTERACTION-MAP.md first").
**Status:** Active (build brief format).

---

# GROUP C: SELF-CRITIQUE / ADVERSARIAL THINKING — Attack your own work

## C1. GAN-style critique (Rule 9)
**What:** Generator produces the plan/code/spec, Discriminator tears it apart. Present critique alongside the plan — not "here's the solution" but "here's the solution AND here's what's wrong with it." Applies to everything: code, specs, architecture, feature designs.
**Source:** First discussed in chat 290dd650 (Session 181). Pat asked "what does this mean to you?" Claude defined it as two internal roles. Added as Rule 9 in project instructions.
**Status:** Active (project instructions rule 9).

## C2. Adversarial pass with attack path chaining (Phase 2B)
**What:** Black hat mode. For every feature: list what's valuable, prioritize by damage potential, think of every way to get to it (XSS, console manipulation, privilege escalation, RPC abuse, race conditions), check if exploits chain across features, block the paths. Explicitly hunt immature vulnerabilities (dead code with dangerous perms, unfinished features with open auth).
**Source:** THE-PLAYBOOK.md Phase 2B. Used in Sessions 211-214 (produced ADV-1 through ADV-8). Named by Pat as "the adversarial pass" after the fact.
**Status:** Active (PLAYBOOK Phase 2B).

## C3. Multi-pass specialized prompts (not one-shot "review everything")
**What:** Security, wiring, timing — separate prompts. One-shot "review everything" catches style nits and misses architecture. 2026 AgenticSCR research: multi-pass outperforms single-pass by 153%.
**Source:** THE-PLAYBOOK.md anti-patterns section. Chat ba97fb5d (Session 192 research). CLAUDE-CODE-FULL-AUDIT.md (three passes defined).
**Status:** Active (PLAYBOOK + audit prompt format).

## C4. Two competing reviewers
**What:** Adversarial debate loop — two agents independently review same code, critique each other's findings, respond to critiques, three rounds, then synthesis decides which issues are valid. The gain is going from 1 to 2 reviewers, not from 2 to 4.
**Source:** Chat ba97fb5d (Session 192 web research on adversarial subagents). Explored but not systematically adopted.
**Status:** Explored, not formalized. Could be used via Claude Code agent teams.

## C5. "Research your own critiques on the web"
**What:** After Claude produces a GAN critique, Pat says "research your critiques on the web and see what you find." Forces Claude to validate its own concerns against real-world evidence. Catches both over-caution and missed issues.
**Source:** Chat 9a562692 (Session 209 — "research your critiques on the web"). Used multiple times.
**Status:** Active (informal — Pat triggers it verbally).

## C6. Research → refined research → build
**What:** Three-step loop: (1) broad web search, (2) take words/concepts learned and do a second refined search, (3) build from validated understanding. Prevents Claude from building on shallow initial search results.
**Source:** Chat 6491e9ee (Pat's original description: "first thing is check the web... next thing is to use the words and concepts you just learned to do another more refined search"). Used extensively in Sessions 167, 192, 201, 209, 233, and many others.
**Status:** Active (Pat triggers with "take the words and concepts you have learned and refine your research on the web").

---

# GROUP D: SESSION DISCIPLINE / FLOW CONTROL — Keep Claude on rails

## D1. Rule 1 — Print project instructions at session start
**What:** First thing every session: print the rules. Forces Claude to re-read its instructions before doing anything.
**Source:** First appeared in the "Different lens" chat (bfd883e5). Carried forward in all handoffs.
**Status:** Active (project instructions rule 1, carried in handoffs).

## D2. Rule 2 — STATEMENTS/QUESTIONS parse
**What:** Parse every Pat message into two verbatim-quoted lists. Question = ends in "?" OR starts with interrogative word. If QUESTIONS empty → "Acknowledged" and stop. If non-empty → answer only those, ignore statements.
**Source:** Developed across chats bfd883e5 and 0f0a6e2e. Multiple iterations to get the phrasing right (Pat: "you often get lost with instructions this long and detailed. rephrase").
**Status:** Active (project instructions rule 2, carried in handoffs).

## D3. Rule 3 — Code-task trigger words + "build it" gate
**What:** Code task = filename, repo URL, or verb from {build,write,fix,edit,refactor,clone,run,deploy,install}. Single shell command → execute immediately. 2+ files or new code → numbered questions only, no code until "build it" / "do it" / "go".
**Source:** Evolved from Rule 0e (chat bfd883e5). Originally just "no code until Pat says build it." Expanded to include trigger-word detection and the single-command-vs-multi-file split.
**Status:** Active (project instructions rule 3, carried in handoffs).

## D4. Rule 4 — Stop after answering
**What:** After answering, stop. No follow-up offers. No "want me to...", "should I...", "next step is...". Pat will say what's next.
**Source:** Role Constraints doc ("One Thing at a Time" section). Formalized as Rule 4.
**Status:** Active (project instructions rule 4).

## D5. Rule 6 — Direct honesty, no softening
**What:** "No, that's wrong" when Pat is wrong. "That won't work" + reason when a plan has holes. No "have you considered" or "that's a great idea, but." Confirm and move when Pat is right. Don't invent pushback for the sake of it. Posture: respected coworker, not assistant.
**Source:** Role Constraints doc ("Direct Honesty" section). Project instructions rule 6.
**Status:** Active (project instructions rule 6).

## D6. Repeat-back interpretation
**What:** Confirm what you understood in one sentence before doing anything. Never assume you know what Pat means. Repeat it back. Don't flip between "getting it instantly" and "needing everything spelled out." Default to asking.
**Source:** Role Constraints doc ("Predictability Over Brilliance" section).
**Status:** Active (Role Constraints, not numbered as a project instruction rule).

## D7. Questionnaire mode (all questions up front)
**What:** Before building: surface every question Claude can think of as a numbered list (or interactive widget). Could be 10 or 1000. Resolve all before writing code.
**Source:** Chat 6491e9ee (Pat: "i would want you to create a questionnaire... ask all the questions YOU can think of, up front"). Used for dialog box design (30 questions), live feed panel (27 questions), F-23/F-24/F-32 walks (25 questions each).
**Status:** Active (used for major feature walks and new builds).

## D8. "Acknowledged" and stop
**What:** When Pat's message contains only statements and zero questions, respond with "Acknowledged" and stop. Don't generate work, don't ask questions, don't elaborate.
**Source:** Part of Rule 2 (D2). Prevents Claude from manufacturing productivity from non-questions.
**Status:** Active (part of Rule 2).

---

# GROUP E: ROLE CONSTRAINTS — Claude is not the product manager

## E1. Don't lead, don't decide, don't generate task lists
**What:** You are a builder who executes what Pat tells you to execute. You do not lead. You do not decide what to build. You do not generate task lists. You do not fill silence with work.
**Source:** Role Constraints doc (first section). Chat 6491e9ee.
**Status:** Partially superseded — later sessions had Pat saying "you decide" and "you tell me." The role constraint softened over time. Currently: Claude can lead when asked but defaults to following.

## E2. The "land questions" (before any new project/feature)
**What:** Before any new project or major feature: Who specifically will use this? How will they find it? Do you have access to even one of those people? What does this person do today without this? How will we know it worked in 30 days?
**Source:** Role Constraints doc.
**Status:** Active (Role Constraints). Not always triggered but remains a principle.

## E3. The Soylent Rule
**What:** Never engineer around a human problem. If the real blocker is that Pat doesn't know anyone who would use the product, the answer is not automation. Name it: "This is a human problem, not an engineering problem. I can't solve this one."
**Source:** Role Constraints doc.
**Status:** Active (Role Constraints).

## E4. Don't manufacture productivity
**What:** Some sessions should end with "go do the hard thing." Don't suggest refactoring, docs, tests, or cleanup when the real next step is something Pat has to do away from the keyboard. If the honest answer is "go talk to a person," say that.
**Source:** Role Constraints doc ("Do Not Be the Productivity Trap").
**Status:** Active (Role Constraints).

---

# GROUP F: OUTPUT DISCIPLINE — How Claude delivers work

## F1. Full files, not patches
**What:** Complete files only, never diffs, never partial edits described in prose. Pat uploads via GitHub web UI — complete files are copy-paste, diffs aren't.
**Source:** CLAUDE.md key patterns, Role Constraints, NT line 58. Three separate places.
**Status:** Active everywhere.

## F2. Verify before claiming done
**What:** Confirm it's actually there via tool call. No "done" without proof. "It should work" is not verification.
**Source:** NT line 59. PLAYBOOK Section 3.1.
**Status:** Active.

## F3. One thing at a time
**What:** Answer the question asked. Don't run ahead. Don't suggest next step.
**Source:** Role Constraints ("One Thing at a Time"). Project instructions rule 4 (D4).
**Status:** Active (overlaps with D4).

## F4. Slow step-by-step VPS instructions
**What:** Pat uses GitHub web UI. Give one VPS instruction at a time. Don't combine steps. Don't assume CLI knowledge.
**Source:** Project instructions rule 1. Memory edit #1 (one of the original surviving edits).
**Status:** Active (project instructions rule 1).

---

# GROUP G: THE BIBLE SYSTEM — Persistent knowledge across sessions

## G1. Three-tier bible docs as hallucination mitigation layer
**What:** Three tiers, each catching different failure modes: (1) Specification layer (NT: what exists, what it does) → catches Project Context Conflicts, (2) Constraint layer (Wiring Manifest + LM Map: dependencies + blast radius) → catches integration mismatches, (3) Failure history layer (LM Map entries: what went wrong, when, why) → prevents repeat mistakes.
**Source:** THE-PLAYBOOK.md Foundational Principles. Built incrementally from Session 1.
**Status:** Active (foundational architecture).

## G2. Land Mine Map — "add an entry every time something burns us"
**What:** 223+ pitfalls in DECISION / PROTECTS / BITES WHEN / SYMPTOM / FIX / SESSIONS format. Read before any SQL, schema, auth, or deployment change. Living document.
**Source:** THE-MODERATOR-LAND-MINE-MAP.md header. Built from Session 1 forward.
**Status:** Active (223+ entries as of S253).

## G3. Propagation rule (LM-203)
**What:** When a handoff docx contains locked design decisions, the next session must propagate those into a canonical spec doc before moving on. Prevents the "stranded in handoff for 64 sessions" problem.
**Source:** SESSION-246-HANDOFF.md Finding 1. The S182 modifier/power-up design was lost for 64 sessions because nobody propagated it.
**Status:** Active (LM-203). Validated in S247 — "the propagation rule held this session."

## G4. Bible specification drift check (Phase 4A)
**What:** After each batch of changes, pick 5 random claims from bible docs, verify each against actual code and live behavior. Fix the doc or fix the code — never leave them mismatched.
**Source:** THE-PLAYBOOK.md Phase 4A.
**Status:** Active (PLAYBOOK Phase 4A).

## G5. Session handoff docs
**What:** End-of-session full state dump: goal, files edited, findings, parked items, still-open TODOs, next-session first actions, active session rules carried forward. Uploaded at start of next session.
**Source:** Every SESSION-XXX-HANDOFF.md file. Template defined in PLAYBOOK Section 2.1.
**Status:** Active (every session).

## G6. Handoff upload checklist
**What:** Explicit numbered list of which files go where (repo root, project knowledge, keep locally) at the end of every handoff. Prevents files from landing in wrong location or being forgotten.
**Source:** SESSION-246-HANDOFF.md "FILES — UPLOAD CHECKLIST FOR PAT" section.
**Status:** Active (standard handoff section).

## G7. Punch list as single source of truth for open work
**What:** One file with every open work item. Features, housekeeping, bugs — all in one place with status emoji + description + spec pointer.
**Source:** THE-MODERATOR-PUNCH-LIST.md. Referenced in MOTHER-DOC-PREP as the canonical feature ID list.
**Status:** Active.

## G8. Walk-to-discover (walk unwalked features even when scary)
**What:** Walk features even when they look scary or undefined. The discovery itself is the work. F-32 sat blocked for 30+ sessions as a scary unspec'd feature ("AI Coach"), turned out to be already shipped. Cost of walking: 10 questions. Cost of not walking: carrying a phantom blocker indefinitely.
**Source:** SESSION-253 handoff notes. "Walk unwalked features even when you're not sure what they are."
**Status:** Active (learned lesson).

## G9. Punch list text is untrustworthy for unwalked features
**What:** Both F-23 ("Full schema designed" — it wasn't) and F-32 ("AI Coach" — not what shipped) had descriptions that didn't match reality. First step of any walk: verify the row text against code and Product Vision, don't take at face value.
**Source:** SESSION-253 handoff notes.
**Status:** Active (learned lesson).

---

# GROUP H: AFTER-CODE VERIFICATION — Three passes in order

## H1. Pass 2A — Functional wiring check
**What:** For every element in UI Interaction Map: EXISTS (find in DOM/TS), WIRED (handler attached), WORKS (right function, right params), REACHABLE (user can get to it). Output as ✅/⚠️/❌ per element. Also check: listeners on nonexistent IDs, unhandled data-action values, screens with no nav path. "This is what Claude Code is built for."
**Source:** THE-PLAYBOOK.md Phase 2A. CLAUDE-CODE-UI-AUDIT-PROMPT.md. CLAUDE-CODE-FULL-AUDIT.md Pass 1.
**Status:** Active (audit prompt format).

## H2. Pass 2B — Adversarial / attack paths
**What:** Same as C2. Dedicated security scan with standardized output: SEC-XX severity, FILE, WHAT, EXPLOIT, CHAIN, FIX.
**Source:** CLAUDE-CODE-FULL-AUDIT.md Pass 2.
**Status:** Active (audit prompt format).

## H3. Pass 2C — Failure and timing
**What:** Double-tap, polling leaks, async error handling, WebRTC failures, realtime sub cleanup, nav state corruption, balance timing. Standardized output: TIMING-XX severity, CATEGORY, SCENARIO, FIX. "Separate prompt from wiring — mixing them produces noise."
**Source:** CLAUDE-CODE-FULL-AUDIT.md Pass 3. THE-PLAYBOOK.md Phase 2C.
**Status:** Active (audit prompt format).

## H4. Pass 2D — Regression spot-check
**What:** After all three passes, verify the 3-5 most recent prior fixes still hold. Catches stale findings marked "already done" that regressed.
**Source:** THE-PLAYBOOK.md Phase 2D.
**Status:** Active (PLAYBOOK Phase 2D).

## H5. Standardized audit output format
**What:** Three sections: WIRING FINDINGS (per screen letter), SECURITY FINDINGS (SEC-XX with severity/file/exploit/chain/fix), TIMING FINDINGS (TIMING-XX with category/scenario/fix). Summary with counts and top-5 lists.
**Source:** CLAUDE-CODE-FULL-AUDIT.md OUTPUT FORMAT section.
**Status:** Active (audit prompt format).

---

# GROUP I: PRE-DEPLOY GATES

## I1. Smoke test — 10 flows on real device
**What:** 15-25 minutes, phone in hand, real network. Click, tap, navigate, break. Covers: signup/login, core feature, nav between screens, guest vs auth, share, payment, error states (kill wifi mid-action), mobile viewport. "No tool replaces this."
**Source:** THE-PLAYBOOK.md Phase 3A.
**Status:** Active (PLAYBOOK Phase 3A).

## I2. RPC/RLS audit
**What:** Every new/changed DB function: auth, authz, balance guards, race conditions (FOR UPDATE), input validation, idempotency. Every table: RLS. "Can someone who shouldn't be able to do this, do it anyway by calling the RPC directly?"
**Source:** THE-PLAYBOOK.md Phase 3B.
**Status:** Active (PLAYBOOK Phase 3B).

---

# GROUP J: POST-DEPLOY / EXTERNAL PERSPECTIVE

## J1. Outside-in review / fresh Claude session
**What:** Deliberately no project context. Post codebase to fresh session with "what's wrong with this." Every major architectural problem (dual table debt, monolith trap, context drift) was invisible from inside the project until an outside perspective made it obvious.
**Source:** THE-PLAYBOOK.md Phase 4C.
**Status:** Active (PLAYBOOK Phase 4C).

## J2. Community / Reddit / external feedback
**What:** Same principle as J1, human version. Seek feedback from communities where users hang out.
**Source:** THE-PLAYBOOK.md Phase 4C.
**Status:** Active (PLAYBOOK Phase 4C).

---

# GROUP K: CONTEXT WINDOW / MEMORY MANAGEMENT — Infrastructure tactics

## K1. Kill auto-memory, use only manual edits
**What:** Auto-generated memory drowns out manual behavioral edits. "Paused means the room is still loud — it just stopped getting louder." Kill auto-memory entirely, keep only lean behavioral rules.
**Source:** Chat fc0115db (Session 121). Pat's theory that memory edits were "a whisper in a loud room." Claude confirmed.
**Status:** Active (auto-memory killed for this project).

## K2. Project instructions > memory edits for rule enforcement
**What:** When memory edit UI became inaccessible on desktop app, rules moved to Project Instructions panel. Same effect, more reliable delivery.
**Source:** Chat fc0115db end. "I concede. Give me the exact text to paste into the instructions."
**Status:** Active (rules live in project instructions).

## K3. In-session correction > rules
**What:** Rules reduce hallucination/drift, they don't eliminate it. In-session correction is more effective because it's in the recency window. Rules are at the top of a long document that gets diluted every message.
**Source:** Chat 9b715f02 (Session 190). "Do the rules even help? seriously." Claude: "In-session correction. It's more effective."
**Status:** Active (accepted limitation — both are used).

## K4. CLAUDE.md at repo root
**What:** CLAUDE.md lives in the repo. Claude Code reads it automatically on every session. Contains: Castle Defense rules, file conventions, key patterns, architecture summary.
**Source:** CLAUDE.md file in repo.
**Status:** Active (repo root).

## K5. Project Knowledge loading strategy
**What:** Punch List + NT loaded every session (Project Knowledge). Land Mine Map + Walkthrough stay in repo, cloned when needed. Keeps Project Knowledge lean and loud.
**Source:** THE-PLAYBOOK.md Tooling Map. Chat 290dd650 (Session 181 recommendation).
**Status:** Active (project knowledge settings).

## K6. Build brief format for Claude Code
**What:** A structured "instruction packet" for Claude Code sessions: (1) READ FIRST list of specific files, (2) current state of relevant tables/RPCs, (3) what to build in numbered steps, (4) verification command at end. Complete enough that Claude Code can run without chat context.
**Source:** F-55-BUILD-BRIEF-FOR-CLAUDE-CODE.md (Session 252). Also chat b6384a76 (F-51 Phase 1 prompt for Claude Code).
**Status:** Active (build brief format).

## K7. `\cp` on VPS to bypass `cp -i`
**What:** Always use `\cp` (backslash prefix) on VPS to bypass the `cp -i` alias. Always verify with grep after copy.
**Source:** CLAUDE.md, NT.
**Status:** Active (VPS ops rule).

---

# GROUP L: META-TACTICS — Tactics about how to develop tactics

## L1. The Playbook as portable strategy
**What:** A project-agnostic testing/quality document built from 230+ sessions. Four phases, eight activities, one continuous discipline. "Drop this into Project Knowledge on day one. Claude reads it before writing a line of code."
**Source:** THE-PLAYBOOK.md header.
**Status:** Active (designed to carry to future projects).

## L2. Evaluate articles against existing practices
**What:** When reading articles about Claude/AI development practices, compare each against what you already do. Most are reinventing what was already built. Only adopt what adds genuinely new value.
**Source:** Chat 5fb59ed0 ("Bottom line: Article 4 is the only one with directly actionable value. The rest are people independently reinventing what you built.").
**Status:** Active (evaluation habit).

## L3. "Do a full code audit — flow traces, adversarial pass, race condition pass"
**What:** Pat's one-sentence vocabulary for requesting the three-pass review. Eliminates the redundant "end-to-end + integration test + flow traces" phrasing that was really all one thing.
**Source:** Chat 8bfcf288 (Pat: "how do I get you to do exactly this... as we do it versus what we're doing right now, which is oh, by the way, at the very end, all of this stuff doesn't connect").
**Status:** Active (established vocabulary).

---

# REPETITIONS / OVERLAPS — Same tactic, different packaging

| Tactic A | Tactic B | Relationship |
|---|---|---|
| B4 Map first | B5 "Show me what it touches" | B5 is B4 said informally |
| B1 Contract verification | B4 Map first | B1 is the verification step inside B4 |
| A1 Rule 7 | A3 information_schema | A3 is the mechanical enforcement of A1 |
| A1 Rule 7 | D6 Repeat-back | Both prevent guessing; A1 is about facts, D6 about intent |
| C1 GAN critique | C2 Adversarial pass | C1 is internal thinking, C2 is a formalized audit phase |
| C1 GAN critique | C4 Two competing reviewers | C4 is multi-agent version of C1 |
| D4 Stop after answering | F3 One thing at a time | Same rule, different angle |
| A5 Hard research gate | C6 Research → refined research | C6 supersedes A5 with a second-pass loop |
| H1 Wiring check | B4 Map first | H1 is the after-code version of B4's before-code trace |
| E1 Don't lead | D8 Acknowledged and stop | Both prevent Claude from generating unsolicited work |
| F1 Full files not patches | G6 Upload checklist | F1 is the format, G6 is the delivery process |

---

# EVOLUTION TIMELINE — When key tactics appeared

| Session range | What was developed |
|---|---|
| 1-22 | Bible system created (NT, OT, LM Map). Handoff format established. |
| 23-68 | Bible consolidation. Two NTs → one. OT backfilled. Memory edits introduced. |
| 69-92 | Hard research gate (memory edit). Verify-before-claiming-done. Full-file-not-patches. |
| 93-121 | Memory cleanup (auto-memory killed). Project instructions formalized (Rules 1-5). Map-first-code-second. |
| 121-150 | Rule 6 (direct honesty). LM Map recovered from git history (Session 152). |
| 151-181 | GAN critique added (Rule 9). Bible doc loading strategy refined. |
| 181-192 | Rule 7 (verify instead of guessing). Rule 8 (no external knowledge inference). Multi-pass audit research. |
| 192-214 | Three-pass audit (flow traces → adversarial → race conditions). 75 findings. Vocabulary locked. |
| 214-240 | Rules 1-4 (STATEMENTS/QUESTIONS parse, code-task triggers, stop after answering). Role Constraints doc. |
| 240-253 | THE-PLAYBOOK written. Feature walks with questionnaire mode. Build brief format. Mother doc prep. Walk-to-discover lesson. |

---

*Compiled from 30+ repo docs, 60+ past chats, and 253 sessions of trial and error. The hardest lesson remains the one in the Playbook: "We knew the patterns. We named them. We wrote rules against them. And we still did it 177 times."*
