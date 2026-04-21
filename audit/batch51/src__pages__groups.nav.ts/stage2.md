# Stage 2 Outputs — groups.nav.ts

## Agent 01

### setNavOpenGroupCallback

This function accepts a callback function as a parameter and assigns it to the module-level variable `_openGroup`. It takes a function with signature `(id: string) => void` and stores it for later use by other functions in the module. The function has no return value and produces no other side effects.

### switchTab

This function receives a `tab` parameter (a string) and updates the active tab in the lobby view. It calls `setActiveTab(tab)` to update module-level state. It then queries all elements with the selector `#lobby-tabs .tab-btn` and toggles their `active` class based on whether the tab name at index `i` in the array `['discover', 'mine', 'leaderboard']` matches the `tab` parameter. It sets the `display` style of three elements (`#tab-discover`, `#tab-mine`, `#tab-leaderboard`) to `'block'` if their corresponding tab is selected, or `'none'` otherwise. When `tab` is `'mine'`, it dynamically imports `groups.load.ts` and calls `loadMyGroups()`. When `tab` is `'leaderboard'`, it dynamically imports `groups.load.ts` and calls `loadLeaderboard()`. The function is synchronous and returns no value.

### switchDetailTab

This function receives a `tab` parameter (a string) and updates the active detail tab. It calls `setActiveDetailTab(tab)` to update module-level state. It defines a `tabs` array with four tab names: `['hot-takes', 'challenges', 'members', 'auditions']`. It then queries all elements with the selector `#detail-tabs .tab-btn` and toggles their `active` class based on whether the tab name at index `i` in the `tabs` array matches the `tab` parameter. It sets the `display` style of four detail content elements (`#detail-hot-takes`, `#detail-challenges`, `#detail-members-list`, `#detail-auditions`) to `'block'` if their tab is selected, or `'none'` otherwise. When `tab` is `'auditions'` and the module-level state variable `currentGroupId` is truthy, it calls `loadPendingAuditions(currentGroupId, callerRole)`, passing the current group ID and caller role. The function is synchronous and returns no value.

### filterCategory

This function receives a `cat` parameter (which may be a string or null) and an `el` parameter (an HTMLElement). It queries all elements with the class `cat-pill` and removes the `active` class from each. It then adds the `active` class to the provided `el`. It calls `setActiveCategory(cat)` to update the module-level state variable `activeCategory` to the provided category. It then dynamically imports `groups.load.ts` and calls `loadDiscover()`. The function is synchronous and returns no value.

### showLobby

This function calls `setCurrentGroupId(null)` to clear the module-level state variable `currentGroupId` and `setCallerRole(null)` to clear the module-level state variable `callerRole`. It sets the `display` style of the element with ID `view-detail` to `'none'` and the `display` style of the element with ID `view-lobby` to `'block'`. The function is synchronous and returns no value.

## Agent 02

### setNavOpenGroupCallback

This function accepts a callback function `fn` that takes a string parameter and returns void. It assigns `fn` to the module-level variable `_openGroup`, which was initially declared as `null`. The function returns void and has no other side effects. This is a simple setter used to inject the `openGroup` function from `groups.detail.ts`.

### switchTab

This function reads the `tab` parameter and calls `setActiveTab(tab)` to update module-level state. It then queries all elements with selector `#lobby-tabs .tab-btn`, iterates over them, and toggles the `active` class on each based on whether the tab name at index `i` in the array `['discover', 'mine', 'leaderboard']` matches the `tab` parameter. Next, it queries the DOM for three elements with IDs `tab-discover`, `tab-mine`, and `tab-leaderboard`, casting each to `HTMLElement`, and sets the `display` style property to `'block'` if the corresponding tab matches, otherwise `'none'`. If `tab` equals `'mine'`, the function dynamically imports `groups.load.ts` and calls the `loadMyGroups` function. If `tab` equals `'leaderboard'`, it dynamically imports `groups.load.ts` and calls the `loadLeaderboard` function. Both imports are not awaited. The function returns void.

### switchDetailTab

This function reads the `tab` parameter and calls `setActiveDetailTab(tab)` to update module-level state. It declares a local array `tabs` containing `['hot-takes', 'challenges', 'members', 'auditions']`, then queries all elements with selector `#detail-tabs .tab-btn`, iterates over them, and toggles the `active` class based on whether `tabs[i]` matches the `tab` parameter. It then queries the DOM for four elements (`detail-hot-takes`, `detail-challenges`, `detail-members-list`, `detail-auditions`) and sets their `display` style to `'block'` if the corresponding tab name matches, otherwise `'none'`. If `tab` equals `'auditions'` and the module-level variable `currentGroupId` is truthy, it calls `loadPendingAuditions(currentGroupId, callerRole)` (both module-level state). The function returns void and does not use `await`.

