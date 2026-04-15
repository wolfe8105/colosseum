# Refactor Prompt — tokens.ts (510 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/tokens.ts (510 lines).

Read CLAUDE.md first, then read src/tokens.ts in full before touching anything. The file is the Token Economy module — milestones, daily login, action claims, balance display, cross-tab sync, and coin animations.

SPLIT MAP (verify against the file before executing):

1. tokens.ts (orchestrator, ~55 lines)
   Keeps: module-level state (lastKnownBalance, milestoneClaimed, dailyLoginClaimed, _dailyLoginInFlight, _bc), init, auto-init block, default export object, all imports. Calls sub-modules.

2. tokens.types.ts (~55 lines)
   All type and interface definitions: MilestoneKey, MilestoneDefinition, ClaimResult, MilestoneListItem, TokenSummary. No logic.

3. tokens.milestones.ts (~60 lines)
   MILESTONES const, claimMilestone, _loadMilestones, _checkStreakMilestones, getMilestoneList, checkProfileMilestones. All milestone logic in one place.

4. tokens.animations.ts (~65 lines)
   _injectCSS, _coinFlyUp, _tokenToast, _milestoneToast. All visual feedback — CSS injection and animation helpers. No RPC calls.

5. tokens.claims.ts (~100 lines)
   claimDailyLogin, claimHotTake, claimReaction, claimVote, claimDebate, claimAiSparring, claimPrediction. All public claim functions. Imports _tokenToast and _coinFlyUp from tokens.animations.ts and claimMilestone from tokens.milestones.ts.

6. tokens.balance.ts (~45 lines)
   _updateBalanceDisplay, updateBalance, _initBroadcast, getBalance, requireTokens, getSummary, _rpc helper. Balance reads, writes, and cross-tab broadcast.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (MilestoneKey, MilestoneDefinition, ClaimResult, MilestoneListItem, TokenSummary, Profile).
- Dependency direction: orchestrator imports all 5. claims imports animations, milestones, balance. milestones imports balance (for _updateBalanceDisplay). animations is standalone. balance is standalone. types is imported by all.
- Target under 110 lines per file. claims.ts at ~100 is acceptable.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in tokens* files.

LANDMINES — log these as // LANDMINE [LM-TOK-NNN]: description comments. Do NOT fix them:

- LM-TOK-001 (in tokens.animations.ts at _injectCSS): CSS injection hardcodes #b8942e (gold gradient end) and #2d5a8e (milestone toast blue) — no CSS var token equivalents exist yet.

- LM-TOK-002 (in tokens.claims.ts at claimHotTake, claimVote, claimDebate): Dynamic import of onboarding-drip.ts uses fire-and-forget .catch(() => {}) — intentional but silent. If the import fails the drip trigger is silently skipped with no log.

- LM-TOK-003 (in tokens.milestones.ts at checkProfileMilestones): Calls claimMilestone('verified_gladiator') when completedCount >= 3 — same threshold as profile_3_sections. Awarding the Verified Gladiator badge at 3 sections may be intentional but is undocumented and surprising.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
