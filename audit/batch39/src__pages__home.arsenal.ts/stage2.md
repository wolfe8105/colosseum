# Stage 2 Outputs — home.arsenal.ts

## Agent 01

### loadArsenalScreen

When called, this function returns a Promise that resolves to void. It reads `state.arsenalForgeCleanup` and `state.arsenalActiveTab` from module-level state, and queries the DOM for an element with id `arsenal-content` and all elements with the `data-arsenal-tab` attribute. If a `arsenalForgeCleanup` function is stored in state, it calls that function and clears the state property to null. It calls `cleanupShopScreen()` without awaiting. It then queries the DOM and updates `state.arsenalActiveTab` to `'my-arsenal'`, toggling the `active` class on all tab elements based on their `data-arsenal-tab` attribute. The function returns early with a resolved void Promise if the container element is not found. Otherwise, it calls `loadMyArsenal(container)` and returns the Promise from that call (async, awaited).

### loadMyArsenal

When called with an HTMLElement container parameter, this async function returns a Promise that resolves to void. It reads no explicit parameters beyond the container. It calls `renderArsenal(container)` and awaits the result, writing the returned array to `state.arsenalRefs`. It then calls `wireArsenalButtons(container)` synchronously without awaiting. The function has no early returns or error handling.

### loadArmory

When called with an HTMLElement container parameter, this async function returns a Promise that resolves to void. It calls `renderArmory(container)` and awaits the result. The function performs no state mutations, has no early returns, and no error handling.

### loadForge

When called with an HTMLElement container parameter, this synchronous function returns void. It calls `showForgeForm(container, ...)` with three arguments: the container, and two callback functions. The result of `showForgeForm` is written to `state.arsenalForgeCleanup`. Both callbacks read and write `state.arsenalForgeCleanup` to null, read `state.arsenalActiveTab`, query and toggle the `active` class on all `[data-arsenal-tab]` elements, and call `loadMyArsenal(container)` without awaiting (fire-and-forget). The success callback receives a `_refId` parameter; the cancel callback receives no parameters. Both callbacks perform identical DOM and state operations.

### wireArsenalButtons

When called with an HTMLElement container parameter, this synchronous function returns void. It queries the container for an element with id `arsenal-forge-btn` and all elements with class `ref-card-edit-btn`. For the forge button, if it exists, it attaches a click listener that queries the DOM for an element with `data-arsenal-tab="forge"` and clicks it if found. For each edit button, it attaches a click listener that reads `data-refId` from the button element; if not present, the listener returns early. It searches `state.arsenalRefs` by id; if not found, the listener returns early. If a ref is found, it calls `showForgeForm(container, ...)` with three arguments: the container and two callback functions. Both callbacks write `state.arsenalForgeCleanup` to null and call `loadMyArsenal(container)` without awaiting. The result of `showForgeForm` is written to `state.arsenalForgeCleanup`.

## Agent 02

### loadArsenalScreen

This function is called to initialize the arsenal screen. It reads the module-level state field `arsenalForgeCleanup` and the global document. If `arsenalForgeCleanup` is set, it calls that cleanup function and nulls it out. It then calls `cleanupShopScreen()` and gets the element with id `arsenal-content`; if the element does not exist, it returns an immediately-resolved promise. If the element exists, it writes `'my-arsenal'` to `state.arsenalActiveTab`, then queries all elements with `[data-arsenal-tab]` and sets their `active` class to true only for elements where `data-arsenal-tab === 'my-arsenal'`. Finally, it calls `loadMyArsenal(container)` and returns its promise. The function is async and awaits nothing directly, but returns the promise from `loadMyArsenal`.

### loadMyArsenal

This async function takes an HTMLElement container and reads nothing from module state on entry. It calls `renderArsenal(container)` and awaits the result, writing the returned array to `state.arsenalRefs`. It then calls `wireArsenalButtons(container)` synchronously without awaiting. The function returns a promise that resolves after the await of `renderArsenal` completes and after `wireArsenalButtons` is invoked.

### loadArmory

This async function takes an HTMLElement container and reads nothing from module state. It calls `renderArmory(container)`, awaits the result, and returns the promise. The function performs no other operations and writes nothing to module state.

### loadForge