### filterCategory

This function reads the `cat` parameter (a string or null) and the `el` parameter (an HTMLElement). It queries all elements with class `cat-pill` and removes the `active` class from each. It then adds the `active` class to the `el` parameter. It calls `setActiveCategory(cat)` to update module-level state. It then dynamically imports `groups.load.ts` and calls the `loadDiscover` function without awaiting. The function returns void.

### showLobby

This function calls `setCurrentGroupId(null)` and `setCallerRole(null)` to clear module-level state. It queries the DOM for elements with IDs `view-detail` and `view-lobby`, casts each to `HTMLElement`, and sets the `display` style property of `view-detail` to `'none'` and `view-lobby` to `'block'`. The function returns void.

## Agent 03

### setNavOpenGroupCallback
This function stores a callback function in the module-level variable `_openGroup`. It takes a single parameter `fn`, a function that accepts a string id, and sets `_openGroup` to that function. The function returns nothing. This is a simple setter with no side effects beyond storing the callback reference.

### switchTab
This function reads the `tab` parameter and writes to both module-level state via `setActiveTab(tab)` and DOM elements. It queries all elements with class `.tab-btn` within `#lobby-tabs`, iterating through them and toggling their `active` class based on whether each button's position in the array matches the tab name at that index (comparing against the array `['discover', 'mine', 'leaderboard']`). It then sets the display style to `'block'` for the corresponding tab element (`#tab-discover`, `#tab-mine`, or `#tab-leaderboard`) and `'none'` for the others. If the tab parameter is `'mine'`, it dynamically imports `groups.load.ts` and calls `loadMyGroups()` via promise chaining. If the tab parameter is `'leaderboard'`, it similarly imports and calls `loadLeaderboard()`. This function is not async but contains unwaited promise chains.

### switchDetailTab
This function reads the `tab` parameter and writes to module-level state via `setActiveDetailTab(tab)` and DOM elements. It defines a local array `tabs` containing `['hot-takes', 'challenges', 'members', 'auditions']`, then queries all elements with class `.tab-btn` within `#detail-tabs`, iterating through them and toggling their `active` class based on whether the tab name at each position matches the `tab` parameter. It then sets the display style to `'block'` for the matching detail element and `'none'` for the others, targeting `#detail-hot-takes`, `#detail-challenges`, `#detail-members-list`, and `#detail-auditions`. If the tab is `'auditions'` and the module-level variable `currentGroupId` is truthy, it calls `loadPendingAuditions(currentGroupId, callerRole)`, reading both from module-level state. This function is not async.

### filterCategory
This function reads the `cat` parameter and an HTMLElement reference `el`, and writes to module-level state and DOM elements. It queries all elements with class `.cat-pill`, removing the `active` class from each. It then adds the `active` class to the element passed as `el`. It calls `setActiveCategory(cat)` to update module-level state. Finally, it dynamically imports `groups.load.ts` and calls `loadDiscover()` via promise chaining. This function is not async but contains an unwaited promise chain.

### showLobby
This function reads nothing and writes only to module-level state and DOM elements. It calls `setCurrentGroupId(null)` and `setCallerRole(null)` to clear module-level state, then sets the display style of `#view-detail` to `'none'` and `#view-lobby` to `'block'`. This function performs no branching or external calls and returns nothing.

## Agent 04

### setNavOpenGroupCallback

This function receives a callback function with signature `(id: string) => void` as its parameter `fn` and assigns it to the module-level variable `_openGroup`. The assignment stores the callback for later use by other functions in the module. The function returns `void` and makes no other reads or writes.

### switchTab

This function reads the parameter `tab` and writes to module-level state by calling `setActiveTab(tab)`. It then queries the DOM for all elements matching `#lobby-tabs .tab-btn` and iterates through them with a forEach loop, toggling the `active` CSS class on each button based on whether the tab name at the corresponding index in the array `['discover', 'mine', 'leaderboard']` matches the `tab` parameter. It then selects three DOM elements by ID and sets their display style to `block` or `none` based on which tab matches. If `tab` equals `'mine'`, the function dynamically imports from `./groups.load.ts` and calls `loadMyGroups()` via `.then()` (async import). If `tab` equals `'leaderboard'`, it similarly imports and calls `loadLeaderboard()` asynchronously. The function itself is not declared as async and does not await the imports.

