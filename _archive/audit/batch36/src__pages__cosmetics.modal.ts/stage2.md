# Stage 2 Outputs — cosmetics.modal.ts

## Agent 01

### initModalCallbacks

`initModalCallbacks` takes three function arguments — `getBalance`, `setBalance`, and `rerender` — and writes each one into the corresponding module-level variable: `_getTokenBalance`, `_setTokenBalance`, and `_rerenderTab`. All three module-level variables are initialized to no-op stubs at declaration time, so any call to `openConfirmModal`, `executePurchase`, or `handleEquip` before `initModalCallbacks` is invoked will silently succeed (balance reads return `0`, balance writes are discarded, and rerenders do nothing). The function is synchronous, takes no return value, and performs no DOM access or external I/O.

### openConfirmModal

`openConfirmModal` receives a `cosmeticId` string and a `catalog` array of `CosmeticItem` objects. It searches `catalog` for the entry whose `cosmetic_id` matches the argument. If no matching entry is found, or if the found entry's `unlock_type` is anything other than `'token'`, the function returns immediately without touching the DOM.

On the happy path it reads `item.token_cost` (defaulting to `0` if absent) and calls `_getTokenBalance()` to compute the post-purchase balance `after`. It then makes four direct DOM writes via `getElementById`: it sets the text content of `modal-item-name` to the item's name and `modal-cost-amount` to the localized cost string. For the `modal-balance-after` element it branches on whether `after >= 0`: if so it writes a localized "Balance after: …" string and clears any inline color style; if not it writes a "Need N more tokens" string and sets the element's inline color to the hardcoded hex `#e74c3c`. It then reads the `modal-confirm` button element, disables it when `after < 0`, resets its text content to `'Purchase'`, and assigns its `onclick` to a closure that calls `executePurchase(cosmeticId, confirmBtn, catalog)`. Finally it removes the `hidden` CSS class from the `confirm-modal` element to show the modal. The function is synchronous and returns `void`.

### closeConfirmModal

`closeConfirmModal` takes no parameters. It calls `getElementById('confirm-modal')` and adds the class `'hidden'` to that element's class list, hiding the confirmation modal. It reads no module-level state, writes no module-level state, and has no branches or error handling. The function is synchronous and returns `void`.

### executePurchase

`executePurchase` is `async`. It receives a `cosmeticId` string, a reference to the confirm button `btn` as `HTMLButtonElement`, and the `catalog` array. It immediately sets `btn.disabled = true` and `btn.textContent = 'Purchasing…'` before any await, giving synchronous visual feedback.

It then awaits `safeRpc<{ new_balance: number }>('purchase_cosmetic', { p_cosmetic_id: cosmeticId })`. If the response contains an error or no data, `showToast` is called with an error message at severity `'error'`, `btn.disabled` is reset to `false`, `btn.textContent` is reset to `'Purchase'`, and the function returns early. There is no `try/finally` block: if `safeRpc` throws rather than returning an error object, `btn.disabled` remains `true` and is never re-enabled — this is the known landmine documented in the file header as `LM-COS-002`.

On success it searches `catalog` for the matching item and, if found, sets `item.owned = true` on that object in place. It then calls `_setTokenBalance(data.new_balance)`. It reads `document.getElementById('token-balance-display')` and, if the element exists, sets its text content to the localized new balance. It then calls `closeConfirmModal()`, calls `showToast` with a success message using the item's name (or the fallback string `'Item'`), and finally calls `_rerenderTab()`. The function returns `Promise<void>`.

### handleEquip

`handleEquip` is `async`. It receives a `cosmeticId` string, a generic `HTMLElement` reference `btn`, and the `catalog` array. It immediately casts `btn` to `HTMLButtonElement` and sets `disabled = true`, then sets `btn.textContent = '…'`.

It awaits `safeRpc('equip_cosmetic', { p_cosmetic_id: cosmeticId })` with no generic type annotation. If the response contains an error, `showToast` is called with an error message at severity `'error'`, `btn.disabled` is reset to `false`, `btn.textContent` is reset to `'Equip'`, and the function returns early. As with `executePurchase`, there is no `try/finally`, so an exception thrown by `safeRpc` leaves the button permanently disabled.

