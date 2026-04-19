# Anchor List — staking.ts

*(empty — no function definitions exist in this file)*

## Resolution notes

- `placeStake`, `getPool`, `settleStakes`, `getOdds` — listed by no agent as definitions; they appear only in a re-export statement on line 14 (`export { ... } from './staking.rpc.ts'`). These are defined in `staking.rpc.ts`, not in this file. Re-exports are not definitions.
- `renderStakingPanel` — re-exported from `./staking.render.ts` (line 15). Not defined here.
- `wireStakingPanel` — re-exported from `./staking.wire.ts` (line 16). Not defined here.
- `StakeResult`, `PoolData`, `UserStake`, `Odds`, `SettleResult` — type re-exports (line 13). Types are excluded by definition.
- All five agents correctly identified the file as a pure barrel/re-export orchestrator containing zero function definitions. No candidates were proposed, and direct source inspection confirms this: the file contains only a block comment (lines 1–11), one blank line (line 12), and four `export … from` re-export statements (lines 13–16).
