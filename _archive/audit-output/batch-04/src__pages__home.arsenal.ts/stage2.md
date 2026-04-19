# Stage 2 Outputs — home.arsenal.ts

## Agent 01

### loadArsenalScreen

`loadArsenalScreen` is a synchronous exported function that takes no parameters. It reads `state.arsenalForgeCleanup` from the `home.state` module: if that value is truthy, it calls it as a function (invoking whatever cleanup the forge form registered) and then sets `state.arsenalForgeCleanup` to `null`. It then calls `cleanupShopScreen()` unconditionally. It reads the DOM for the element with id `arsenal-content`; if that element is not found, the function returns early without doing anything further. When the element is found, it writes `state.arsenalActiveTab` to the string `'my-arsenal'`, then queries all elements with a `data-arsenal-tab` attribute and toggles the `active` CSS class on each one, adding it only to the element whose `data-arsenal-tab` value equals `'my-arsenal'`. Finally, it calls `loadMyArsenal(container)` as a fire-and-forget call (prefixed with `void`), discarding the returned promise.

### loadMyArsenal

`loadMyArsenal` is an async function that accepts a single `HTMLElement` parameter named `container`. It awaits `renderArsenal(container)`, an imported function from `reference-arsenal.ts`; the resolved value is written to `state.arsenalRefs`. After the await resolves, it calls `wireArsenalButtons(container)` synchronously. The function returns `Promise<void>`. There are no branches, error paths, or try/catch blocks in the function body; if `renderArsenal` rejects, the rejection propagates to the caller (which in all observed call sites discards the promise with `void`, so rejections go unhandled).

### loadArmory

`loadArmory` is an async function that accepts a single `HTMLElement` parameter named `container`. It awaits `renderArmory(container)`, an imported function from `reference-arsenal.ts`, and returns `Promise<void>`. It writes nothing to module-level state, reads nothing from module-level state, and has no branches or error paths. The return value of `renderArmory` is discarded. As with `loadMyArsenal`, if `renderArmory` rejects, the rejection propagates to the caller and, at all observed call sites, goes unhandled because the call is made via `void`.

### loadForge

`loadForge` is a synchronous function that accepts a single `HTMLElement` parameter named `container`. It calls `showForgeForm` from `reference-arsenal.ts`, passing `container` and two callback functions, and assigns the return value of `showForgeForm` to `state.arsenalForgeCleanup`. The return value of `showForgeForm` is described in context as a cleanup function, but the internals of `showForgeForm` are not visible in this file.

The first callback (the success callback, receiving `_refId: string`) sets `state.arsenalForgeCleanup` to `null`, then writes `state.arsenalActiveTab` to `'my-arsenal'`, toggles the `active` class on all `[data-arsenal-tab]` elements to highlight `'my-arsenal'`, and calls `loadMyArsenal(container)` as a fire-and-forget call. The second callback (the cancel callback) performs the identical sequence: it sets `state.arsenalForgeCleanup` to `null`, writes `state.arsenalActiveTab` to `'my-arsenal'`, re-applies the active-class toggle, and calls `loadMyArsenal(container)` fire-and-forget. Both callbacks are registered at call time but only invoked later, when `showForgeForm` signals completion or cancellation. Neither callback has error handling. The function itself is not async and returns `void`.

### wireArsenalButtons

`wireArsenalButtons` is a synchronous function that accepts a single `HTMLElement` parameter named `container`. It reads the DOM within `container`, querying for the element with id `arsenal-forge-btn`. If that element is found, it attaches a `click` event listener. When that listener fires, it queries the document (not just `container`) for a `[data-arsenal-tab="forge"]` element; if found, it programmatically calls `.click()` on it, which will trigger the module-level tab-switching listener registered at the bottom of the file — not `loadForge` directly.

After processing the forge button, the function queries `container` for all elements matching `.ref-card-edit-btn` and attaches a `click` listener to each. When one of those listeners fires, it reads `dataset.refId` from the clicked element; if `refId` is falsy, the handler returns early. Otherwise it searches `state.arsenalRefs` (an array of `ArsenalReference` objects populated by the most recent call to `loadMyArsenal`) for a reference whose `id` matches `refId`. If no matching reference is found, the handler returns early. When a match is found, it calls `showForgeForm` with `container`, a success callback, a cancel callback, and the matched `ref` object as the fourth argument (indicating an edit rather than a new forge). The return value is written to `state.arsenalForgeCleanup`. Both callbacks in this edit path set `state.arsenalForgeCleanup` to `null` and call `loadMyArsenal(container)` fire-and-forget, but unlike the callbacks in `loadForge`, they do not touch `state.arsenalActiveTab` or re-apply the active-class toggle.