On success it searches `catalog` for the matching item. If found, it iterates over the entire `catalog` with `forEach`, setting `equipped = false` on every item sharing the same `category` as the target item. It then sets `item.owned = true` and `item.equipped = true` on the target item. It calls `showToast` with a success message, then calls `_rerenderTab()`. The file's inline comment notes that `_rerenderTab()` rebuilds the DOM, making the `btn` reference stale after this point; the function does not read `btn` after that call. The function returns `Promise<void>`.

### showInfoModal

`showInfoModal` receives a `title` string and a `body` string. It calls `getElementById('info-modal-name')` and sets that element's `textContent` to `title`, then calls `getElementById('info-modal-body')` and sets its `textContent` to `body`. It then calls `getElementById('info-modal')` and removes the `'hidden'` class from its class list. All three `getElementById` calls use the non-null assertion operator; no null check or error handling is present. The function is synchronous, reads no module-level state, writes no module-level state, and returns `void`.

### closeInfoModal

`closeInfoModal` takes no parameters. It calls `getElementById('info-modal')` and adds the class `'hidden'` to that element's class list. It reads no module-level state, writes no module-level state, has no branches, and performs no other operations. The function is synchronous and returns `void`.

## Agent 02

### initModalCallbacks

`initModalCallbacks` takes three function arguments — `getBalance`, `setBalance`, and `rerender` — and writes them directly into three module-level variables: `_getTokenBalance`, `_setTokenBalance`, and `_rerenderTab`. All three variables are initialized at module load time to no-op stubs (`() => 0`, `() => {}`, `() => {}`). After `initModalCallbacks` returns, subsequent calls to `openConfirmModal`, `executePurchase`, and `handleEquip` will invoke the real implementations rather than the stubs. The function is synchronous, has no control flow branches, and returns `void`.

### openConfirmModal

`openConfirmModal` takes a `cosmeticId` string and a `catalog` array of `CosmeticItem` objects. It first searches `catalog` for an entry whose `cosmetic_id` matches `cosmeticId`. If no match is found, or if the matched item's `unlock_type` is not `'token'`, the function returns immediately without touching the DOM. On the happy path, it reads `item.token_cost` (defaulting to `0` if nullish) and calls `_getTokenBalance()` to get the current balance, computing the post-purchase balance as `after`. It then writes to three DOM elements by ID: `modal-item-name` receives the item's name, `modal-cost-amount` receives the cost formatted with `toLocaleString()`, and `modal-balance-after` receives either a formatted balance string (when `after >= 0`) or a deficit message (when `after < 0`), in which case `afterEl.style.color` is also set to the hardcoded hex `#e74c3c`. It then retrieves `modal-confirm` as an `HTMLButtonElement`, sets `disabled` to `true` when `after < 0`, sets `textContent` to `'Purchase'`, and assigns `onclick` to a closure that calls `executePurchase(cosmeticId, confirmBtn, catalog)`. Finally it removes the `'hidden'` CSS class from `confirm-modal`, making the modal visible. The function is synchronous and returns `void`.

### closeConfirmModal

`closeConfirmModal` takes no parameters and reads no state. It queries the DOM for the element with id `confirm-modal` and adds the CSS class `'hidden'` to it, hiding the modal. The function is synchronous, has no branches, and returns `void`.

### executePurchase

`executePurchase` is `async`. It takes a `cosmeticId` string, a reference to the `HTMLButtonElement` `btn`, and the `catalog` array. It immediately sets `btn.disabled = true` and `btn.textContent = 'Purchasing…'`, disabling the button before any network call.

It then awaits `safeRpc<{ new_balance: number }>('purchase_cosmetic', { p_cosmetic_id: cosmeticId })`. If `error` is truthy or `data` is absent, `showToast` is called with an error message and `'error'` severity, `btn.disabled` is restored to `false`, `btn.textContent` is reset to `'Purchase'`, and the function returns early. As noted in the file's leading comment, there is no `try/finally` block, so if `safeRpc` throws rather than returning an error object, `btn.disabled` remains `true` permanently.

