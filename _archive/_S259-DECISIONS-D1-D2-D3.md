# S259 Decision Investigation — D1, D2, D3

Generated: 2026-04-10
Session: S259 (pre-P2)
Type: Read-only investigation

---

## D1 — settings module

### Evidence

- **HTML references:**
  - `src/settings.ts`: NONE (no HTML file references this path)
  - `src/pages/settings.ts`: `moderator-settings.html:600` loads `<script type="module" src="/src/pages/settings.ts">`. Also `src/pages/moderator-settings.html:561` loads the same path.

- **TS imports:**
  - `src/settings.ts` imported by: NONE (no other TS file imports from `./settings` or `../settings` referencing this file)
  - `src/pages/settings.ts` imported by: NONE directly (it is the entry point loaded by the HTML `<script>` tag, not imported by other modules)
  - Note: multiple files import from `./arena/arena-config-settings.ts` — this is a different, unrelated file.

- **Build config references:**
  - `vite.config.ts:10` lists `settings: resolve(__dirname, 'moderator-settings.html')` as a build input. This HTML file loads `src/pages/settings.ts` at line 600. Neither `src/settings.ts` nor `src/pages/settings.ts` is referenced directly in the build config — the HTML entry point is what pulls in the module.

- **Last modified:**
  - `src/settings.ts`: 2026-04-02 17:59:52 — "Add files via upload"
  - `src/pages/settings.ts`: 2026-04-05 22:51:36 — "Add files via upload"

- **Line counts:** `src/settings.ts` = 470, `src/pages/settings.ts` = 482

- **Near-duplicate?** NO — they are clearly divergent. `src/pages/settings.ts` has:
  - A `preferred_language` field in the settings interface (line 28 addition)
  - Language dropdown wiring (`set-language` select element)
  - Save button disable/re-enable UX (`save-btn` disabled state + spinner text)
  - Uses `colosseum_settings` localStorage key (old name)
  - `src/settings.ts` uses `moderator_settings` localStorage key (new name) with migration logic from old key
  - `src/settings.ts` has a back-button listener (`#back-btn`) that `src/pages/settings.ts` does not
  - `src/pages/settings.ts` has `preferred_language` in the profile update payload

### Conclusion

**LIVE: `src/pages/settings.ts`.** DEAD: `src/settings.ts`.

`moderator-settings.html` (the root-level file in the Vite build input) loads `src/pages/settings.ts` at line 600. `src/settings.ts` is not referenced by any HTML file or imported by any other module. It is an older copy (April 2, 12 fewer lines) that still uses the old localStorage migration logic but lacks the language dropdown and save-button UX added in the newer `src/pages/settings.ts` (April 5).

---

## D2 — staging HTML copies

### src/pages/moderator-settings.html
- **Referenced by TS/JS:** NONE
- **Referenced by HTML:** NONE
- **In build config input:** NO — `vite.config.ts:10` references `resolve(__dirname, 'moderator-settings.html')` (root-level), not `src/pages/moderator-settings.html`
- **Last modified:** 2026-04-02 14:06:10 — "Add files via upload"
- **Diff vs root `moderator-settings.html`:** 44 lines of difference (NOT identical)
- **Routing references:** NONE
- **Verdict:** DEAD

### src/pages/moderator-terms.html
- **Referenced by TS/JS:** NONE
- **Referenced by HTML:** NONE
- **In build config input:** NO — `vite.config.ts:16` references `resolve(__dirname, 'moderator-terms.html')` (root-level), not `src/pages/moderator-terms.html`
- **Last modified:** 2026-04-02 14:06:10 — "Add files via upload"
- **Diff vs root `moderator-terms.html`:** 36 lines of difference (NOT identical)
- **Routing references:** NONE
- **Verdict:** DEAD

### src/pages/src-pages-moderator-terms.html
- **Referenced by TS/JS:** NONE
- **Referenced by HTML:** NONE
- **In build config input:** NO
- **Last modified:** 2026-04-03 18:31:20 — "Add files via upload"
- **Diff vs root counterpart:** Not compared (the filename `src-pages-moderator-terms.html` suggests this is a double-nested copy — likely created by a drag-and-drop upload that flattened the path into the filename)
- **Routing references:** NONE
- **Verdict:** DEAD

