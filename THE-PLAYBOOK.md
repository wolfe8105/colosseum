# THE PLAYBOOK — Testing, Quality & Defense Strategy
### Project Knowledge File — Load Into Every New Project
### Version 1.0 — April 5, 2026

> **What this is:** A portable testing and quality strategy built from 230+ sessions of real-world development. Four phases, eight activities, one continuous discipline. Drop this into Project Knowledge on day one. Claude reads it before writing a line of code.

> **Where this came from:** 17 distinct testing methodologies discovered and refined across a full product build (The Moderator, 2024-2026), validated against 2024-2026 industry research in shift-left/shift-right testing, schema drift detection, LLM hallucination taxonomy, agentic code review, contract testing, red/purple teaming, and context engineering.

---

# THE STRATEGY

Four phases. Each phase answers a different question. Run them in order.

---

## PHASE 1: BEFORE CODE — "Does the plan hold up?"

**When:** Every time, before writing any code that touches 2+ files or crosses screen/RPC boundaries. No exceptions.

**What you do:**

**1A. Contract Verification**

For every proposed change, identify every file, RPC, database column, and function it touches. Pull the actual current values via tool calls — never from memory. Verify both sides of every interface agree on names, types, values, and expected behavior. Flag mismatches before writing a single line.

This is what the industry calls contract testing. It catches the class of bugs where one file says `totalRounds: 3` and another says `total_rounds: 4` and a third defaults to `5`. Each works fine alone. The bug only exists where they connect.

Contract verification is also a hallucination detector. Every time Claude names a function, column, or RPC that doesn't exist, this step catches it before it becomes committed code. The July 2025 ISSTA research categorizes these as Project Context Conflicts (26% of all code hallucinations) and Factual Knowledge Conflicts (32%). Contract verification catches both.

**1B. Blast Radius Analysis**

After verifying contracts, walk the dependency graph outward: what else depends on what you're changing? If arena.ts breaks, what happens to spectate.ts, the feed, the leaderboard? Check those downstream files too, not just the ones being directly modified.

The Wiring Manifest (or equivalent dependency doc) is the tool for this. Every entry should have CALLED FROM, EXPECTS, and BLAST RADIUS fields. If no dependency doc exists yet, build one before changing anything — it's cheaper than debugging cascading failures later.

**1C. Schema Drift Check**

Before any batch of code changes, verify the live database matches what the code expects. For Supabase projects, run `supabase db diff` from the repo folder. For any PostgreSQL project, query `information_schema.columns` and compare against what the code assumes.

If the output shows drift, stop. Fix the drift before writing new code on top of a mismatched foundation. Schema drift is the gap between what you think your database looks like and what it actually looks like. Industry research puts the average cost per incident at $35,000.

**1D. GAN Critique (Purple Team Posture)**

Before presenting any plan, spec, or approach: attack your own work. Generator produces the plan, discriminator tears it apart. What breaks? What's the edge case? What assumption isn't verified? Present the critique alongside the plan — not "here's the solution" but "here's the solution and here's what's wrong with it."

This runs continuously, not as a discrete step. It applies to everything Claude produces — code, architecture, specs, feature designs, migration plans. It's a posture, not a phase.

---

## PHASE 2: AFTER CODE — "Does it actually work, and can someone break it?"

**When:** After building a feature, fixing a batch of bugs, or completing a migration. Three passes in order. Each pass assumes the previous one is clean.

**Pass 2A: Functional Wiring Check**

Does every button, handler, RPC call, and navigation path actually connect? This is a systematic, element-by-element verification — no guessing.

Build a UI Interaction Map (every screen, every interactive element, every ID and data-action attribute) and feed it to Claude Code as an audit checklist. For each element: does it exist in the DOM, is it wired to a handler, does the handler do what it should, is the element reachable via navigation?

This pass catches Task Requirement Conflicts (42% of code hallucinations) — where the code doesn't do what was asked — and Project Context Conflicts — where project-specific variables or functions are used incorrectly.

**Pass 2B: Adversarial Pass with Attack Path Analysis**