On the success path, `catalog` is searched for the purchased item and, if found, its `owned` property is mutated to `true` in place. `_setTokenBalance` is called with `data.new_balance`. The DOM element with id `token-balance-display` is queried; if it exists, its `textContent` is set to the new balance formatted with `toLocaleString()`. `closeConfirmModal()` is then called. `showToast` is called with a success message using the item's name (or `'Item'` as a fallback). Finally, `_rerenderTab()` is called. The function returns `Promise<void>`.

### handleEquip

`handleEquip` is `async`. It takes a `cosmeticId` string, a generic `HTMLElement` `btn` (cast to `HTMLButtonElement` where needed), and the `catalog` array. It immediately casts `btn` to `HTMLButtonElement` and sets `disabled = true`, then sets `btn.textContent` to `'…'`.

It awaits `safeRpc('equip_cosmetic', { p_cosmetic_id: cosmeticId })`, discarding the `data` return value and capturing only `error`. If `error` is truthy, `showToast` is called with an error message and `'error'` severity, `btn.disabled` is restored to `false`, `btn.textContent` is reset to `'Equip'`, and the function returns early. There is no `try/finally` here either, mirroring the same permanent-disable risk as `executePurchase`.

On the success path, `catalog` is searched for the matched item. If found, `catalog.forEach` iterates over every item in the catalog and sets `equipped = false` on every item sharing the same `category` as the matched item. Then `item.owned` and `item.equipped` are both set to `true` on the matched item. `showToast` is called with a success message. Finally, `_rerenderTab()` is called. The file notes as a landmine that the DOM reference held in `btn` becomes stale after `_rerenderTab()` rebuilds the DOM. The function returns `Promise<void>`.

### showInfoModal

`showInfoModal` takes a `title` string and a `body` string. It queries the DOM for `info-modal-name` and sets its `textContent` to `title`, then queries `info-modal-body` and sets its `textContent` to `body`. Finally it removes the `'hidden'` class from `info-modal`, making the modal visible. The function is synchronous, has no branches, reads no module-level state, and returns `void`.

### closeInfoModal

`closeInfoModal` takes no parameters and reads no state. It queries the DOM for the element with id `info-modal` and adds the CSS class `'hidden'` to it. The function is synchronous, has no branches, and returns `void`.

## Agent 03

### initModalCallbacks

`initModalCallbacks` receives three function references — `getBalance`, `setBalance`, and `rerender` — and writes them into the three module-level variables `_getTokenBalance`, `_setTokenBalance`, and `_rerenderTab`, replacing the no-op defaults that were assigned at declaration. It takes no action on the DOM, calls no other functions, reads no external state, and returns `void`. It is synchronous.

### openConfirmModal

`openConfirmModal` receives a `cosmeticId` string and a `catalog` array of `CosmeticItem` objects. It searches `catalog` with `Array.find` for an item whose `cosmetic_id` matches `cosmeticId`. If no matching item is found, or if the matching item's `unlock_type` is not `'token'`, the function returns immediately without touching the DOM.

If the item passes that check, it reads `item.token_cost` (defaulting to `0` if nullish) and calls `_getTokenBalance()` to get the current balance, computing the post-purchase balance `after` by subtraction. It then writes `item.name` to the `textContent` of the element with id `modal-item-name`, and the localized cost string to `modal-cost-amount`. It reads the element with id `modal-balance-after` and branches on whether `after >= 0`: if so, it writes a localized balance string to that element's `textContent` and clears its inline `color` style; if not, it writes a deficit message (calling `_getTokenBalance()` a second time to compute the shortfall) and sets `color` to the hardcoded hex `#e74c3c`. It then reads the element `modal-confirm` as an `HTMLButtonElement`, sets its `disabled` property to `true` when `after < 0`, sets its `textContent` to `'Purchase'`, and assigns a new `onclick` handler that will call `executePurchase(cosmeticId, confirmBtn, catalog)` when invoked. Finally it removes the class `'hidden'` from the element with id `confirm-modal`, making the modal visible. The function is synchronous and returns `void`.

### closeConfirmModal

`closeConfirmModal` takes no parameters. It reads the DOM element with id `confirm-modal` and adds the class `'hidden'` to it. It reads no module-level state, writes no module-level state, calls no other functions, and returns `void`. It is synchronous.

