# Stage 2 Outputs — src/arena/arena-loadout-presets.ts

## Agent 01

### renderPresetBar (line 31)
- Sets `container.innerHTML` to loading placeholder immediately (sync, before `await`).
- Declares `presets: LoadoutPreset[] = []`.
- `await safeRpc<LoadoutPreset[]>('get_my_loadout_presets', {})` — no params. Guard: `!error && data` before assigning. Cast `data as LoadoutPreset[]` — no runtime shape validation.
- Silent `catch {}` — network failures and auth errors all produce `presets = []`. UI shows "No saved loadouts" indistinguishable from a real empty state.
- Calls `renderBar(...)` unconditionally. Returns void.
- **Issue**: If `safeRpc` returns `{ data: null, error: null }`, `presets` stays `[]`.

### renderBar (line 50)
- Branch A (empty): Writes static empty-state HTML with "＋ SAVE CURRENT" button.
- Branch B (non-empty): Maps to chip HTML. `escapeHTML(p.id)` and `escapeHTML(p.name)` — XSS-correct. Save button shown only if `presets.length < 6`.
- Save button wired via `?.addEventListener` (optional chain handles missing button).
- Per-chip wiring: `dataset.presetId` → `presets.find(...)`. Guards on missing presetId/preset.
- `pressTimer` (600ms) + `didLongPress` flag pattern: pointerdown arms timer, pointerup/pointercancel clear timer, click checks flag.
- `pointercancel` clears timer but does NOT reset `didLongPress = false`. **Potential issue**: user long-presses, scroll triggers pointercancel, next tap is suppressed.
- Floating promises from `handleSave`, `applyPreset`, `handleDelete` — unhandled rejections silent.

### applyPreset (line 123)
- Visual: `chip.classList.add('preset-chip-active')` + fire-and-forget 800ms `setTimeout` to remove.
- Refs branch: `if (refsContainer && debate.mode !== 'ai')` — calls `renderLoadoutPicker(...)` in try/catch.
- Power-up branch: `if (powerupContainer && preset.powerup_effect_ids.length > 0)`.
  - First `getMyPowerUps(debate.id)` — inventory snapshot.
  - Serial `for...of` loop: finds unequipped item by `effect_id`, calls `await equip(...)` if `slot <= 3`. Slot increments only on found+equipped item.
  - If any `equip` throws, entire power-up catch fires — remaining slots not attempted.
  - Dynamic `import('../powerups.ts')` and `import('../auth.ts')` — redundant (already statically imported); resolved from cache.
  - Second `getMyPowerUps(debate.id)` for refresh. Re-renders `powerupContainer.innerHTML` and calls `wireLoadout`.
- Two independent try/catch blocks (refs and power-ups).

### handleSave (line 181)
- `prompt(...)` blocking dialog. Guards null/empty trim.
- Ref IDs: `refsContainer?.querySelectorAll('.ref-loadout-card.selected')` — pushes `card.dataset.refId`.
- Power-up IDs: `await getMyPowerUps(...)` in silent try/catch.
- `saveBtn.disabled = true; textContent = 'SAVING...'` before RPC.
- **BUG**: Save button is NEVER re-enabled on failure paths. Both the `alert(msg); return` branch and the outer `catch` block exit without restoring `saveBtn`. User must navigate away to recover.
- On success: re-fetches presets, calls `renderBar`. Fallback `(data as LoadoutPreset[]) || presets` — stale data if re-fetch fails.

### handleDelete (line 236)
- `confirm(...)` with `preset.name` unescaped — safe (plain-text dialog, not HTML).
- `await safeRpc('delete_loadout_preset', { p_preset_id: preset.id })` — **return value NOT checked**. If RPC returns error without throwing, local optimistic removal still fires.
- `presets.filter(...)` produces new array, calls `renderBar` — re-render happens inside `try`, so catch fires before renderBar on exception.
- No user-facing error feedback on failure.
- `debate`, `refsContainer`, `powerupContainer` threaded through only for `renderBar`.

---

## Agent 02

