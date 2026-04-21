# Stage 2 Outputs — src/arena/arena-core.utils.ts

## Agent 01

### isPlaceholder

Reads the return value of `getSupabaseClient()` (from `auth.ts`) and the module-level constant `isAnyPlaceholder` (from `config.ts`). Returns `true` if either `getSupabaseClient()` is falsy or `isAnyPlaceholder` is truthy; returns `false` otherwise. No module-level state is written, no external state is modified, and no other functions besides the two imports are called. The function has no branches or loops. A landmine comment indicates that `isAnyPlaceholder` is set during config module evaluation and remains immutable after initialization.

### formatTimer

Reads a numeric parameter `sec` representing seconds. Computes the minutes by dividing `sec` by 60 and flooring the result into `m`. Computes the remaining seconds as `sec % 60` into `s`. Constructs a string by concatenating `m`, a literal colon, a conditional zero-pad (the string `'0'` if `s < 10`, otherwise empty string), and `s`, returning that string. No module-level state or external state is read or written. No other functions are called, and there are no branches, loops, or error paths.

### randomFrom

Reads a readonly array parameter `arr` of generic type `T`. Calls `Math.random()` to generate a number in the range `[0, 1)`, multiplies by `arr.length`, floors the result, and uses that as an index to access `arr`. Returns the element at that index with a non-null assertion operator `!`. No module-level state or external state is read or written. No control flow branches, loops, or error paths exist. The function is synchronous and makes no await calls.

### pushArenaState

Reads a string parameter `viewName`. Calls the browser global `history.pushState()` with an object literal `{ arenaView: viewName }` as the first argument, an empty string as the second argument, and no third argument. This operation modifies the browser's session history and returns `undefined`. No module-level state or external state is read or written beyond the browser history API. No other functions or await calls are made, and no branches, loops, or error paths exist.

## Agent 02

### isPlaceholder

The function reads the result of calling `getSupabaseClient()` from the `auth.ts` module and the module-level constant `isAnyPlaceholder` imported from `config.ts`. It performs a logical OR of two conditions: first checking whether `getSupabaseClient()` returns a falsy value, then checking the `isAnyPlaceholder` flag. The function returns `true` if either the Supabase client is absent or the `isAnyPlaceholder` flag is set to `true`; otherwise it returns `false`. No external state is modified. There are no branches, loops, or error paths beyond the short-circuit evaluation of the OR operator.

### formatTimer

The function reads a `sec` parameter of type `number`. It performs two arithmetic operations: dividing by 60 and flooring to extract minutes, and taking the modulo 60 to extract seconds. It then constructs and returns a string by concatenating the minutes value, a colon, a conditional leading zero if seconds is less than 10, and the seconds value. No external state is read or modified. No other functions or APIs are called. There are no loops, error paths, or conditional branches beyond the ternary operator for the leading zero.

### randomFrom

The function reads a readonly array parameter `arr` of generic type `T`. It calls `Math.random()` to generate a number between 0 and 1, multiplies it by the array length, floors the result to get an integer index, and uses that index to access and return an element from the array. The non-null assertion operator `!` is applied to the indexed access. No external state is read or modified, no other functions are called, and there are no loops, branches, or error paths. The function operates synchronously and does not inspect or validate array bounds.

### pushArenaState

The function reads a `viewName` parameter of type `string` and calls the browser's `history.pushState()` method with an object containing the key `arenaView` set to the `viewName` value, an empty string as the title, and no URL parameter. The function returns `void`. No value is returned to the caller, and no module-level state is modified. There are no branches, loops, error paths, or async operations. The `history.pushState()` call modifies the browser's session history state.

## Agent 03

### isPlaceholder

This function reads the `getSupabaseClient` function from the auth module and the module-level `isAnyPlaceholder` boolean from the config module. It returns a boolean that is true if either `getSupabaseClient()` returns a falsy value or `isAnyPlaceholder` is true. The function makes two reads and performs a logical OR operation with no branching, early returns, or other control flow.

### formatTimer

