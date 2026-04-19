# Stage 2 Outputs — spectate.utils.ts

## Agent 01

### escHtml

`escHtml` accepts a single parameter `str` typed as `unknown`. If `str` is falsy — including `null`, `undefined`, `0`, an empty string, or `false` — it returns an empty string immediately. Otherwise it coerces the value to a string via `String(str)` and applies five sequential `replaceAll` substitutions in order: `&` to `&amp;`, `<` to `&lt;`, `>` to `&gt;`, `"` to `&quot;`, and `'` to `&#39;`. It returns the resulting escaped string. The function reads no module-level state, accesses no external state, performs no I/O, and is synchronous.

### parseAvatar

`parseAvatar` accepts two parameters: `avatarUrl`, typed as `string | null`, and `fallbackName`, a string. It reads no module-level state. If `avatarUrl` is truthy and begins with the prefix `'emoji:'`, it returns the object `{ type: 'emoji', value: avatarUrl.replace('emoji:', '') }`, where `value` is the substring of `avatarUrl` after that prefix is stripped. If either condition fails — `avatarUrl` is `null`, an empty string, or does not start with `'emoji:'` — the function falls through to the second branch and returns `{ type: 'initial', value: (fallbackName || '?')[0].toUpperCase() }`. In the fallback branch, if `fallbackName` is falsy the expression resolves to `'?'`, so `value` becomes `'?'`; otherwise `value` is the uppercase first character of `fallbackName`. The function is synchronous and has no side effects.

### renderAvatar

`renderAvatar` accepts `avatarUrl` (`string | null`), `name` (string), and `sideClass` (string). It calls `parseAvatar(avatarUrl, name)` and stores the result in `av`. If `av.type` is `'emoji'`, it calls `escHtml(av.value)` and returns the string `'<div class="vs-avatar emoji">'` concatenated with the escaped value and a closing `</div>`. If `av.type` is anything other than `'emoji'` — in practice `'initial'` — it calls `escHtml(av.value)` and returns `'<div class="vs-avatar '` concatenated with `sideClass`, a closing quote, `'>`, the escaped value, and `</div>`. The `sideClass` parameter is interpolated directly into the returned HTML string without escaping. The function is synchronous, reads no module-level state, and returns an HTML string in both branches.

### modeLabel

`modeLabel` accepts a single parameter `mode` typed as `string | null`. It constructs a `Record<string, string>` literal named `map` on every call, mapping four keys to display strings: `'live'` to `'🎙️ LIVE AUDIO'`, `'voicememo'` to `'🎤 VOICE MEMO'`, `'text'` to `'⌨️ TEXT'`, and `'ai'` to `'🤖 AI SPARRING'`. It then evaluates the expression `map[mode as string] || mode?.toUpperCase() || 'DEBATE'` and returns the result. If `mode` is a key present in `map`, the mapped display string is returned. If `mode` is a non-null string not in `map`, `mode.toUpperCase()` is returned. If `mode` is `null` or `undefined`, the optional chaining `mode?.toUpperCase()` yields `undefined`, and the final fallback `'DEBATE'` is returned. The function is synchronous and reads no external state.

### statusBadge

`statusBadge` accepts a single parameter `status` typed as `string | null`. It evaluates three strict equality checks in sequence. If `status === 'live'`, it returns the HTML string `'<span class="status-badge live"><span class="dot"></span> LIVE</span>'`. If `status === 'complete'` or `status === 'completed'`, it returns `'<span class="status-badge complete">COMPLETE</span>'`. If none of those branches match, it falls through to a default return that calls `escHtml(status?.toUpperCase() || 'UNKNOWN')` and wraps the result in `<span class="status-badge complete">`. In the default branch, if `status` is `null`, the optional chaining yields `undefined`, the `||` resolves to `'UNKNOWN'`, and `escHtml` receives the literal string `'UNKNOWN'`. If `status` is any other non-matching string, `status.toUpperCase()` is passed to `escHtml`. The function is synchronous, reads no module-level state, and returns an HTML string in every branch.

### timeAgo

