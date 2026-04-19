# Stage 2 Outputs — webrtc.state.ts

## Agent 01

### on
The `on` function reads the `event` parameter (a string) and `fn` parameter (a WebRTCEventCallback). It reads the `state.callbacks` object at module level. The function checks whether `state.callbacks[event]` exists; if it does not, it initializes it as an empty array. The function then pushes `fn` into the `state.callbacks[event]` array, mutating module-level state. The function returns `void`. It makes no external function calls and has one conditional branch with no early return.

### off
The `off` function reads the `event` parameter (a string) and the optional `fn` parameter (a WebRTCEventCallback or undefined). It reads `state.callbacks` at module level. The function first checks whether `state.callbacks[event]` exists; if it does not, it returns early without writing any state. If `fn` is not provided (falsy), the function sets `state.callbacks[event]` to an empty array and returns. If `fn` is provided, the function filters `state.callbacks[event]` to remove all entries matching `fn` by reference equality using `f !== fn`, and writes the filtered result back to `state.callbacks[event]`. The function returns `void`. It has two conditional branches with an early return in the first.

### fire
The `fire` function reads the `event` parameter (a string) and `data` parameter (a Record of unknown values). It reads `state.callbacks[event]` at module level, using a nullish coalescing operator to default to an empty array if the key does not exist. The function iterates through all callbacks in the array via `forEach` and invokes each callback with `data` as its sole argument. Each callback invocation is wrapped in a try-catch block; if an exception is thrown, the error is logged to the console via `console.error` with the message 'Event handler error:' and the exception object. The function returns `void`. The error path logs but does not rethrow, allowing subsequent callbacks to execute even if an earlier one fails.

### getSupabase
The `getSupabase` function takes no parameters. It calls the external function `getSupabaseClient()` imported from `'./auth.ts'` with no arguments and returns its result directly. The return type is `SupabaseClient | null`. The function makes exactly one call and returns synchronously.

### isPlaceholder
The `isPlaceholder` function takes no parameters. It calls `getSupabase()`, which in turn calls the external function `getSupabaseClient()`. The function returns a boolean value that is the logical negation (`!`) of the return value of `getSupabase()`. If `getSupabase()` returns `null` or another falsy value, `isPlaceholder()` returns `true`; otherwise it returns `false`. The function makes one internal function call and returns synchronously.

## Agent 02

### on
The `on` function reads the `event` parameter (a string) and the `fn` parameter (a callback function). It accesses `state.callbacks`, a module-level object mapping event names to arrays of callbacks. If no array exists for the given event, it creates one by assigning an empty array to `state.callbacks[event]`. It then appends the callback function to that array via `push()`. The function returns `undefined`.

### off
The `off` function reads the `event` parameter and an optional `fn` parameter, both used to identify callbacks to remove. It accesses `state.callbacks` at the module level. If the callbacks array for the event does not exist, the function returns early with `undefined` and does nothing. If `fn` is not provided, it clears the entire callbacks array for that event by assigning an empty array to `state.callbacks[event]`. If `fn` is provided, it filters the callbacks array to create a new array that excludes all callbacks equal to `fn` by reference, reassigning the filtered result back to `state.callbacks[event]`. The function returns `undefined`.

### fire
The `fire` function reads the `event` parameter (a string) and `data` parameter (a record object). It accesses `state.callbacks[event]` from module-level state; if that array does not exist, it substitutes an empty array via the nullish coalescing operator. It iterates through each callback function in the array using `forEach()`. For each callback, it calls `fn(data)` within a try-catch block; if the callback throws an error, the error is logged to the console via `console.error()` with the message 'Event handler error:' and the error object, but execution continues to the next callback. The function returns `undefined` and does not wait for any asynchronous operations.

### getSupabase
The `getSupabase` function takes no parameters. It calls the `getSupabaseClient()` function (imported from './auth.ts') and returns its result directly. This will return a `SupabaseClient` instance or `null`.

### isPlaceholder
The `isPlaceholder` function takes no parameters. It calls `getSupabase()` (defined in the same module), which in turn calls `getSupabaseClient()`. The result is converted to a boolean via the logical NOT operator (`!`), and that boolean is returned. The function returns `true` if `getSupabase()` returns a falsy value (including `null`), and `false` if it returns a truthy value.

## Agent 03

### on
The `on` function reads the `event` parameter (a string) and the `fn` parameter (a callback function). It accesses and potentially modifies `state.callbacks`. If the event key does not exist in `state.callbacks`, the function creates an empty array at that key. It then appends the callback function `fn` to the array for that event. The function returns `undefined`.

