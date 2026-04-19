# Stage 2 Outputs — reference-arsenal.utils.ts

## Agent 01
### compositeScore

`compositeScore` accepts a single parameter `ref` of type `ArsenalReference`. It reads two fields from that object: `ref.seconds` and `ref.strikes`. It reads no module-level state, no DOM, no external storage, and makes no calls to other functions or APIs. Its body is a single arithmetic expression: it multiplies `ref.seconds` by `2`, adds `ref.strikes` to the result, and returns that number. There are no branches, no loops, no early returns, no error paths, and no try/catch blocks. The function is synchronous.

### powerDisplay

`powerDisplay` accepts a single parameter `ref` of type `ArsenalReference`. It reads `ref.source_type`, `ref.current_power`, and `ref.graduated` from the parameter. It also reads from the module-level constant `SOURCE_TYPES`, which is imported from `reference-arsenal.constants.ts`. `SOURCE_TYPES` is indexed by `ref.source_type` to produce a local variable `srcInfo`. The function then branches on whether `srcInfo` is truthy: if it is, `ceiling` is set to `srcInfo.ceiling`; if `srcInfo` is falsy (the key was not found in `SOURCE_TYPES`), `ceiling` is set to the literal `1`. The return value is a template string in the form `"${Number(ref.current_power)}/${ceiling + (ref.graduated ? 1 : 0)}"`. The numerator is `ref.current_power` cast through `Number()`. The denominator adds `1` to `ceiling` when `ref.graduated` is truthy, and leaves `ceiling` unchanged when it is falsy. The function writes no state, touches no DOM, and makes no additional function calls beyond the `Number()` built-in. It is synchronous and has no error paths or try/catch blocks.

## Agent 02
### compositeScore

`compositeScore` is a synchronous function that accepts a single parameter, `ref`, typed as `ArsenalReference`. It reads two numeric fields from that object: `ref.seconds` and `ref.strikes`. It reads no module-level state and performs no external calls. The body is a single arithmetic expression: it multiplies `ref.seconds` by `2`, adds `ref.strikes`, and returns the resulting number. There are no branches, loops, early returns, or error paths.

### powerDisplay

`powerDisplay` is a synchronous function that accepts a single parameter, `ref`, typed as `ArsenalReference`. It reads `ref.source_type`, `ref.current_power`, and `ref.graduated` from that parameter. It also reads `SOURCE_TYPES`, a module-level constant imported from `reference-arsenal.constants.ts`. The function first indexes into `SOURCE_TYPES` using `ref.source_type` to retrieve a source-type descriptor object, storing the result in `srcInfo`. It then branches: if `srcInfo` is truthy, `ceiling` is set to `srcInfo.ceiling`; otherwise `ceiling` defaults to `1`. Next it builds the return string using a template literal. The numerator is `Number(ref.current_power)` — an explicit numeric cast applied before interpolation into the string. The denominator is `ceiling` plus either `1` (if `ref.graduated` is truthy) or `0` (if falsy). The function returns the formatted string `"<current_power>/<ceiling+graduated_bonus>"` and writes no external state.

## Agent 03
### compositeScore

`compositeScore` is a synchronous function that takes a single parameter `ref` of type `ArsenalReference`. It reads two properties from that object: `ref.seconds` and `ref.strikes`. It writes no state, performs no I/O, and calls no other functions or APIs. The function has no branches, loops, or error paths. It multiplies `ref.seconds` by 2, adds `ref.strikes`, and returns the resulting number directly.

### powerDisplay

`powerDisplay` is a synchronous function that takes a single parameter `ref` of type `ArsenalReference`. It reads the module-level constant `SOURCE_TYPES`, imported from `reference-arsenal.constants.ts`, and indexes into it with `ref.source_type` to retrieve a source-type descriptor object. It then reads `srcInfo.ceiling` from that descriptor if the lookup succeeded, or falls back to `1` if `SOURCE_TYPES[ref.source_type]` is falsy — this is the only branch in the function. Next it reads `ref.current_power` and `ref.graduated` from the parameter. It calls `Number()` on `ref.current_power` to cast it to a numeric type before interpolation. The ceiling value used in the output is `srcInfo.ceiling` incremented by `1` when `ref.graduated` is truthy, or left as-is when `ref.graduated` is falsy. The function returns a string of the form `"<current_power>/<ceiling>"` built via a template literal. It writes no state, performs no I/O, and has no loops or error paths.

## Agent 04
### compositeScore

`compositeScore` is a synchronous function that accepts a single parameter `ref` of type `ArsenalReference`. It reads two properties from that parameter: `ref.seconds` and `ref.strikes`. It calls no external functions, performs no I/O, writes to no external state, and has no branches, loops, early returns, or error paths. It computes the expression `(ref.seconds * 2) + ref.strikes` and returns the resulting number directly.

### powerDisplay

`powerDisplay` is a synchronous function that accepts a single parameter `ref` of type `ArsenalReference`. It reads the module-level constant `SOURCE_TYPES`, imported from `./reference-arsenal.constants.ts`, using `ref.source_type` as a key to look up an entry. If `SOURCE_TYPES[ref.source_type]` is truthy, `ceiling` is set to `srcInfo.ceiling`; otherwise `ceiling` is set to `1`. It then reads `ref.current_power` and `ref.graduated` from the parameter. It calls `Number()` on `ref.current_power` to coerce it to a numeric type, and evaluates the ternary `ref.graduated ? 1 : 0` to add either `1` or `0` to `ceiling`. The function returns a string in the format `"<current_power>/<ceiling + graduated_bonus>"` constructed via a template literal. There are no loops, early returns, try/catch blocks, or async operations.

## Agent 05
### compositeScore
`compositeScore` is a synchronous function that accepts a single parameter `ref` of type `ArsenalReference`. It reads two fields from that object: `ref.seconds` and `ref.strikes`. It calls no external functions or APIs, writes nothing, accesses no module-level state, and has no branches, early returns, or error paths. It computes `(ref.seconds * 2) + ref.strikes` and returns the resulting `number` directly.

### powerDisplay
`powerDisplay` is a synchronous function that accepts a single parameter `ref` of type `ArsenalReference`. It reads from the module-level constant `SOURCE_TYPES`, imported from `reference-arsenal.constants.ts`, using `ref.source_type` as the lookup key. If `SOURCE_TYPES[ref.source_type]` resolves to a truthy value, the local variable `ceiling` is set to `srcInfo.ceiling`; otherwise `ceiling` is set to the literal `1`. It then reads `ref.current_power` and `ref.graduated` from the parameter. The expression `ceiling + (ref.graduated ? 1 : 0)` conditionally adds `1` to `ceiling` when `ref.graduated` is truthy. `ref.current_power` is cast with `Number()` before being interpolated into the template string. The function returns a `string` of the form `"<current_power>/<ceiling>"`, where the denominator is either `ceiling` or `ceiling + 1` depending on the `graduated` branch. It calls no RPCs, writes nothing, and has no try/catch blocks.
