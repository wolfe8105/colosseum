# Stage 2 Outputs — modifiers.ts

## Agent 01
### getModifierCatalog

`getModifierCatalog` is async and reads two module-level variables: `_catalogCache` (a `ModifierEffect[]` array or `null`) and `_catalogFetchedAt` (a timestamp number). On entry it calls `Date.now()` and checks whether `_catalogCache` is non-null and the elapsed time since `_catalogFetchedAt` is less than the constant `CATALOG_TTL_MS` (3,600,000 ms). If both conditions are true, it returns `_catalogCache` immediately without any network call. If the cache is stale or absent, it awaits `safeRpc('get_modifier_catalog')` with no parameters. If `result.error` is truthy or `result.data` is not an array, it logs to `console.error` and returns the existing `_catalogCache` if it is non-null, or an empty array otherwise. On success it casts `result.data` to `ModifierEffect[]`, writes it to `_catalogCache`, writes the current timestamp to `_catalogFetchedAt`, and returns the newly cached array.

### getEffect

`getEffect` is async. It takes a single string parameter `effectId`, awaits `getModifierCatalog` to obtain the full catalog array (hitting the in-memory cache if valid), then calls `Array.prototype.find` to locate the first entry whose `id` property strictly equals `effectId`. It returns that entry if found, or `null` via the nullish-coalescing fallback if `find` returns `undefined`. It writes no state.

### getEndOfDebateEffects

`getEndOfDebateEffects` is async. It awaits `getModifierCatalog` to obtain the catalog array, then calls `Array.prototype.filter` on the result, keeping only entries whose `timing` property strictly equals the string `'end_of_debate'`. It returns the filtered array, which may be empty. It writes no state.

### getInDebateEffects

`getInDebateEffects` is async. It awaits `getModifierCatalog` to obtain the catalog array, then calls `Array.prototype.filter` on the result, keeping only entries whose `timing` property strictly equals the string `'in_debate'`. It returns the filtered array, which may be empty. It writes no state.

### buyModifier

`buyModifier` is async. It takes a single string parameter `effectId` and awaits `safeRpc('buy_modifier', { p_effect_id: effectId })`. If `result.error` is truthy it returns a plain object with `success: false` and an `error` string derived from `result.error.message` if that property exists, or from `String(result.error)` otherwise. If `result.error` is falsy it casts `result.data` to the return type shape — `{ success: boolean; modifier_id?: string; cost?: number; error?: string }` — and returns it directly. The function writes no module-level state; any side effects (debiting tokens, recording ownership) occur server-side inside the `buy_modifier` RPC.

### buyPowerup

`buyPowerup` is async. It takes a string `effectId` and an optional `quantity` number that defaults to `1`. It awaits `safeRpc('buy_powerup', { p_effect_id: effectId, p_quantity: quantity })`. If `result.error` is truthy it returns `{ success: false, error: ... }` using the same string-extraction logic as `buyModifier`. If `result.error` is falsy it casts and returns `result.data` as `{ success: boolean; new_quantity?: number; cost?: number; error?: string }`. No module-level state is written.

### socketModifier

`socketModifier` is async. It takes three parameters: `referenceId` (string), `socketIndex` (number, 0-based), and `modifierId` (string). It awaits `safeRpc('socket_modifier', { p_reference_id: referenceId, p_socket_index: socketIndex, p_modifier_id: modifierId })`. If `result.error` is truthy it returns `{ success: false, error: ... }` using the same string-extraction pattern as the buy functions. If `result.error` is falsy it casts and returns `result.data` as `{ success: boolean; error?: string }`. No module-level state is written; the permanent socketing operation occurs server-side.

### equipPowerupForDebate

`equipPowerupForDebate` is async. It takes two string parameters, `debateId` and `effectId`, and awaits `safeRpc('equip_powerup_for_debate', { p_debate_id: debateId, p_effect_id: effectId })`. If `result.error` is truthy it returns `{ success: false, error: ... }`. If `result.error` is falsy it casts and returns `result.data` as `{ success: boolean; slots_used?: number; error?: string }`. No module-level state is written; inventory deduction and slot counting occur server-side.

### getUserInventory

`getUserInventory` is async. It takes an optional string parameter `debateId`. It awaits `safeRpc('get_user_modifier_inventory', { p_debate_id: debateId ?? null })`, passing `null` when `debateId` is not supplied. If `result.error` is truthy it logs to `console.error` and returns `null`. If `result.error` is falsy it casts and returns `result.data` as a `UserInventory` object — which contains `unsocketed_modifiers`, `powerup_stock`, and `equipped_loadout` arrays. The `equipped_loadout` array is populated server-side only when a `debateId` was supplied; what the server returns for `equipped_loadout` when `debateId` is `null` is not visible in this file.

### tierLabel

`tierLabel` is synchronous. It takes a `RarityTier` string and returns a new string formed by uppercasing `tier.charAt(0)` and concatenating `tier.slice(1)`. It reads no external state and writes nothing.

### timingLabel

`timingLabel` is synchronous. It takes a `ModifierTiming` string and performs a strict equality check: if the value is `'end_of_debate'` it returns the string `'Post-Match'`; otherwise it returns `'In-Debate'`. It reads no external state and writes nothing.

### categoryLabel

`categoryLabel` is synchronous. It takes a `ModifierCategory` string, constructs a local `Record<ModifierCategory, string>` literal mapping all twelve category values to their display strings, then returns `map[cat]`. If `cat` is not a key in the map — which cannot happen under strict TypeScript but could at runtime with an unexpected value — the nullish-coalescing fallback returns `cat` unchanged. It reads no external state and writes nothing.

### rarityClass

`rarityClass` is synchronous. It takes a `RarityTier` string and returns it unchanged. The function body is a single `return tier` statement. It reads no external state and writes nothing. The return value is intended for use as a CSS class suffix.

### renderEffectCard

`renderEffectCard` is synchronous. It takes a `ModifierEffect` object and an optional `opts` object with four boolean/string fields, all defaulting to absent. It constructs and returns a trimmed HTML string representing a modifier effect card; it writes no state and does not touch the DOM directly.

