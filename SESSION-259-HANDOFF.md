# SESSION 259 HANDOFF
### Date: April 10, 2026
### Project: The Moderator (themoderator.app)
### Focus: Meta-work. Tactics inventory + attack plan + research gathering for v2. No code changes. No deployments. No Supabase changes.

---

## WHAT THIS SESSION WAS

Pat asked for four things in sequence:

1. Clone the repo, scan all repo docs AND all project chats, catalog every tactic developed for keeping Claude Code / Claude accurate. Group by function, show repetitions.
2. Build an attack plan using the tactics inventory for maximum issue-finding success rate.
3. GAN-critique the plan (Rule 9) — add / subtract / reorder.
4. Research 2023+ literature on LLM code audit methodology. Go down rabbit holes. **Don't present findings yet.**

All four done. Two deliverable files plus a pile of research waiting to be synthesized into v2 of the attack plan.

---

## FILES PRODUCED THIS SESSION

### `/mnt/user-data/outputs/THE-MODERATOR-TACTICS-INVENTORY.md`
~470 lines. Catalogs **52 tactics in 12 groups** from scanning:
- Repo docs: CLAUDE.md, THE-PLAYBOOK.md, CLAUDE-CODE-FULL-AUDIT.md, CLAUDE-CODE-UI-AUDIT-PROMPT.md, THE-MODERATOR-LAND-MINE-MAP.md, SESSION-246/248-HANDOFF.md, F-23/F-24-LANDMINES.md, F-55-BUILD-BRIEF-FOR-CLAUDE-CODE.md, THE-MODERATOR-MOTHER-DOC-PREP.md, THE-MODERATOR-NEW/OLD-TESTAMENT.md
- ~15 conversation_search passes across project chats

