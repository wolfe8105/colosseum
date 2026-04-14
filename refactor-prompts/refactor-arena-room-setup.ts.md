# Refactor Prompt — arena-room-setup.ts (407 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-room-setup.ts (407 lines).

Read CLAUDE.md first, then read src/arena/arena-room-setup.ts in full before touching anything. The file has two public entry points — `showPreDebate` (pre-debate loadout/staking/bounty screen) and `enterRoom` (room entry dispatcher) — plus a private `_renderRoom` that builds the full room layout and a helper `showPreDebateLoadout`.

SPLIT MAP (verify against the file before executing):

1. arena-room-predebate.ts (~180 lines — largest section, acceptable)
   `export async function showPreDebate(debateData: CurrentDebate): Promise<void>`
   `async function showPreDebateLoadout(debateData: CurrentDebate, container: HTMLElement): Promise<void>` (file-local helper)
   Owns the pre-debate screen: rank badge, VS bar, staking panel render + wire, power-up loadout render + wire, reference loadout picker (F-51 Phase 3), preset bar (F-60), bounty claim dropdown (F-28), enter-button wiring, share-link copy button wiring. The 180-line block stays together because every section shares mutable DOM state (`pre`, `loadoutEl`, `refsEl`, `presetsEl`, `bountyEl`) built up sequentially; splitting further forces passing 5+ container refs between functions.

2. arena-room-enter.ts (~80 lines)
   `export function enterRoom(debate: CurrentDebate): void`
   Entry dispatcher. Sets view, stops intro music via dynamic import, routes `live` mode to `enterFeedRoom` (early return), otherwise plays entrance sequence via dynamic import and then calls `renderRoom`. Keeps the dynamic imports of arena-sounds and arena-entrance to preserve lazy-loading.

3. arena-room-render.ts (~160 lines)
   `export function renderRoom(debate: CurrentDebate): void` — renamed from private `_renderRoom` since the leading underscore loses meaning once it's in its own file.
   Room layout builder: rank badge, VS bar construction, mod bar (if moderator assigned), power-up loadout load IIFE, mode-specific input controls via `renderInputControls`, reference button via `addReferenceButton`, activation bar wiring with silence/shield/reveal handlers, reference poll start, mod status poll start, live round timer + `initLiveAudio`.

4. Delete arena-room-setup.ts. Update every consumer to import from the appropriate new file. Run `grep -rn "from.*arena-room-setup" src/` to find callers. Common consumers: arena-match.ts (calls showPreDebate and enterRoom), arena-private-lobby.ts, arena-mod-queue.ts, arena-mod-debate.ts, arena-core.ts.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- `import type` for all type-only imports (CurrentDebate, DebateRole).
- Dependency direction: arena-room-render imports nothing from predebate or enter. arena-room-enter imports renderRoom from arena-room-render. arena-room-predebate imports enterRoom from arena-room-enter.
- Target under 300 lines, preference 150. Predebate at ~180 is over preference but well under the ceiling.
- Run `npm run build` after the split, report chunk sizes and line counts for every new file.
- Run `npm run typecheck` and confirm zero NEW errors in arena-room-* files.

LANDMINES — log these as `// LANDMINE [LM-SETUP-NNN]: description` comments in the affected files. Do NOT fix them:

- LM-SETUP-001 (in arena-room-predebate.ts near the `injectAdSlot(pre, ...)` call at line 90 of the original): `injectAdSlot` is called but does NOT appear in the import list at the top of the original file. If the build currently succeeds, the symbol is resolving through some other chain (possibly a transitive re-export or an arena-core indirection). If the build currently fails on this, that's a pre-existing bug, not something this refactor introduced. **Verify by running the baseline `npm run build` BEFORE any edits** — note the result in the refactor report. If baseline fails with `injectAdSlot` undefined, add the missing import from `./arena-ads.ts` as part of this refactor and note it; if baseline succeeds, add the explicit import anyway during the split (it's cheap housekeeping and removes the ambiguity).

- LM-SETUP-002 (in arena-room-render.ts near line 239 of the original): The guard `if (debate.mode === 'ai' && !isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-'))` is the same "real debate" predicate family logged as LM-END-002 in the arena-room-end refactor. Worth extracting a shared `isRealDebate(debate)` helper in a follow-up sweep after both refactors land.

- LM-SETUP-003 (in arena-room-render.ts at the power-up loadout load IIFE, lines 315-340 of the original): The IIFE fetches power-ups, renders the loadout, wires a callback that fetches again and renders again. On successful equip the wire callback triggers a second full fetch + re-render + re-wire. Double round-trip per equip action. Verify intent — if the intent was optimistic local update, this is wrong; if the intent was "always re-sync after mutation," it's correct but expensive.

- LM-SETUP-004 (in arena-room-predebate.ts at the `wireLoadout` callback inside showPreDebate, lines 116-118 of the original): The wire callback captures `showPreDebateLoadout` which itself calls `wireLoadout` again, which captures `showPreDebateLoadout`. Recursive wiring loop is intentional (refresh after equip) but the closure chain means each render leaks one more reference. Low severity.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
