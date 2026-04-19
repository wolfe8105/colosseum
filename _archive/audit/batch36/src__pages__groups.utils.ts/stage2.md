# Stage 2 Outputs — groups.utils.ts

## Agent 01

### clientRoleRank

This function is synchronous. It accepts a single parameter `role` typed as `string | null`. It runs a `switch` statement against the role value, returning the integer `1` for `'leader'`, `2` for `'co_leader'`, `3` for `'elder'`, and `4` for `'member'`. The `default` branch returns `99`, which covers both `null` and any unrecognized string. It reads no module-level state, performs no I/O, and makes no external calls. It returns a number on every code path with no early returns.

### assignableRoles

This function is synchronous. It accepts a single `role: string` parameter. It runs a `switch` statement and returns a `string[]` on every branch. The `'leader'` case returns the full four-element array `['leader', 'co_leader', 'elder', 'member']`. The `'co_leader'` case returns the two-element array `['elder', 'member']`. The `default` branch returns an empty array, covering any other role value including `'elder'` and `'member'`. It reads no module-level state, performs no I/O, and makes no external calls.

### roleLabel

This function is synchronous. It accepts a single `role: string` parameter. It runs a `switch` statement and returns a display string: `'Leader'` for `'leader'`, `'Co-Leader'` for `'co_leader'`, `'Elder'` for `'elder'`, `'Member'` for `'member'`. The `default` branch returns the raw `role` argument unchanged, so any unrecognized string is passed through as-is. It reads no module-level state, performs no I/O, and makes no external calls.

### renderEmpty

This function is synchronous. It accepts three `string` parameters: `icon`, `title`, and `sub`. It calls `escapeHTML` (imported from `../config.ts`) on each of `icon` and `title` unconditionally, and on `sub` only if `sub` is truthy — when `sub` is falsy the `empty-sub` div is omitted entirely from the output. The function returns a single interpolated HTML string containing a `div.empty-state` wrapper with nested `div.empty-icon` and `div.empty-title` elements, plus a conditional `div.empty-sub`. It writes nothing to the DOM, reads no module-level state, and makes no further calls beyond `escapeHTML`.

### renderGroupList

This function is synchronous. It accepts five parameters: `containerId: string`, `groups: GroupListItem[]`, `showRole: boolean` (defaults to `false`), `showRank: boolean` (defaults to `false`), and `onGroupClick: (groupId: string) => void`.

It begins by calling `document.getElementById(containerId)` and storing the result in `el`. If `el` is `null` it returns immediately with no further action. If `groups.length === 0` it sets `el.innerHTML` to the output of `renderEmpty` called with hardcoded strings `'👥'`, `'No groups here yet'`, and `'Be the first to create one'`, then returns.

For non-empty `groups`, it aliases `escapeHTML` as the local constant `esc`. It calls `groups.map()` to produce an array of HTML strings — one per `GroupListItem`. Inside the map callback, it looks up the category display label by indexing `CATEGORY_LABELS` (imported from `./groups.state.ts`) with `g.category` cast to `keyof typeof CATEGORY_LABELS`. If the lookup returns a falsy value or `g.category` is absent, it falls back to `esc(g.category || 'General')`. The `roleHtml` local variable is set to a `span.my-role-badge` element only when both `showRole` is `true` and `g.role` is truthy; otherwise it is the empty string. All user-supplied string fields (`g.id`, `g.avatar_emoji`, `g.name`, `g.description`, `g.role`) are passed through `esc` before insertion into `innerHTML`. The numeric fields `g.member_count`, `g.rank`, and `g.elo_rating` are each coerced with `Number.parseInt(String(...), 10)`, with `|| 0`, `|| (i + 1)`, and `|| 1000` as respective fallbacks. The `rank` div is rendered only when `showRank` is `true`. The mapped array is joined to a single string and assigned to `el.innerHTML`.

After setting `innerHTML`, the function queries all `.group-card[data-group-id]` elements within `el` using `querySelectorAll` and iterates them with `forEach`. For each card it attaches a `'click'` event listener. The listener reads `dataset.groupId` from the card, coercing a missing value to `''` via `?? ''`, and passes it to `onGroupClick`. The function returns `void` and calls no RPCs or async operations.

## Agent 02

### clientRoleRank

`clientRoleRank` is a synchronous function that accepts a single `role` argument typed as `string | null` and returns a `number`. It runs a `switch` statement over the four recognized role strings: `'leader'` returns `1`, `'co_leader'` returns `2`, `'elder'` returns `3`, `'member'` returns `4`. Any other value — including `null` and unrecognized strings — falls through to the `default` branch, which returns `99`. The function reads no module-level state, calls no other functions, performs no side effects, and has no early return path before the `switch`.

