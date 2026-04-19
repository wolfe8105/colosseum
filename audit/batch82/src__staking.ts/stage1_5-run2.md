# Anchor List — staking.ts

*(empty — no function definitions exist in this file)*

## Resolution notes

- `placeStake`, `getPool`, `settleStakes`, `getOdds` (line 14): re-exported names from `./staking.rpc.ts` via a bare `export { }` re-export statement. The function definitions live in the sub-file, not in this file. Not eligible.
- `renderStakingPanel` (line 15): re-exported from `./staking.render.ts`. Same reason. Not eligible.
- `wireStakingPanel` (line 16): re-exported from `./staking.wire.ts`. Same reason. Not eligible.
- `StakeResult`, `PoolData`, `UserStake`, `Odds`, `SettleResult` (line 13): type-only re-exports. Excluded by definition.
- All five agents correctly identified zero function definitions in this file; every line is either a block comment, a blank line, or a re-export statement.