### executePurchase

`executePurchase` receives a `cosmeticId` string, a reference to the confirm button `btn` as `HTMLButtonElement`, and the `catalog` array. It is `async` and returns `Promise<void>`.

It immediately sets `btn.disabled = true` and `btn.textContent = 'Purchasing…'` before any async work. It then awaits `safeRpc<{ new_balance: number }>('purchase_cosmetic', { p_cosmetic_id: cosmeticId })`.

On the error path — when `error` is truthy or `data` is falsy — it calls `showToast` with an error message, re-enables the button by setting `btn.disabled = false` and `btn.textContent = 'Purchase'`, then returns early. The file's own comment at line 6 notes that if `safeRpc` itself throws an unhandled exception (rather than returning an error object), there is no `try/finally` block, so the button would remain permanently disabled.

On the happy path, it finds the matching item in `catalog` by `cosmetic_id` and, if found, mutates `item.owned = true` in place. It calls `_setTokenBalance(data.new_balance)` to update the module-level balance callback state. It then reads the element with id `token-balance-display` and, if present, writes `data.new_balance.toLocaleString()` to its `textContent`. It calls `closeConfirmModal()` to hide the modal, calls `showToast` with a success message using the item name (falling back to `'Item'`), and finally calls `_rerenderTab()`. The confirm button is not re-enabled on the success path.

### handleEquip

`handleEquip` receives a `cosmeticId` string, a generic `HTMLElement` reference `btn`, and the `catalog` array. It is `async` and returns `Promise<void>`.

Before any async work it casts `btn` to `HTMLButtonElement` and sets `disabled = true`, then sets `btn.textContent = '…'`. It then awaits `safeRpc('equip_cosmetic', { p_cosmetic_id: cosmeticId })`, destructuring only `error` from the result.

On the error path — when `error` is truthy — it calls `showToast` with an error message, re-enables the button by casting `btn` to `HTMLButtonElement` again and setting `disabled = false`, sets `btn.textContent = 'Equip'`, then returns early. As with `executePurchase`, there is no `try/catch` or `try/finally`, so an unhandled exception from `safeRpc` would leave the button permanently disabled.

On the happy path, it searches `catalog` for the matching item. If found, it iterates the entire `catalog` array with `forEach`, setting `equipped = false` on every item whose `category` matches the found item's category. It then sets `item.owned = true` and `item.equipped = true` on the matched item. It calls `showToast` with a success message, then calls `_rerenderTab()`. The comment at line 85 notes that because `_rerenderTab()` rebuilds the DOM, `btn` becomes a stale reference after this point.

### showInfoModal

`showInfoModal` receives two strings: `title` and `body`. It writes `title` to the `textContent` of the element with id `info-modal-name`, writes `body` to the `textContent` of the element with id `info-modal-body`, and removes the class `'hidden'` from the element with id `info-modal`. It reads no module-level state, writes no module-level state, calls no other functions, and returns `void`. It is synchronous.

### closeInfoModal

`closeInfoModal` takes no parameters. It reads the DOM element with id `info-modal` and adds the class `'hidden'` to it. It reads no module-level state, writes no module-level state, calls no other functions, and returns `void`. It is synchronous.

## Agent 04

### initModalCallbacks

`initModalCallbacks` takes three function references — `getBalance`, `setBalance`, and `rerender` — and writes them directly into three module-level variables: `_getTokenBalance`, `_setTokenBalance`, and `_rerenderTab`. Those three variables are declared at module scope and initialized to no-op stubs (`() => 0`, `() => {}`, `() => {}`). After this call the stubs are replaced. The function reads no external state, performs no async work, and returns `void`.

### openConfirmModal

`openConfirmModal` takes a `cosmeticId` string and a `catalog` array of `CosmeticItem`. It searches `catalog` with `Array.find` for an item whose `cosmetic_id` matches `cosmeticId`. If no item is found, or if the found item's `unlock_type` is not `'token'`, the function returns immediately with no DOM changes.