The function first builds `timingBadge`, an HTML `<span>` string, by branching on `effect.timing === 'in_debate'`. It then builds `modBtn`: if `opts.showModButton` is truthy it produces a `<button>` element with a `data-effect-id` attribute set to `escapeHTML(effect.id)` and label text derived from `opts.modButtonLabel` if provided or a fallback string interpolating `effect.mod_cost`; if `opts.showModButton` is falsy `modBtn` is the empty string. The same pattern applies to `puBtn` using `opts.showPuButton`, `opts.puButtonLabel`, and `effect.pu_cost`. The function then assembles the outer card markup, calling `rarityClass` on `effect.tier_gate` for CSS class suffixes, `escapeHTML` on `effect.id`, `effect.name`, and `effect.description`, `tierLabel` on `effect.tier_gate`, and `categoryLabel` on `effect.category`. The completed template literal is trimmed before being returned.

### renderModifierRow

`renderModifierRow` is synchronous. It takes an `OwnedModifier` object and an optional `opts` object with a single boolean field `showSocketButton`. It constructs and returns a trimmed HTML string representing an inventory row for an unsocketed modifier; it writes no state and does not touch the DOM.

If `opts.showSocketButton` is truthy it produces a `<button>` with class `mod-socket-btn` and a `data-modifier-id` attribute set to `escapeHTML(mod.modifier_id)`; otherwise `socketBtn` is the empty string. The row markup calls `escapeHTML` on `mod.modifier_id`, `mod.name`, and `mod.description`, calls `rarityClass` on `mod.tier_gate` and inlines a ternary on `mod.timing` for the timing badge CSS suffix, and calls `tierLabel` and `timingLabel` for display text.

### renderPowerupRow

`renderPowerupRow` is synchronous. It takes a `PowerUpStock` object and an optional `opts` object with `showEquipButton` (boolean) and `debateId` (string). It constructs and returns a trimmed HTML string representing an inventory row for a consumable power-up; it writes no state and does not touch the DOM.

`equipBtn` is only generated when both `opts.showEquipButton` is truthy and `opts.debateId` is a non-empty string; if either is absent `equipBtn` is the empty string. When generated, the button carries `data-effect-id` and `data-debate-id` attributes, both passed through `escapeHTML`. The row markup inlines `pu.quantity` directly as `×${pu.quantity}` without additional escaping (it is a number from the typed interface). `escapeHTML` is called on `pu.effect_id`, `pu.name`, and `pu.description`. `timingLabel` is called on `pu.timing` and a ternary on `pu.timing` supplies the CSS suffix.

### handleBuyModifier

`handleBuyModifier` is async. It takes `effectId` (string) and `effectName` (string). It awaits `buyModifier(effectId)`. If the returned object's `success` property is truthy it calls `showToast` with a success message interpolating `effectName` and the string `'success'`, then returns `true`. If `success` is falsy it calls `showToast` with `res.error` if that string is present or the fallback string `'Purchase failed'`, and the string `'error'`, then returns `false`. The function writes no module-level state.

### handleBuyPowerup

`handleBuyPowerup` is async. It takes `effectId` (string), `effectName` (string), and an optional `quantity` number defaulting to `1`. It awaits `buyPowerup(effectId, quantity)`. If the returned object's `success` property is truthy it calls `showToast` with a message interpolating both `effectName` and `quantity`, and the string `'success'`, then returns `true`. If `success` is falsy it calls `showToast` with `res.error ?? 'Purchase failed'` and `'error'`, then returns `false`. The function writes no module-level state.

### handleEquip

`handleEquip` is async. It takes `debateId` (string), `effectId` (string), and `effectName` (string). It awaits `equipPowerupForDebate(debateId, effectId)`. If the returned object's `success` property is truthy it calls `showToast` with a message interpolating `effectName` and `res.slots_used` in the format `"${effectName} equipped (slot ${res.slots_used}/3)"` and the string `'success'`, then returns `true`. If `success` is falsy it calls `showToast` with `res.error ?? 'Equip failed'` and `'error'`, then returns `false`. The function writes no module-level state. If `res.slots_used` is `undefined` on success (which the type allows), the interpolated message will read `"slot undefined/3"` — there is no guard against that case in this function.

## Agent 02
### getModifierCatalog

`getModifierCatalog` is async. It reads the module-level variables `_catalogCache` and `_catalogFetchedAt`, and the constant `CATALOG_TTL_MS` (3,600,000 ms). On entry it captures `Date.now()` and checks whether `_catalogCache` is non-null and the elapsed time since `_catalogFetchedAt` is less than `CATALOG_TTL_MS`. If both conditions are true it returns `_catalogCache` immediately without any network call. Otherwise it calls `safeRpc('get_modifier_catalog')` and awaits the result. If `result.error` is truthy or `result.data` is not an array it logs to `console.error` and returns the stale `_catalogCache` if one exists, or an empty array if not. On a successful fetch it writes `result.data` (cast to `ModifierEffect[]`) into `_catalogCache`, writes the current timestamp into `_catalogFetchedAt`, and returns the freshly written `_catalogCache`.

### getEffect

`getEffect` is async. It takes a single `effectId` string parameter. It calls `getModifierCatalog()` and awaits the result, obtaining the full (possibly cached) `ModifierEffect[]` array. It then calls `Array.prototype.find` on that array, matching on `e.id === effectId`. It returns the matching `ModifierEffect` if found, or `null` via the nullish-coalescing fallback if `find` returns `undefined`. It writes no state.

### getEndOfDebateEffects

`getEndOfDebateEffects` is async. It takes no parameters. It calls `getModifierCatalog()` and awaits the result. It then calls `Array.prototype.filter` on the returned array, retaining only entries whose `timing` property equals the string `'end_of_debate'`. It returns the filtered array. It writes no state.

### getInDebateEffects

`getInDebateEffects` is async. It takes no parameters. It calls `getModifierCatalog()` and awaits the result. It then calls `Array.prototype.filter` on the returned array, retaining only entries whose `timing` property equals the string `'in_debate'`. It returns the filtered array. It writes no state.

### buyModifier

`buyModifier` is async. It takes one parameter, `effectId: string`. It calls `safeRpc('buy_modifier', { p_effect_id: effectId })` and awaits the result. If `result.error` is truthy it returns a plain object with `success: false` and an `error` string derived from `result.error.message` if that property exists, falling back to `String(result.error)`. On the success path it casts `result.data` to the return shape `{ success: boolean; modifier_id?: string; cost?: number; error?: string }` and returns it directly. It writes no module-level state. The returned object's contents depend entirely on what the RPC returns.