Put on the black hat. For every feature just built, ask: what's valuable here, how would I steal or corrupt it, and can I chain this exploit with another weakness into a bigger breach?

The shift from pre-2024 thinking: don't just find isolated vulnerabilities. Map complete attack paths. One self-voting bypass is annoying. Chained with a forged-win exploit and a leaderboard corruption, it's catastrophic.

Explicitly hunt immature vulnerabilities — dead code with dangerous permissions, unfinished features with open auth, RPCs that exist but nothing calls yet. These are the ones that become critical the moment someone wires them up.

Framework for each feature:
- List what's valuable (tokens, reputation, user data, mod powers)
- Prioritize by damage potential
- Think of every way to get to it (XSS, console manipulation, privilege escalation, RPC abuse, race conditions)
- Check if exploits chain together across features
- Block the paths

**Pass 2C: Failure and Timing Pass**

What breaks under real-world pressure? This pass covers everything that only fails under real network conditions:

- Double-tap / rapid fire — can two quick taps fire two RPCs before the first returns?
- Unhandled async failures — what does the user see if the network dies mid-request?
- Polling without cleanup — do intervals stack up, leak memory, or survive navigation?
- WebRTC failure paths — what happens when TURN fails, the peer disconnects, ICE restart exhausts?
- Realtime subscription leaks — do Supabase channels get cleaned up on navigation?
- Token race conditions — can two tabs spend the same tokens? Does the RPC use FOR UPDATE?
- State corruption on navigation — what happens if the user hits back mid-transition?

Feed this as a dedicated Claude Code prompt. Separate from the wiring check — mixing them produces noise.

**Pass 2D: Regression Spot-Check**

After all three passes, verify the 3-5 most recent prior fixes still hold. Changes in this batch may have silently undone a previous fix. Check specifically for: stale audit findings marked "already done" that actually regressed, column names or function signatures that were corrected but got overwritten, and integration points that were verified in a prior session but touched by new code.

---

## PHASE 3: BEFORE DEPLOY — "Is the whole thing solid?"

**When:** Before any deployment to production, before flipping a feature flag, before the bot army goes live.

**Gate 3A: Smoke Test**

10 flows, 15-25 minutes, on the actual device your users will use. Not reading code — using the app. Click, tap, navigate, break. This catches what looks fine in code but fails in a browser.