This non-async function takes an HTMLElement container and reads nothing from module state on entry. It calls `showForgeForm()` with the container and two callback functions, storing the returned cleanup function in `state.arsenalForgeCleanup`. The first callback (completion case) nulls out `state.arsenalForgeCleanup`, writes `'my-arsenal'` to `state.arsenalActiveTab`, queries all `[data-arsenal-tab]` elements and activates the `my-arsenal` one, and calls `loadMyArsenal(container)` without awaiting it (fire-and-forget via `void`). The second callback (cancellation case) performs the same operations: nulls `arsenalForgeCleanup`, sets `arsenalActiveTab` to `'my-arsenal'`, updates tab active classes, and calls `loadMyArsenal(container)` without awaiting. The function returns nothing and the cleanup function returned by `showForgeForm()` is written to state.

### wireArsenalButtons

This non-async function takes an HTMLElement container and reads `state.arsenalRefs` in error paths. It queries for an element with id `arsenal-forge-btn`; if found, it attaches a click listener that queries for the element `[data-arsenal-tab="forge"]` and calls `.click()` on it if it exists. It then queries the container for all elements with class `ref-card-edit-btn` and attaches a click listener to each. In each listener, it reads the `data-refId` attribute from the clicked button and returns early if it is falsy. It then searches `state.arsenalRefs` for an object with matching `id` and returns early if not found. If found, it calls `showForgeForm()` with the container, the found reference object, and two callbacks. The first callback nulls `state.arsenalForgeCleanup` and calls `loadMyArsenal(container)` without awaiting. The second callback performs the same operations. The cleanup function is stored in `state.arsenalForgeCleanup`.

## Agent 03

### loadArsenalScreen

Reads `state.arsenalForgeCleanup`, `state.arsenalActiveTab`, and the DOM element with id `arsenal-content`. If `state.arsenalForgeCleanup` is truthy, it calls that cleanup function and sets it to null. Then calls `cleanupShopScreen()`. If the container element does not exist, returns a resolved promise immediately. Otherwise, sets `state.arsenalActiveTab` to `'my-arsenal'`, updates all elements with `[data-arsenal-tab]` to set the `active` class only on the one matching `'my-arsenal'`, then calls and awaits `loadMyArsenal(container)`. Returns a promise.

### loadMyArsenal

Awaits `renderArsenal(container)`, which receives the container and returns a reference array stored in `state.arsenalRefs`. After that completes, calls `wireArsenalButtons(container)` synchronously. Returns a promise that resolves after both operations complete.

### loadArmory

Awaits `renderArmory(container)` with no other side effects. Returns the resolved promise from that call.

### loadForge

Calls `showForgeForm(container, ...)` with two callback functions and stores the returned cleanup function in `state.arsenalForgeCleanup`. The first callback fires when forging completes: sets `state.arsenalForgeCleanup` to null, updates `state.arsenalActiveTab` to `'my-arsenal'`, updates all `[data-arsenal-tab]` elements to activate only `'my-arsenal'`, then fire-and-forgets `loadMyArsenal(container)` with `void`. The second callback fires on cancel: performs identical operations. Does not return a value.

### wireArsenalButtons

Queries for `#arsenal-forge-btn` within the container and, if found, attaches a click listener that queries for `[data-arsenal-tab="forge"]` in the document and clicks it. Then queries the container for all `.ref-card-edit-btn` elements and attaches a click listener to each. Each listener reads the `data-refId` attribute from the button; if absent, returns early. Otherwise, searches `state.arsenalRefs` for a reference matching that id; if not found, returns early. If found, calls `showForgeForm(container, ...)` with the reference as the final argument and two identical callbacks: both set `state.arsenalForgeCleanup` to null and fire-and-forget `loadMyArsenal(container)`. The result of `showForgeForm` is stored in `state.arsenalForgeCleanup`.

## Agent 04

### loadArsenalScreen

Reads module-level state `state.arsenalForgeCleanup`, then conditionally invokes it if truthy before nullifying it. Calls `cleanupShopScreen()` to clean up external shop screen state. Queries the DOM for an element with id `arsenal-content`, returning an immediately-resolved promise if not found. Writes `state.arsenalActiveTab` to `'my-arsenal'`. Queries all DOM elements matching `[data-arsenal-tab]` and toggles their `active` class based on whether their `data-arsenalTab` attribute equals `'my-arsenal'`. Returns the promise from `loadMyArsenal(container)`. Does not await any calls.

### loadMyArsenal

Awaits `renderArsenal(container)`, writing the returned `ArsenalReference` array to `state.arsenalRefs`. Calls `wireArsenalButtons(container)` synchronously afterward. Returns a promise that resolves when `renderArsenal` completes.

### loadArmory

Awaits `renderArmory(container)` and returns its promise. Reads nothing from module state. Writes nothing to module state. Returns a promise that resolves when `renderArmory` completes.

