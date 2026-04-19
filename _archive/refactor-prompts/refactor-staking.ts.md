# Refactor Prompt — staking.ts (343 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/staking.ts (343 lines).

Read CLAUDE.md first, then read src/staking.ts in full before touching anything. The file is the Token Staking module — RPC calls for place/get/settle, odds calculation, pool bar render, full staking panel render, and panel event wiring.

SPLIT MAP (verify against the file before executing):

1. staking.ts (orchestrator, ~30 lines)
   Re-exports all public functions from sub-modules. No logic. Preserves the existing import surface for callers.

2. staking.rpc.ts (~70 lines)
   placeStake, getPool, settleStakes, getOdds. All server interactions and the pure odds calculation utility.

3. staking.render.ts (~75 lines)
   renderStakingPanel, _renderPoolBar. Builds the staking panel HTML and the visual pool odds bar. Imports getOdds from staking.rpc.ts.

4. staking.wiring.ts (~85 lines)
   wireStakingPanel, _updateConfirmButton. All event wiring for the staking panel — side selection, amount input, confirm button state, and the stake submission handler.

RULES:
- No barrel files other than the orchestrator re-export. Direct imports between sub-modules where needed.
- import type for all type-only imports (StakeResult, PoolData, SettleResult, Odds).
- Dependency direction: orchestrator re-exports all. wiring imports rpc (placeStake) and render (to update the panel after stake). render imports rpc (getOdds). rpc is standalone.
- Target under 90 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in staking* files.

LANDMINES — log these as // LANDMINE [LM-STK-NNN]: description comments. Do NOT fix them:

- LM-STK-001 (in staking.wiring.ts at wireStakingPanel confirm handler): Confirm button is disabled on click. Verify try/finally is used — if placeStake throws, the button must be re-enabled. If not already using try/finally, apply it during this refactor (this is a fix aligned with CLAUDE.md rules, not a landmine to preserve).

- LM-STK-002 (in staking.rpc.ts at getPool): getPool is called on panel open and returns the current pool totals. There is no live update — if another user places a stake while this user has the panel open, the displayed odds are stale until the panel is closed and reopened.

Do NOT fix landmines other than LM-STK-001 if the try/finally is missing. Refactor only.

Wait for approval of the split map before writing any code.
```
