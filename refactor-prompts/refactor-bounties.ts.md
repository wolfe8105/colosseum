# Refactor Prompt — bounties.ts (433 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/bounties.ts (433 lines).

Read CLAUDE.md first, then read src/bounties.ts in full before touching anything. The file is the Bounties module — dot indicator system, RPC calls, slot limits, and two large profile section renderers.

SPLIT MAP (verify against the file before executing):

1. bounties.ts (orchestrator, ~30 lines)
   Re-exports all public functions from sub-modules. No logic. Preserves the existing import surface for callers.

2. bounties.dots.ts (~40 lines)
   loadBountyDotSet, userHasBountyDot, bountyDot. The dot indicator system — fetches which users have active bounties and exposes the dot HTML helper used throughout the feed.

3. bounties.rpc.ts (~65 lines)
   postBounty, cancelBounty, getMyBounties, getOpponentBounties, selectBountyClaim. All server mutations and reads.

4. bounties.limits.ts (~15 lines)
   bountySlotLimit. Pure utility — calculates max bounty slots from profile depth percentage.

5. bounties.profile.ts (~155 lines)
   renderProfileBountySection. The full profile bounty section — fetches opponent bounties, builds the bounty card HTML, wires place/cancel actions. Largest section of the file.

6. bounties.my-bounties.ts (~85 lines)
   renderMyBountiesSection. The "my bounties" dashboard section — fetches user's own bounties, builds the management UI.

RULES:
- No barrel files other than the orchestrator re-export. Direct imports between sub-modules where needed.
- import type for all type-only imports (OpponentBounty, MyBountiesResult, AuthResult).
- Dependency direction: orchestrator re-exports all. profile imports rpc and limits. my-bounties imports rpc. dots is standalone. limits is standalone. rpc is standalone.
- Target under 160 lines per file. profile.ts at ~155 is acceptable.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in bounties* files.

LANDMINES — log these as // LANDMINE [LM-BNT-NNN]: description comments. Do NOT fix them:

- LM-BNT-001 (in bounties.my-bounties.ts at renderMyBountiesSection, already catalogued as L-M1 in AUDIT-FINDINGS.md): Missing try/catch around getMyBounties(). Works today only because getMyBounties never rejects, but any future RPC error becomes an unhandled rejection.

- LM-BNT-002 (in bounties.rpc.ts at cancelBounty, already catalogued as L-M2 in AUDIT-FINDINGS.md): Refund calculation uses duration_days instead of duration_fee. The duration_fee field is defined on the type but unused. Fragile assumption — if the pricing model changes, this calculation silently uses the wrong field.

- LM-BNT-003 (in bounties.profile.ts or bounties.my-bounties.ts, already catalogued as L-M3 in AUDIT-FINDINGS.md): Cancel button uses both addEventListener and onclick assignment on the same element — dual-handler pattern. Works but unusual and could fire twice if the pattern is replicated.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