### loadForge

Calls `showForgeForm(container, onSuccess, onCancel)` where both callbacks are inline arrow functions. The return value from `showForgeForm` is written to `state.arsenalForgeCleanup`. The `onSuccess` callback nullifies `state.arsenalForgeCleanup`, sets `state.arsenalActiveTab` to `'my-arsenal'`, toggles the `active` class on all `[data-arsenal-tab]` elements to match that tab id, and fire-and-forgets `loadMyArsenal(container)` via the `void` operator. The `onCancel` callback performs identical operations. Does not await anything. Returns `undefined`.

### wireArsenalButtons

Queries the DOM for an element with id `arsenal-forge-btn`, and if found, attaches a `click` listener that queries for `[data-arsenal-tab="forge"]`, and if found, invokes `click()` on it. Queries the container for all elements matching `.ref-card-edit-btn` and attaches a `click` listener to each. Inside each listener, reads the `data-refId` attribute and early-returns if not present. Looks up the reference in `state.arsenalRefs` by id and early-returns if not found. Calls `showForgeForm(container, onSuccess, onCancel, ref)` with the found reference as the fourth argument, writing its return value to `state.arsenalForgeCleanup`. Both callbacks nullify `state.arsenalForgeCleanup` and fire-and-forget `loadMyArsenal(container)`.

## Agent 05

### loadArsenalScreen

This function returns a resolved Promise if the `arsenal-content` container does not exist; otherwise it performs cleanup and initialization work. It first reads `state.arsenalForgeCleanup` and `state.arsenalActiveTab` from module-level state. If `state.arsenalForgeCleanup` is truthy, it calls that function (expecting a cleanup callback) and sets `state.arsenalForgeCleanup` to null. It then calls `cleanupShopScreen()` with no parameters, and queries the DOM for an element with id `arsenal-content`. If the element does not exist, it returns an immediately resolved Promise. If the element exists, it sets `state.arsenalActiveTab` to the string `'my-arsenal'`, then calls `document.querySelectorAll('[data-arsenal-tab]')` to find all tab elements and toggles their `active` class based on whether their `data-arsenal-tab` attribute equals `'my-arsenal'`. Finally, it returns the Promise returned by `loadMyArsenal(container)`, which is awaited implicitly through the return value.

### loadMyArsenal

This async function reads the `container` parameter and calls `renderArsenal(container)` with the await operator, storing the result in `state.arsenalRefs`. It then calls `wireArsenalButtons(container)` without awaiting it. The function returns a Promise that resolves after `renderArsenal` completes and `wireArsenalButtons` has been invoked (though `wireArsenalButtons` is a synchronous function and completes immediately). The writes are: `state.arsenalRefs` is assigned the result from `renderArsenal`, and side effects from `wireArsenalButtons` occur on the DOM.

### loadArmory

This async function reads the `container` parameter and calls `renderArmory(container)` with the await operator. It returns the Promise returned by `renderArmory`, with no other control flow or state mutations.

### loadForge

This synchronous function reads the `container` parameter and calls `showForgeForm(container, ...)` with three arguments: the container, and two callback functions. The first callback is invoked when a forge operation succeeds (receiving a refId parameter it ignores). Inside this callback, `state.arsenalForgeCleanup` is set to null, `state.arsenalActiveTab` is set to `'my-arsenal'`, all `[data-arsenal-tab]` elements are queried and their `active` class is toggled based on matching `'my-arsenal'`, and `loadMyArsenal(container)` is called with `void` operator (fire-and-forget). The second callback is invoked on cancel and performs the identical mutations and call to `loadMyArsenal`. The return value from `showForgeForm` is assigned to `state.arsenalForgeCleanup`, which is expected to be a cleanup function based on how it is used elsewhere in the file.

### wireArsenalButtons

This synchronous function reads the `container` parameter and queries the DOM twice: first for an element with id `arsenal-forge-btn`, and second for all elements matching `.ref-card-edit-btn`. If the forge button exists, an event listener is attached that queries for an element with `[data-arsenal-tab="forge"]` and, if found, calls its `click()` method. For each edit button, an event listener is attached that reads the `data-ref-id` attribute from that button. If the attribute is missing or falsy, the listener returns early. If the attribute is present, it reads `state.arsenalRefs` and searches for a reference object with a matching `id` property; if no match is found, the listener returns early. If a match is found, `showForgeForm(container, ...)` is called with the container, two callbacks, and the matched reference object as the fourth argument. The return value is assigned to `state.arsenalForgeCleanup`.
