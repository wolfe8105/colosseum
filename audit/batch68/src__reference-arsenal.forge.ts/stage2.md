# Stage 2 Outputs — reference-arsenal.forge.ts

## Agent 01

### showForgeForm

`showForgeForm` is a synchronous function that accepts four parameters: `container` (an `HTMLElement` to render into), `onComplete` (a callback receiving a `refId` string), `onCancel` (a zero-argument callback), and an optional `editRef` of type `ArsenalReference`. It returns a `() => void` destructor function.

On entry, it derives a boolean `isEdit` by double-negating `editRef`. It then allocates a fresh `ForgeFormState` object, closure-local to this invocation, initializing `step` to `1` and seeding each of the seven text fields (`source_title`, `source_author`, `source_date`, `locator`, `claim_text`, `source_type`, `category`, `source_url`) from the corresponding property on `editRef` if present, or falling back to an empty string. A `destroyed` flag is initialized to `false`.

Inside the closure, it defines a nested `render` function. When `render` is called, it first checks `destroyed`; if `true`, it returns immediately without touching the DOM. Otherwise it calls `_buildForgeContent(state, isEdit)` — an imported function from `reference-arsenal.forge-render.ts` — passing the current `state` snapshot and the `isEdit` flag, and assigns the returned HTML string to `container.innerHTML`. It then calls `_wireForgeSheet(container, state, isEdit, editRef, onComplete, onCancel, render)` — an imported function from `reference-arsenal.forge-wiring.ts` — passing the container, the same state object, the edit flags, the two caller-supplied callbacks, and the `render` function itself as a re-render trigger.

After defining `render`, `showForgeForm` calls it once immediately, performing the initial DOM write. It then returns the destructor `() => { destroyed = true; container.innerHTML = ''; }`. When that destructor is invoked, it sets `destroyed` to `true` — causing any subsequent `render` call that still holds a reference to the closure to exit early — and clears the container's inner HTML. There are no `await` expressions, no try/catch blocks, no loops, and no early returns in the outer function body beyond the destructor's deferred guard in `render`.

## Agent 02

### showForgeForm

`showForgeForm` is a synchronous function that takes four parameters: a `container` HTMLElement into which the form is rendered, an `onComplete` callback that receives a reference ID string, an `onCancel` callback, and an optional `editRef` of type `ArsenalReference`. It returns a destroy function (`() => void`).

At the start of the body, `showForgeForm` derives a boolean `isEdit` by double-negating `editRef`. It then constructs a closure-local `ForgeFormState` object named `state`, initializing `step` to `1` and all other fields (`source_title`, `source_author`, `source_date`, `locator`, `claim_text`, `source_type`, `category`, `source_url`) to the corresponding property of `editRef` if `editRef` is present, or to an empty string otherwise. This `state` object is not shared with any module-level variable; it is unique to this call's closure. A closure-local boolean `destroyed` is initialized to `false`.

A nested synchronous function `render` is defined. When `render` is called it first checks `destroyed`; if `destroyed` is `true` it returns immediately without doing anything. Otherwise it sets `container.innerHTML` to the string returned by `_buildForgeContent(state, isEdit)`, replacing whatever was previously in the container, then calls `_wireForgeSheet(container, state, isEdit, editRef, onComplete, onCancel, render)`. `_wireForgeSheet` receives `render` itself as its last argument, which allows wiring logic to trigger a re-render by calling back into `render`. Neither `_buildForgeContent` nor `_wireForgeSheet` are awaited; both are treated as synchronous.

After defining `render`, `showForgeForm` calls `render()` once immediately, producing the initial form render into `container`. No branching occurs at the call-site of that initial `render()` invocation. `showForgeForm` then returns an arrow function that, when invoked, sets `destroyed` to `true` and sets `container.innerHTML` to an empty string, clearing the form from the DOM. Any subsequent call to `render` after the destroy function has been called will find `destroyed === true` and return without touching the DOM. The function has no try/catch blocks and no async paths anywhere in its body.

## Agent 03

### showForgeForm

`showForgeForm` is a synchronous function that accepts four parameters: a `container` `HTMLElement` into which the form is rendered, an `onComplete` callback that receives a `refId` string, an `onCancel` callback, and an optional `editRef` of type `ArsenalReference`. It returns a destroy function (a `() => void` closure).

On entry, the function derives the boolean `isEdit` from whether `editRef` is truthy, then constructs a closure-local `ForgeFormState` object named `state`. `state.step` is hardcoded to `1`. Each remaining field is initialized to the corresponding property of `editRef` if `editRef` is present and the property is truthy, otherwise to an empty string. This `state` object is not stored in any module-level variable; it is private to this single invocation. A boolean `destroyed` is also initialized to `false` and is private to the same invocation.