### buyPowerup

`buyPowerup` is async. It takes `effectId: string` and an optional `quantity` parameter that defaults to `1`. It calls `safeRpc('buy_powerup', { p_effect_id: effectId, p_quantity: quantity })` and awaits the result. If `result.error` is truthy it returns `{ success: false, error: ... }` using the same message-or-stringify fallback as `buyModifier`. On the success path it casts `result.data` to `{ success: boolean; new_quantity?: number; cost?: number; error?: string }` and returns it. It writes no module-level state.

### socketModifier

`socketModifier` is async. It takes three parameters: `referenceId: string`, `socketIndex: number`, and `modifierId: string`. It calls `safeRpc('socket_modifier', { p_reference_id: referenceId, p_socket_index: socketIndex, p_modifier_id: modifierId })` and awaits the result. If `result.error` is truthy it returns `{ success: false, error: ... }` via the same error-extraction pattern used in `buyModifier`. On success it casts `result.data` to `{ success: boolean; error?: string }` and returns it. It writes no module-level state.

### equipPowerupForDebate

`equipPowerupForDebate` is async. It takes `debateId: string` and `effectId: string`. It calls `safeRpc('equip_powerup_for_debate', { p_debate_id: debateId, p_effect_id: effectId })` and awaits the result. If `result.error` is truthy it returns `{ success: false, error: ... }` using the same error-extraction pattern as the other buy/socket functions. On success it casts `result.data` to `{ success: boolean; slots_used?: number; error?: string }` and returns it. It writes no module-level state.

### getUserInventory

`getUserInventory` is async. It takes an optional `debateId?: string` parameter. It calls `safeRpc('get_user_modifier_inventory', { p_debate_id: debateId ?? null })` and awaits the result, passing `null` when `debateId` is `undefined`. If `result.error` is truthy it logs to `console.error` and returns `null`. On success it casts `result.data` to `UserInventory` and returns it. It writes no module-level state.

### tierLabel

`tierLabel` is synchronous. It takes a `RarityTier` string. It capitalises the first character with `charAt(0).toUpperCase()` and concatenates the remainder of the string with `slice(1)`, then returns the result. It reads and writes no external state.

### timingLabel

`timingLabel` is synchronous. It takes a `ModifierTiming` string. It performs a strict equality check against `'end_of_debate'`: if true it returns the string `'Post-Match'`; otherwise it returns `'In-Debate'`. It reads and writes no external state.

### categoryLabel

`categoryLabel` is synchronous. It takes a `ModifierCategory` string. It defines a local `Record<ModifierCategory, string>` lookup map with twelve entries and performs a property access using `cat` as the key. If the key is present in the map it returns the mapped display string; if the lookup yields `undefined` (i.e., an unrecognised category value) it falls back to returning `cat` unchanged via the `??` operator. It reads and writes no external state.

### rarityClass

`rarityClass` is synchronous. It takes a `RarityTier` string and returns it unchanged. It performs no transformation, reads no external state, and writes no external state. Its sole runtime effect is returning the input value to the caller for use as a CSS class suffix.

### renderEffectCard

`renderEffectCard` is synchronous. It takes a `ModifierEffect` object and an optional `opts` object whose fields `showModButton`, `showPuButton`, `modButtonLabel`, and `puButtonLabel` all default to absent. It builds the HTML string in three stages. First it constructs `timingBadge` by comparing `effect.timing` to `'in_debate'`, producing one of two `<span>` strings. Second it conditionally builds `modBtn`: if `opts.showModButton` is truthy it produces a `<button>` element with a `data-effect-id` attribute set to `escapeHTML(effect.id)` and inner text set to `escapeHTML` of either `opts.modButtonLabel` or a default string embedding `effect.mod_cost`; otherwise `modBtn` is an empty string. Third it conditionally builds `puBtn` by the same logic keyed on `opts.showPuButton`, using `effect.pu_cost` in the default label. It then assembles the final template literal, calling `rarityClass(effect.tier_gate)` twice for CSS class suffixes, `escapeHTML(effect.id)` for the card's `data-effect-id`, `escapeHTML(effect.name)` for the name span, `rarityClass` and `tierLabel(effect.tier_gate)` for the rarity badge, `escapeHTML(effect.description)` for the description paragraph, and `categoryLabel(effect.category)` for the category tag. The complete string is trimmed and returned. It writes no state.

### renderModifierRow

`renderModifierRow` is synchronous. It takes an `OwnedModifier` object and an optional `opts` object with a single `showSocketButton` field. It conditionally builds `socketBtn`: if `opts.showSocketButton` is truthy it produces a `<button class="mod-socket-btn">` with a `data-modifier-id` attribute set to `escapeHTML(mod.modifier_id)`; otherwise `socketBtn` is an empty string. It then constructs and returns a trimmed template-literal HTML string for a `.mod-inventory-row` div, embedding `escapeHTML(mod.modifier_id)` as `data-modifier-id`, `escapeHTML(mod.name)`, `rarityClass(mod.tier_gate)` and `tierLabel(mod.tier_gate)` for the rarity badge, a timing badge whose modifier class is determined by comparing `mod.timing` to `'in_debate'` and whose label comes from `timingLabel(mod.timing)`, `escapeHTML(mod.description)`, and the conditionally built `socketBtn`. It writes no state.

### renderPowerupRow

`renderPowerupRow` is synchronous. It takes a `PowerUpStock` object and an optional `opts` object with `showEquipButton` and `debateId` fields. It builds `equipBtn` only when both `opts.showEquipButton` is truthy and `opts.debateId` is truthy; if either is falsy `equipBtn` is an empty string. When built, the equip button carries `data-effect-id` set to `escapeHTML(pu.effect_id)` and `data-debate-id` set to `escapeHTML(opts.debateId)`. The function then returns a trimmed template-literal HTML string for a `.mod-powerup-row` div, embedding `escapeHTML(pu.effect_id)` as `data-effect-id`, `escapeHTML(pu.name)` and `escapeHTML(pu.description)` for display text, `pu.quantity` (interpolated directly as a numeric value with a `×` prefix — note: no `escapeHTML` or `Number()` cast is applied here), a timing badge class and label derived from comparing `pu.timing` to `'in_debate'` and calling `timingLabel(pu.timing)`, and the conditionally built `equipBtn`. It writes no state.