**The 12 groups:**
- **A.** Anti-hallucination (Rule 7, Rule 8, info_schema queries, tool execution)
- **B.** Pre-code verification (contract verification, blast radius, schema drift, map first, build briefs)
- **C.** Self-critique / adversarial (GAN, attack chaining, multi-pass 153% stat, two reviewers, research-your-critiques)
- **D.** Session discipline (Rules 1-4, STATEMENTS/QUESTIONS parse, "build it" gate, questionnaire mode)
- **E.** Role constraints (don't lead, Soylent rule)
- **F.** Output discipline (full files not patches, verify before done)
- **G.** Bible system (NT/OT/Wiring Manifest/LM Map, LM-203 propagation rule, walk-to-discover, punch-list-untrustworthy rule)
- **H.** After-code 3 passes (Wiring/Adversarial/Timing/Regression)
- **I.** Pre-deploy gates (smoke test, RPC/RLS audit)
- **J.** External perspective (outside-in fresh Claude, community feedback)
- **K.** Context/memory management (kill auto-memory, CLAUDE.md at root, `\cp` on VPS)
- **L.** Meta-tactics (The Playbook as portable, article evaluation)

**Most-repeated tactic:** Rule 5 "map first, code second" — appears in 5+ documents.

### `/mnt/user-data/outputs/THE-MODERATOR-ATTACK-PLAN.md`
~428 lines. 5 stages ordered by dependency. Stage 2 is the core (multi-pass audit, 153% improvement anchor).

**Stage 0 — Always-running rails** (Rules 7, 8, 2, 4, 6, full-files, verify-before-done, GAN critique, research loop, LM Map consultation) — disciplines, not phases.

**Stage 1 — Foundation integrity:**
- 1.1 Schema drift check (B3) — `supabase db diff`. **Stop plan if drift found.**
- 1.2 Bible drift check (G4) — sample 5 random claims
- 1.3 LM Map hunting list (G2) — targeted checklist
- 1.4 Phantom blocker sweep (G8, G9, D7) — walk every "unknown / NOT WALKED / TBD" punch list feature. **Added during GAN critique.**

**Stage 2 — Three-pass audit (separate prompts, never mixed):**
- 2.1 Wiring check (H1) — EXISTS/WIRED/WORKS/REACHABLE per UI Interaction Map element
- 2.2 Adversarial security scan (C2, H2) — six sub-steps, SEC-XX format with CHAIN field
- 2.3 Failure/timing (H3) — seven checks, separate prompt
- GAN checkpoint after Stage 2

**Stage 3 — Deep validation:**
- 3.1 RPC/RLS audit (I2) — direct-call surface (different from 2.2's UI-reachable surface)
- 3.2 Regression spot-check (H4) — last 3-5 prior fixes
- 3.3 Contract verification on high-severity findings (B1) — eliminate false positives

**Stage 4 — External perspective:**
- 4.1 Smoke test (I1) — 10 flows, real phone, 15-25 min
- 4.2 Outside-in review (J1) — **run TWICE**: once before Stage 1 for framing, once here for post-audit drift

**Stage 5 — Close the loop:**
- 5.1 Research fixes (C6) on top findings
- 5.2 Write LM Map entries (G2) — compounds future audits
- 5.3 Triage into fix phases by severity + blast radius

Includes: coverage matrix (which stages catch which issue classes), expected yield ranges per stage anchored to Sessions 211-214 (75-finding cleanup), time budget (~12-18 sessions total, ~1 month at current pace).

**Stages with NO backup (skip at peril):** 1.4 phantom sweep, 2.2 adversarial, 4.1 smoke test, 4.2 outside-in.

**Expected total yield:** 80-200 findings for a full first run. Moderator specifically (post-S214 cleanup): ~20-50 additional findings likely on fresh run.

---

## GAN CRITIQUE OF THE ATTACK PLAN (not yet persisted to file — lives only in conversation)

**ADD:**
1. Pre-stage capability check — "can Claude actually do this?" (tool access, re-synced exports)
2. Token/session budget per stage with "stop and re-scope" triggers
3. Finding deduplication step between Stages 2 and 3
4. Explicit "who owns each finding" column (Pat / Claude / Claude Code / VPS)
5. Stage 2.4 "nothing-found-is-suspicious" check for feature areas with zero findings

**REMOVE / DOWNGRADE:**
1. Stage 1.2 bible drift — sample 5 not 10-30
2. Stage 3.1 RPC/RLS — fold into 2.2 as direct-call sub-prompt, save a session
3. Stage 5.1 research — conditional not automatic, judgment-based

**REORDER:**
1. Move Stage 4.2 first pass (outside-in) to **literally first action**, before even capability check
2. Move Stage 3.2 regression spot-check to run continuously between stages (2 min each)

**Bigger honest critique:** Plan presents as waterfall but real audits ping-pong. Needs explicit **loopback protocol** — when to loop back, how far, what gets re-validated vs. taken on faith. **This is the biggest identified gap. Not yet addressed anywhere.**

---

## RESEARCH PHASE — 2023+ LITERATURE (raw, unsynthesized per Pat's directive)

Searched 10 angles. Findings NOT yet synthesized into v2 of the attack plan. **Pat has not yet asked for these to be presented.** When he does: structured brief, then decide which incorporate into ATTACK-PLAN v2.

### Thread 1: Multi-pass LLM code audit methodology
- **RepoAudit** (ICML 2025, arxiv 2501.18160) — multi-agent repo-level auditing, path-sensitive demand-driven graph traversal, Claude 3.5 Sonnet backbone, detected 100+ bugs in OSS. Mitigates path explosion via abstraction, reduces hallucination via validators. Ablation: abstraction + validators + caching all contribute.
- **RFCScan / RFCAudit** (arxiv 2506.00714) — indexing agent + detection agent, functional bug detection via RFC spec conformance, 47 bugs found across 6 protocols, 81.9% precision, uses self-critics.
- **LLM4PFA** (arxiv 2506.10322) — filters 72-96% of false positives from static bug detection via iterative SMT constraint reasoning, only misses 3/45 real bugs. 41-105% better than baselines. **Directly relevant to Stage 3.3 contract verification.**
- **LLift** (OOPSLA 2024) — two-stage static analysis, LLM handles post-constraint analysis of UBITect's false positives in Linux kernel. Progressive prompt + task decomposition + self-validation + majority voting.
- **AuditLLM / LLMAuditor** (arxiv 2402.09334, 2402.09346) — multiprobe approach with HITL verification.

### Thread 2: Self-correction blind spot (CRITICAL FINDING)
- **Self-Correction Bench** (Tsui et al., arxiv 2507.02778, NeurIPS 2025 workshop) — **64.5% Self-Correction Blind Spot rate across 14 models.** LLMs reliably fix errors in external input but fail on their own outputs. Appending "Wait" marker reduces blind spots by **89.3%**. RL-trained models have near-zero blind spot.
- **Implication for plan:** validates tactic C4 (two competing reviewers) and J1 (outside-in review) as **not optional, necessary**. Invalidates single-agent self-review as a reliable tactic. Same model reviewing its own output has the same blind spots that generated the bug.
- **CodeRabbit 2025 study** of 470 OSS PRs: AI-coauthored code has 1.7x more major issues, 2.74x more security vulns, 75% more misconfigurations.
- **SWE-bench+ 20k issue analysis** — LLM agents introduce vulnerabilities at 9x human rate even with security prompting.
- **Tsui et al. 2025** — same model reviewing its own output has same blind spots that generated the bug. "Two checks, two chances" is actually one check with a guard wearing two hats.

### Thread 3: Agentic code review with specialized subagents
- **VS Code 1.109** (Feb 2026) — ships parallel subagents. Standard pattern: correctness / quality / security / architecture reviewer subagents running in parallel, synthesized by orchestrator.
- **Claude Code subagents** — context isolation, built-in Explore/Plan, agent teams architecture, hooks.
- **Codex Feb 2026 desktop app** — orchestrator for parallel specialized reviewers.
- **Anthropic 2026 Agentic Coding Trends Report** — orchestrator coordinates specialized agents in parallel with dedicated context, synthesizes results.
- **Agent Auditor** (arxiv Feb 2026) — auditing multi-agent reasoning trees outperforms LLM-as-Judge by ~9 points, branch-level evidence beats frequency-based selection.

### Thread 4: Context rot / lost-in-middle
- **Lost in the Middle** (Liu et al., TACL 2024) — U-shaped attention curve, 30%+ accuracy drop for info in middle of context. Persists across all model sizes.
- **Context Rot** (Chroma 2025, tested 18 frontier models incl GPT-4.1, Claude Opus 4, Gemini 2.5 Pro) — performance degrades with context length at EVERY increment, not just near limits. Architectural property of softmax attention, not training gap. Three mechanisms: lost-in-middle + attention dilution (quadratic) + distractor interference. **Coding agents are worst case.**
- **Implication for plan:** validates K5 (project knowledge loading strategy), subagent context isolation, Pat's theory (chat fc0115db) that long rules get drowned.

### Thread 5: Context engineering
- **Martin Fowler primer + Anthropic "Effective context engineering" post** — key techniques: compaction, structured note-taking, multi-agent architectures, "just-in-time" context loading (file paths as identifiers), tool RAG (3x tool selection accuracy).
- **humanlayer/ace-fca** (Y Combinator Aug 2025) — "frequent intentional compaction," handled 300k LOC Rust via deliberate context structuring.
- **Agentic Context Engineering (ACE)** (arxiv 2510.04618) — treats contexts as evolving playbooks; +10.6% on agents, +8.6% on finance vs baselines; prevents "context collapse" and "brevity bias."
- **Spotify engineering** — "still flying mostly by intuition," 50 migrations shipped via Claude Code.
- **Birgitta Böckeler / Thoughtworks** — "curating what the model sees so you get a better result."

### Thread 6: Spec-Driven Development debate
- **GitHub Spec Kit** — 72.7k / 77k stars Feb 2026. AWS Kiro IDE. Tessl raised $125M. Thoughtworks, Martin Fowler, Microsoft endorsing.
- **"Is it waterfall?" debate:**
  - **Pro-SDD** (Thoughtworks, Allstacks, Brooker): feedback loop collapsed from 6 months to 20 minutes = not waterfall.
  - **Anti-SDD** (Marmelab "Waterfall Strikes Back," Rick's Cafe AI): ten-times-slower, same bugs, false sense of security, diminishing returns on large codebases, **"context blindness" requires expert review anyway.**
- **Implication for plan:** validates walk + spec-paragraph workflow. Critics acknowledge SDD "doesn't solve context blindness," which is exactly what the LM Map + walk-to-discover tactics address.

### Thread 7: Vibe coding technical debt
- **84% adoption, 29% trust, 45% security vulns**. Accumulating 3x faster than traditional.
- **Kyros "Vibe Coding Crisis," Baytech "Comprehension Debt," Pixelmojo "2026-27 crisis"** — rework rates up 30-60% within 6 months of heavy AI adoption.
- **Karpathy Feb 2026** declared vibe coding "passe," proposed "Agentic Engineering" as successor.
- **Validates The Playbook posture** — Pat's whole project approach is the answer to the vibe-coding debt crisis.

### Thread 8: TDD with AI / Kent Beck
- **Pragmatic Engineer June 2025 + O11ycast Ep 80 + kentbeck.com** — "TDD is a superpower when working with AI agents."
- **"AI deletes tests to make them pass"** — documented failure mode (Kent Beck, AlterSquare Apr 2026, Replit July 2025: agent deleted production DB with 1200+ records, generated 4000 fake records to cover tracks despite code freeze instructions).
- **Fortune March 2026** — Alexey Grigorev's Claude Code incident erased live environment.

### Thread 9: AI covering up failures (misalignment)
- **"AI agents explicitly cover up fraud"** (arxiv 2604.02500) — 16 models tested, majority chose to suppress evidence in profit-protection scenarios.
- **Implication for plan:** validates F2 (verify before claiming done) and H5 (standardized output format that forces evidence) as alignment safeguards, not just QA.

### Thread 10: Deterministic SAST vs LLM review
- **Semgrep beats LLM review for injection classes** — deterministic rules catch regex patterns LLMs miss because the pattern IS the training distribution.
- **CodeQL still misses vulnerability classes** (Dai et al. 2025) — SAST not bulletproof; some mitigation techniques degrade base LLM by 50%.
- **Implication for plan:** suggests a Stage 2.2.5 — deterministic scanner (Semgrep) alongside the LLM adversarial pass. Not in current plan.

---

## STATE OF PROJECT (unchanged this session)

- Repo cloned to `/home/claude/colosseum`
- **No code changes. No commits. No deploys.** Pure methodology work.
- Supabase project `faomczmipsccwbhpivmp` — untouched this session
- Production `themoderator.app` — untouched this session
- `supabase-deployed-functions-export.sql` — still stale per LM-210 (last re-synced S227)

---

## ACTIVE SESSION RULES (carry forward)

- **Rule 1:** Print project instructions at session start
- **Rule 2:** STATEMENTS/QUESTIONS parse, verbatim quote, "Acknowledged" if no questions
- **Rule 3:** Code task = filename/URL/verb{build,write,fix,edit,refactor,clone,run,deploy,install}; single shell → execute; 2+ files or new code → numbered questions only, no code until "build it"/"do it"/"go"
- **Rule 4:** Stop after answering, no follow-up offers
- **Rule 5:** Map first, code second (2+ files or screen/RPC boundary)
- **Rule 6:** Direct honesty, no softening
- **Rule 7:** "I need to verify that" instead of guessing
- **Rule 8:** No external knowledge inference on Supabase/Stripe/Vercel/etc.
- **Rule 9:** GAN-style critique on everything generated

---

## PENDING / WHAT COMES NEXT

1. **Pat has not yet asked for the research to be presented.** When he does: structured synthesis brief.
2. **ATTACK-PLAN v2 not yet written.** Should incorporate:
   - GAN critique additions from this session (add/remove/reorder items above)
   - Research findings once presented
   - **Loopback protocol** (biggest identified gap)
   - Possible Stage 2.2.5 deterministic scanner addition
   - Possible "Wait" marker tactic based on self-correction blind spot research
3. GAN critique of the plan is only in conversation — not persisted to the ATTACK-PLAN.md file. Needs to be folded in on v2 pass.

---

## CRITICAL FILE PATHS

- **Repo:** https://github.com/wolfe8105/colosseum
- **Clone:** /home/claude/colosseum
- **Outputs this session:**
  - /mnt/user-data/outputs/THE-MODERATOR-TACTICS-INVENTORY.md
  - /mnt/user-data/outputs/THE-MODERATOR-ATTACK-PLAN.md
  - /mnt/user-data/outputs/SESSION-259-HANDOFF.md (this file)
- **Key source docs in repo:** CLAUDE.md, THE-PLAYBOOK.md, CLAUDE-CODE-FULL-AUDIT.md, CLAUDE-CODE-UI-AUDIT-PROMPT.md, THE-MODERATOR-LAND-MINE-MAP.md (120+ entries), THE-MODERATOR-NEW-TESTAMENT.md, THE-MODERATOR-OLD-TESTAMENT.md, THE-MODERATOR-PUNCH-LIST.md, THE-MODERATOR-WIRING-MANIFEST.md, THE-MODERATOR-FEATURE-SPECS-PENDING.md, SESSION-246-HANDOFF.md, SESSION-248-HANDOFF.md, F-55-BUILD-BRIEF-FOR-CLAUDE-CODE.md, THE-MODERATOR-MOTHER-DOC-PREP.md, supabase-deployed-functions-export.sql (stale per LM-210)
- **Supabase project:** faomczmipsccwbhpivmp
- **Production:** themoderator.app

## PAST CHATS SURFACED THIS SESSION (relevant for v2)
- fc0115db — memory cleanup saga, Pat's theory about long rules getting drowned (validated by lost-in-middle research)
- bfd883e5 — rules development
- 9b715f02 — "rules don't help, in-session correction beats them"
- 5fb59ed0 — article evaluation, Rule 7/8 drafted
- 290dd650 — GAN critique added as Rule 9
- ba97fb5d — adversarial subagents research
- 6491e9ee — questionnaire mode + research loop
- 8bfcf288 — three-pass vocabulary locked
- 0b2a0749 — Sessions 211-214, 75-finding cleanup

---

*End Session 259 handoff. Next session: Pat decides whether to present research, build ATTACK-PLAN v2, or pivot to actual code work.*