The smoke test checklist should cover: signup/login flow, core feature flow (whatever the app's main action is), navigation between every major screen, guest vs. authenticated behavior, share/social features, payment flow (if applicable), error states (disconnect wifi mid-action), and mobile viewport edge cases.

**Gate 3B: RPC/RLS Audit**

Every new or changed database function checked for: auth (does it verify the caller?), authorization (can User A affect User B's data?), balance guards (can values go negative?), race conditions (does it use FOR UPDATE or CHECK constraints?), input validation (does it reject bad input?), and idempotency (does calling it twice cause double effects?).

Every table checked for Row Level Security. The question isn't "does the feature work?" — it's "can someone who shouldn't be able to do this, do it anyway by calling the RPC directly?"

---

## PHASE 4: AFTER DEPLOY — "Is it holding up in the real world?"

**When:** After deployment, ongoing.

**4A. Regression Verification**

Full re-check of previous findings after each batch of changes. Pick 5 random claims from the bible docs (or equivalent specification documents), verify each one against actual code and live behavior. If the spec says "round count is 3" and the code says 4, the doc drifted. Fix the doc or fix the code — but don't leave them mismatched.

This catches specification drift — when documentation and code evolve separately and silently diverge. The March 2026 "Codified Context" research identifies this as a primary failure mode in AI-assisted development: the model reads stale docs and generates code that matches outdated specifications.

**4B. Production Monitoring**

Once real users exist, watch for what no static audit can catch: actual error rates, actual latency under load, actual failure patterns. For early-stage products, this doesn't require fancy tooling — Supabase logs, Vercel function logs, and basic error tracking give enough signal.

The key shift-right principle: pre-deployment testing, no matter how thorough, cannot replicate the complexity of real production conditions. The timing and concurrency bugs flagged in Phase 2C get truly verified only under real traffic.

**4C. Outside-In Review**

Once per major milestone, deliberately break familiarity blindness. Options: post the codebase to a fresh Claude session with zero context and ask "what's wrong with this," seek feedback from communities where your users hang out, or re-read the code after a week away.

The pattern from 230+ sessions: every major architectural problem (dual table debt, monolith trap, context drift) was invisible from inside the project until an outside perspective made it obvious.

---

# FOUNDATIONAL PRINCIPLES

These aren't steps. They're truths that shape how every phase gets executed.

**Modularity is testability.** Monoliths can't be contract-tested because they have no contracts. Every function touching everything means no interfaces to verify, no blast radius to analyze, no wiring to check. Start modular from day one — not because modules are architecturally better in the abstract, but because they create the seams that testing actually operates on.

**The bible system is a hallucination mitigation layer.** Three tiers of knowledge, each catching a different failure mode:
- Specification layer (what exists, what it does) — catches Project Context Conflicts by grounding Claude in the actual project
- Constraint layer (what depends on what, blast radius) — catches integration mismatches before they ship
- Failure history layer (what went wrong, when, why) — prevents repeat mistakes across sessions

Build all three from session 1. They're not documentation. They're the primary defense against an AI that is structurally incapable of knowing when it's wrong.

**Hallucinations are permanent.** OpenAI's September 2025 research proved that LLMs hallucinate because training rewards guessing over admitting uncertainty. A 2024 paper proved mathematically that hallucinations are inevitable for general-purpose LLMs. This will not be fixed. It can only be managed. Rule 7 ("say I need to verify that instead of guessing") is the single most important instruction in any Claude project.

**Schema drift is silent and cumulative.** The database you think you have and the database you actually have diverge over time. Every manual change, every hotfix, every migration that ran in staging but not production adds drift. Run `supabase db diff` (or equivalent) before every code batch. One command, definitive answer.

**The before-code checks are the most valuable and the most skipped.** Doing the contract verification before writing code takes 15 minutes. Skipping it costs days. The single biggest lesson from 230+ sessions: the 75-finding cleanup at the end could have been prevented by 15-minute checks at the beginning.

**External perspectives catch what internal reviews miss.** Reddit threads, fresh Claude sessions, community feedback — all surfaced architectural problems that were invisible from inside the project. Build outside-in review into the process deliberately, not accidentally.

---

# TOOLING MAP

Which tool to use in each phase, and why.

| Phase | Tool | Why |
|-------|------|-----|
| 1A. Contract verification | **Chat** | Needs bible docs from Project Knowledge. Needs back-and-forth discussion. Needs blast radius conversation before anyone writes code. |
| 1B. Blast radius analysis | **Chat** | Same — requires project context and discussion of downstream effects. |
| 1C. Schema drift check | **Terminal** | Run `supabase db diff` or `information_schema` query directly. Neither Chat nor Claude Code — just a command. |
| 1D. GAN critique | **Chat** | Intrinsic to how Chat operates when the rule is in Project Instructions. |
| 2A. Wiring check | **Claude Code** | Grep-intensive across 50+ files. Feed it the UI Interaction Map checklist. Get a report back. This is what Claude Code is built for. |
| 2B. Adversarial pass — scan | **Claude Code** | Specialized security prompt. Read every RPC, every auth check, every input path. Produce audit findings. |
| 2B. Adversarial pass — analysis | **Chat** | Take Claude Code's findings back to Chat for attack path chaining and GAN critique. Chat has bible doc context that Claude Code doesn't. |
| 2C. Timing/concurrency pass | **Claude Code** | Dedicated concurrency audit prompt. Every async function, every polling interval, every race condition candidate. Bulk file scanning. |
| 2D. Regression spot-check | **Chat** | Needs context of what was previously fixed. Needs bible doc cross-reference. |
| 3A. Smoke test | **You, manually** | Phone in hand, tapping buttons, on real network. No tool replaces this. |
| 3B. RPC/RLS audit | **Claude Code** | Feed it all SQL files. Specialized audit prompt. Get security report. |
| 4A. Regression verification | **Chat** | Needs session history context, bible doc cross-reference, and doc-code sync checking. |
| 4B. Production monitoring | **Terminal / Dashboard** | Supabase logs, Vercel logs, error tracking. Not an AI task. |
| 4C. Outside-in review | **Fresh Claude session** | Deliberately no project context. The point is to see what a fresh perspective catches. |

**When Claude Code is the right tool:**
- The task is grep-intensive across many files
- The task needs to read, change, and commit multiple files in one pass
- The task is a specialized scan with a focused prompt (the multi-agent pattern: separate prompts for security, wiring, timing — never one giant "review everything" prompt)
- The output is a report, not a conversation

**When Chat is the right tool:**
- The task needs bible doc context from Project Knowledge
- The task is a design decision or requires back-and-forth
- The task needs the map-first-code-second conversation (Phase 1)
- The task involves VPS work or infrastructure Claude Code can't reach
- You need the GAN critique before committing to an approach

**When neither is the right tool:**
- Smoke testing (you, on the phone)
- Schema drift check (one terminal command)
- Production monitoring (logs and dashboards)

---

# THE THREE HALLUCINATION CATEGORIES AND WHAT CATCHES EACH

The July 2025 ISSTA taxonomy, mapped to our defenses:

| Category | Frequency | What It Looks Like | What Catches It |
|----------|-----------|-------------------|-----------------|
| Task Requirement Conflicts | 42% | Code doesn't do what was asked. Wrong logic, missing requirements. | Phase 2A wiring check, Phase 3A smoke test |
| Factual Knowledge Conflicts | 32% | Invented function names, wrong API parameters, nonexistent methods. Looks right, compiles, crashes at runtime. | Rule 7 ("I need to verify that"), Phase 1A contract verification via tool calls |
| Project Context Conflicts | 26% | Uses project variables or patterns incorrectly. `debate.totalRounds` when the field is `debate.total_rounds`. Compiles, runs, does the wrong thing silently. | Bible docs in Project Knowledge (specification layer), Phase 2A wiring check, Phase 2D regression spot-check |

No single layer catches all three. The strategy works because each phase targets different categories.

---

# SCHEMA DRIFT QUICK REFERENCE

**For Supabase projects:**

Before any code batch:
```
supabase db diff
```

If output is empty, you're clean. If it shows changes, the live database has drifted from migration files. Fix the drift first.

**For any PostgreSQL project without migration tooling:**

```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

Compare this output against what the code expects. Any mismatch is drift.

**Periodic full check (before any major deploy):**

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Verifies RLS policies match expectations. Missing policies = exposed tables.

---

# ANTI-PATTERNS TO WATCH FOR

These are the patterns that repeatedly caused problems across 230+ sessions. Carry this list forward.

**Silent architectural debt.** Two tables serving the same purpose. Two config files with overlapping values. Two functions that do the same thing with different names. These don't crash. They silently produce mismatched data across features until someone notices the leaderboard disagrees with the profile page.

**Specification drift.** Bible docs say one thing, code does another. Both look authoritative. Neither is checked against the other. New code gets built on stale assumptions from outdated docs.

**Confident wrong answers.** Claude names a column, function, or RPC that sounds right but doesn't exist. The code compiles. The bug surfaces at runtime or — worse — never surfaces because the wrong path is silently ignored. Rule 7 exists specifically for this.

**One-shot review prompts.** "Review everything" catches style nits and misses architectural problems. Multi-pass with specialized prompts (security, wiring, concurrency) outperforms single-pass by 153% in the 2026 AgenticSCR research.

**Testing after instead of before.** The 75-finding cleanup could have been 15-minute contract checks at each step. Every time Phase 1 gets skipped "because it's a small change," the cleanup debt compounds.

**Monolith as starting point.** One file, no interfaces, no contracts to verify, no blast radius to analyze. Every future project starts modular from day one. The modularity IS the testability.

---

*Built from 17 testing methodologies, 230+ development sessions, 80+ bugs found and fixed, and four passes of industry research (2024-2026). The hardest lesson: we knew the patterns. We named them. We wrote rules against them. And we still did it 177 times. This document exists so the next project starts with the lessons already learned.*