### assignableRoles

`assignableRoles` is a synchronous function that accepts a single `role` string and returns a `string[]`. It runs a `switch` over the caller's role. If the caller is `'leader'`, it returns all four roles `['leader', 'co_leader', 'elder', 'member']`. If the caller is `'co_leader'`, it returns `['elder', 'member']`. Any other value falls through to `default` and returns an empty array `[]`. The function reads no module-level state, calls no other functions, and has no side effects.

### roleLabel

`roleLabel` is a synchronous function that accepts a single `role` string and returns a `string`. It runs a `switch` over four known role strings: `'leader'` returns `'Leader'`, `'co_leader'` returns `'Co-Leader'`, `'elder'` returns `'Elder'`, `'member'` returns `'Member'`. Any other value falls through to `default`, which returns the original `role` argument unchanged. The function reads no module-level state and calls no other functions.

### renderEmpty

`renderEmpty` is a synchronous function that accepts three strings — `icon`, `title`, and `sub` — and returns an HTML string. It calls `escapeHTML` (imported from `../config.ts`) on each of the three arguments before interpolating them. The `sub` parameter is conditionally included: if it is a truthy string, a `<div class="empty-sub">` element is appended; if falsy, that element is omitted entirely. The function writes nothing to the DOM directly and has no side effects; it only constructs and returns the HTML string.

### renderGroupList

`renderGroupList` is a synchronous function that accepts a `containerId` string, a `groups` array of `GroupListItem`, two optional booleans `showRole` (default `false`) and `showRank` (default `false`), and an `onGroupClick` callback of type `(groupId: string) => void`. It returns `void`.

It first calls `document.getElementById(containerId)` and assigns the result to `el`. If `el` is `null`, the function returns immediately with no further action. If `groups.length === 0`, it sets `el.innerHTML` to the result of `renderEmpty('👥', 'No groups here yet', 'Be the first to create one')` and returns.

When the array is non-empty, a local alias `esc` is assigned to `escapeHTML`. The function maps over the `groups` array. For each entry `g` at index `i`, it resolves a `catLabel` by looking up `g.category` as a key in `CATEGORY_LABELS` (imported from `./groups.state.ts`); if the lookup produces no value, it falls back to `esc(g.category || 'General')`. It conditionally builds a `roleHtml` string: if `showRole` is `true` and `g.role` is truthy, it produces a `<span>` badge with the escaped role; otherwise `roleHtml` is an empty string. For the member count, rank, and ELO fields, it applies `Number.parseInt(String(...), 10)` with an `|| 0` or `|| 1000` fallback. The `showRank` boolean gates whether a rank `<div>` appears in the ELO column. The `description` field is conditionally rendered only when truthy. All user-supplied string values are passed through `esc` before insertion. The mapped strings are joined and written to `el.innerHTML` as a single assignment.

After setting `innerHTML`, the function queries all `.group-card[data-group-id]` elements within `el` using `querySelectorAll` and attaches a `'click'` event listener to each. The click handler reads `dataset.groupId` from the clicked element (falling back to `''` if absent) and invokes the `onGroupClick` callback with that value. No cleanup or `destroy()` path is present for these listeners.

## Agent 03

### clientRoleRank

`clientRoleRank` is a synchronous function. It receives a single parameter `role` typed as `string | null`. It reads no module-level state and writes nothing to the DOM or any external variable. It evaluates `role` in a `switch` statement against four string literals — `'leader'`, `'co_leader'`, `'elder'`, `'member'` — returning the integers 1, 2, 3, and 4 respectively. Any other value, including `null`, falls to the `default` branch and returns 99. There are no loops, no calls to other functions, and no early returns beyond what the `switch` provides.

### assignableRoles

`assignableRoles` is a synchronous function. It receives a single parameter `role` typed as `string`. It reads no module-level state. It evaluates `role` in a `switch` statement against two string literals. When `role` is `'leader'`, it returns the array `['leader', 'co_leader', 'elder', 'member']`. When `role` is `'co_leader'`, it returns `['elder', 'member']`. Every other value falls to `default` and returns an empty array `[]`. There are no loops, no external calls, and no mutations.

### roleLabel

`roleLabel` is a synchronous function. It receives a single parameter `role` typed as `string`. It reads no module-level state. It evaluates `role` in a `switch` statement against four literals — `'leader'`, `'co_leader'`, `'elder'`, `'member'` — returning the display strings `'Leader'`, `'Co-Leader'`, `'Elder'`, and `'Member'` respectively. Any unrecognised value falls to `default` and returns the raw `role` argument unchanged.

### renderEmpty