### handleBuyModifier

`handleBuyModifier` is async. It takes `effectId: string` and `effectName: string`. It calls `buyModifier(effectId)` and awaits the result into `res`. If `res.success` is truthy it calls `showToast` with a success message that interpolates `effectName` (without escaping — the value is placed into the toast string directly) and the literal string `'success'`, then returns `true`. If `res.success` is falsy it calls `showToast` with `res.error` falling back to the string `'Purchase failed'` and the literal `'error'`, then returns `false`. It writes no module-level state.

### handleBuyPowerup

`handleBuyPowerup` is async. It takes `effectId: string`, `effectName: string`, and an optional `quantity` defaulting to `1`. It calls `buyPowerup(effectId, quantity)` and awaits the result into `res`. If `res.success` is truthy it calls `showToast` with a message that interpolates `effectName` and `quantity` (neither escaped) followed by the literal `'success'`, then returns `true`. If `res.success` is falsy it calls `showToast` with `res.error` falling back to `'Purchase failed'` and the literal `'error'`, then returns `false`. It writes no module-level state.

### handleEquip

`handleEquip` is async. It takes `debateId: string`, `effectId: string`, and `effectName: string`. It calls `equipPowerupForDebate(debateId, effectId)` and awaits the result into `res`. If `res.success` is truthy it calls `showToast` with a message that interpolates `effectName` and `res.slots_used` (neither escaped), formatted as `"<name> equipped (slot <n>/3)"`, paired with the literal `'success'`, then returns `true`. If `res.success` is falsy it calls `showToast` with `res.error` falling back to `'Equip failed'` and the literal `'error'`, then returns `false`. It writes no module-level state.

## Agent 03
### getModifierCatalog

`getModifierCatalog` is async. It reads the module-level variables `_catalogCache` and `_catalogFetchedAt`, and the constant `CATALOG_TTL_MS` (3,600,000 ms). On entry it captures `Date.now()` as `now` and checks whether `_catalogCache` is non-null and whether the elapsed time since `_catalogFetchedAt` is less than `CATALOG_TTL_MS`. If both conditions are true, the function returns `_catalogCache` immediately without any network call. When the cache is absent or stale, it calls `safeRpc('get_modifier_catalog')` and awaits the result. If `result.error` is truthy or `result.data` is not an array, it logs to `console.error` and returns the existing `_catalogCache` if it is non-null, or an empty array if it is null — the stale cache is preferred over an empty array. On a successful response it writes `result.data` (cast to `ModifierEffect[]`) into `_catalogCache`, writes the current timestamp into `_catalogFetchedAt`, and returns the freshly populated cache.

### getEffect

`getEffect` is async. It accepts a single string parameter `effectId`. It calls `getModifierCatalog()` and awaits the result, receiving the full `ModifierEffect[]` array from cache or network. It then calls `Array.prototype.find` on that array, matching the first entry whose `id` property strictly equals `effectId`. It returns that entry if found, or `null` via the nullish-coalescing fallback if `find` returns `undefined`. It writes nothing.

### getEndOfDebateEffects

`getEndOfDebateEffects` is async. It calls `getModifierCatalog()` and awaits the result. It then calls `Array.prototype.filter` on the returned array, retaining only entries whose `timing` property equals the string `'end_of_debate'`. It returns the filtered array. It writes nothing and has no error path of its own; any error from `getModifierCatalog` propagates as an empty array.

### getInDebateEffects

`getInDebateEffects` is async and structurally identical to `getEndOfDebateEffects`. It calls `getModifierCatalog()` and awaits the result, then filters for entries whose `timing` equals `'in_debate'`, and returns that filtered array. It writes nothing.

### buyModifier

`buyModifier` is async. It accepts a single string parameter `effectId`. It calls `safeRpc('buy_modifier', { p_effect_id: effectId })` and awaits the result. If `result.error` is truthy, it returns an object with `success: false` and an `error` string derived from `result.error.message` if that property exists, otherwise from `String(result.error)`. If there is no error, it casts `result.data` to the return shape `{ success: boolean; modifier_id?: string; cost?: number; error?: string }` and returns it directly — the server response determines the values of those fields. It writes no module-level state.

### buyPowerup

`buyPowerup` is async. It accepts `effectId: string` and `quantity: number` (defaulting to `1`). It calls `safeRpc('buy_powerup', { p_effect_id: effectId, p_quantity: quantity })` and awaits the result. On `result.error` it returns `{ success: false, error: ... }` using the same message-extraction pattern as `buyModifier`. On success it casts `result.data` to `{ success: boolean; new_quantity?: number; cost?: number; error?: string }` and returns it. It writes no module-level state.

### socketModifier

`socketModifier` is async. It accepts three parameters: `referenceId: string`, `socketIndex: number`, and `modifierId: string`. It calls `safeRpc('socket_modifier', { p_reference_id: referenceId, p_socket_index: socketIndex, p_modifier_id: modifierId })` and awaits the result. On `result.error` it returns `{ success: false, error: ... }` using the same error-extraction pattern used in `buyModifier`. On success it casts `result.data` to `{ success: boolean; error?: string }` and returns it. It writes no module-level state.

### equipPowerupForDebate

`equipPowerupForDebate` is async. It accepts `debateId: string` and `effectId: string`. It calls `safeRpc('equip_powerup_for_debate', { p_debate_id: debateId, p_effect_id: effectId })` and awaits the result. On `result.error` it returns `{ success: false, error: ... }` using the same error-extraction pattern as the other buy/socket functions. On success it casts `result.data` to `{ success: boolean; slots_used?: number; error?: string }` and returns it. It writes no module-level state.

### getUserInventory

`getUserInventory` is async. It accepts an optional `debateId?: string` parameter. It calls `safeRpc('get_user_modifier_inventory', { p_debate_id: debateId ?? null })` and awaits the result, passing `null` when `debateId` is `undefined`. If `result.error` is truthy it logs to `console.error` and returns `null`. On success it casts `result.data` to `UserInventory` and returns it. It writes no module-level state.

### tierLabel

`tierLabel` is synchronous. It accepts a `RarityTier` string. It reads `tier.charAt(0)`, uppercases it via `.toUpperCase()`, concatenates it with `tier.slice(1)`, and returns the result. It reads and writes no external state.

