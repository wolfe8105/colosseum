## F-32 AI Moderator Scoring (SHIPPED — documentation-only entry)

**Status: SHIPPED.** F-32 has been live in production since Session 220 (AI-BUG-2 fix, Groq/Llama → Claude swap) and was mis-categorized as "unwalked" on the punch list for 30+ sessions. S253 discovered the shipped implementation during the mother-doc walk-close pass. No build work is required. This spec entry exists purely to document what is already running, where it lives, and how it works — so the mother doc has an accurate row and future sessions don't re-walk this feature.

**The punch list row** ("Argument strength analysis, improvement tips") misnamed the feature. There is no user-facing coach and there was never going to be one. The real feature is the **AI judge** that scores debates in AI Sparring mode and produces the 4-criteria scorecard that ships through the already-deployed `save_ai_scorecard` RPC.

---

**What's shipped.**

Two Supabase Edge Functions, both running on Claude Sonnet 4 (`claude-sonnet-4-20250514`), both authed via `ANTHROPIC_API_KEY`:

**1. `supabase/functions/ai-sparring/index.ts`** — the AI debate opponent and the AI judge, in the same function, mode-selected via the `mode` request body field. Two distinct prompts live here:

- **`buildSystemPrompt(topic, totalRounds)`** (line 39) — personality prompt for the AI opponent in AI Sparring mode. Defines a casual, hot-takes-driven, push-back-hard persona. Max ~60 words per response. Never starts with "I", never uses debate jargon, never agrees with the user's main point. Tuned for engagement, not formality. Round-specific guidance: round 1 stake boldly with a real-world example, middle rounds attack specific weaknesses, final round land a memorable knockout line. Temperature unspecified in code (Claude default).

- **`buildScoringPrompt(topic)`** (line 67) — the F-32 core. Post-debate 4-criteria judge. Full prompt text:

> "You are the official AI Judge for The Moderator, a live debate platform. You have just watched a complete debate and must score both sides.
>
> DEBATE TOPIC: "${topic}"
>
> Score each side on 4 criteria, each from 1 to 10:
> - LOGIC: How sound is their reasoning? Are there logical fallacies, contradictions, or leaps?
> - EVIDENCE: Did they cite real examples, data, or experiences? Or just opinions and assertions?
> - DELIVERY: Was the argument clear, punchy, and persuasive? Or rambling and unfocused?
> - REBUTTAL: Did they directly address and counter the opponent's points? Or talk past them?
>
> The conversation uses "user" for Side A and "assistant" for Side B.
>
> You MUST respond with ONLY valid JSON, no markdown, no backticks, no preamble. Use this exact structure: [...]
>
> Be a tough judge. Don't give 8+ unless they earned it. Most scores should be 4-7. Differentiate — if one side was clearly better on a criterion, the scores should reflect that gap."

Temperature `0.3` for consistency. Max tokens `800`. The output is a JSON object with `side_a.{logic,evidence,delivery,rebuttal}.{score,reason}`, same for `side_b`, plus `overall_winner` and a one-sentence `verdict`. Every criterion score is validated and clamped server-side to the 1-10 range (`validateCriterion` at line 126).

**2. `supabase/functions/ai-moderator/index.ts`** — reference/evidence validator. This is NOT the debate scorer despite the misleading filename. It fires when a debater submits a citation mid-debate and rules ALLOW or DENY. Solid system prompt already in place (lines 104-127). "Tough but fair. Most legitimate submissions get ALLOWED. You only DENY clear garbage." Fail-safe: on any error or missing API key, returns `ruling: 'allowed'` so debates can't hang (LM-087). Separate from F-32 but worth noting in the same doc because the filename causes confusion.

---

**Scale: 1-10 per criterion, not 1-5.** The AI scorecard uses 1-10 per criterion, max 40 per side. This is intentional and documented here for clarity: it does NOT match the F-51 human-mod 1-5 per-comment scale. They feed different surfaces:

- **Human mod 1-5 per comment** → inline point awards in the live feed (F-05/F-51), running totals on the scoreboard, final score = sum of all awarded points.
- **AI judge 1-10 per criterion** → post-debate scorecard stored via `save_ai_scorecard`, displayed on the replay page as a 4-bar breakdown.

The two scoring artifacts are not numerically comparable. A spectator watching a human-modded debate replay sees "Player A: 23 pts" with inline tags. A spectator watching an AI-modded debate sees "Player A: Logic 7, Evidence 5, Delivery 8, Rebuttal 6 = 26." The shape of the output is different because the shape of the judgment is different. This is not a bug — it's a deliberate split surfaced by S253 for mother-doc clarity.

**Why this matters:** any future "unify the scoring artifacts" work is a separate feature (call it F-32.5 or fold it into F-51 Phase 2), NOT part of F-32. F-32 is the AI judge's rubric. It already exists.

---

**Product posture: intentionally mid.** Per S253 walk: the AI moderator is meant to be "good enough that the scorecard looks reasonable, weird enough in edge cases that users notice." This is the core strategy — AI mod is the onboarding hook and the "try it alone" mode, not the destination. Users are expected to face humans for real scoring. The current prompt supports this posture naturally: a tough-but-imperfect judge using Claude Sonnet 4 with calibration guidance but no per-category tuning, no example comments, no penalty-condition matrix. The weirdness is a feature.