If the item passes the guard, the function computes `cost` from `item.token_cost` (defaulting to `0` if nullish) and `after` by subtracting `cost` from the current balance via `_getTokenBalance()`. It then writes `item.name` to the text content of `#modal-item-name`, writes the locale-formatted cost to `#modal-cost-amount`, and branches on whether `after >= 0`. If the balance will be sufficient, the `#modal-balance-after` element receives a locale-formatted "Balance after" string and its inline color style is cleared. If the balance will be insufficient, the element instead receives a "Need N more tokens" string and its inline `color` is set to the hardcoded hex `#e74c3c`. The function then retrieves `#modal-confirm` as an `HTMLButtonElement`, disables it if `after < 0`, sets its `textContent` to `'Purchase'`, and assigns an `onclick` handler that calls `executePurchase(cosmeticId, confirmBtn, catalog)`. Finally, it removes the `'hidden'` class from `#confirm-modal`, making the modal visible. The function is synchronous, returns `void`, and calls `_getTokenBalance()` twice: once to compute `after` and once inside the insufficient-balance branch to recompute the shortfall.

### closeConfirmModal

`closeConfirmModal` takes no parameters and reads no state. It retrieves the element with id `confirm-modal` from the DOM and adds the class `'hidden'` to it. The function is synchronous and returns `void`.

### executePurchase

`executePurchase` is `async`. It takes `cosmeticId`, an `HTMLButtonElement` reference `btn`, and the `catalog` array. It immediately sets `btn.disabled = true` and `btn.textContent = 'Purchasing…'`, providing visual feedback before any await.

It then calls `safeRpc<{ new_balance: number }>('purchase_cosmetic', { p_cosmetic_id: cosmeticId })` and awaits the result. If `error` is truthy or `data` is falsy, the function calls `showToast` with an error message and `'error'` severity, restores `btn.disabled = false` and `btn.textContent = 'Purchase'`, and returns early. There is no `try/finally` block. As noted in the file's header comment, if `safeRpc` throws an uncaught exception rather than returning an error object, `btn.disabled` will remain `true` permanently.

On success, the function searches `catalog` for the purchased item and, if found, sets `item.owned = true` directly on the catalog entry. It then calls `_setTokenBalance(data.new_balance)`, and attempts to find the DOM element `#token-balance-display`; if it exists, it writes `data.new_balance.toLocaleString()` to its `textContent`. Next, it calls `closeConfirmModal()`, calls `showToast` with a success message, and finally calls `_rerenderTab()`. The function returns `Promise<void>`.

### handleEquip

`handleEquip` is `async`. It takes `cosmeticId`, a generic `HTMLElement` reference `btn`, and the `catalog` array. It casts `btn` to `HTMLButtonElement` to set `disabled = true` and sets `btn.textContent = '…'`.

It calls `safeRpc('equip_cosmetic', { p_cosmetic_id: cosmeticId })` and awaits the result, destructuring only `{ error }`. If `error` is truthy, the function calls `showToast` with an error message and `'error'` severity, restores `btn.disabled = false` and `btn.textContent = 'Equip'`, and returns early. As with `executePurchase`, there is no `try/finally`.

On success, the function searches `catalog` for the item. If found, it iterates the entire `catalog` with `forEach`, setting `equipped = false` on every item whose `category` matches `item.category`. It then sets `item.owned = true` and `item.equipped = true` on the found item. It calls `showToast` with a success message, then calls `_rerenderTab()`, and returns `Promise<void>`.

### showInfoModal

`showInfoModal` takes `title` and `body` strings. It writes `title` to the `textContent` of `#info-modal-name`, writes `body` to the `textContent` of `#info-modal-body`, and removes the class `'hidden'` from `#info-modal`. The function reads no module-level state, performs no async work, and returns `void`.

### closeInfoModal

`closeInfoModal` takes no parameters and reads no state. It retrieves the element with id `info-modal` and adds the class `'hidden'` to it. The function is synchronous and returns `void`.

## Agent 05

### initModalCallbacks

`initModalCallbacks` takes three function parameters — `getBalance`, `setBalance`, and `rerender` — and writes them directly into the three module-level variables `_getTokenBalance`, `_setTokenBalance`, and `_rerenderTab`, replacing the no-op stubs. It reads nothing and returns nothing. It is not async. It has no branches or error paths.

### openConfirmModal