`timeAgo` accepts a single parameter `ts` typed as `string | null`. If `ts` is falsy, it returns an empty string immediately. Otherwise it computes `diff` by reading `Date.now()`, constructing a `Date` from `ts`, subtracting the timestamps, dividing by 1000, and flooring to obtain elapsed seconds. If `diff < 60`, it returns `'now'`. If `diff < 3600`, it returns `Math.floor(diff / 60)` concatenated with `'m'`. Otherwise it returns `Math.floor(diff / 3600)` concatenated with `'h'`. No error path exists for an unparseable `ts` string; if `new Date(ts).getTime()` returns `NaN`, `diff` will be `NaN`, all comparisons will be false, and the function will return `NaN + 'h'` — the string `'NaNh'`. The function is synchronous.

---

## Agent 02

### escHtml

`escHtml` accepts a single parameter `str` typed as `unknown` and returns a `string`. It reads nothing beyond its parameter. If `str` is falsy (including `null`, `undefined`, `0`, empty string, or `false`), it returns the empty string immediately. Otherwise it coerces `str` to a string with `String(str)` and calls `replaceAll` five times in sequence, substituting `&` with `&amp;`, `<` with `&lt;`, `>` with `&gt;`, `"` with `&quot;`, and `'` with `&#39;`. The final transformed string is returned. There are no loops, no branches beyond the falsy guard, no error paths, and the function is synchronous.

### parseAvatar

`parseAvatar` accepts `avatarUrl` (`string | null`) and `fallbackName` (`string`) and returns a plain object with shape `{ type: string, value: string }`. If `avatarUrl` is truthy and begins with the literal prefix `'emoji:'`, it returns `{ type: 'emoji', value: avatarUrl.replace('emoji:', '') }`. In all other cases it falls through to the second branch, which accesses `(fallbackName || '?')[0].toUpperCase()`: if `fallbackName` is falsy the expression produces `'?'`, otherwise it takes the first character of `fallbackName` and uppercases it. The returned object has `type: 'initial'`. The function writes no state and is synchronous.

### renderAvatar

`renderAvatar` accepts `avatarUrl` (`string | null`), `name` (`string`), and `sideClass` (`string`) and returns a `string` of HTML markup. It calls `parseAvatar(avatarUrl, name)` first and stores the result in `av`. If `av.type` is `'emoji'`, it returns a `<div class="vs-avatar emoji">` element whose inner content is `av.value` passed through `escHtml`. If `av.type` is anything else (in practice `'initial'`), it returns a `<div>` with classes `"vs-avatar "` concatenated with `sideClass`, with the value passed through `escHtml`. In both branches `escHtml` is called exactly once. The function reads nothing beyond its parameters, writes no state, and is synchronous.

### modeLabel

`modeLabel` accepts a single `mode` parameter typed as `string | null` and returns a `string`. It constructs a local `Record<string, string>` literal mapping four keys — `'live'`, `'voicememo'`, `'text'`, and `'ai'` — to their display strings. It evaluates `map[mode as string]`. If that lookup yields a truthy value, that string is returned. If the lookup yields `undefined`, the expression falls to `mode?.toUpperCase()`. If `mode` is non-null, `toUpperCase()` is called and the result returned. If `mode` is `null`, optional chaining produces `undefined`, and the final fallback `'DEBATE'` is returned. The function writes no state and is synchronous.

### statusBadge

`statusBadge` accepts `status` typed as `string | null` and returns a `string` of HTML markup. It evaluates four sequential `if` checks. If `status` is exactly `'live'`, it returns a `<span class="status-badge live">` containing a nested `<span class="dot">` and the text ` LIVE`. If `status` is `'complete'` or `'completed'`, it returns a `<span class="status-badge complete">` containing `COMPLETE`. If `status` is `'voting'`, it returns a `<span class="status-badge voting">` containing `VOTING`. If none of those conditions match — including when `status` is `null` — it falls through to a default return: `escHtml(status?.toUpperCase() || 'UNKNOWN')` embedded in a `<span class="status-badge complete">`. The function writes no state and is synchronous.

### timeAgo

