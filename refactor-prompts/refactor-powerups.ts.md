# Refactor Prompt — powerups.ts (459 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/powerups.ts (459 lines).

Read CLAUDE.md first, then read src/powerups.ts in full before touching anything. The file is the Power-ups module — RPC calls for buy/equip/activate, shop render, loadout render/wiring, activation bar render/wiring, and overlay renders (silence, reveal, shield).

SPLIT MAP (verify against the file before executing):

1. powerups.ts (orchestrator, ~30 lines)
   Re-exports all public functions from sub-modules. No logic. Preserves the existing import surface for callers.

2. powerups.rpc.ts (~65 lines)
   buy, equip, activate, getMyPowerUps, getOpponentPowerUps. All server calls. Returns typed results directly from safeRpc.

3. powerups.shop.ts (~30 lines)
   renderShop. Builds the power-up shop HTML string for display in the arsenal.

4. powerups.loadout.ts (~85 lines)
   renderLoadout, wireLoadout. The debate loadout — equip slots display and equip button wiring.

5. powerups.activation.ts (~65 lines)
   renderActivationBar, wireActivationBar. The in-debate activation bar — activated power-up buttons and their click handlers.

6. powerups.overlays.ts (~85 lines)
   renderSilenceOverlay, renderRevealPopup, renderShieldIndicator, removeShieldIndicator, hasMultiplier. All in-debate visual overlays and state helpers.

RULES:
- No barrel files other than the orchestrator re-export. Direct imports between sub-modules where needed.
- import type for all type-only imports (PowerUpResult, MyPowerUpsResult, EquippedItem, ActivationCallbacks).
- Dependency direction: orchestrator re-exports all. Sub-modules import from auth.ts, config.ts directly. overlays.ts is standalone. No cross-imports between sub-modules.
- Target under 90 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in powerups* files.

LANDMINES — log these as // LANDMINE [LM-PWR-NNN]: description comments. Do NOT fix them:

- LM-PWR-001 (in powerups.activation.ts at wireActivationBar): Activation button click handlers disable the button but have no try/finally — if the activate RPC throws, the button stays permanently disabled. Disable-button-no-finally pattern.

- LM-PWR-002 (in powerups.overlays.ts at renderSilenceOverlay): Returns a setInterval handle that callers must store and clear manually. The return type makes this explicit but the convention is non-obvious — callers that discard the return value create a leak. Consider adding a JSDoc comment noting the required cleanup.

- LM-PWR-003 (in powerups.overlays.ts, already catalogued as L-A4 in AUDIT-FINDINGS.md): removeShieldIndicator is exported but the audit found it was a dead import in arena-room-setup.ts (fixed in Sweep C). Verify it still has active callers after the Sweep C cleanup.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