### timingLabel

`timingLabel` is synchronous. It accepts a `ModifierTiming` string. It evaluates a ternary: if `timing` equals `'end_of_debate'` it returns the string `'Post-Match'`; otherwise it returns `'In-Debate'`. It reads and writes no external state.

### categoryLabel

`categoryLabel` is synchronous. It accepts a `ModifierCategory` string parameter `cat`. It constructs a local `Record<ModifierCategory, string>` literal `map` that covers all twelve defined category values, then returns `map[cat]`. If `cat` is not a key in the map, the nullish-coalescing fallback returns `cat` as-is. No external calls are made and nothing is written.

### rarityClass

`rarityClass` is synchronous. It accepts a `RarityTier` string and returns it unchanged. The function body is a single `return tier` statement. Its only purpose is to carry the type annotation and comment establishing the expected CSS class suffix convention.

### renderEffectCard

`renderEffectCard` is synchronous. It accepts a `ModifierEffect` object and an optional `opts` object whose four boolean/string properties all default to absent (the default argument is `{}`). It builds an HTML string in four phases. First, it evaluates `effect.timing` to select one of two `<span>` badge strings (`timingBadge`). Second, it conditionally builds a modifier buy button (`modBtn`) by checking `opts.showModButton`; if truthy, it constructs a `<button>` element using `escapeHTML` on `effect.id` and either `opts.modButtonLabel` or a fallback string incorporating `effect.mod_cost`; if falsy, `modBtn` is an empty string. Third, it builds a power-up buy button (`puBtn`) by the same conditional pattern using `opts.showPuButton`, `effect.pu_cost`, and `opts.puButtonLabel`. Fourth, it assembles the full card template literal, calling `rarityClass(effect.tier_gate)`, `escapeHTML(effect.id)`, `escapeHTML(effect.name)`, `tierLabel(effect.tier_gate)`, `escapeHTML(effect.description)`, and `categoryLabel(effect.category)` inline within the template. The final string is trimmed and returned. No DOM is touched and no state is written.

### renderModifierRow

`renderModifierRow` is synchronous. It accepts an `OwnedModifier` object and an optional `opts` object (default `{}`). It checks `opts.showSocketButton`; if truthy, it builds a `<button class="mod-socket-btn">` element with `data-modifier-id` set to `escapeHTML(mod.modifier_id)`; otherwise `socketBtn` is empty. It then assembles a template literal for the row, calling `escapeHTML` on `mod.modifier_id`, `mod.name`, and `mod.description`; calling `rarityClass(mod.tier_gate)` and `tierLabel(mod.tier_gate)` for the rarity badge; and evaluating a ternary on `mod.timing` to select the CSS modifier class `'live'` or `'post'` for the timing badge, also calling `timingLabel(mod.timing)`. The trimmed HTML string is returned. No DOM is touched and no state is written.

### renderPowerupRow

`renderPowerupRow` is synchronous. It accepts a `PowerUpStock` object and an optional `opts` object with `showEquipButton` and `debateId` fields. The equip button is built only when both `opts.showEquipButton` is truthy and `opts.debateId` is truthy — either missing value suppresses the button. When both are present, a `<button class="mod-equip-btn">` is constructed with `data-effect-id` set to `escapeHTML(pu.effect_id)` and `data-debate-id` set to `escapeHTML(opts.debateId)`. The row template includes `escapeHTML(pu.effect_id)` on the container, `escapeHTML(pu.name)` and `escapeHTML(pu.description)` for display text, `pu.quantity` rendered directly as `×${pu.quantity}` (not passed through `escapeHTML` — it is a number from the typed interface), a timing class ternary on `pu.timing`, and `timingLabel(pu.timing)`. The trimmed string is returned. No DOM is touched and no state is written.

### handleBuyModifier

`handleBuyModifier` is async. It accepts `effectId: string` and `effectName: string`. It calls `buyModifier(effectId)` and awaits the result into `res`. If `res.success` is truthy it calls `showToast` with a success message that interpolates `effectName` (without escaping — the value is placed into the toast string directly) and the literal string `'success'`, then returns `true`. If `res.success` is falsy it calls `showToast` with `res.error` falling back to the string `'Purchase failed'` and the literal `'error'`, then returns `false`. It writes no module-level state.

### handleBuyPowerup

`handleBuyPowerup` is async. It accepts `effectId: string`, `effectName: string`, and an optional `quantity` defaulting to `1`. It calls `buyPowerup(effectId, quantity)` and awaits the result into `res`. If `res.success` is truthy it calls `showToast` with a message that interpolates `effectName` and `quantity` (neither escaped) followed by the literal `'success'`, then returns `true`. If `res.success` is falsy it calls `showToast` with `res.error` falling back to `'Purchase failed'` and the literal `'error'`, then returns `false`. It writes no module-level state.

### handleEquip

`handleEquip` is async. It accepts `debateId: string`, `effectId: string`, and `effectName: string`. It calls `equipPowerupForDebate(debateId, effectId)` and awaits the result into `res`. If `res.success` is truthy it calls `showToast` with a message that interpolates `effectName` and `res.slots_used` (neither escaped), formatted as `"<name> equipped (slot <n>/3)"`, paired with the literal `'success'`, then returns `true`. If `res.success` is falsy it calls `showToast` with `res.error` falling back to `'Equip failed'` and the literal `'error'`, then returns `false`. It writes no module-level state.

## Agent 04
### getModifierCatalog

`getModifierCatalog` is async. It reads the module-level variables `_catalogCache` and `_catalogFetchedAt`, and compares the result of `Date.now()` against `_catalogFetchedAt` plus the constant `CATALOG_TTL_MS` (3,600,000 ms). If `_catalogCache` is non-null and the elapsed time is less than the TTL, it returns `_catalogCache` immediately without making a network call. Otherwise it calls `safeRpc('get_modifier_catalog')` with no parameters and awaits the result. If `result.error` is set or `result.data` is not an array, it logs to `console.error` and returns the existing `_catalogCache` if it is non-null, or an empty array if it is null. On success it writes `result.data` cast to `ModifierEffect[]` into `_catalogCache`, writes the current timestamp into `_catalogFetchedAt`, and returns `_catalogCache`.

### getEffect

