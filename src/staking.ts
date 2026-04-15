/**
 * THE MODERATOR — Token Staking System (TypeScript)
 *
 * Slim orchestrator — re-exports from domain sub-files.
 * Session 254 track: split into staking.types / staking.rpc / staking.render / staking.wire.
 *
 * THIS IS WHERE LM-185 DIES: `import { safeRpc }` replaces bare
 * `ModeratorAuth.safeRpc()` — scope bug is structurally impossible.
 *
 * Migration: Session 126 (Phase 2). Window bridge: Session 140.
 */

export type { StakeResult, PoolData, UserStake, Odds, SettleResult } from './staking.types.ts';
export { placeStake, getPool, settleStakes, getOdds } from './staking.rpc.ts';
export { renderStakingPanel } from './staking.render.ts';
export { wireStakingPanel } from './staking.wire.ts';
