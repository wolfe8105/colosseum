# Refactor Prompt — home.invite.ts (325 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/home.invite.ts (325 lines).

Read CLAUDE.md first, then read src/pages/home.invite.ts in full before touching anything. The file is F-59 Invite Rewards — invite link display, reward milestones, activity feed, and a claim bottom sheet. Has types, module state (_sheetCleanup), entry point, render, HTML helpers, event wiring, and the claim sheet flow.

SPLIT MAP (verify against the file before executing):

1. home.invite.ts (orchestrator, ~60 lines)
   Keeps: InviteReward/ActivityEntry/InviteStats interfaces, module-level _sheetCleanup, exported loadInviteScreen and cleanupInviteScreen. loadInviteScreen fetches stats via safeRpc and delegates to render().

2. home.invite-render.ts (~95 lines)
   `export function renderInvite(container: HTMLElement, stats: InviteStats): void`
   Builds the full HTML: progress band, invite link box, share row (native + WhatsApp + SMS), unclaimed rewards section, activity feed, FAQ ladder details. Delegates to wireInviteScreen at the end.

3. home.invite-html.ts (~50 lines)
   `export function rewardLabel(milestone: number): string`
   `export function rewardTypeLabel(type: InviteReward['reward_type']): string`
   `export function rewardRowHtml(r: InviteReward): string`
   `export function activityRowHtml(a: ActivityEntry): string`
   Pure HTML/label helpers. No DOM, no state. Leaf module.

4. home.invite-wiring.ts (~50 lines)
   `export function wireInviteScreen(container: HTMLElement, stats: InviteStats, onClaim: (rewardId: string, rewardType: InviteReward['reward_type']) => void): void`
   Wires copy button (clipboard write + showToast fallback), native share button (navigator.share), claim button click handlers. Takes an onClaim callback so wiring doesn't need to import the sheet module directly.

5. home.invite-sheet.ts (~95 lines)
   `export async function openClaimSheet(rewardId: string, rewardType: InviteReward['reward_type'], container: HTMLElement, onClose: () => void, onReload: () => void): Promise<() => void>`
   The claim bottom sheet flow: build overlay, load catalog via getModifierCatalog, filter by tier (legendary/mythic), render eligible cards, wire select buttons which call safeRpc('claim_invite_reward'), handle success (showToast + reload) and failure. Returns the close cleanup fn so the orchestrator can track _sheetCleanup.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- `import type` for all type-only imports (InviteReward, ActivityEntry, InviteStats, ModifierEffect, RarityTier).
- Dependency direction: html is a leaf. wiring imports html. sheet imports html. render imports html + wiring. orchestrator imports render + sheet.
- Target under 300 lines, preference 150. Every file lands under 100.
- Run `npm run build` after the split, report chunk sizes and line counts.
- Run `npm run typecheck` and confirm zero NEW errors.

LANDMINES — log these as `// LANDMINE [LM-INVITE-NNN]: description` comments. Do NOT fix them:

- LM-INVITE-001 (in home.invite-html.ts at rewardTypeLabel, already catalogued as M-F2 in AUDIT-FINDINGS.md): `rewardTypeLabel(type)` uses object-literal indexing `{ ... }[type]` which returns `undefined` for any unrecognized type. In home.invite-sheet.ts at openClaimSheet, the code does `rewardTypeLabel(rewardType).toUpperCase()` at line 255 of the original — this throws `TypeError: Cannot read property 'toUpperCase' of undefined` at runtime on any unknown reward_type. Fix is `rewardTypeLabel(rewardType)?.toUpperCase() ?? 'REWARD'` at the call site, or making rewardTypeLabel fall-through to a default.

- LM-INVITE-002 (in home.invite-sheet.ts at the select button click handler inside openClaimSheet, already catalogued as M-F3 in AUDIT-FINDINGS.md): The `.mod-buy-btn` handler does `btn.disabled = true; btn.textContent = 'Claiming…';` before the `safeRpc` call. On the success path `close()` runs — good. On the error path (data.ok false) the button is re-enabled — good. But if the await rejects before data is set, neither branch runs and the button stays stuck. Sixth confirmed instance of the disable-button-no-finally pattern (M-B5, M-C2, M-D1, M-E1, M-F1, M-F3). Fix: try/finally wrap.

- LM-INVITE-003 (in home.invite-wiring.ts at the claim button click handler): `openClaimSheet(...)` is called fire-and-forget in the click handler with no `.catch()`. If openClaimSheet rejects before the sheet is rendered (network failure on getModifierCatalog, for example), the rejection becomes an unhandled promise rejection. Already catalogued as L-F9. Same family as M-C5, L-C6.

- LM-INVITE-004 (in home.invite-sheet.ts at the grid guard after catalog load): `const grid = overlay.querySelector<HTMLElement>('#claim-picker-grid'); if (!grid) return;` is dead code. The grid was inserted into the overlay innerHTML 5 lines earlier as `<div class="invite-claim-grid" id="claim-picker-grid">` — the element WILL be there unless the template is malformed. The guard only fires if a developer breaks the template. Already catalogued as L-F8.

- LM-INVITE-005 (in home.invite-render.ts at the progress stats interpolation, already catalogued as L-F7): `${converts}`, `${stats.total_signups}`, `${stats.total_clicks}` are interpolated into innerHTML without `Number()` casts. CLAUDE.md rule violation. Same family as M-D2, L-F5.

Do NOT fix landmines — they're tracked in AUDIT-FINDINGS.md for Phase 2 cleanup. Refactor only.

Wait for approval of the split map before writing any code.
```