`getEffect` is async. It accepts a single parameter `effectId: string`. It calls `getModifierCatalog()` and awaits the returned array. It then calls `Array.prototype.find` on that array, comparing each element's `id` property to `effectId`. It returns the matching `ModifierEffect` if found, or `null` via the nullish-coalescing fallback if `find` returns `undefined`. It writes nothing.

### getEndOfDebateEffects

`getEndOfDebateEffects` is async. It calls `getModifierCatalog()` and awaits the result. It calls `Array.prototype.filter` on the catalog, keeping only elements whose `timing` property is strictly equal to `'end_of_debate'`. It returns the filtered array. It writes nothing and has no error path of its own; any error surfaces through `getModifierCatalog`.

### getInDebateEffects

`getInDebateEffects` is async and structurally identical to `getEndOfDebateEffects` except the filter predicate keeps elements whose `timing` is `'in_debate'`. It calls `getModifierCatalog()`, awaits it, filters, and returns the filtered array. It writes nothing.

### buyModifier

`buyModifier` is async. It accepts a single string parameter `effectId`. It calls `safeRpc('buy_modifier', { p_effect_id: effectId })` and awaits the result. If `result.error` is truthy it returns a plain object `{ success: false, error: … }` where the error string is `result.error.message` if present, otherwise `String(result.error)`. On the success path it casts `result.data` to the return shape `{ success: boolean; modifier_id?: string; cost?: number; error?: string }` and returns it directly. It writes no module-level state and performs no other side effects.

### buyPowerup

`buyPowerup` is async. It accepts `effectId: string` and `quantity: number` (defaulting to `1`). It calls `safeRpc('buy_powerup', { p_effect_id: effectId, p_quantity: quantity })` and awaits the result. On error it returns `{ success: false, error: … }` using the same message-extraction pattern as `buyModifier`. On success it casts and returns `result.data` as `{ success: boolean; new_quantity?: number; cost?: number; error?: string }`. It writes no module-level state.

### socketModifier

`socketModifier` is async. It accepts three parameters: `referenceId: string`, `socketIndex: number`, and `modifierId: string`. It calls `safeRpc('socket_modifier', { p_reference_id: referenceId, p_socket_index: socketIndex, p_modifier_id: modifierId })` and awaits the result. On error it returns `{ success: false, error: … }` with the same message-extraction logic as the buy functions. On success it casts and returns `result.data` as `{ success: boolean; error?: string }`. It writes no module-level state.

### equipPowerupForDebate

`equipPowerupForDebate` is async. It accepts `debateId: string` and `effectId: string`. It calls `safeRpc('equip_powerup_for_debate', { p_debate_id: debateId, p_effect_id: effectId })` and awaits the result. On error it returns `{ success: false, error: … }` using the same message-extraction pattern. On success it casts and returns `result.data` as `{ success: boolean; slots_used?: number; error?: string }`. The `slots_used` value in the success response comes from the server. The function writes no local state.

### getUserInventory

`getUserInventory` is async. It accepts an optional `debateId` string. It calls `safeRpc('get_user_modifier_inventory', { p_debate_id: debateId ?? null })` and awaits the result, passing `null` when `debateId` is `undefined`. If `result.error` is truthy it logs to `console.error` and returns `null`. On success it casts `result.data` to `UserInventory` and returns it. It writes no module-level state. The `equipped_loadout` field in the returned `UserInventory` is populated only when a non-null `debateId` was supplied, though this distinction is enforced by the server, not by this function.

### tierLabel

`tierLabel` is synchronous. It accepts a `RarityTier` string. It reads `tier.charAt(0)`, uppercases it via `.toUpperCase()`, concatenates it with `tier.slice(1)`, and returns the result. It writes nothing and calls no external functions. There is no branching; all five valid tier values (`'common'`, `'uncommon'`, `'rare'`, `'legendary'`, `'mythic'`) are transformed by the same expression.

### timingLabel

`timingLabel` is synchronous. It accepts a `ModifierTiming` string. It evaluates a ternary: if `timing` equals `'end_of_debate'` it returns the string `'Post-Match'`; otherwise it returns `'In-Debate'`. It writes nothing.

### categoryLabel

`categoryLabel` is synchronous. It accepts a `ModifierCategory` string parameter `cat`. It constructs a local `Record<ModifierCategory, string>` literal `map` that covers all twelve defined category values, then returns `map[cat]`. If `cat` is not a key in the map, the nullish-coalescing fallback returns `cat` as-is. No external calls are made and nothing is written.

### rarityClass

`rarityClass` is synchronous. It accepts a `RarityTier` string and returns it unchanged. The function body is a single `return tier` statement. Its only purpose is to carry the type annotation and comment establishing the expected CSS class suffix convention.

### renderEffectCard

`renderEffectCard` is synchronous. It accepts a `ModifierEffect` object and an optional `opts` object whose four boolean/string properties all default to absent (the default argument is `{}`). It builds an HTML string in four phases. First, it evaluates `effect.timing` to select one of two `<span>` badge strings (`timingBadge`). Second, it conditionally builds a modifier buy button (`modBtn`) by checking `opts.showModButton`; if truthy, it constructs a `<button>` element using `escapeHTML` on `effect.id` and either `opts.modButtonLabel` or a fallback string incorporating `effect.mod_cost`; if falsy, `modBtn` is an empty string. Third, it builds a power-up buy button (`puBtn`) by the same conditional pattern using `opts.showPuButton`, `effect.pu_cost`, and `opts.puButtonLabel`. Fourth, it assembles the full card template literal, calling `rarityClass(effect.tier_gate)`, `escapeHTML(effect.id)`, `escapeHTML(effect.name)`, `tierLabel(effect.tier_gate)`, `escapeHTML(effect.description)`, and `categoryLabel(effect.category)` inline within the template. The final string is trimmed and returned. No DOM is touched and no state is written.

### renderModifierRow

`renderModifierRow` is synchronous. It accepts an `OwnedModifier` object and an optional `opts` object (default `{}`). It checks `opts.showSocketButton`; if truthy, it builds a `<button class="mod-socket-btn">` element with `data-modifier-id` set to `escapeHTML(mod.modifier_id)`; otherwise `socketBtn` is empty. It then assembles a template literal for the row, calling `escapeHTML` on `mod.modifier_id`, `mod.name`, and `mod.description`; calling `rarityClass(mod.tier_gate)` and `tierLabel(mod.tier_gate)` for the rarity badge; and evaluating a ternary on `mod.timing` to select the CSS modifier class `'live'` or `'post'` for the timing badge, also calling `timingLabel(mod.timing)`. The trimmed HTML string is returned. No DOM is touched and no state is written.