`timeAgo` accepts `ts` typed as `string | null` and returns a `string`. It reads the current wall-clock time via `Date.now()` and constructs a `Date` from `ts`. If `ts` is falsy, it returns the empty string immediately. It computes `diff` as the floor of `(Date.now() - new Date(ts).getTime()) / 1000`. If `diff < 60`, it returns `'now'`. If `diff < 3600`, it returns the floor of `diff / 60` appended with `'m'`. Otherwise it returns the floor of `diff / 3600` appended with `'h'`. There is no try/catch: if `ts` cannot be parsed by `Date`, `getTime()` returns `NaN`, all comparisons evaluate to `false`, and the function produces `'NaNh'`. The function writes no state and is synchronous.

---

## Agent 03

### escHtml

`escHtml` accepts a single parameter, `str`, typed as `unknown`. It reads no module-level state, no external state, no browser APIs, and performs no I/O. If `str` is falsy — including `null`, `undefined`, `0`, `false`, or an empty string — the function returns an empty string immediately via an early return. Otherwise it calls `String(str)` to coerce the input to a string, then chains five successive `replaceAll` calls in fixed order: `&` to `&amp;`, `<` to `&lt;`, `>` to `&gt;`, `"` to `&quot;`, and `'` to `&#39;`. The final escaped string is returned. There are no branches beyond the initial falsy guard, no loops, no try/catch, and no async behavior.

### parseAvatar

`parseAvatar` accepts two parameters: `avatarUrl` (a `string` or `null`) and `fallbackName` (a `string`). It first checks whether `avatarUrl` is truthy and begins with the literal prefix `'emoji:'`. If that condition is true, it returns `{ type: 'emoji', value: avatarUrl.replace('emoji:', '') }`. If false — because `avatarUrl` is `null` or does not start with `'emoji:'` — execution falls to: `{ type: 'initial', value: (fallbackName || '?')[0].toUpperCase() }`. This guards against an empty `fallbackName` by substituting `'?'` when falsy, then takes the first character uppercased. No other branches, no loops, no error paths.

### renderAvatar

`renderAvatar` accepts three parameters: `avatarUrl` (`string | null`), `name` (`string`), and `sideClass` (`string`). It is synchronous and returns an HTML string. It calls `parseAvatar(avatarUrl, name)` first. Based on `av.type`, it follows one of two branches. If `av.type` is `'emoji'`, it returns a `<div>` with the fixed class `"vs-avatar emoji"`, with inner content from `escHtml(av.value)`. Otherwise, it returns a `<div>` whose class is `"vs-avatar "` concatenated with `sideClass`, with inner content from `escHtml(av.value)`. In both branches `escHtml` is called to escape the avatar value.

### modeLabel

`modeLabel` accepts a single parameter, `mode` (`string | null`). At the start of the call body, a `Record<string, string>` literal is created mapping four keys — `'live'`, `'voicememo'`, `'text'`, and `'ai'` — to their label strings including emoji prefixes. The function returns `map[mode as string]` if that lookup yields a truthy value. If the lookup returns `undefined`, the expression falls through to `mode?.toUpperCase()`, which upper-cases the raw mode string if `mode` is non-null. If `mode` is `null` or `undefined`, the optional chain yields `undefined`, and the final fallback `'DEBATE'` is returned. The map object is allocated on every call.

### statusBadge

`statusBadge` accepts a single parameter, `status` (`string | null`). The function consists of three explicit equality checks followed by a default case. If `status === 'live'`, it returns a `<span>` with class `"status-badge live"` containing a nested `<span class="dot">` and the text `" LIVE"`. If `status === 'complete'` or `status === 'completed'`, it returns a `<span>` with class `"status-badge complete"` and the text `"COMPLETE"`. If `status === 'voting'`, it returns a `<span>` with class `"status-badge voting"` and the text `"VOTING"`. None of these branches calls `escHtml`. If none of the three explicit checks match, the default return builds `<span class="status-badge complete">` with content `escHtml(status?.toUpperCase() || 'UNKNOWN')`.

### timeAgo

`timeAgo` accepts a single parameter, `ts` (`string | null`). If `ts` is falsy, the function returns an empty string immediately. Otherwise it calls `Date.now()` for the current epoch millisecond timestamp and `new Date(ts).getTime()` to parse the input. The difference is divided by 1000 and floored to produce `diff`. Three threshold checks follow: if `diff < 60`, returns `'now'`; if `diff < 3600`, returns floored minutes concatenated with `'m'`; otherwise returns floored hours concatenated with `'h'`. There is no handling for invalid date strings — if `ts` is unparseable, `getTime()` returns `NaN`, arithmetic propagates `NaN`, and the function returns `'NaNh'`.

