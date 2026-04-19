# Stage 2 Outputs — leaderboard.ts

## Agent 01

### init

`init` is a synchronous function that takes no parameters. It reads the module-level `FEATURES` object imported from `./config.ts`, specifically the `FEATURES.leaderboard` flag. If that flag is falsy, the function returns immediately without doing anything further.

If the flag is truthy, the function creates a `MutationObserver` and attaches it to the DOM element with id `screen-leaderboard`. The observer is configured to watch only attribute mutations, filtered to the `class` attribute. Inside the observer callback, the function reads the DOM by calling `document.getElementById('screen-leaderboard')` again. It checks two conditions simultaneously: whether that element has the class `active` and whether its `children.length` is `0`. If both are true, the observer immediately calls `observer.disconnect()` to stop further observation, then calls `render()` synchronously (imported from `./leaderboard.render.ts`), and then calls `fetchLeaderboard()` (imported from `./leaderboard.fetch.ts`) followed by another `render()` call chained via `.then()`. The `fetchLeaderboard().then(...)` call is prefixed with `void`, making it fire-and-forget — the returned promise is not awaited and its rejection is not caught. The second `render()` call inside `.then()` runs asynchronously after `fetchLeaderboard()` resolves.

After constructing the observer, `init` performs a second `document.getElementById('screen-leaderboard')` lookup and, if that element exists, calls `observer.observe(screen, { attributes: true, attributeFilter: ['class'] })` to start watching. If the element does not exist at call time, the observer is created but never attached and never fires. The function returns `void` in all paths. There is no try/catch block.

---

## Agent 02

### init

`init` is a synchronous function that returns `void`. It first reads `FEATURES.leaderboard` from the imported config; if that flag is falsy, it returns immediately without doing anything further. When the flag is truthy, it constructs a `MutationObserver` whose callback queries `document.getElementById('screen-leaderboard')`, checks whether the found element both carries the CSS class `active` and has zero child nodes (`children.length === 0`), and if both conditions hold, calls `observer.disconnect()` to stop observing, calls `render()` synchronously (producing an immediate empty-state render), then fires `fetchLeaderboard()` as a floating async chain — the resolved value of the promise is passed to another call to `render()`, and the `void` prefix discards the returned promise so no rejection propagates to the caller. After setting up the observer callback, `init` reads `document.getElementById('screen-leaderboard')` a second time (independent of the first query inside the callback closure); if that element exists it calls `observer.observe(screen, { attributes: true, attributeFilter: ['class'] })`, restricting observation to class-attribute mutations. If the element does not exist at call time, `observe` is never called and the observer is silently inert. There is no try/catch around any of this; if `render()` throws or `fetchLeaderboard()` rejects, the error is swallowed by the `void` discard on the promise chain. `init` itself is called at module evaluation time via `ready.then(() => init())`, meaning it runs after the auth `ready` promise resolves.

---

## Agent 03

### init

`init` is a synchronous, void-returning function. It first reads `FEATURES.leaderboard` from the imported config module; if that flag is falsy, the function returns immediately without doing anything further. When the flag is truthy, it constructs a `MutationObserver` whose callback reads the DOM element with id `screen-leaderboard` and checks whether that element both has the CSS class `active` and has no child nodes (`children.length === 0`). When both conditions are true, the observer calls `observer.disconnect()` to stop watching, then calls `render()` synchronously to produce an immediate skeleton or placeholder render, and then calls `fetchLeaderboard()` — which is async — chaining a `.then()` that calls `render()` a second time once the fetch resolves; the promise is cast to void with `void`, so any rejection is silently discarded. After defining the observer, `init` reads `document.getElementById('screen-leaderboard')` a second time into the local variable `screen`; if that element exists, it calls `observer.observe(screen, { attributes: true, attributeFilter: ['class'] })` to begin watching for class attribute mutations. If the element does not exist at call time, `observe` is never called and the observer is inert. There is no error handling around the `fetchLeaderboard` promise, no explicit error path, and no interaction with the `ready` auth promise inside the function body — `ready.then(() => init())` is the module-level call site that defers `init` until auth state is resolved.

---

## Agent 04

### init

`init` is a synchronous function that returns `void`. It first reads `FEATURES.leaderboard` from the imported config; if that flag is falsy, the function returns immediately without doing anything else. When the flag is truthy, it constructs a `MutationObserver` whose callback reads the DOM element with id `screen-leaderboard` and checks two conditions on it: whether it carries the CSS class `active` and whether its `children.length` is zero. If both conditions are met inside the callback, the observer immediately calls its own `disconnect()` to stop further observations, then calls `render()` synchronously to paint a skeleton or empty state, and then calls `fetchLeaderboard()` asynchronously — the returned promise is cast to `void` and chained with `.then(() => render())` so that a second `render()` call fires after the fetch resolves. There is no `.catch()` on that promise chain, so a rejected `fetchLeaderboard()` is silently swallowed. After the observer is created, `init` reads the same `screen-leaderboard` element a second time; if the element exists in the DOM, `observer.observe` is called on it with `{ attributes: true, attributeFilter: ['class'] }`, limiting observations to class-attribute mutations. If the element is absent at call time, the observer is created but never attached and fires no callbacks. The function itself is not async; it is called as the resolution handler of the module-level `ready` promise (`ready.then(() => init())`), so it runs after auth initialization completes.

---

## Agent 05

### init

`init` is a synchronous function that returns `void`. It first reads `FEATURES.leaderboard` from the imported config; if that flag is falsy it returns immediately without further action. If the flag is set, it instantiates a `MutationObserver` whose callback reads the DOM element with id `screen-leaderboard`, checks whether that element both carries the CSS class `active` and has no child nodes (`children.length === 0`), and if both conditions are true, calls `observer.disconnect()` to stop observing, calls `render()` synchronously to paint a skeleton or empty state, then calls `fetchLeaderboard()` — which is async — and chains `.then(() => render())` so that `render()` is called a second time once the fetch resolves, refreshing the list with real data. If the element is found in the DOM at the time `init` runs, `observer.observe` is called on it with `{ attributes: true, attributeFilter: ['class'] }`, meaning the observer fires only when the element's `class` attribute changes. If `document.getElementById('screen-leaderboard')` returns `null`, the observer is created but never attached and never fires. There is no explicit error path on the `fetchLeaderboard()` promise — a rejection is silently swallowed because the `.then()` chain has no `.catch()` and the `void` operator discards the returned promise. The function is called once at module load time via the module-level expression `ready.then(() => init())`, meaning it does not execute until the auth `ready` promise resolves.