### off
The `off` function reads the `event` parameter (a string) and the optional `fn` parameter (a callback function). It accesses `state.callbacks`. If no callbacks exist for the event, the function returns early without modification. If `fn` is not provided (falsy), the function clears the entire callback array for that event by assigning an empty array. If `fn` is provided, the function filters the callback array to remove any function strictly equal to `fn`, then writes the filtered array back to `state.callbacks`. The function returns `undefined`.

### fire
The `fire` function reads the `event` parameter (a string) and `data` parameter (a record of unknown values). It retrieves the array of callbacks for the event from `state.callbacks`, defaulting to an empty array if no callbacks exist. It iterates through each callback function in the array. For each callback, it invokes the function with the `data` parameter inside a try-catch block. If the callback throws an error, the error is caught and logged to the console via `console.error()`, but iteration continues. The function returns `undefined`.

### getSupabase
The `getSupabase` function takes no parameters and reads no module-level state. It calls `getSupabaseClient()` (imported from `./auth.ts`) and returns the result directly. The return type is `SupabaseClient | null`.

### isPlaceholder
The `isPlaceholder` function takes no parameters. It calls `getSupabase()` and returns a boolean: `true` if `getSupabase()` returns a falsy value (i.e., `null`), and `false` otherwise. The function is synchronous and performs no side effects.

## Agent 04

### on
The `on` function reads the event name string and a callback function as parameters, then reads the `state.callbacks` object. If the event does not exist as a key, it writes an empty array to `state.callbacks[event]`. Then it writes the callback function to the end of the array at `state.callbacks[event]` by calling push. The function returns undefined. It does not call any other functions or external APIs.

### off
The `off` function reads the event name string, the optional callback function parameter, and the `state.callbacks` object. If the event does not exist as a key in `state.callbacks`, the function returns early without making any changes. If the event exists but no callback function is provided, it writes an empty array to `state.callbacks[event]`, overwriting any existing array, and returns. If the event exists and a callback function is provided, it reads the entire array at `state.callbacks[event]` and writes a new filtered array back to that key, keeping only callbacks that are not strictly equal to the provided function. The function returns undefined.

### fire
The `fire` function reads the event name string, the data object parameter, and the `state.callbacks` object. It retrieves the array of callbacks for the event from `state.callbacks[event]`, defaulting to an empty array if the key does not exist. It then iterates through each callback function in that array in order. For each callback, it calls the callback function with the data object as an argument inside a try-catch block. If the callback throws an error, the catch block logs the error to console.error with the message 'Event handler error:' and the error object, then continues to the next callback. The function returns undefined.

### getSupabase
The `getSupabase` function calls the `getSupabaseClient` function imported from './auth.ts' without arguments and returns its result directly. It does not read module-level state. The return type is `SupabaseClient | null`.

### isPlaceholder
The `isPlaceholder` function calls the `getSupabase` function and returns the logical negation of its result (true if `getSupabase()` returns null or another falsy value, false if it returns a truthy SupabaseClient). No module-level state is written.

## Agent 05

### on
The function reads the `event` parameter (a string key) and the `fn` parameter (a callback function). It reads module-level state by accessing `state.callbacks`. If the event key does not exist in `state.callbacks`, it creates a new empty array at that key, then pushes the callback function onto the array at that key. No external functions are called. Returns void.

### off
The function reads the `event` parameter (a string key) and the optional `fn` parameter (a callback function). It reads module-level state by accessing `state.callbacks`. If the event key does not exist in `state.callbacks`, the function returns early without modifying anything; if the callback function `fn` is not provided, the function clears the array at `state.callbacks[event]` by assigning an empty array; if `fn` is provided, the function filters the array at `state.callbacks[event]` to remove all references to that specific function object. No external functions are called. Returns void.

### fire
The function reads the `event` parameter (a string key) and the `data` parameter (a Record object). It reads module-level state by accessing `state.callbacks[event]`, falling back to an empty array if the key does not exist. It iterates through all callbacks registered for the event in order and calls each one with the `data` parameter as its argument. Each callback invocation is wrapped in a try-catch block; if a callback throws an error, the error is logged to the console via `console.error` and execution continues to the next callback. Returns void.

### getSupabase
The function reads no parameters. It calls `getSupabaseClient()` (imported from `./auth.ts`) once and returns its result directly. The return type is `SupabaseClient | null`. No module-level state is read or written.

### isPlaceholder
The function reads no parameters and no module-level state directly. It calls `getSupabase()` (defined in this module at line 111), and returns the logical negation of its result (true if `getSupabase()` returns a falsy value, false if truthy). No state is written.
