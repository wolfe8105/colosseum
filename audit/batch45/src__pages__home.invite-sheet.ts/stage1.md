# Stage 1 Outputs — home.invite-sheet.ts

## Agent 01

### Control Flow
- `if` statement (`if (!effectId)`, `if (!effect)`, `if (data?.ok)`, `if (eligible.length === 0)`)
- `return` statement (early returns, return value `close`)
- `try` / `finally` block
- Ternary operator `? :` (multiple)

### Operators
- Strict equality `===`
- Strict inequality `!==`
- Logical NOT `!`
- Nullish coalescing `??`
- Optional chaining `?.`
- Non-null assertion `!` (postfix)
- Assignment `=`
- Template literal interpolation

### Async Constructs
- `async function` declaration
- `async` arrow function (click handler)
- `await` expression
- `Promise<() => void>` return type

### Type System
- `import type`
- Indexed access type `InviteReward['reward_type']`
- Type annotation `: RarityTier`
- Type assertion `as { ok?: boolean; error?: string; effect_name?: string } | null`
- Generic type argument on `querySelector<HTMLElement>`, `querySelectorAll<HTMLButtonElement>`
- Optional property markers `?` in asserted object type
- `void` type

### DOM APIs
- `document.createElement('div')`
- `document.body.appendChild(overlay)`
- `.className` setter
- `.innerHTML` setter
- `.textContent` setter
- `.disabled` setter
- `.dataset.effectId`
- `.remove()`
- `.addEventListener('click', ...)`
- `.querySelector()`
- `.querySelectorAll()`
- `e.target`

### Array Methods
- `.filter()`, `.map()`, `.join('')`, `.find()`, `.forEach()`

### String Methods
- `.toUpperCase()`

### Variable Declarations
- `const` (all declarations)

### Module System
- `import type` (named), `import` (named), `export async function`

## Agent 02

### Control Flow
- `if` statement
- `return` statement
- `try / finally`

### Operators
- `===`, `!==`, `!`, `??`, `?.`, `?:` (ternary), `=>` (arrow)
- Non-null assertion `!` (postfix)

### Type System
- `import type`, generic type params `<HTMLElement>`, `<HTMLButtonElement>`
- Indexed access type, type assertion `as`, optional `?` properties, union `| null`
- `: void`, `: Promise<() => void>`, `: RarityTier`

### Async Constructs
- `async function`, `async` arrow function, `await`, `Promise<>`

### DOM APIs
- `document.createElement()`, `document.body.appendChild()`, `.className`, `.innerHTML`, `.remove()`, `.addEventListener()`, `.querySelector()`, `.querySelectorAll()`, `.forEach()`, `e.target`, `btn.dataset.effectId`, `btn.disabled`, `btn.textContent`

### Array/String Methods
- `.filter()`, `.map()`, `.join()`, `.find()`, `.forEach()`, `.toUpperCase()`

### Module System
- `import type`, `import`, `export`

## Agent 03

### Control Flow
- `if` (4×), `return`, `try / finally`
- Ternary `? :` (3×), nullish coalescing `??` (3×), optional chaining `?.` (4×)

### Operators
- `===` (2×), `!==` (1×), `!` (1×), non-null assertion `!` (1×)
- Template literal with `${}` (3 template strings)

### Variable Declarations
- `const` (9×)

### Type Constructs
- `import type` (2×), `: RarityTier`, `: Promise<() => void>`, `: void`, `as` assertion, `?` optional, `| null`, `<HTMLElement>`, `<HTMLButtonElement>`, indexed access type

### Async
- `async` function, `async` arrow, `await` (2×), `Promise<>`

### Array/String Methods
- `.filter()`, `.map()`, `.find()`, `.join()`, `.forEach()`, `.toUpperCase()`

### DOM APIs
- `document.createElement()`, `document.body.appendChild()`, `.className`, `.innerHTML` (3×), `.remove()`, `.addEventListener()` (3×), `.querySelector()` (2×), `.querySelectorAll()`, `.dataset.effectId`, `.disabled` (2×), `.textContent` (2×), `e.target`

## Agent 04

### Control Flow
- `if` (`if (!effectId)`, `if (!effect)`, `if (data?.ok)`, `if (eligible.length === 0)`)
- `return`, `try / finally`, ternary, `??`, `?.`

### Operators
- `===` (3×), `!==` (1×), `!`, `??` (3×), `?.` (4×), non-null assertion `!`, ternary `? :`

### Variable Declarations
- `const`

### Type System
- `import type`, `: RarityTier`, `e: ModifierEffect`, `Promise<() => void>`, `: void`, `as` assertion, `?` optional, `| null`, indexed access type

### Async
- `async function`, `async () =>`, `await getModifierCatalog()`, `await safeRpc(...)`

### Array/String Methods
- `.filter()`, `.map()`, `.join()`, `.find()`, `.forEach()`, `.toUpperCase()`

### DOM APIs
- `document.createElement('div')`, `document.body.appendChild()`, `.className`, `.innerHTML`, `.textContent`, `.disabled`, `.remove()`, `.addEventListener()`, `.querySelector()`, `.querySelectorAll()`, `e.target`, `btn.dataset.effectId`

## Agent 05

### Control Flow
- `if` (4×), `return`, `try / finally`, ternary, `??`, `?.`

### Operators
- `===`, `!==`, `!`, `?.`, `??`, `=`, `=>`
- Non-null assertion `!` (postfix)

### Variable Declarations
- `const`

### Type System
- `import type`, generic params, `: RarityTier`, `: Promise<() => void>`, `: void`, indexed access, `as` assertion, `| null`, optional `?`, function type `() => void`

### Async
- `async function`, `async` arrow, `await` (2×), `Promise<>`

### Array/String Methods
- `.filter()`, `.map()`, `.join('')`, `.find()`, `.forEach()`, `.toUpperCase()`

### DOM APIs
- `document.createElement()`, `document.body.appendChild()`, `.className`, `.innerHTML`, `.remove()`, `.addEventListener()` (3×), `.querySelector()`, `.querySelectorAll()`, `e.target`, `btn.dataset.effectId`, `btn.disabled`, `btn.textContent`

### Literals
- String literals, `0`, `true`/`false` (implicit via disabled)