---

## Agent 04

### escHtml

`escHtml` accepts a single parameter `str` typed as `unknown`. It reads no module-level state. If `str` is falsy — including `null`, `undefined`, `0`, an empty string, or `false` — the function returns an empty string immediately. Otherwise it calls `String(str)` to coerce the value to a string, then chains five sequential `replaceAll` calls: `&` to `&amp;`, `<` to `&lt;`, `>` to `&gt;`, `"` to `&quot;`, and `'` to `&#39;`. The final escaped string is returned. The function is synchronous and has no side effects.

### parseAvatar

`parseAvatar` accepts two parameters: `avatarUrl` (a string or null) and `fallbackName` (a string). It reads no external state. If `avatarUrl` is truthy and begins with the prefix `'emoji:'`, the function strips that prefix via `replace('emoji:', '')` and returns a plain object `{ type: 'emoji', value: <stripped string> }`. In all other cases — `avatarUrl` is null, an empty string, or a non-emoji URL — it falls through to the second branch, returning `{ type: 'initial', value: <uppercase character> }` where the value is the first character of `fallbackName || '?'`, uppercased. The function is synchronous.

### renderAvatar

`renderAvatar` receives three parameters: `avatarUrl` (string or null), `name` (string), and `sideClass` (string). It calls `parseAvatar(avatarUrl, name)` and stores the result in `av`. If `av.type === 'emoji'`, it calls `escHtml(av.value)` and concatenates it into a fixed HTML string using the class `"vs-avatar emoji"`. Otherwise — for any non-emoji type — it calls `escHtml(av.value)` and concatenates it into an HTML string using the classes `"vs-avatar "` plus the caller-supplied `sideClass`. The function is synchronous, writes no state, and returns an HTML string in both branches.

### modeLabel

`modeLabel` receives a single parameter `mode` typed as string or null. It constructs a local `map` object literal keyed by the four known mode strings — `'live'`, `'voicememo'`, `'text'`, and `'ai'` — mapping each to a display string with an emoji prefix. It then evaluates `map[mode as string]`. If that lookup returns a truthy value, the mapped display string is returned. If the lookup returns `undefined`, the expression short-circuits to `mode?.toUpperCase()`, which uppercases the raw mode string if `mode` is non-null. If `mode` is null, `mode?.toUpperCase()` returns `undefined`, and the final fallback `'DEBATE'` is returned. The function is synchronous and has no side effects.

### statusBadge

`statusBadge` receives a single parameter `status` typed as string or null. It evaluates four conditions in sequence — each is an independent `if` that returns immediately when matched. If `status === 'live'`, it returns a hard-coded HTML span with classes `"status-badge live"` containing a nested `.dot` span and the text `" LIVE"`. If `status === 'complete'` or `status === 'completed'` (tested as a single `||` condition), it returns a hard-coded span with class `"status-badge complete"` and the text `"COMPLETE"`. If `status === 'voting'`, it returns a hard-coded span with class `"status-badge voting"` and the text `"VOTING"`. If none of the three prior conditions matched, the function falls through to the default return: a span with class `"status-badge complete"` whose text content is produced by calling `escHtml(status?.toUpperCase() || 'UNKNOWN')`. The function is synchronous and has no side effects.

### timeAgo

`timeAgo` receives a single parameter `ts` typed as string or null. It reads the browser's `Date.now()`. If `ts` is falsy, it returns the empty string immediately. Otherwise it constructs a `new Date(ts)`, calls `.getTime()`, subtracts from `Date.now()`, divides by 1000, and floors to get elapsed seconds in `diff`. If `diff < 60`, returns `'now'`; if `diff < 3600`, returns floored minutes concatenated with `'m'`; otherwise returns floored hours concatenated with `'h'`. If `new Date(ts)` produces an invalid Date, `getTime()` returns `NaN`, arithmetic propagates `NaN`, comparisons evaluate false, and the function returns the string `"NaNh"`. The function is synchronous and writes no state.

---

## Agent 05

### escHtml