A nested function `render` is defined. When called, `render` first checks whether `destroyed` is `true` and returns immediately without writing to the DOM. Otherwise it sets `container.innerHTML` to the string returned by `_buildForgeContent(state, isEdit)`, then calls `_wireForgeSheet(container, state, isEdit, editRef, onComplete, onCancel, render)`, passing `render` itself as the last argument so that wiring code can trigger a re-render. Both `_buildForgeContent` and `_wireForgeSheet` are imported from sibling sub-modules; neither is awaited.

After defining `render`, `showForgeForm` calls `render()` once immediately, which performs the initial DOM write and wiring. It then returns a destroy closure. When the returned destroy function is invoked by the caller, it sets `destroyed` to `true` and clears `container.innerHTML` to the empty string. Setting `destroyed` before clearing the DOM means any subsequent `render()` call triggered from wiring code will exit early without touching the container. There are no loops, no try/catch blocks, and no async operations anywhere in the function body or its inner `render`.

## Agent 04

### showForgeForm

`showForgeForm` is a synchronous function that accepts four parameters: `container` (an `HTMLElement` into which the form is rendered), `onComplete` (a callback that receives a `refId` string when the form is submitted successfully), `onCancel` (a callback invoked when the user cancels), and an optional `editRef` of type `ArsenalReference` used to pre-populate the form for an edit flow. It returns a teardown function of type `() => void`.

On entry the function derives a boolean `isEdit` from whether `editRef` is truthy. It then constructs a fresh `ForgeFormState` object named `state` as a closure-local variable — not module-level state — initializing `step` to `1` and each field to the corresponding property on `editRef` if present, or to an empty string if absent. A separate closure-local boolean `destroyed` is initialized to `false`.

The function defines an inner `render` function. When `render` is called, it first checks whether `destroyed` is `true` and returns immediately without doing anything if so. Otherwise it calls `_buildForgeContent(state, isEdit)` which produces an HTML string, and assigns that string to `container.innerHTML`, replacing any prior content. It then calls `_wireForgeSheet(container, state, isEdit, editRef, onComplete, onCancel, render)`, passing the full set of closure state so that wiring logic can attach event listeners and can call `render` again to trigger a re-render when the step changes. After defining `render`, `showForgeForm` calls it once immediately, which triggers the initial DOM render and wiring pass.

Finally, `showForgeForm` returns an arrow function that, when called by the caller, sets `destroyed` to `true` and sets `container.innerHTML` to an empty string, clearing the rendered form from the DOM. Any subsequent call to `render` that might be queued via event handlers attached by `_wireForgeSheet` will observe `destroyed === true` and return without re-rendering.

## Agent 05

### showForgeForm

`showForgeForm` is a synchronous function that takes four parameters: a `container` HTMLElement into which the form will be rendered, an `onComplete` callback that receives a `refId` string, an `onCancel` callback, and an optional `editRef` of type `ArsenalReference`. It returns a destroy function (`() => void`).

On entry it reads `editRef` to derive a boolean `isEdit` flag (`!!editRef`), then constructs a closure-local `ForgeFormState` object named `state`. Each field in `state` is initialized from the corresponding property on `editRef` if `editRef` is present, or to an empty string otherwise; `step` is always initialized to `1`. It also initializes a closure-local boolean `destroyed` to `false`. The `state` object is not stored in any module-level variable; every call to `showForgeForm` produces its own independent instance.

It defines an inner function `render` that checks `destroyed` and returns immediately if it is `true`. If `destroyed` is `false`, `render` writes to `container.innerHTML` by calling `_buildForgeContent(state, isEdit)`, replacing whatever HTML was previously in the container. Immediately after that assignment, it calls `_wireForgeSheet(container, state, isEdit, editRef, onComplete, onCancel, render)`, passing the container, the shared `state` reference, the edit flags, the callbacks, and `render` itself as arguments. `render` has no return value, no try/catch, and no branches beyond the `destroyed` guard.

After defining `render`, `showForgeForm` calls `render()` once unconditionally, which performs the initial DOM population and event wiring. It then returns a destroy closure that sets `destroyed = true` and clears `container.innerHTML` to an empty string. Once the destroy closure is called, any subsequent invocation of `render` (which `_wireForgeSheet` may have stored as a re-render callback) becomes a no-op due to the `destroyed` guard.