This function reads a single numeric parameter representing seconds. It computes minutes by floor-dividing the input by 60 and computes seconds as the remainder after dividing by 60. It then constructs and returns a string in the format `"m:ss"` by concatenating: the minute value, a colon, a zero-padding digit (added when seconds are less than 10), and the second value. The function contains one conditional branch to determine whether to pad seconds with a leading zero.

### randomFrom

This function reads a single readonly array parameter and returns a single element from that array. It generates a random index by multiplying `Math.random()` (which produces a value in [0, 1)) by the array length, floor-dividing to convert to an integer, and using that index to access the array. The function's return value is guaranteed to be non-null via the TypeScript non-null assertion operator, which carries no runtime meaning. There is no branching or error handling.

### pushArenaState

This function reads a single string parameter representing a view name and calls the browser's `history.pushState()` API with an object containing a single property `arenaView` set to the view name and an empty string for the title parameter. The function returns void. It makes exactly one external API call and has no branching, loops, error handling, or other control flow.

## Agent 04

### isPlaceholder

When called, this function reads the Supabase client from `getSupabaseClient()` and the boolean flag `isAnyPlaceholder` from the config module. It returns `true` if either the Supabase client is falsy or the `isAnyPlaceholder` flag is `true`. The function short-circuits on the first condition via the logical OR operator. No external state is written. `getSupabaseClient()` is called first, then its result is evaluated; if falsy, the return value is determined immediately without evaluating `isAnyPlaceholder`.

### formatTimer

When called with a numeric parameter `sec`, this function divides it by 60 and floors the result to extract minutes, and takes the remainder after dividing by 60 to get seconds. It then builds and returns a string by concatenating the minutes count, a colon, a padded seconds count (with a leading zero if under 10), and the seconds count. The function performs no I/O, reads no module-level state, writes nothing, and branches once on the seconds value to decide whether to prepend a zero to the seconds portion.

### randomFrom

When called with a readonly array parameter, this function calls `Math.random()` to generate a float between 0 and 1 (exclusive), multiplies it by the array length, floors the result to an integer index, and uses the non-null assertion operator `!` to access that index in the array. It returns the element at that index. The function performs no I/O, reads no module-level state beyond the input array's length property, writes nothing, and has no branching or error paths. The non-null assertion suppresses TypeScript type-checking but does not alter runtime behavior.

### pushArenaState

When called with a `viewName` string parameter, this function invokes the global `history.pushState()` method, passing an object with an `arenaView` property set to the `viewName` string, an empty string as the title, and no URL argument. This operation modifies the browser's session history, allowing the user to navigate backward via the back button, though the browser does not navigate to a new page. The function returns `undefined`. It performs no I/O, reads no module-level state, writes to the browser's history stack, and has no branching, loops, or error paths.

## Agent 05

### isPlaceholder

Reads the return value of `getSupabaseClient()` from the auth module and the module-level `isAnyPlaceholder` flag from the config module. Returns `true` if either condition is met: `getSupabaseClient()` returns a falsy value, or `isAnyPlaceholder` is `true`. Returns `false` if both `getSupabaseClient()` returns a truthy value and `isAnyPlaceholder` is `false`. Makes no external state changes and is synchronous.

### formatTimer

Takes a numeric parameter representing seconds. Computes minutes by dividing the input by 60 and flooring the result, then computes remaining seconds using modulo 60. Returns a string formatted as `minutes:seconds`, with the seconds value zero-padded to two digits if it is less than 10. For example, passing 125 returns "2:05" and passing 30 returns "0:30". Makes no external state changes and is synchronous.

### randomFrom

Takes a readonly array parameter of generic type T. Generates a random integer between 0 (inclusive) and the array length (exclusive) using `Math.random()` multiplied by the array length and floored. Returns the element at that index, with a non-null assertion operator applied. If the input array is empty, the index will be 0 and the function will return `undefined` narrowed to T by the assertion. Makes no external state changes and is synchronous.

### pushArenaState

Takes a string parameter `viewName`. Calls the browser `history.pushState()` API with an object literal containing the property `arenaView` set to the `viewName` parameter, an empty string as the title argument, and no URL argument. This adds a new entry to the browser history stack without navigating and without changing the displayed URL. Makes no return value and is synchronous.