`openConfirmModal` takes a `cosmeticId` string and the `catalog` array of `CosmeticItem` objects. It searches `catalog` with `Array.find` for the entry whose `cosmetic_id` matches `cosmeticId`. If no entry is found, or if the found entry's `unlock_type` is not `'token'`, the function returns immediately without touching the DOM.

On the happy path, it reads `item.token_cost` (defaulting to `0` if absent) and calls `_getTokenBalance()` to compute the post-purchase balance `after`. It then writes to four DOM elements by ID: `'modal-item-name'` receives the item's name as `textContent`, and `'modal-cost-amount'` receives the cost formatted with `toLocaleString`. For the `'modal-balance-after'` element, the function branches on whether `after` is non-negative: if so, it sets `textContent` to a formatted balance string and clears the element's inline `color` style; if negative, it calls `_getTokenBalance()` a second time to compute the shortfall and sets `textContent` to a "Need N more tokens" message with an inline `color` of `'#e74c3c'`. It then queries `'modal-confirm'` as an `HTMLButtonElement`, sets its `disabled` to `true` when `after < 0`, resets its `textContent` to `'Purchase'`, and assigns its `onclick` to a closure that calls `executePurchase(cosmeticId, confirmBtn, catalog)`. Finally, it removes the `'hidden'` class from the `'confirm-modal'` element. The function is not async and returns nothing.

### closeConfirmModal

`closeConfirmModal` takes no parameters and reads no state. It queries the DOM element with id `'confirm-modal'` and adds the class `'hidden'` to it. It returns nothing and is not async.

### executePurchase

`executePurchase` is async. It takes a `cosmeticId` string, a reference to an `HTMLButtonElement` (`btn`), and the `catalog` array.

At entry it immediately writes `btn.disabled = true` and `btn.textContent = 'Purchasing…'`. There is no `try/finally` block — the file's leading comment explicitly flags this as landmine `LM-COS-002`, meaning that if the awaited call throws an uncaught exception, `btn.disabled` will remain `true` permanently.

It awaits `safeRpc<{ new_balance: number }>('purchase_cosmetic', { p_cosmetic_id: cosmeticId })`. On the error path — when `error` is truthy or `data` is falsy — it calls `showToast` with an error message and the `'error'` variant, re-enables the button, then returns early.

On the success path it searches `catalog` for the matching item and, if found, sets `item.owned = true` directly on the catalog entry. It then calls `_setTokenBalance(data.new_balance)`. It separately queries the DOM element `'token-balance-display'` and, if that element exists, sets its `textContent` to the formatted new balance. It then calls `closeConfirmModal()`. It calls `showToast` with a success message using the item's name (falling back to `'Item'`). Finally it calls `_rerenderTab()`. The function returns `Promise<void>`.

### handleEquip

`handleEquip` is async. It takes a `cosmeticId` string, a generic `HTMLElement` (`btn`), and the `catalog` array.

At entry it casts `btn` to `HTMLButtonElement` and sets `disabled = true`, then sets `btn.textContent` to `'…'`. It awaits `safeRpc('equip_cosmetic', { p_cosmetic_id: cosmeticId })`. The return value is destructured for `error` only; the `data` field is discarded. On the error path, it calls `showToast`, re-enables the button, and returns early.

On the success path it searches `catalog` for the matching item. If found, it iterates over every entry in `catalog` with `forEach`, setting `equipped = false` on all items whose `category` matches the matched item's category. It then sets `item.owned = true` and `item.equipped = true` on the matched item. It calls `showToast` with a success message, then calls `_rerenderTab()`. The function returns `Promise<void>`.

### showInfoModal

`showInfoModal` takes a `title` string and a `body` string. It queries three DOM elements by ID: it sets `'info-modal-name'`'s `textContent` to `title`, sets `'info-modal-body'`'s `textContent` to `body`, and removes the `'hidden'` class from `'info-modal'`. Both `title` and `body` are assigned to `textContent` (not `innerHTML`), so no XSS escaping is needed. It reads no module-level state, writes no module-level state, and returns nothing. It is not async.

### closeInfoModal

`closeInfoModal` takes no parameters and reads no state. It queries the DOM element with id `'info-modal'` and adds the class `'hidden'` to it. It returns nothing and is not async.
