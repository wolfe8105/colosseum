# Stage 1 Outputs — home.invite.ts

## Agent 01

1. line 9 | import | safeRpc from ../auth.ts
2. line 10 | import | escapeHTML, showToast from ../config.ts
3. lines 11-17 | import | getModifierCatalog, renderEffectCard, tierLabel, type ModifierEffect, type RarityTier from ../modifiers.ts
4. line 21 | interface | InviteReward
5. line 29 | interface | ActivityEntry
6. line 35 | interface | InviteStats
7. line 48 | var-binding | _sheetCleanup (let, type `(() => void) | null`, initialized to null)
8. line 52 | function-def | loadInviteScreen (exported async, params: container: HTMLElement, returns Promise<void>)
9. line 69 | function-def | render (params: container: HTMLElement, stats: InviteStats, returns void)
10. line 161 | function-def | rewardLabel (params: milestone: number, returns string)
11. line 168 | function-def | rewardTypeLabel (params: type: InviteReward['reward_type'], returns string)
12. line 172 | function-def | rewardRowHtml (params: r: InviteReward, returns string)
13. line 190 | function-def | activityRowHtml (params: a: ActivityEntry, returns string)
14. line 206 | function-def | wireInviteScreen (params: container: HTMLElement, stats: InviteStats, returns void)
15. line 244 | function-def | openClaimSheet (async, params: rewardId: string, rewardType: InviteReward['reward_type'], container: HTMLElement, stats: InviteStats, returns Promise<void>)
16. line 322 | function-def | cleanupInviteScreen (exported, no params, returns void)

## Agent 02

1. Line 9 — import — `{ safeRpc }` from `'../auth.ts'`
2. Line 10 — import — `{ escapeHTML, showToast }` from `'../config.ts'`
3. Lines 11–17 — import — `{ getModifierCatalog, renderEffectCard, tierLabel, type ModifierEffect, type RarityTier }` from `'../modifiers.ts'`
4. Lines 21–27 — interface declaration — `InviteReward`
5. Lines 29–33 — interface declaration — `ActivityEntry`
6. Lines 35–44 — interface declaration — `InviteStats`
7. Line 48 — variable declaration (`let`) — `_sheetCleanup: (() => void) | null`
8. Lines 52–65 — exported async function declaration — `loadInviteScreen(container: HTMLElement): Promise<void>`
9. Lines 69–157 — function declaration — `render(container: HTMLElement, stats: InviteStats): void`
10. Lines 161–166 — function declaration — `rewardLabel(milestone: number): string`
11. Lines 168–170 — function declaration — `rewardTypeLabel(type: InviteReward['reward_type']): string`
12. Lines 172–188 — function declaration — `rewardRowHtml(r: InviteReward): string`
13. Lines 190–202 — function declaration — `activityRowHtml(a: ActivityEntry): string`
14. Lines 206–240 — function declaration — `wireInviteScreen(container: HTMLElement, stats: InviteStats): void`
15. Lines 244–320 — async function declaration — `openClaimSheet(rewardId: string, rewardType: InviteReward['reward_type'], container: HTMLElement, stats: InviteStats): Promise<void>`
16. Lines 322–324 — exported function declaration — `cleanupInviteScreen(): void`

## Agent 03

1. line 9 — import — `safeRpc` from `../auth.ts`
2. line 10 — import — `escapeHTML`, `showToast` from `../config.ts`
3. lines 11–17 — import — `getModifierCatalog`, `renderEffectCard`, `tierLabel`, `ModifierEffect` (type), `RarityTier` (type) from `../modifiers.ts`
4. line 21 — interface — `InviteReward`
5. line 29 — interface — `ActivityEntry`
6. line 35 — interface — `InviteStats`
7. line 48 — var-binding — `_sheetCleanup`
8. line 52 — function-def — `loadInviteScreen`
9. line 69 — function-def — `render`
10. line 161 — function-def — `rewardLabel`
11. line 168 — function-def — `rewardTypeLabel`
12. line 172 — function-def — `rewardRowHtml`
13. line 190 — function-def — `activityRowHtml`
14. line 206 — function-def — `wireInviteScreen`
15. line 244 — function-def — `openClaimSheet`
16. line 322 — function-def — `cleanupInviteScreen`

## Agent 04

1. Line 1 — import — `safeRpc`
2. Line 2 — import — `escapeHTML`, `showToast`
3. Line 3 — import — `getModifierCatalog`, `renderEffectCard`, `tierLabel`, `ModifierEffect` (type), `RarityTier` (type)
4. Line 11 — interface — `InviteReward`
5. Line 18 — interface — `ActivityEntry`
6. Line 24 — interface — `InviteStats`
7. Line 34 — variable — `_sheetCleanup`
8. Line 36 — async function — `loadInviteScreen`
9. Line 47 — function — `render`
10. Line 57 — function — `rewardLabel`
11. Line 63 — function — `rewardTypeLabel`
12. Line 67 — function — `rewardRowHtml`
13. Line 74 — function — `activityRowHtml`
14. Line 80 — function — `wireInviteScreen`
15. Line 84 — async function — `openClaimSheet`
16. Line 92 — function — `cleanupInviteScreen`

## Agent 05

1. `import { safeRpc } from '../auth.ts'` (line 9)
2. `import { escapeHTML, showToast } from '../config.ts'` (line 10)
3. `import { getModifierCatalog, renderEffectCard, tierLabel, type ModifierEffect, type RarityTier } from '../modifiers.ts'` (lines 11-17)
4. `interface InviteReward` (lines 21-27)
5. `interface ActivityEntry` (lines 29-33)
6. `interface InviteStats` (lines 35-44)
7. `let _sheetCleanup: (() => void) | null` (line 48)
8. `export async function loadInviteScreen(container: HTMLElement): Promise<void>` (lines 52-65)
9. `function render(container: HTMLElement, stats: InviteStats): void` (lines 69-157)
10. `function rewardLabel(milestone: number): string` (lines 161-166)
11. `function rewardTypeLabel(type: InviteReward['reward_type']): string` (lines 168-170)
12. `function rewardRowHtml(r: InviteReward): string` (lines 172-188)
13. `function activityRowHtml(a: ActivityEntry): string` (lines 190-202)
14. `function wireInviteScreen(container: HTMLElement, stats: InviteStats): void` (lines 206-240)
15. `async function openClaimSheet(rewardId, rewardType, container, stats): Promise<void>` (lines 244-320)
16. `export function cleanupInviteScreen(): void` (lines 322-324)