**No rubric expansion work planned.** S253 explicitly decided against:
- Per-category rubrics (politics vs sports vs couples court vs entertainment vs music) — universal rubric stays universal.
- Example comments per score tier (few-shot examples in the prompt) — would improve consistency but also reduces the charm-of-imperfection the product wants.
- Penalty-condition lists (ad hominem -N, dodge -N, etc.) — left to Claude's judgment.
- Scale harmonization with F-51 human mod flow — separate feature if ever pursued.

**No model change planned.** S253 explicitly kept `claude-sonnet-4-20250514`. Not upgrading to Sonnet 4.6. Not downgrading to Haiku. Not switching to Gemini or Groq. The current model and pricing are acceptable at launch-scale traffic.

---

**Surface area summary.**

| Piece | Location | Status |
|---|---|---|
| AI opponent personality prompt | `ai-sparring/index.ts:39` `buildSystemPrompt()` | Shipped |
| AI judge scoring prompt | `ai-sparring/index.ts:67` `buildScoringPrompt()` | Shipped |
| AI judge output validator | `ai-sparring/index.ts:126-163` | Shipped |
| AI judge client handler | `src/arena/arena-room-ai.ts:129` `requestAIScoring()` | Shipped |
| Scorecard persistence RPC | `save_ai_scorecard` (Session 234) | Shipped |
| Scorecard display in replay | `get_arena_debate_spectator` | Shipped |
| Scorecard render component | `arena-room-ai.ts:168` `renderAIScorecard()` | Shipped |
| Reference validator prompt | `ai-moderator/index.ts:104` | Shipped (separate feature, mis-labeled) |
| Fallback on Claude API failure | Random-score fallback in `arena-room-ai.ts:156` | Shipped |

**Zero new build work required.** Zero new RPCs. Zero new tables. Zero new client files. Zero new triggers.

---

**Future iteration path (NOT PLANNED, documented for the mother doc only).**

If at some point the AI mod feels *too* weird or *too* sharp and needs tuning, the entire tuning surface is:

1. Edit `buildScoringPrompt()` in `ai-sparring/index.ts`.
2. Redeploy the Edge Function (`supabase functions deploy ai-sparring`).
3. Observe the next few AI-modded debates.
4. Iterate.

No migrations, no client changes, no downtime. The prompt is a single string in a single file. Tuning F-32 is a **5-minute edit-and-deploy**, not a feature build. Nothing on the mother doc, punch list, or build queue should treat F-32 as a multi-session effort ever again.

**If the scoring scale gets unified with F-51 later:** that's a different feature. It would touch (a) the prompt output format, (b) the `AIScoreResult` type, (c) the `save_ai_scorecard` RPC column types, (d) `renderAIScorecard()`. Estimated as a small build, not an F-32 task. Spec when (and if) the product decision is made.

---

**Land Mines — none added.**

F-32 does not introduce new land mines. The existing implementation has one minor concern that's already documented elsewhere:

- **LM-087** (existing, not new) — AI moderator must not hang debates on API failure. Already mitigated: both Edge Functions fall back to `ruling: 'allowed'` or random scoring on any error path, and the client has a hardcoded fallback in `arena-room-ai.ts:156` (`"AI scoring failed, falling back to random"`).

---

**Test checklist — verification-only, not build test.**

Because F-32 is shipped, the "test checklist" is a **production verification checklist** to confirm the shipped implementation works as documented. Run these at any point to confirm F-32 is healthy:

1. Start an AI Sparring debate on any topic. AI opponent responds within ~5 seconds.
2. Complete the debate through final round.
3. Scorecard appears on the end screen with 4 criteria per side, scores between 1-10.
4. Each criterion has a one-sentence reason string.
5. `overall_winner` field is 'a', 'b', or 'draw'.
6. `verdict` field is a non-empty string under 300 chars.
7. Scorecard persists to `arena_debates.ai_scorecard` JSONB column via `save_ai_scorecard`.
8. Replay page renders the scorecard from `get_arena_debate_spectator`.
9. Edge Function logs show Claude API calls, not Groq or Llama (legacy).
10. Temperature 0.3 confirmed in the code.
11. Model `claude-sonnet-4-20250514` confirmed on line 19.
12. Fallback path: temporarily unset `ANTHROPIC_API_KEY` in Supabase dashboard, attempt an AI debate, confirm client shows random-fallback without crashing. Restore key.

If any of the above fail, F-32 has regressed — file as a bug against `ai-sparring/index.ts`, not as a feature re-build.

---

**Punch list update (S253).** F-32 row should be updated from "Attack Plan 3.3 / Argument strength analysis, improvement tips" to:

> F-32 | AI Judge (4-criteria scorecard) | ✅ SHIPPED (S220, documented S253) | Claude Sonnet 4 in `ai-sparring` Edge Function. Post-debate scorecard on 1-10 scale. Intentionally mid per product strategy.

**Mother doc row.** F-32 appears as `SHIPPED` with a pointer to `supabase/functions/ai-sparring/index.ts:67`. No asterisks, no caveats, no TBDs.