### Overall conclusion

**ALL THREE DEAD.** None are in the Vite build input. None are referenced by any TS, JS, or HTML file. None are routed to. They are stale staging copies from early April uploads. Safe to add to `.audit-exclude`.

---

## D3 — power-up shop

### arena-lobby.ts power-up flow (lines 100-350 summary)

The lobby renders a "POWER-UPS" button (`arena-powerup-shop-btn`, line 79). Clicking it calls `showPowerUpShop()` (line 302), which replaces the lobby screen with a shop view rendered by `renderShop()` from `src/powerups.ts`. The shop displays the 4-item catalog (2x Multiplier, Silence, Shield, Reveal) with buy buttons. Each buy button calls `buyPowerUp()` (imported as `buy` from `src/powerups.ts`), which calls `safeRpc('buy_power_up', ...)`. A back button returns to the lobby via `renderLobby()`.

### src/powerups.ts scope

`src/powerups.ts` (460 lines) is the complete power-up system module. It owns: the static catalog definition (4 power-ups), all RPC wrappers (`buy`, `equip`, `activate`, `getMyPowerUps`, `getOpponentPowerUps`), shop rendering (`renderShop`), pre-debate loadout rendering and wiring (`renderLoadout`, `wireLoadout`), in-debate activation bar rendering and wiring (`renderActivationBar`, `wireActivationBar`), and visual effects (silence overlay, reveal popup, shield indicator). It covers the full lifecycle: browse shop → buy → equip before debate → activate during debate → visual feedback.

### Same overlay or different?

**Different UI surfaces, same module.** The arena-lobby power-up shop uses `showPowerUpShop()` which renders into `screenEl` (the main arena screen) with elements: `powerup-shop-back` (back button), `.powerup-buy-btn` (buy buttons), `.powerup-shop-item` (catalog items). The loadout/equip UI uses `renderLoadout()` which creates: `.powerup-slot` (empty/filled slots), `#powerup-inventory-picker`, `.powerup-inv-item` (inventory items). The activation bar uses `#powerup-activation-bar` with `.powerup-activate-btn` buttons. The reveal popup uses `#powerup-reveal-popup`. No DOM element IDs are shared between shop, loadout, and activation — they are three separate UI surfaces rendered at different stages of the debate lifecycle.

### Existing F-01 scope

**Title:** "Waiting Room"
**First action:** "User configures debate settings — ENTER THE ARENA -> ranked/casual -> ruleset -> mode -> category picker chain"

F-01 covers the queue and matchmaking system. It lists `src/arena/arena-lobby.ts` in `files_touched` but its scope is the ENTER THE ARENA → configure → queue → match flow. It does not mention power-ups, the shop, or any power-up RPCs.

### Backend surface

**RPCs called (via `safeRpc` in `src/powerups.ts`):**
- `buy_power_up` (line 88)
- `equip_power_up` (line 98)
- `activate_power_up` (line 109)
- `get_my_power_ups` (line 123)
- `get_opponent_power_ups` (line 130)

**Tables touched:** None directly. All writes go through the 5 RPCs above (SECURITY DEFINER pattern). No `supabase.from()` calls in either `src/powerups.ts` or the power-up section of `src/arena/arena-lobby.ts`.

**Importers of `src/powerups.ts`:**
- `src/arena/arena-lobby.ts` — buy + renderShop (shop flow)
- `src/arena/arena-mod-refs.ts` — removeShieldIndicator
- `src/arena/arena-room-end.ts` — removeShieldIndicator + cleanup
- `src/arena/arena-types.ts` — EquippedItem type
- `src/arena/arena-state.ts` — EquippedItem type
- `src/pages/home.ts` — showPowerUpShop (deep-link action)

### Report (no recommendation)

The power-up system spans 5 RPCs, 1 dedicated module (`src/powerups.ts`, 460 lines), and 3 distinct UI surfaces (shop, loadout, activation bar). It is imported by 6 files across the arena subsystem. F-01 covers queue/matchmaking and does not reference any power-up RPCs or UI. The `arena-lobby.ts` file is shared between F-01 (lobby rendering, queue entry) and the power-up shop (shop rendering, buy flow), but the code sections are cleanly separated (lobby: lines 30-171, power-up shop: lines 298-350).
