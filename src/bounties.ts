/**
 * THE MODERATOR — Bounty Board (F-28)
 *
 * Refactored: types, dot, rpc, render sub-modules.
 */

export type { BountyRow, OpponentBounty, MyBountiesResult, PostBountyResult, SelectClaimResult } from './bounties.types.ts';
export { loadBountyDotSet, userHasBountyDot, bountyDot } from './bounties.dot.ts';
export { postBounty, cancelBounty, getMyBounties, getOpponentBounties, selectBountyClaim, bountySlotLimit } from './bounties.rpc.ts';
export { renderProfileBountySection, renderMyBountiesSection } from './bounties.render.ts';
