# Stage 2 Outputs — powerups.types.ts

## Agent 01
### [No functions on anchor list]

**Module-level runtime behavior:**

The file contains only type aliases and interfaces. The single exported value is `CATALOG` (line 51), which is a const object literal. At module load time, `CATALOG` is initialized as a pure static object with no computation — it contains four hardcoded power-up entries (multiplier_2x, silence, shield, reveal), each with string and number properties defined inline. The `as const` assertion at line 56 ensures TypeScript treats the object as a literal type, but this is a compile-time constraint with no runtime overhead.

**Summary:** Zero module-level computational effects. The file is purely declarative TypeScript type definitions plus one static constant.

## Agent 02
### [No functions on anchor list]

**Module-level runtime effects:**

The file contains only TypeScript type definitions and one constant binding. The exported const `CATALOG` is a **pure static object literal** with no runtime computation. It is declared with `Readonly<Record<PowerUpId, PowerUpCatalogEntry>>` and `as const`, making it an immutable mapping of power-up IDs to their metadata (name, icon, cost, and description).

At module load time, `CATALOG` is initialized once with four power-up entries (multiplier_2x, silence, shield, reveal), but this initialization performs no function calls, computations, or side effects—it is purely declarative object construction. The module executes no other top-level code.

## Agent 03
### [No functions on anchor list]

**Module-level runtime effects:**

The file exports one constant value: `CATALOG`, which is declared at line 51 as a typed constant object literal.

At module load time, `CATALOG` is initialized as a static object with four power-up entries (multiplier_2x, silence, shield, reveal). Since it is a pure object literal containing only primitive values (strings and numbers), **no computation or side effects occur at module load time** — the object is simply constructed and frozen via the `as const` assertion, then marked as `Readonly`.

The file performs **zero runtime computations** upon module initialization. All other exports are purely type-level constructs that have no runtime behavior.

## Agent 04
### No functions on anchor list

**Top-level runtime effects (module load behavior):**

The file contains no executable code with runtime side effects. The exported constant `CATALOG` (line 51) is initialized with a pure static object literal containing four power-up definitions. This object is declared as `Readonly<Record<PowerUpId, PowerUpCatalogEntry>>` with the `as const` assertion, meaning it is a compile-time constant with no computation at module load time.

The file consists entirely of:
- Type aliases (`PowerUpId`)
- Interfaces (`PowerUpCatalogEntry`, `PowerUpResult`, `InventoryItem`, `EquippedItem`, `MyPowerUpsResult`, `ActivationCallbacks`)
- One constant binding (`CATALOG`) that directly assigns a static object literal

No statements execute when this module is loaded. The `CATALOG` object is immutable by design and performs zero computation.

## Agent 05
### No functions on anchor list

The file contains only TypeScript type definitions and one exported constant object literal. There are no function definitions.

**Module-level runtime behavior:**

The `CATALOG` export (lines 51–56) is a pure static object literal with `as const` assertion. At module load time, it performs no computation—it is simply a readonly record mapping PowerUpId union types to PowerUpCatalogEntry objects. The object is defined inline with literal string keys and literal values (name, icon emoji, numeric cost, and description string), so it requires no function calls or runtime evaluation. The type annotation `Readonly<Record<PowerUpId, PowerUpCatalogEntry>>` is purely a compile-time type constraint that has no runtime overhead.

**No other module-level side effects** occur in this file.