`escHtml` receives a single parameter `str` typed as `unknown`. It reads no module-level state, no DOM, and no external APIs. If `str` is falsy — including `null`, `undefined`, `0`, `false`, or empty string — it returns the empty string immediately. Otherwise it calls `String(str)` to coerce the value to a string, then chains five `replaceAll` calls in sequence: `&` to `&amp;`, `<` to `&lt;`, `>` to `&gt;`, `"` to `&quot;`, and `'` to `&#39;`. The final escaped string is returned. The function is synchronous and has no side effects.

### parseAvatar

`parseAvatar` receives two parameters: `avatarUrl` (a string or null) and `fallbackName` (a string). It reads no external state. If `avatarUrl` is truthy and its first six characters are the literal prefix `"emoji:"`, the function strips that prefix via `replace('emoji:', '')` and returns a plain object `{ type: 'emoji', value: <stripped string> }`. In all other cases it falls through to the second branch: reads `fallbackName`, guards against empty-or-falsy with `(fallbackName || '?')`, takes the first character with `[0]`, uppercases it with `toUpperCase()`, and returns `{ type: 'initial', value: <uppercase character> }`. The function is synchronous and has no side effects.

### renderAvatar

`renderAvatar` receives three parameters: `avatarUrl` (string or null), `name` (string), and `sideClass` (string). It reads no external state. It calls `parseAvatar(avatarUrl, name)` first and stores the result in `av`. It then branches on `av.type`. If `av.type === 'emoji'`, it calls `escHtml(av.value)` and concatenates it into a fixed HTML string using the class `"vs-avatar emoji"`, returning that string. Otherwise — for any non-emoji type, in practice `'initial'` — it calls `escHtml(av.value)` and concatenates it into an HTML string using the classes `"vs-avatar "` plus the caller-supplied `sideClass`. The function is synchronous, writes no state, and returns an HTML string in both branches.

### modeLabel

`modeLabel` receives a single parameter `mode` typed as string or null. It reads no external state. It constructs a local `map` object literal keyed by the four known mode strings — `'live'`, `'voicememo'`, `'text'`, and `'ai'` — mapping each to a display string prefixed with an emoji. It evaluates `map[mode as string]`. If that lookup returns a truthy value, the mapped display string is returned. If the lookup returns `undefined`, the expression short-circuits to `mode?.toUpperCase()`, which uppercases the raw mode string if `mode` is non-null. If `mode` is null, `mode?.toUpperCase()` returns `undefined`, and the final fallback `'DEBATE'` is returned. The function is synchronous and has no side effects.

### statusBadge

`statusBadge` receives a single parameter `status` typed as string or null. It reads no external state. It evaluates four conditions in sequence — each is an independent `if` that returns immediately when matched. If `status === 'live'`, it returns a hard-coded HTML span with classes `"status-badge live"` containing a nested `.dot` span and the text `" LIVE"`. If `status === 'complete'` or `status === 'completed'` (tested as a single `||` condition), it returns a hard-coded span with class `"status-badge complete"` and the text `"COMPLETE"`. If `status === 'voting'`, it returns a hard-coded span with class `"status-badge voting"` and the text `"VOTING"`. If none of the three prior conditions matched, the function falls through to the default return: a span with class `"status-badge complete"` whose text content is produced by calling `escHtml(status?.toUpperCase() || 'UNKNOWN')`. The function is synchronous and has no side effects.

### timeAgo

`timeAgo` receives a single parameter `ts` typed as string or null. It reads the browser's `Date.now()` — a live wall-clock read at call time. If `ts` is falsy, it returns the empty string immediately. Otherwise it constructs a `new Date(ts)` from the input string, calls `.getTime()` on it to get a millisecond epoch value, subtracts that from `Date.now()`, divides by 1000, and floors the result to get elapsed seconds in `diff`. It then branches: if `diff` is less than 60, it returns the string `'now'`; if `diff` is less than 3600 (one hour), it returns the floored minutes as a number concatenated with `'m'`; otherwise it returns the floored hours concatenated with `'h'`. The function does not handle invalid date strings — if `new Date(ts)` produces an invalid Date, `getTime()` returns `NaN`, arithmetic propagates `NaN`, and the comparisons all evaluate false, causing the function to return the string `"NaNh"`. The function is synchronous and writes no state.