### switchDetailTab

This function reads the parameter `tab`, reads module-level state variables `currentGroupId` and `callerRole`, and writes to module-level state by calling `setActiveDetailTab(tab)`. It defines a local array `tabs` with the values `['hot-takes', 'challenges', 'members', 'auditions']`, then queries the DOM for elements matching `#detail-tabs .tab-btn` and iterates with forEach, toggling the `active` class on each button based on whether the tab name at the corresponding index matches the `tab` parameter. It then selects four DOM elements by ID and sets their display style to `block` or `none` according to which tab matches the parameter. After all DOM updates, there is a conditional branch: if `tab` equals `'auditions'` and `currentGroupId` is truthy, the function calls `loadPendingAuditions(currentGroupId, callerRole)` synchronously. The function itself is not async.

### filterCategory

This function reads the parameter `cat` (a string or null), reads the parameter `el` (an HTMLElement), and writes to module-level state by calling `setActiveCategory(cat)`. It queries the DOM for all elements matching `.cat-pill`, iterates through them with forEach, and removes the `active` CSS class from each. It then calls `el.classList.add('active')` to add the `active` class to the passed element. Finally, it dynamically imports from `./groups.load.ts` and calls `loadDiscover()` via `.then()` (async import). The function itself is not async and does not await the import.

### showLobby

This function reads no parameters and writes to module-level state by calling `setCurrentGroupId(null)` and `setCallerRole(null)`. It then selects two DOM elements by ID (`view-detail` and `view-lobby`), sets the display style of `view-detail` to `'none'`, and sets the display style of `view-lobby` to `'block'`. The function returns `void` and makes no other calls.

## Agent 05

### setNavOpenGroupCallback

This function receives a callback function `fn` of type `(id: string) => void` as a parameter and assigns it to the module-level variable `_openGroup`. It returns `void`. The function does not read from the DOM, module state, or external APIs, and it does not branch or loop.

### switchTab

This function receives a `tab` parameter of type `string` and first calls `setActiveTab(tab)` to update module-level state. It then queries all elements matching the selector `'#lobby-tabs .tab-btn'` and iterates through them, toggling the `'active'` class on each based on whether the tab string matches the corresponding index in the array `['discover', 'mine', 'leaderboard']`. Next, it unconditionally casts and sets the `style.display` property of three elements (`'tab-discover'`, `'tab-mine'`, `'tab-leaderboard'`) to either `'block'` or `'none'` depending on whether their ID matches the `tab` parameter. If `tab === 'mine'`, the function dynamically imports `'./groups.load.ts'` and calls the destructured `loadMyGroups()` function via `.then()` without awaiting. If `tab === 'leaderboard'`, it similarly imports and calls `loadLeaderboard()` without awaiting. The function returns `void`.

### switchDetailTab

This function receives a `tab` parameter of type `string` and calls `setActiveDetailTab(tab)` to update module-level state. It defines a local array `tabs = ['hot-takes', 'challenges', 'members', 'auditions']` and queries all elements matching `'#detail-tabs .tab-btn'`, iterating through them to toggle the `'active'` class based on whether `tabs[i]` matches the `tab` parameter. It then unconditionally casts and sets the `style.display` property of four elements (`'detail-hot-takes'`, `'detail-challenges'`, `'detail-members-list'`, `'detail-auditions'`) to either `'block'` or `'none'` based on whether their ID corresponds to the `tab` parameter. There is a conditional branch: if `tab === 'auditions'` and `currentGroupId` (a module-level state variable) is truthy, the function calls `loadPendingAuditions(currentGroupId, callerRole)` (where `callerRole` is also a module-level state variable) synchronously. The function returns `void`.

### filterCategory

This function receives a `cat` parameter of type `string | null` and an `el` parameter of type `HTMLElement`. It queries all elements matching the class selector `'.cat-pill'` and removes the `'active'` class from each. It then adds the `'active'` class to the `el` parameter. It calls `setActiveCategory(cat)` to update module-level state. Finally, it dynamically imports `'./groups.load.ts'` and calls the destructured `loadDiscover()` function via `.then()` without awaiting. The function returns `void`.

### showLobby

This function takes no parameters. It calls `setCurrentGroupId(null)` and `setCallerRole(null)` to update module-level state. It then unconditionally casts and sets the `style.display` property of two elements (`'view-detail'` to `'none'` and `'view-lobby'` to `'block'`). The function returns `void`.
