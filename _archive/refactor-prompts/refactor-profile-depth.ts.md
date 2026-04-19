# Refactor Prompt — profile-depth.ts (809 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/profile-depth.ts (809 lines).

Read CLAUDE.md first, then read src/pages/profile-depth.ts in full before touching anything. The file is the Profile Depth Engine — 20 questionnaire sections, 100 questions, tier integration, and milestone rewards.

SPLIT MAP (verify against the file before executing):

1. profile-depth.ts (orchestrator, ~60 lines)
   Keeps: module-level state (answers, completedSections, activeSection, serverQuestionsAnswered, previouslyAnsweredIds), the DOMContentLoaded init handler, and all imports. Calls sub-modules for render and save. Removes the local escHtml function and replaces all calls with imported escapeHTML from config.ts.

2. profile-depth.types.ts (~45 lines)
   All type and interface definitions: QuestionBase, InputQuestion, ChipsQuestion, SliderQuestion, SelectQuestion, Question, SectionReward, Section, AnswerValue, Answers. No logic.

3. profile-depth.data.ts (~440 lines)
   The SECTIONS array (20 sections, 100 questions) and DEPTH_MILESTONES array. Pure data, zero logic. Exports both as named constants.

4. profile-depth.state.ts (~40 lines)
   sanitizeAnswers, sanitizeCompleted, snapshotAnswered. The localStorage read/initialization for answers and completedSections also moves here. These are pure state management helpers with no DOM dependency.

5. profile-depth.tier.ts (~55 lines)
   The 4 window-cast tier globals (getTier, getNextTier, renderTierBadge, renderTierProgress), their type casts, renderTierBannerUI, and updateMilestoneBar. All tier-display logic in one place.

6. profile-depth.render.ts (~85 lines)
   renderGrid, renderQuestion, ringSVG, sectionPct. Renders the section grid and individual question cards. Imports escapeHTML from config.ts (not the local escHtml).

7. profile-depth.section.ts (~80 lines)
   openSection, wireQuestions, saveSection, showReward. The full section-interaction flow: open → wire → save → reward.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (Question, Section, SectionReward, AnswerValue, Answers, InputQuestion, ChipsQuestion, SliderQuestion, SelectQuestion).
- Replace all local escHtml(...) calls with escapeHTML from config.ts — the local helper is an exact duplicate that violates CLAUDE.md.
- Dependency direction: orchestrator imports all 6 sub-modules. section.ts imports render.ts and tier.ts. render.ts imports data.ts and state.ts. No cross-imports between leaves.
- Target under 300 lines per file, preference 150. data.ts at ~440 is acceptable — pure data.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in profile-depth* files.

LANDMINES — log these as // LANDMINE [LM-DEPTH-NNN]: description comments. Do NOT fix them:

- LM-DEPTH-001 (in profile-depth.tier.ts at window cast block): The 4 tier globals (getTier, getNextTier, renderTierBadge, renderTierProgress) are accessed via (window as unknown as Record<string, unknown>). This bypasses TypeScript's type system and silently returns undefined if moderator-tiers.js is not loaded before this module. No runtime guard — if getTier is undefined and renderTierBannerUI is called, the early return is the only protection.

- LM-DEPTH-002 (in profile-depth.state.ts at init block): The migration sync block (serverQuestionsAnswered === 0 && previouslyAnsweredIds.size > 0) fires on every cold start where the server count is genuinely 0. A user who truly has 0 questions answered but has local localStorage data from a previous session will trigger a sync. May over-count if called multiple times.

- LM-DEPTH-003 (in profile-depth.section.ts at saveSection): The 2-second timeout that closes the panel after a completed section uses an anonymous setTimeout — no handle stored, cannot be cancelled if the user opens a different section before it fires.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