## Agent 02

### loadArsenalScreen

`loadArsenalScreen` takes no parameters. It reads `state.arsenalForgeCleanup` from the `home.state` module. If that value is truthy, it calls it as a function (executing whatever cleanup the forge form registered), then sets `state.arsenalForgeCleanup` to `null`. It then calls `cleanupShopScreen()` unconditionally. It queries the DOM for the element with id `arsenal-content` and returns early if that element is not found. If the element exists, it writes `state.arsenalActiveTab` to the string `'my-arsenal'`, then iterates every element in the document carrying a `data-arsenal-tab` attribute and toggles the `active` class on each: elements whose `data-arsenal-tab` value equals `'my-arsenal'` receive `active`, all others lose it. Finally, it calls `loadMyArsenal(container)` with the found element, fire-and-forget via `void`. `loadArsenalScreen` is synchronous; it does not await the call to `loadMyArsenal`.

### loadMyArsenal

`loadMyArsenal` is async. It receives one parameter, `container`, an `HTMLElement`. It awaits `renderArsenal(container)`, which is imported from `reference-arsenal.ts`. The return value of that awaited call is written to `state.arsenalRefs`. After `renderArsenal` resolves, it calls `wireArsenalButtons(container)`. `loadMyArsenal` returns `Promise<void>`. It has no branches, no early returns, and no try/catch block.

### loadArmory

`loadArmory` is async. It receives one parameter, `container`, an `HTMLElement`. It awaits `renderArmory(container)`, imported from `reference-arsenal.ts`. The return value is not captured. The function returns `Promise<void>`. It has no branches, no early returns, and no try/catch block.

### loadForge

`loadForge` takes one parameter, `container`, an `HTMLElement`. It is synchronous. It calls `showForgeForm`, imported from `reference-arsenal.ts`, passing `container`, a success callback, and a cancel callback. The return value of `showForgeForm` — which the comment structure and `state.arsenalForgeCleanup` assignment pattern indicate is a cleanup function, though what it contains is defined in `reference-arsenal.ts` and not visible here — is written to `state.arsenalForgeCleanup`.

The success callback receives a `_refId` string argument (unused). When invoked it sets `state.arsenalForgeCleanup` to `null`, sets `state.arsenalActiveTab` to `'my-arsenal'`, iterates every `[data-arsenal-tab]` element in the document and toggles `active` so only the `'my-arsenal'` tab is active, then calls `loadMyArsenal(container)` fire-and-forget via `void`.

The cancel callback receives no arguments. When invoked it performs the identical sequence: sets `state.arsenalForgeCleanup` to `null`, sets `state.arsenalActiveTab` to `'my-arsenal'`, updates tab `active` classes identically, then calls `loadMyArsenal(container)` fire-and-forget via `void`.

Neither callback is invoked by `loadForge` itself; they are passed to `showForgeForm` to be called by the forge form at a later time. `loadForge` returns `void`.

### wireArsenalButtons

`wireArsenalButtons` takes one parameter, `container`, an `HTMLElement`. It is synchronous and returns `void`. It queries `container` for an element with id `arsenal-forge-btn`. If that element is found, it attaches a `click` listener. That listener queries the document for an element matching `[data-arsenal-tab="forge"]` and, if found, calls `.click()` on it — dispatching a synthetic click that the module-level tab-switching listener (defined at line 82, outside the anchor list) will receive.

It then queries `container` for all elements matching `.ref-card-edit-btn` and iterates over them. For each such button, it attaches a `click` listener. That listener reads `dataset.refId` from the clicked button element. If `refId` is falsy, the listener returns early without doing anything. Otherwise it searches `state.arsenalRefs` — the array written by `loadMyArsenal` — for an entry whose `id` property equals `refId`, typed as `ArsenalReference`. If no matching entry is found, the listener returns early. If a match is found, it calls `showForgeForm` passing `container`, a success callback, a cancel callback, and the matched `ref` object as a fourth argument (the edit-mode overload). The return value is written to `state.arsenalForgeCleanup`. The success callback sets `state.arsenalForgeCleanup` to `null` then calls `loadMyArsenal(container)` fire-and-forget. The cancel callback does the same. Neither callback updates `state.arsenalActiveTab` or the tab `active` classes, unlike the callbacks passed from `loadForge`.