### renderPowerupRow

`renderPowerupRow` is synchronous. It accepts a `PowerUpStock` object and an optional `opts` object with `showEquipButton` and `debateId` fields. The equip button is built only when both `opts.showEquipButton` is truthy and `opts.debateId` is truthy — either missing value suppresses the button. When both are present, a `<button class="mod-equip-btn">` is constructed with `data-effect-id` set to `escapeHTML(pu.effect_id)` and `data-debate-id` set to `escapeHTML(opts.debateId)`. The row template includes `escapeHTML(pu.effect_id)` on the container, `escapeHTML(pu.name)` and `escapeHTML(pu.description)` for display text, `pu.quantity` rendered directly as `×${pu.quantity}` (not passed through `escapeHTML` — it is a number from the typed interface), a timing class ternary on `pu.timing`, and `timingLabel(pu.timing)`. The trimmed string is returned. No DOM is touched and no state is written.

### handleBuyModifier

`handleBuyModifier` is async. It accepts `effectId: string` and `effectName: string`. It calls `buyModifier(effectId)` and awaits the result into `res`. If `res.success` is truthy it calls `showToast` with the string `` `${effectName} modifier added to inventory` `` and the level `'success'`, then returns `true`. If `res.success` is falsy it calls `showToast` with `res.error ?? 'Purchase failed'` and the level `'error'`, then returns `false`. There is no try/catch; the error path relies solely on the `success` flag from `buyModifier`.

### handleBuyPowerup

`handleBuyPowerup` is async. It accepts `effectId: string`, `effectName: string`, and `quantity` (number, default `1`). It calls `buyPowerup(effectId, quantity)` and awaits the result into `res`. If `res.success` is truthy it calls `showToast` with `` `${effectName} ×${quantity} added to inventory` `` at level `'success'` and returns `true`. Otherwise it calls `showToast` with `res.error ?? 'Purchase failed'` at level `'error'` and returns `false`. The `quantity` value in the toast reflects the requested quantity, not any server-confirmed quantity.

### handleEquip

`handleEquip` is async. It accepts `debateId`, `effectId`, and `effectName`, all strings. It calls `equipPowerupForDebate(debateId, effectId)` and awaits the result into `res`. If `res.success` is truthy it calls `showToast` with `` `${effectName} equipped (slot ${res.slots_used}/3)` `` at level `'success'` — `res.slots_used` is the server-returned slot count after equipping — and returns `true`. Otherwise it calls `showToast` with `res.error ?? 'Equip failed'` at level `'error'` and returns `false`.

## Agent 05
### getModifierCatalog

`getModifierCatalog` is async. It reads two module-level variables, `_catalogCache` and `_catalogFetchedAt`, and the constant `CATALOG_TTL_MS` (3,600,000 ms). On entry it captures `Date.now()`. If `_catalogCache` is non-null and the elapsed time since `_catalogFetchedAt` is less than `CATALOG_TTL_MS`, it returns `_catalogCache` immediately without any network call. When the cache is absent or expired, it awaits `safeRpc('get_modifier_catalog')` with no parameters. If `result.error` is truthy or `result.data` is not an array, it logs the error to the console and returns the existing `_catalogCache` if it is non-null, or an empty array if it is null. On success it writes `result.data` cast to `ModifierEffect[]` into `_catalogCache`, writes `now` into `_catalogFetchedAt`, and returns `_catalogCache`.

### getEffect

`getEffect` is async. It receives a single string parameter `effectId`. It awaits `getModifierCatalog()` to obtain the full catalog array (from cache or network). It then calls `Array.prototype.find` on the returned array, comparing each entry's `id` property against `effectId`. It returns the first matching `ModifierEffect`, or `null` if no match is found. It writes no state.

### getEndOfDebateEffects

`getEndOfDebateEffects` is async. It takes no parameters. It awaits `getModifierCatalog()` and calls `Array.prototype.filter` on the result, retaining only entries whose `timing` property strictly equals the string `'end_of_debate'`. It returns the filtered array, which may be empty. It writes no state.

### getInDebateEffects

`getInDebateEffects` is async. It takes no parameters. Its structure is identical to `getEndOfDebateEffects` except the filter predicate matches entries whose `timing` equals `'in_debate'`. It awaits `getModifierCatalog()`, filters, and returns the filtered array. It writes no state.

### buyModifier

`buyModifier` is async. It receives a single string parameter `effectId`. It awaits `safeRpc('buy_modifier', { p_effect_id: effectId })`. If `result.error` is truthy it returns a plain object with `success: false` and an `error` string derived from `result.error.message` if that property exists, otherwise from `String(result.error)`. On the success path it casts `result.data` to the return type shape and returns it, which may contain `success`, `modifier_id`, and `cost` fields. The function writes no module-level state; all side effects live inside the RPC.

### buyPowerup

`buyPowerup` is async. It receives a string `effectId` and an optional numeric `quantity` that defaults to `1`. It awaits `safeRpc('buy_powerup', { p_effect_id: effectId, p_quantity: quantity })`. If `result.error` is truthy it returns `{ success: false, error: ... }` using the same error-coercion pattern as `buyModifier`. On success it casts `result.data` to the return shape, which may include `success`, `new_quantity`, and `cost`, and returns it. No module-level state is written.

### socketModifier

`socketModifier` is async. It receives three parameters: a string `referenceId`, a number `socketIndex` (0-based slot), and a string `modifierId`. It awaits `safeRpc('socket_modifier', { p_reference_id: referenceId, p_socket_index: socketIndex, p_modifier_id: modifierId })`. If `result.error` is truthy it returns `{ success: false, error: ... }` using the same error-coercion pattern as the buy functions. On success it casts `result.data` to `{ success: boolean; error?: string }` and returns it. No module-level state is written.

### equipPowerupForDebate

