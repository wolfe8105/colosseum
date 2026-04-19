# Stage 1 Primitive Inventory — powerups.activation.ts

Source: src/powerups.activation.ts (56 lines)

## Imports (lines 6–9)
- L6: named import `escapeHTML` from `./config.ts`
- L7: named import `CATALOG` from `./powerups.types.ts`
- L8: named import `activate` from `./powerups.rpc.ts`
- L9: `import type` — named types `PowerUpId`, `EquippedItem`, `ActivationCallbacks` from `./powerups.types.ts`

## renderActivationBar (lines 11–32)
- L11: `export function` declaration, parameter `equipped: EquippedItem[]`, return type `string`
- L12: optional-chain `equipped?.length`; logical negation guard; early return string literal `''`
- L14: `const buttons` assigned `equipped.map(eq => ...)` — Array.prototype.map, arrow function
- L15: `const cat` — bracket index access `CATALOG[eq.power_up_id as PowerUpId]`; type assertion `as PowerUpId`
- L16: `const isPassive` — strict equality `eq.power_up_id === 'multiplier_2x'`; boolean result
- L17–24: `return` template literal; 3 ternary expressions; property reads (`eq.power_up_id`, `eq.slot_number`, `eq.icon`); optional chain `cat?.icon`; nullish coalesce `?? '?'` (×2); `escapeHTML()` function call
- L27–31: `return` template literal; `buttons.join('')` — Array.prototype.join

## wireActivationBar (lines 34–56)
- L34: `export function` declaration, parameters `debateId: string`, `callbacks: ActivationCallbacks`, return type `void`
- L35: `document.querySelectorAll('.powerup-activate-btn:not(.passive):not(.used)')` — DOM API call; `.forEach(btn => {...})` — iteration; arrow function
- L36: `btn.addEventListener('click', async () => {...})` — event listener registration; async arrow function
- L37: `const el` — type assertion `btn as HTMLButtonElement`
- L38: `const powerUpId` — `el.dataset.id ?? ''` — dataset property read; nullish coalesce `?? ''`
- L39: `el.disabled = true` — property assignment
- L40: `el.style.opacity = '0.5'` — property assignment
- L42: `const result` — `await activate(debateId, powerUpId)` — async function call, await expression
- L43: `if (!result.success)` — property read; logical NOT; `el.disabled = false` — assignment; `el.style.opacity = '1'` — assignment; `return` — early return
- L45: `el.classList.add('used')` — method call
- L46: `el.style.background = '...'` — property assignment
- L47: `el.style.borderColor = '...'` — property assignment
- L48: `const label` — `el.querySelector('span:last-child')` — DOM query
- L49: `if (label)` — null guard; `label.textContent = 'USED'` — property assignment
- L51: `if (powerUpId === 'silence')` — strict equality; `callbacks.onSilence?.()` — optional method call
- L52: `else if (powerUpId === 'shield')` — strict equality; `callbacks.onShield?.()` — optional method call
- L53: `else if (powerUpId === 'reveal')` — strict equality; `callbacks.onReveal?.()` — optional method call

## Structural Notes
- No try/catch anywhere in the file
- No finally block in wireActivationBar
- `el.disabled = true` at L39 re-enabled only in the `!result.success` path (L43); success path and exception path both leave button disabled
- No setInterval — `destroy()` rule N/A
- No class declarations; no default export