`renderEmpty` is a synchronous function. It receives three parameters: `icon`, `title`, and `sub`, all strings. It calls `escapeHTML` (imported from `../config.ts`) on each of `icon`, `title`, and `sub` before interpolating them into a template literal. The `sub` parameter is tested in a ternary: when it is a non-empty truthy string, a `<div class="empty-sub">` element is included in the output; when it is falsy, that element is omitted. The function returns the composed HTML string. It writes nothing to the DOM and reads no module-level state.

### renderGroupList

`renderGroupList` is a synchronous function. It receives five parameters: `containerId` (string), `groups` (array of `GroupListItem`), `showRole` (boolean, default `false`), `showRank` (boolean, default `false`), and `onGroupClick` (a callback accepting a `groupId` string).

It first calls `document.getElementById(containerId)` and stores the result in `el`. If `el` is `null`, the function returns immediately without doing anything further. If `groups.length === 0`, it sets `el.innerHTML` to the result of calling `renderEmpty` with a hard-coded icon, title, and subtitle string, then returns.

When `groups` is non-empty, the function creates a local alias `esc` pointing to `escapeHTML`. It then calls `groups.map()` to build one HTML string per item. Inside the map callback, it reads `CATEGORY_LABELS` (imported from `./groups.state.ts`) to look up a localised category label for `g.category`; if the lookup yields `undefined`, it falls back to `esc(g.category || 'General')`. The `showRole` flag and the truthiness of `g.role` together gate inclusion of a role badge span. The `showRank` flag gates inclusion of a rank `<div>`. Three numeric fields — `g.member_count`, `g.rank`, and `g.elo_rating` — are each coerced via `Number.parseInt(String(...), 10)`; if the parse returns `NaN`, they fall back to `0`, `(i + 1)`, and `1000` respectively. All user-sourced string fields pass through `esc` before interpolation.

After joining the mapped strings, the function sets `el.innerHTML` to the result in one assignment. It then calls `el.querySelectorAll('.group-card[data-group-id]')` and iterates over the returned `NodeList` with `forEach`, attaching a `'click'` event listener to each card. Each listener reads `dataset.groupId` from the clicked card element (with a nullish coalesce to `''`) and calls `onGroupClick` with that value. The function returns `void`.

## Agent 04

### clientRoleRank

Not async. Takes a single `role` parameter typed as `string | null`. Reads nothing from module-level state. Returns a `number` via a `switch` statement with five branches: `'leader'` returns `1`, `'co_leader'` returns `2`, `'elder'` returns `3`, `'member'` returns `4`, and the `default` branch — covering `null` and any unrecognized string — returns `99`. Calls nothing. Writes nothing. Has no loops and no early returns outside the switch.

### assignableRoles

Not async. Takes a single `role` parameter typed as `string`. Reads nothing from module-level state. Returns a `string[]` via a `switch` with three branches: `'leader'` returns all four role strings `['leader', 'co_leader', 'elder', 'member']`; `'co_leader'` returns `['elder', 'member']`; the `default` branch returns an empty array. Calls nothing. Writes nothing.

### roleLabel

Not async. Takes a single `role` parameter typed as `string`. Reads nothing from module-level state. Returns a `string` via a `switch` with five branches: `'leader'` returns `'Leader'`, `'co_leader'` returns `'Co-Leader'`, `'elder'` returns `'Elder'`, `'member'` returns `'Member'`, and the `default` branch returns the raw input `role` unchanged. Calls nothing. Writes nothing.

### renderEmpty

Not async. Takes three `string` parameters: `icon`, `title`, and `sub`. Calls `escapeHTML` on each of `icon` and `title` unconditionally. The `sub` parameter has a conditional branch: if `sub` is truthy, a `<div class="empty-sub">` element containing `escapeHTML(sub)` is interpolated into the template; if `sub` is falsy, that div is omitted entirely. Returns a single template-literal string. Writes nothing to the DOM. Calls nothing else and reads no module-level state.

### renderGroupList

Not async. Takes five parameters: `containerId` (string), `groups` (array of `GroupListItem`), `showRole` (boolean, defaults to `false`), `showRank` (boolean, defaults to `false`), and `onGroupClick` (a callback typed `(groupId: string) => void`).

Reads `CATEGORY_LABELS` from module-level state imported from `./groups.state.ts`. Calls `document.getElementById(containerId)` and stores the result in `el`. If `el` is `null`, the function returns immediately. If `groups.length === 0`, it sets `el.innerHTML` to the output of `renderEmpty('👥', 'No groups here yet', 'Be the first to create one')` and returns.