### renderPresetBar (line 31)
- Loading placeholder written immediately. Async RPC with silent catch. `renderBar` always called.
- Container may be detached between await and renderBar — harmless but no guard.

### renderBar (line 50)
- escapeHTML on both `p.id` and `p.name` — correct XSS protection.
- `pressTimer` is cleared on `pointerup`/`pointercancel` but not null-ed — clearTimeout on an already-fired timer is harmless.
- `didLongPress` is never reset after long-press; old closures abandoned on re-render — safe only because re-render replaces DOM.
- Every `renderBar` call is a full teardown/rebuild — no incremental update.
- `#preset-save-btn` ID assumes single preset bar in document — multiple instances would collide.

### applyPreset (line 123)
- 800ms setTimeout remove has no cancel handle — fires on detached element harmlessly.
- Sequential `equip` calls: 3 serial round-trips at most.
- Second `powerupContainer` guard inside inner `if (powerupContainer && refreshed)` is redundant but harmless.
- `getCurrentProfile()` synchronous via dynamic import — async overhead for a sync call.

### handleSave (line 181)
- `name.trim().slice(0, 32)` — correct order (trim before slice).
- `(data as LoadoutPreset[]) || presets` — empty array `[]` is truthy so fallback to stale presets only on null/undefined.
- **BUG**: Button remains disabled on all failure paths.
- `alert()` blocking — incompatible with headless testing.

### handleDelete (line 236)
- **BUG**: `safeRpc` return not inspected. Silent error means UI removes chip but DB record remains.
- Optimistic update without re-fetch (asymmetry with `handleSave` which re-fetches).
- Two concurrent deletes: both filter from same closure snapshot — second re-render may re-introduce chip from first delete if presets differ.

---

## Agent 03

### renderPresetBar (line 31)
- Silent catch hides all failures. Correct that presets are optional, but no logging means persistent failures are invisible.

### renderBar (line 50)
- **Critical long-press race**: `pointercancel` handler clears `pressTimer` but does NOT reset `didLongPress = false`. If user long-presses (which sets `didLongPress = true`), scrolls (triggering `pointercancel`), then taps the same chip, `didLongPress` is still `true` and the tap is suppressed. **Fix**: add `didLongPress = false` to `pointercancel` handler.
- `pressTimer` cleared but not nulled — harmless.

### applyPreset (line 123)
- **Bug — equip loop**: `inventory` snapshot is taken before equipping. If `preset.powerup_effect_ids` contains duplicates, the same unequipped item is found twice and `equip` called twice for the same item.
- First `equip` failure aborts remaining equip calls (entire try/catch).
- Dynamic imports of already-loaded modules — architectural inconsistency, not a runtime risk.
- `wireLoadout` called on potentially detached/stale container.

### handleSave (line 181)
- If `refsContainer` is null (mode without refs), `selectedRefIds` stays empty — preset saved with no refs silently.
- **BUG**: Button not re-enabled on error. User stuck until re-render.
- Post-save re-fetch may return stale data if another client saved between calls.

### handleDelete (line 236)
- No RPC result check — optimistic removal even on server error.
- No user error feedback.
- Concurrent deletes from rapid long-presses: both use same stale closure, second re-render may clobber first.

---

## Agent 04

### renderPresetBar (line 31)
- Silent catch with no warning log — identical to Agent 01.

### renderBar (line 50)
- `pressTimer` type: `ReturnType<typeof setTimeout>` — correct in TypeScript.
- Re-render wipes listeners — full rebuild is safe given small size.
- `#preset-save-btn` ID collision risk if multiple instances.

### applyPreset (line 123)
- No `debate.mode` guard on power-up branch (refs branch has `!== 'ai'` check).
- Sequential equip loop without `Promise.all`.

### handleSave (line 181)
- Client-side 6-preset cap not re-checked in `handleSave` before RPC — server should enforce.
- Button permanently disabled on error paths.

### handleDelete (line 236)
- No RPC result inspection.
- No user-facing error on failure.

---

## Agent 05 (Security Focus)

