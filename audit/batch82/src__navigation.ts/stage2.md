# Stage 2 Outputs — navigation.ts

## Agent 01

Read 22 lines of 22 total.

### registerNavigate

`registerNavigate` accepts a single parameter, `fn`, typed as `NavigateFn` (a function that takes a `string` and returns `void`). It writes that value to the module-level variable `_navigate`, which is initialized to `null` at module load time. It reads nothing from external state and accesses no browser APIs, DOM, storage, or network. It returns `void`. There is no branching, no early return, no loop, and no error path. It is synchronous. After this call, `_navigate` holds the registered function for subsequent calls to `navigateTo`.

### navigateTo

`navigateTo` accepts a single parameter, `screenId`, typed as `string`. It reads the module-level variable `_navigate`. If `_navigate` is non-null (truthy), it calls `_navigate(screenId)` and returns whatever that call returns — which, per the type, is `void`. If `_navigate` is `null`, the conditional is false and the function returns immediately without calling anything or writing any state. The function does not await anything, does not access the DOM, storage, network, or any browser API directly, and does not throw. It is synchronous. The sole branch is the truthiness check on `_navigate`.

## Agent 02

Read 22 lines of 22 total.

### registerNavigate

`registerNavigate` is a synchronous void function that accepts a single parameter, `fn`, typed as `NavigateFn` — a function that takes a `string` and returns `void`. It reads `fn` from its parameter and writes it directly to the module-level variable `_navigate`, which is initialized to `null` at module load time. It calls no other functions or APIs, has no branches, no early returns, no loops, and no try/catch block. After the call, `_navigate` holds the reference passed in. The function returns nothing.

### navigateTo

`navigateTo` is a synchronous void function that accepts a single parameter, `screenId`, typed as `string`. It reads the module-level variable `_navigate`. Its sole control-flow construct is a single conditional: if `_navigate` is not `null` (or otherwise falsy), it calls `_navigate(screenId)`, forwarding the `screenId` argument to whatever function was registered by a prior call to `registerNavigate`. If `_navigate` is still `null` — meaning `registerNavigate` has not yet been called — the conditional body is skipped entirely and the call silently produces no effect. There are no loops, no early returns, no try/catch block, and no other function or API calls beyond the indirect invocation of `_navigate`. The function returns nothing.

## Agent 03

Read 22 lines of 22 total.

### registerNavigate

`registerNavigate` is synchronous and takes a single argument, `fn`, typed as `NavigateFn` — a function that accepts a `string` and returns `void`. It writes that argument directly to the module-level variable `_navigate`, which is initialized to `null` at module load time. There is no guard against double-registration, no return value, and no error path; a second call silently overwrites the first. The function neither reads any external state nor calls any other function.

### navigateTo

`navigateTo` is synchronous and takes a single argument, `screenId`, typed as `string`. It reads the module-level variable `_navigate` in a truthy check. If `_navigate` is non-null — meaning `registerNavigate` has previously been called — it calls `_navigate(screenId)`, forwarding the argument verbatim to whatever implementation was registered. If `_navigate` is still `null` at the time of the call, the condition is false, the delegation is skipped, and the function returns without doing anything and without throwing. There is no error path, no logging, and no return value.

## Agent 04

Read 22 lines of 22 total.

### registerNavigate

`registerNavigate` is synchronous and accepts a single argument `fn` of type `NavigateFn` (a function that takes a `string` and returns `void`). It writes that argument directly to the module-level variable `_navigate`, overwriting whatever was there before (initially `null`). There is no return value, no conditional logic, no error path, and no guard against being called multiple times — a second call would silently replace the first registration.

### navigateTo

`navigateTo` is synchronous and accepts a single `screenId` string. It reads the module-level variable `_navigate` and, if it is not `null`, calls it with `screenId` as the sole argument, delegating all navigation logic to whatever function was previously registered. If `_navigate` is still `null` — meaning `registerNavigate` has not yet been called — the condition is falsy and the function returns without doing anything, producing no error, no thrown exception, and no observable side effect. There is no async path, no retry, and no logging of the dropped call.

## Agent 05

Read 22 lines of 22 total.

### registerNavigate

`registerNavigate` is a synchronous function that accepts a single argument, `fn`, typed as `NavigateFn` (a function that takes a `string` and returns `void`). It writes that argument directly into the module-level variable `_navigate`, which is initialized to `null` at module load time. The function reads nothing, calls nothing, and has no branching, no error paths, and no return value. It is intended to be called exactly once, by `home.ts` during its initialization sequence; calling it more than once silently replaces the previously registered function with the new one.

### navigateTo

`navigateTo` is a synchronous function that accepts a single `screenId` string argument. It reads the module-level variable `_navigate` and, if that variable is non-null (truthy), calls it with `screenId` as the sole argument, delegating all navigation logic to whatever function was registered via `registerNavigate`. If `_navigate` is still `null` — meaning `registerNavigate` has not yet been called — the conditional is false and the function returns without doing anything; there is no error thrown, no fallback, and no logging. The function has no return value and no async behavior.