Otherwise, it assigns `escapeHTML` to the local alias `esc`, then calls `groups.map()` to produce an HTML string for each `GroupListItem`. Inside the map callback, it resolves `catLabel` by looking up `g.category` in `CATEGORY_LABELS`, falling back to `esc(g.category || 'General')` if the lookup yields `undefined`. It conditionally builds `roleHtml`: if `showRole` is true and `g.role` is truthy, it produces a `<span>` with the role uppercased and escaped; otherwise `roleHtml` is an empty string. The `member_count` and `elo_rating` fields are both cast via `Number.parseInt(String(...), 10)` with `|| 0` and `|| 1000` fallbacks. The `rank` field is similarly cast with a fallback to `i + 1`. The `showRank` flag controls whether the rank `<div>` is rendered. All user-supplied string fields pass through `esc`. The mapped strings are joined with `''` and assigned to `el.innerHTML`.

After the innerHTML assignment, the function calls `el.querySelectorAll('.group-card[data-group-id]')` and iterates over the result with `forEach`, attaching a `'click'` event listener to each card. Each listener reads `(card as HTMLElement).dataset.groupId`, defaulting to `''` if undefined, and passes that value to `onGroupClick`. Returns `void`.

## Agent 05

### clientRoleRank

`clientRoleRank` accepts a single `role` argument typed as `string | null`. Reads no module-level state and calls no other functions. Runs a `switch` statement over four string literals — `'leader'`, `'co_leader'`, `'elder'`, `'member'` — returning the integers `1`, `2`, `3`, `4` respectively. Any value that does not match, including `null`, falls to `default` and returns `99`. Synchronous, no side effects.

### assignableRoles

`assignableRoles` accepts a single `role` argument typed as `string`. Reads no module-level state and calls no other functions. Runs a `switch` statement over two string literals: `'leader'` returns `['leader', 'co_leader', 'elder', 'member']`; `'co_leader'` returns `['elder', 'member']`. Any other value falls to `default` and returns `[]`. Synchronous, no side effects.

### roleLabel

`roleLabel` accepts a single `role` argument typed as `string`. Reads no module-level state and calls no other functions. Runs a `switch` statement over four string literals — `'leader'`, `'co_leader'`, `'elder'`, `'member'` — returning `'Leader'`, `'Co-Leader'`, `'Elder'`, `'Member'` respectively. Any unmatched value falls to `default` and returns the raw `role` argument unchanged. Synchronous, no side effects.

### renderEmpty

`renderEmpty` accepts three arguments: `icon`, `title`, and `sub`, all typed as `string`. Calls `escapeHTML` on each of `icon` and `title` unconditionally. The `sub` parameter is tested in a ternary: if truthy, a `<div class="empty-sub">` element is generated with `escapeHTML(sub)` as its content; if falsy, that element is omitted entirely. Returns a single HTML string. Writes nothing to the DOM. Synchronous.

### renderGroupList

`renderGroupList` accepts five arguments: `containerId` (string), `groups` (array of `GroupListItem`), `showRole` (boolean, defaults to `false`), `showRank` (boolean, defaults to `false`), and `onGroupClick` (a callback typed `(groupId: string) => void`). Returns `void`. Synchronous.

First calls `document.getElementById(containerId)` and assigns the result to `el`. If `el` is `null`, returns immediately. If `groups.length === 0`, calls `renderEmpty` with hardcoded strings `'👥'`, `'No groups here yet'`, and `'Be the first to create one'`, assigns the result to `el.innerHTML`, and returns.

If `groups` is non-empty, creates a local alias `esc` pointing at `escapeHTML`. Calls `.map()` on `groups`, producing an HTML string for each `GroupListItem`. Inside the map callback, `CATEGORY_LABELS` (imported from `./groups.state.ts`) is indexed by `g.category`; if the lookup is falsy or `g.category` is absent, it falls back to `esc(g.category || 'General')`. The `roleHtml` variable is set to a `<span>` element only when both `showRole` is truthy and `g.role` is truthy; otherwise it is an empty string. Numeric fields `g.member_count`, `g.rank`, and `g.elo_rating` are each cast through `Number.parseInt(String(...), 10)` with fallback values (`0`, `i + 1`, and `1000`) via `||`. The `showRank` flag controls whether the rank `<div>` element is rendered. All user-supplied string fields pass through `escapeHTML`. The joined HTML string is assigned to `el.innerHTML`.

After the `innerHTML` assignment, calls `el.querySelectorAll('.group-card[data-group-id]')` and iterates the resulting `NodeList` with `forEach`. For each matching element attaches a `'click'` event listener. When fired, the listener reads `(card as HTMLElement).dataset.groupId`, falling back to `''` via `??`, and passes the value to `onGroupClick`.
