# Stage 2 Outputs — src/async.state.ts

## Agent 01

### state (line 43)

`state` is a plain object literal exported as `export const state` at line 43. It has no prototype methods beyond `Object.prototype`; all interaction happens exclusively through ten explicitly defined accessor properties (getter/setter pairs or getter-only). The backing store is ten module-level private variables declared at lines 28–37, which are closed over by the getters and setters. Because the object is `const`, the binding itself cannot be reassigned, but every property it exposes is mutable through the defined accessors.

**`hotTakes` (lines 44–45) — get + set.** Returns the live `_hotTakes: HotTake[]` reference. No defensive copy. Any caller that stores the returned array and mutates it in place bypasses the setter. The setter replaces the backing reference wholesale.

**`predictions` (lines 47–48) — get + set.** Identical pattern to `hotTakes`. Live reference return. No defensive copy. Setter does full replacement.

**`standaloneQuestions` (lines 50–51) — get + set.** Same as above. Live reference.

**`currentFilter` (lines 53–54) — get + set.** Backs `_currentFilter: CategoryFilter = 'all'`. Primitive string return — no aliasing risk. No runtime validation in setter. TypeScript-only enforcement.

**`pendingChallengeId` (lines 56–57) — get + set.** Backs `_pendingChallengeId: string | null = null`. Primitive return. No UUID-format validation in setter.

**`reactingIds` (line 59) — getter-only.** Returns live `_reactingIds: Set<string>`. No setter — prevents identity replacement. Contents fully mutable by any caller via `.add()`/`.delete()`. Intentional: shared dedup guard for react-toggle RPC.

**`postingInFlight` (lines 61–62) — get + set.** Boolean scalar. Simple mutex flag.

**`challengeInFlight` (lines 64–65) — get + set.** Boolean scalar. Same pattern.

**`predictingInFlight` (line 67) — getter-only.** Returns live `_predictingInFlight: Set<string>`. No setter. Per-debate-ID in-flight dedup guard (documented in LANDMINE comment lines 1–8 as the replacement for the dead `_placingPrediction` variable).

**`wiredContainers` (line 69) — getter-only.** Returns live `_wiredContainers: WeakSet<HTMLElement>`. No setter. Tracks containers with listeners already attached. `WeakSet` chosen so detached DOM elements are GC'd automatically.

**Module-level side effect (lines 200–202).** `PLACEHOLDER_TAKES.all!.forEach((t) => { PLACEHOLDER_TAKES[t.section]?.push(t); })` runs unconditionally at module-load time. Populates per-category sub-arrays from the `all` array. Optional-chain `?.push` silently drops takes with unknown section keys. Non-null assertion on `.all` is safe given the literal declaration.

**Security concerns.** (1) Getter-only Sets (`reactingIds`, `predictingInFlight`) expose live references — any caller can `.clear()` or `.add()` them freely, defeating dedup guards. (2) `pendingChallengeId` has no setter-side UUID validation; downstream PostgREST filter injection risk if callers assign untrusted strings. (3) Array getters return live references — in-place mutation bypasses setter.

## Agent 02

### state (line 43)

(Covers same ground — key additional observations:)

- **`reactingIds` exposure**: Unsanctioned `.add(id)` silently suppresses a reaction toggle RPC for that take ID for the lifetime of the page. Buggy or injected code could silently suppress engagement events for targeted take IDs.
- **`predictingInFlight` exposure**: Unsanctioned `.delete(id)` bypasses the in-flight dedup guard, allowing concurrent `place_prediction` RPCs for the same debate. Whether the DB function itself is idempotent is the only backstop.
- **`hotTakes` array injection path**: A caller pushing a crafted item into `state.hotTakes` in place would inject content into the rendered feed. XSS risk depends on whether render path uses `escapeHTML()` — outside this file's scope.
- **`PLACEHOLDER_TAKES` side-effect timing**: Runs at first import; category arrays populated before any fetch. Load-bearing for offline/error fallback. Objects in `all` are shared by reference across `all` and category sub-arrays — mutating an item via `PLACEHOLDER_TAKES.sports[0]` also mutates the `all` copy.

## Agent 03

### state (line 43)

(Covers same ground — key additional observations:)

- `pendingChallengeId` acts as coordination token for challenges initiated while unauthenticated; setter accepts raw strings — if callers assign URL parameter values without UUID validation before writing here, and downstream code interpolates this into a PostgREST `.or()` filter, the project's UUID-validation security rule is violated at point of use. This file is the natural defense boundary but provides none.
- `wiredContainers` as `WeakSet`: callers use `.has(el)` and `.add(el)` directly; correct design for DOM-keyed registry; no iteration possible.

## Agent 04

### state (line 43)

(Covers same ground — key additional observations:)

- `currentFilter` setter: runtime value unchecked; if a caller writes `state.currentFilter = someUntrustedString as CategoryFilter` from a URL query parameter, the unchecked string silently passes through.
- `pendingChallengeId` is almost certainly a database UUID — callers assigning from user-supplied input (e.g. `?challenge=<id>` URL param) without prior UUID validation would violate CLAUDE.md rules.
- `PLACEHOLDER_TAKES` side-effect: optional `?.push` drops entries with unknown `section` values silently.

## Agent 05

### state (line 43)

(Covers same ground — key additional observations:)

- **Getter-only trio rationale**: `reactingIds`, `predictingInFlight`, `wiredContainers` have no setter because callers must not replace the collection reference — only contents. Replacing would break any module holding a cached reference to the old Set/WeakSet. Enforces reference stability but allows unrestricted in-place mutation.
- **`hotTakes`/`predictions`/`standaloneQuestions`** store unescaped user content (e.g. `HotTake.text`, `Prediction.topic`). Escaping is the render layer's responsibility; state module provides no last-line-of-defense protection.
- **`PLACEHOLDER_TAKES` mutability**: exported as a plain mutable `Record`. No `Object.freeze` — any importer can mutate category arrays after module init.