### renderPresetBar (line 31)
- `container.innerHTML` loading message is hardcoded literal — no XSS risk.
- Silent catch: persistent RPC failure masked as empty state.
- **Stale-write race**: if called twice in rapid succession, second call's `renderBar` may fire after first call's, overwriting DOM. No cancellation token.

### renderBar (line 50)
- `escapeHTML(p.id)` and `escapeHTML(p.name)` — correct XSS protection per CLAUDE.md rules.
- `data-preset-id` value only used for in-memory `.find()` — never re-interpolated into innerHTML or RPC `.or()` filter directly at this layer. Safe.
- **Orphaned timer double-delete risk**: if `renderBar` is called while a chip's `pointerdown` timer is still running (from `handleDelete` triggering re-render mid-hold), the 600ms timer fires against the new DOM after re-render. The new chip for the same preset is now present and `handleDelete` is invoked a second time. This requires `handleDelete` to fire quickly enough to trigger a re-render within 600ms — possible.
- 6-preset UI cap enforced via button visibility only — not re-validated in `handleSave`.

### applyPreset (line 123)
- **XSS trust delegation**: `powerupContainer.innerHTML = renderLoadout(...)`. This file cannot be cleared on XSS safety without auditing `powerups.ts` to confirm `renderLoadout` escapes its inputs.
- `debate.mode !== 'ai'` guards refs but no equivalent guard on power-ups.
- **Slot counter bug**: if `equip()` throws at slot 1, the catch exits the entire block — slots 2 and 3 never attempted. But also: the `slot <= 3` check is before equip; if `equip` throws without incrementing `slot`, the next iteration (if catch weren't wrapping the whole block) would retry slot 1 — confirmed the outer try/catch means this branch exits entirely.
- Dynamic imports: `renderLoadout`, `wireLoadout`, `getCurrentProfile` are dynamically imported despite the same modules being statically imported at file top. Redundant complexity, resolved from cache.
- `profile?.questions_answered || 0` — safe null handling.

### handleSave (line 181)
- `p_name: name.trim().slice(0, 32)` — `escapeHTML` not applied, which is **correct** for RPC params (escaping is for HTML rendering, not SQL params).
- `selectedRefIds.push(card.dataset.refId)` — should be guarded with `if (card.dataset.refId)` to avoid pushing `undefined`. **Bug: `card.dataset.refId` can be `undefined` if `data-ref-id` attribute is absent.**
- `result.data?.error` shown in `alert()` — rendered as plain text, no XSS risk.
- Client-side 6-preset cap: hidden button is UI-only enforcement. Server-side RPC should enforce; if it doesn't, users can bypass via console.
- **BUG**: Save button permanently disabled on all failure paths (both `return` and `catch`). No `finally` block.

### handleDelete (line 236)
- `preset.name` in `confirm()` — unescaped but plain-text dialog context, no XSS.
- **BUG**: `safeRpc` result not checked. On silent RPC error (returns `{ error }` without throwing), local optimistic removal fires and chip disappears from UI while DB record remains.
- Optimistic removal without re-fetch — asymmetry with `handleSave`.
- No user-facing error on delete failure.

---

## Cross-Agent Consensus Summary

| Function | Key findings |
|---|---|
| renderPresetBar | Silent catch, loading placeholder, no data shape validation |
| renderBar | escapeHTML correctly applied; pointercancel missing didLongPress reset; orphaned timer risk; #id collision for multiple instances |
| applyPreset | Sequential equip (no Promise.all); first equip failure aborts rest; redundant dynamic imports; XSS trust delegated to renderLoadout; no mode guard on power-ups |
| handleSave | **Save button permanently disabled on error** (all 5 agree); selectedRefIds may include undefined (Agent 05); client-side cap not re-validated |
| handleDelete | **RPC result not checked** (all 5 agree); optimistic removal diverges from server on error; no user feedback on failure |

**Unique to Agent 03**: Concrete race: `pointercancel` missing `didLongPress = false` reset — next tap after scroll following long-press is suppressed.
**Unique to Agent 05**: Orphaned timer double-delete path; XSS delegation to `renderLoadout`; `selectedRefIds.push(card.dataset.refId)` can push `undefined`.