## Agent 03

### loadArsenalScreen

`loadArsenalScreen` takes no parameters. It reads `state.arsenalForgeCleanup` from the shared `state` object imported from `home.state.ts`. If that value is truthy, it calls it as a function (invoking the cleanup teardown stored there) and then sets `state.arsenalForgeCleanup` to `null`. It then calls `cleanupShopScreen()` unconditionally. It queries the DOM for the element with id `arsenal-content`; if that element is not found, the function returns early with no further action. When the element is found, it writes `'my-arsenal'` to `state.arsenalActiveTab`, then iterates every element matching `[data-arsenal-tab]` and toggles the CSS class `active` on each one, adding it only to the element whose `data-arsenal-tab` attribute equals `'my-arsenal'`. Finally, it calls `loadMyArsenal(container)` with the found container element, fire-and-forget via `void`. `loadArsenalScreen` is synchronous itself; the async work is delegated to `loadMyArsenal`.

### loadMyArsenal

`loadMyArsenal` is `async` and accepts a single `HTMLElement` parameter named `container`. It awaits `renderArsenal(container)`, an imported function from `reference-arsenal.ts`, and assigns the resolved value to `state.arsenalRefs`. The type of `state.arsenalRefs` after this assignment is whatever `renderArsenal` returns — from the type import, it is `ArsenalReference[]`, though the shape of those objects is defined in `reference-arsenal.ts`, not this file. After the await resolves, `loadMyArsenal` calls `wireArsenalButtons(container)` synchronously. There are no branches, loops, error paths, or try/catch blocks. The function returns `Promise<void>`.

### loadArmory

`loadArmory` is `async` and accepts a single `HTMLElement` parameter named `container`. It awaits `renderArmory(container)`, an imported function from `reference-arsenal.ts`. It neither reads nor writes any module-level state. After the await resolves the function returns; there are no branches, early returns, or error paths. The return value of `renderArmory` is discarded. The function returns `Promise<void>`.

### loadForge

`loadForge` is synchronous and accepts a single `HTMLElement` parameter named `container`. It calls `showForgeForm`, imported from `reference-arsenal.ts`, passing `container` and two callbacks, then assigns the return value of that call to `state.arsenalForgeCleanup`. The return value of `showForgeForm` is therefore expected to be a cleanup function, though its exact type is not declared in this file.

The first callback — the "on forge complete" path — receives a `_refId` string argument (unused). It sets `state.arsenalForgeCleanup` to `null`, writes `'my-arsenal'` to `state.arsenalActiveTab`, toggles the `active` class on all `[data-arsenal-tab]` elements (activating only the `'my-arsenal'` tab), then calls `loadMyArsenal(container)` fire-and-forget via `void`.

The second callback — the "on cancel" path — receives no meaningful argument. It sets `state.arsenalForgeCleanup` to `null`, performs the same tab-activation loop as the first callback, and calls `loadMyArsenal(container)` fire-and-forget via `void`.

Both callbacks are identical in effect after clearing `state.arsenalForgeCleanup`. `loadForge` itself does not await anything and returns `void`.

### wireArsenalButtons

`wireArsenalButtons` is synchronous and accepts a single `HTMLElement` parameter named `container`. It reads `state.arsenalRefs` (the array previously written by `loadMyArsenal`) and queries the DOM within `container`.

First, it looks for an element with id `arsenal-forge-btn` inside `container`. If found, it attaches a `click` listener. That listener queries the full document for `[data-arsenal-tab="forge"]` and, if found, programmatically calls `.click()` on it — which triggers the module-level tab-switching listener at the bottom of the file rather than calling `loadForge` directly.

Second, it iterates every element matching `.ref-card-edit-btn` within `container`. For each such button, it attaches a `click` listener. The listener reads `data-ref-id` from the button element. If that attribute is absent or empty, the listener returns early. Otherwise it searches `state.arsenalRefs` for an entry whose `id` matches the `refId` string. If no match is found, the listener returns early. If a match is found, the listener calls `showForgeForm` with `container`, two callbacks, and the matched `ref` object as a fourth argument (the edit-mode path). The first callback (save complete) sets `state.arsenalForgeCleanup` to `null` and calls `loadMyArsenal(container)` fire-and-forget. The second callback (cancel) does the same. The return value of `showForgeForm` is assigned to `state.arsenalForgeCleanup`. There is no error path or try/catch in this function.