`equipPowerupForDebate` is async. It receives two string parameters: `debateId` and `effectId`. It awaits `safeRpc('equip_powerup_for_debate', { p_debate_id: debateId, p_effect_id: effectId })`. If `result.error` is truthy it returns `{ success: false, error: ... }` using the same error-coercion pattern. On success it casts `result.data` to `{ success: boolean; slots_used?: number; error?: string }` and returns it. The server-side RPC is documented to deduct one unit from the caller's inventory and enforce a maximum of three equipped power-ups per debate; this function itself reads and writes no client-side state.

### getUserInventory

`getUserInventory` is async. It accepts an optional string `debateId`. It awaits `safeRpc('get_user_modifier_inventory', { p_debate_id: debateId ?? null })`, passing `null` when `debateId` is not supplied. If `result.error` is truthy it logs the error to the console and returns `null`. On success it casts `result.data` to `UserInventory` and returns it. The returned object, when non-null, contains three array fields: `unsocketed_modifiers`, `powerup_stock`, and `equipped_loadout`. The `equipped_loadout` field is populated only when a `debateId` was passed (this is a server-side behavior — the client passes the value through without conditional logic). No module-level state is written.

### tierLabel

`tierLabel` is synchronous. It receives a `RarityTier` string. It uppercases the first character via `charAt(0).toUpperCase()`, concatenates the remainder of the string via `slice(1)`, and returns the result. For example, `'uncommon'` becomes `'Uncommon'`. No state is read or written.

### timingLabel

`timingLabel` is synchronous. It receives a `ModifierTiming` string. It returns the string `'Post-Match'` if the argument strictly equals `'end_of_debate'`, and `'In-Debate'` for any other value (in practice only `'in_debate'`). No state is read or written.

### categoryLabel

`categoryLabel` is synchronous. It receives a `ModifierCategory` string. It constructs a local `Record<ModifierCategory, string>` map literal inline on every call and looks up `map[cat]`. If the key exists it returns the mapped display string; if it does not exist (which cannot happen with a well-typed `ModifierCategory` argument but is guarded against anyway) it falls back to returning `cat` unchanged via `?? cat`. It writes nothing.

### rarityClass

`rarityClass` is synchronous. It receives a `RarityTier` string and returns it unchanged. The function body is a direct `return tier` with no transformation, branching, or side effects.

### renderEffectCard

`renderEffectCard` is synchronous. It receives a `ModifierEffect` object and an options object with four optional boolean/string fields. It reads `effect.timing` to choose between two hard-coded HTML badge strings stored in `timingBadge`. It evaluates `opts.showModButton`: if truthy it builds a button string using `escapeHTML(effect.id)` and `escapeHTML(opts.modButtonLabel ?? \`Buy Modifier · ${effect.mod_cost} tokens\`)`, otherwise it assigns an empty string to `modBtn`. It evaluates `opts.showPuButton` in the same way to produce `puBtn`, with a fallback label using `effect.pu_cost`. It then assembles and returns a multi-line template-literal HTML string representing a `<div class="mod-effect-card …">` element. Within the template it calls `rarityClass(effect.tier_gate)` (twice, for the card class and the rarity badge class), `escapeHTML(effect.id)` (once on the card's `data-effect-id`), `escapeHTML(effect.name)`, `tierLabel(effect.tier_gate)`, `escapeHTML(effect.description)`, and `categoryLabel(effect.category)`. The template is trimmed before being returned. Nothing is written to the DOM; the caller is responsible for insertion.

### renderModifierRow

`renderModifierRow` is synchronous. It receives an `OwnedModifier` object and an options object with an optional `showSocketButton` boolean. It evaluates `opts.showSocketButton`: if truthy it builds a button string using `escapeHTML(mod.modifier_id)`, otherwise it assigns an empty string to `socketBtn`. It then assembles and returns a trimmed template-literal HTML string for a `<div class="mod-inventory-row …">` element. Within the template it calls `escapeHTML(mod.modifier_id)` (twice: once on the row's `data-modifier-id` and once inside `socketBtn` when present), `escapeHTML(mod.name)`, `rarityClass(mod.tier_gate)`, `tierLabel(mod.tier_gate)`, reads `mod.timing` directly to select the `live`/`post` CSS variant, calls `timingLabel(mod.timing)`, and calls `escapeHTML(mod.description)`. Nothing is written to the DOM.

### renderPowerupRow

`renderPowerupRow` is synchronous. It receives a `PowerUpStock` object and an options object with optional `showEquipButton` boolean and `debateId` string. It evaluates `opts.showEquipButton && opts.debateId`: only when both are truthy does it build an equip button string using `escapeHTML(pu.effect_id)` and `escapeHTML(opts.debateId)`. If either condition is falsy `equipBtn` is an empty string. It assembles and returns a trimmed template-literal HTML string for a `<div class="mod-powerup-row …">` element. Within the template it calls `escapeHTML(pu.effect_id)`, `escapeHTML(pu.name)`, reads `pu.quantity` directly (cast implicitly to string by the template), reads `pu.timing` to select the CSS variant, calls `timingLabel(pu.timing)`, and calls `escapeHTML(pu.description)`. Nothing is written to the DOM.

### handleBuyModifier

`handleBuyModifier` is async. It receives a string `effectId` and a string `effectName`. It awaits `buyModifier(effectId)`. If `res.success` is truthy it calls `showToast` with the string `` `${effectName} modifier added to inventory` `` and the level `'success'`, then returns `true`. If `res.success` is falsy it calls `showToast` with `res.error ?? 'Purchase failed'` and the level `'error'`, then returns `false`. There are no other branches or error paths.

### handleBuyPowerup

`handleBuyPowerup` is async. It receives a string `effectId`, a string `effectName`, and an optional numeric `quantity` that defaults to `1`. It awaits `buyPowerup(effectId, quantity)`. If `res.success` is truthy it calls `showToast` with `` `${effectName} ×${quantity} added to inventory` `` at level `'success'` and returns `true`. If `res.success` is falsy it calls `showToast` with `res.error ?? 'Purchase failed'` at level `'error'` and returns `false`.

### handleEquip

`handleEquip` is async. It receives three strings: `debateId`, `effectId`, and `effectName`. It awaits `equipPowerupForDebate(debateId, effectId)`. If `res.success` is truthy it calls `showToast` with `` `${effectName} equipped (slot ${res.slots_used}/3)` `` at level `'success'` and returns `true`. If `res.success` is falsy it calls `showToast` with `res.error ?? 'Equip failed'` at level `'error'` and returns `false`. There are no other branches.
