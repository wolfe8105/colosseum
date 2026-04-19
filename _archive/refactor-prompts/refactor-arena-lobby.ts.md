# Refactor Prompt — arena-lobby.ts (353 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-lobby.ts (353 lines).

Read CLAUDE.md first, then read src/arena/arena-lobby.ts in full before touching anything. The file is the Arena Lobby — renders the lobby feed (arena cards + auto-debate cards + placeholders), handles spectator click intercept, and shows the power-up shop.

SPLIT MAP (verify against the file before executing):

1. arena-lobby.ts (orchestrator, ~40 lines)
   Keeps: renderLobby export, showPowerUpShop export, all imports. Calls sub-modules for feed and shop.

2. arena-lobby-feed.ts (~80 lines)
   loadLobbyFeed, renderArenaFeedCard, renderAutoDebateCard, renderPlaceholderCards. The feed data fetch and all card HTML builders.

3. arena-lobby-shop.ts (~55 lines)
   showPowerUpShop. The power-up shop bottom-sheet triggered from the lobby — loads inventory, builds sheet DOM, wires close.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (ArenaFeedItem, AutoDebateItem).
- Dependency direction: orchestrator imports feed and shop. feed and shop are standalone — no cross-imports.
- Target under 85 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in arena-lobby* files.

LANDMINES — log these as // LANDMINE [LM-LOB-NNN]: description comments. Do NOT fix them:

- LM-LOB-001 (in arena-lobby-feed.ts at loadLobbyFeed): No try/catch around the RPC fetch. If the RPC throws, the lobby shows a permanently empty feed with no error state.

- LM-LOB-002 (in arena-lobby-feed.ts at renderArenaFeedCard): Card click handler calls enterFeedRoomAsSpectator directly. If the user taps a card rapidly, multiple spectate entry calls can fire before the first resolves. No in-flight guard.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