## Agent 04

### loadArsenalScreen

`loadArsenalScreen` takes no parameters. It reads `state.arsenalForgeCleanup` from module-level state imported from `home.state.ts`. If that value is truthy, it calls the cleanup function stored there and then sets `state.arsenalForgeCleanup` to `null`. It then calls `cleanupShopScreen()` unconditionally. Next it queries the DOM for the element with id `arsenal-content`; if that element is not found, the function returns early with no further action. If the element is found, it sets `state.arsenalActiveTab` to the string `'my-arsenal'`, then queries all elements bearing a `data-arsenal-tab` attribute and toggles the `active` CSS class on each one, applying `active` only to the element whose `data-arsenalTab` dataset value equals `'my-arsenal'`. Finally it calls `loadMyArsenal(container)` as a fire-and-forget async call (prefixed with `void`). The function itself is synchronous and returns `void`.

### loadMyArsenal

`loadMyArsenal` is an `async` function that accepts a single `container: HTMLElement` parameter. It awaits `renderArsenal(container)`, which is imported from `reference-arsenal.ts` and performs DOM rendering into the provided container; the awaited return value is assigned to `state.arsenalRefs` on the shared `state` object. After the await resolves, it calls `wireArsenalButtons(container)` synchronously. The function returns `Promise<void>`. There are no branches, loops, or error paths — no try/catch block is present, so any rejection from `renderArsenal` propagates as an unhandled promise rejection at the call site.

### loadArmory

`loadArmory` is an `async` function that accepts a single `container: HTMLElement` parameter. It awaits `renderArmory(container)`, imported from `reference-arsenal.ts`. The function writes nothing to module-level state and returns `Promise<void>`. There are no branches, loops, or error paths, and no try/catch block — any rejection from `renderArmory` propagates as an unhandled promise rejection.

### loadForge

`loadForge` is a synchronous function that accepts a single `container: HTMLElement` parameter. It calls `showForgeForm` from `reference-arsenal.ts`, passing `container` and two callbacks, and assigns the return value to `state.arsenalForgeCleanup`. The first callback is the on-success callback; it receives a `_refId: string` argument (unused). When invoked, it sets `state.arsenalForgeCleanup` to `null`, sets `state.arsenalActiveTab` to `'my-arsenal'`, updates the `active` class on all `[data-arsenal-tab]` elements to mark `'my-arsenal'` as active, then calls `loadMyArsenal(container)` fire-and-forget. The second callback is the on-cancel callback; it takes no arguments and performs exactly the same sequence: sets `state.arsenalForgeCleanup` to `null`, sets `state.arsenalActiveTab` to `'my-arsenal'`, updates the active tab CSS classes, and calls `loadMyArsenal(container)` fire-and-forget. The function does not await anything, has no branches or loops in its own body, and returns `void`. The return value of `showForgeForm` — stored in `state.arsenalForgeCleanup` — is described by this file's comment structure as a cleanup function callable later; what `showForgeForm` actually returns is defined in `reference-arsenal.ts` and not visible here.

### wireArsenalButtons

`wireArsenalButtons` is a synchronous function that accepts a single `container: HTMLElement` parameter. It reads nothing from module-level state directly, but it reads `state.arsenalRefs` inside an event listener closure. It queries `container` for an element with id `arsenal-forge-btn`. If that element exists, it attaches a `click` listener to it; when clicked, the listener queries the broader document for an element matching `[data-arsenal-tab="forge"]` and, if found, calls `.click()` on it programmatically, which triggers the module-level tab-switching listener defined at the bottom of the file. If `arsenal-forge-btn` is not found, the branch is skipped with no action. It then queries `container` for all elements matching `.ref-card-edit-btn` and iterates over them with `forEach`. For each edit button, it attaches a `click` listener. When a `.ref-card-edit-btn` is clicked, the listener reads `data-ref-id` from the button's dataset; if that value is absent, it returns early. Otherwise it searches `state.arsenalRefs` for a matching `ArsenalReference` by `id`; if none is found, it returns early. If a matching reference is found, it calls `showForgeForm` with `container`, an on-success callback that sets `state.arsenalForgeCleanup` to `null` and calls `loadMyArsenal(container)` fire-and-forget, an on-cancel callback that does the same, and the matched `ref` object passed as a fourth argument (the edit-mode initializer). The return value of `showForgeForm` is assigned to `state.arsenalForgeCleanup`. The function itself returns `void`.

## Agent 05

### loadArsenalScreen

`loadArsenalScreen` is synchronous and takes no parameters. It reads `state.arsenalForgeCleanup` from the module-level `state` object imported from `home.state.ts`. If that value is truthy, it calls it as a function (invoking whatever cleanup the forge form registered) and then sets `state.arsenalForgeCleanup` to `null`. It then calls `cleanupShopScreen()` unconditionally. Next it queries the DOM for the element with id `arsenal-content`; if that element is not found, the function returns early with no further action. If the element is found, it writes `'my-arsenal'` to `state.arsenalActiveTab`, then iterates over all elements matching the attribute selector `[data-arsenal-tab]` and toggles the CSS class `active` on each one, adding it only to the element whose `data-arsenal-tab` value equals `'my-arsenal'`. Finally it calls `loadMyArsenal(container)` as a fire-and-forget async call (the returned promise is cast to `void` and not awaited).

### loadMyArsenal

`loadMyArsenal` is async and accepts a single `container: HTMLElement` parameter. It awaits `renderArsenal(container)`, an imported function from `reference-arsenal.ts`, and assigns the resolved value to `state.arsenalRefs`. The type of that resolved value is `ArsenalReference[]` based on the import, though the exact shape of what `renderArsenal` puts into the DOM is determined outside this file. After the await resolves, it calls `wireArsenalButtons(container)` synchronously. There are no branches, early returns, or error paths in this function.

### loadArmory

`loadArmory` is async and accepts a single `container: HTMLElement` parameter. It awaits `renderArmory(container)`, an imported function from `reference-arsenal.ts`. The return value of `renderArmory` is discarded. The function has no branches, no writes to `state`, and no error paths. Its only effect is to wait for `renderArmory` to finish before returning.

### loadForge

`loadForge` is synchronous and accepts a single `container: HTMLElement` parameter. It calls `showForgeForm` from `reference-arsenal.ts` and immediately assigns the return value to `state.arsenalForgeCleanup`. `showForgeForm` receives three arguments: `container`, a success callback, and a cancel callback.

The success callback receives a `_refId: string` argument (which is unused inside the callback). When the success callback fires, it sets `state.arsenalForgeCleanup` to `null`, writes `'my-arsenal'` to `state.arsenalActiveTab`, iterates over all `[data-arsenal-tab]` elements toggling `active` to mark only the `'my-arsenal'` tab, and then calls `loadMyArsenal(container)` as a fire-and-forget call.

The cancel callback performs identical steps: it sets `state.arsenalForgeCleanup` to `null`, writes `'my-arsenal'` to `state.arsenalActiveTab`, toggles the same tab active states, and calls `loadMyArsenal(container)` as fire-and-forget. The two callbacks differ only in their parameter signature; their bodies are identical. What `showForgeForm` returns — and therefore what gets stored in `state.arsenalForgeCleanup` — is a cleanup function determined by `reference-arsenal.ts`, not by this file.

### wireArsenalButtons

`wireArsenalButtons` is synchronous and accepts a single `container: HTMLElement` parameter. It reads `state.arsenalRefs`, which at this call site has been populated by the preceding `await renderArsenal(container)` call in `loadMyArsenal`.

It first queries `container` for an element with id `arsenal-forge-btn`. If found, it attaches a `click` listener that queries the document for the element with `data-arsenal-tab="forge"` and, if found, programmatically calls `.click()` on it. This delegates to the module-level tab-switching listener defined at lines 82–99, rather than calling `loadForge` directly.

It then queries `container` for all elements matching `.ref-card-edit-btn` and iterates over them with `forEach`. For each button, a `click` listener is attached. When that listener fires, it reads `data-ref-id` from the clicked element; if the value is absent, the listener returns early. If a value is present, it searches `state.arsenalRefs` for an `ArsenalReference` whose `id` matches the ref ID. If no matching reference is found, the listener returns early. If a match is found, it calls `showForgeForm` with `container`, a success callback, a cancel callback, and the found `ref` object as the fourth argument. The return value of `showForgeForm` is stored in `state.arsenalForgeCleanup`. Both the success callback (receiving `_editedId`) and the cancel callback set `state.arsenalForgeCleanup` to `null` and then call `loadMyArsenal(container)` as fire-and-forget. The edit-mode invocation of `showForgeForm` is structurally identical to the one in `loadForge` except it passes the pre-existing `ref` as the fourth argument, which signals to `showForgeForm` that this is an edit rather than a new creation.
