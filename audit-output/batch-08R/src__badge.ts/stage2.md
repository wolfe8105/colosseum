# Stage 2 Outputs — src/badge.ts

## Agent 01

### vgBadge

`vgBadge` accepts a single parameter `verified` typed as `boolean | null | undefined` and returns a `string`. It has no side effects: no DOM mutations, no network calls, no storage access, and no external function calls.

The function has two code paths determined entirely by the truthiness of `verified`. On the first path, if `verified` is `false`, `null`, or `undefined` — all falsy values — the condition `!verified` evaluates to `true` and the function immediately returns an empty string `''`. On the second path, if `verified` is `true` (the only remaining value the type allows), the condition is false and the function returns a string containing a self-closing `<span>` element. That span carries a `title` attribute of `"Verified Gladiator"`, an `aria-label` attribute of `"Verified Gladiator"`, inline styles setting `display:inline-block`, `margin-left:4px`, `font-size:0.9em`, `line-height:1`, `vertical-align:middle`, and `cursor:default`, a `class` of `vg-badge`, and inner content of the `🎖️` emoji character. The returned string is a raw HTML fragment intended for direct concatenation into template literals or `innerHTML` assignments; the function itself performs no insertion into the DOM.

## Agent 02

### vgBadge

`vgBadge` accepts a single parameter `verified` typed as `boolean | null | undefined` and always returns a `string`. It has no side effects: it performs no DOM mutations, makes no network calls, and touches no storage.

The function has exactly two code paths determined by a single truthiness check on `verified`. If `verified` is any falsy value — `false`, `null`, or `undefined` — the condition `!verified` evaluates to `true` and the function immediately returns an empty string `''`. This early return means the caller can safely concatenate the result without any conditional logic on their side. If `verified` is `true` (the only remaining value the type allows after ruling out all falsy cases), the condition `!verified` evaluates to `false`, the early return is skipped, and the function returns a string containing a self-contained `<span>` element. That span carries a `title` attribute of `"Verified Gladiator"`, an `aria-label` attribute of `"Verified Gladiator"`, inline styles setting `display` to `inline-block`, a left margin of `4px`, a `font-size` of `0.9em`, `line-height` of `1`, `vertical-align` of `middle`, and `cursor` of `default`, and a `class` attribute of `vg-badge`. The content of the span is the `🎖️` emoji character. This returned string is raw HTML intended for injection via `innerHTML` or template literal concatenation immediately after a rendered username.

## Agent 03

### vgBadge

`vgBadge` accepts a single parameter `verified` typed as `boolean | null | undefined` and returns a `string`. It has no side effects — it performs no DOM mutations, network calls, storage reads or writes, or calls to any external functions.

The function contains exactly two code paths determined by a single conditional check on `verified`. If `verified` is any falsy value — `false`, `null`, or `undefined` — the condition `!verified` evaluates to `true` and the function immediately returns an empty string `''`. This is the "unverified user" path. If `verified` is `true` — the only truthy value the parameter type admits — the condition `!verified` evaluates to `false` and the function falls through to the return statement on the next line. It returns a fixed, hard-coded HTML string containing a single `<span>` element. That span carries a `title` attribute of `"Verified Gladiator"`, an `aria-label` attribute of `"Verified Gladiator"`, inline styles setting `display` to `inline-block`, `margin-left` to `4px`, `font-size` to `0.9em`, `line-height` to `1`, `vertical-align` to `middle`, and `cursor` to `default`, a `class` attribute of `vg-badge`, and inner content of the medal emoji `🎖️`. This string is identical on every invocation where `verified` is `true` — no dynamic content is interpolated. The function holds no local state between calls. Every invocation is stateless and deterministic based solely on the truthiness of the `verified` argument.

## Agent 04

### vgBadge

`vgBadge` accepts a single parameter `verified` typed as `boolean | null | undefined` and returns a `string`. It has no side effects — no DOM mutations, no network calls, no storage reads or writes.

The function contains a single conditional branch. If `verified` is falsy — meaning it is `false`, `null`, or `undefined` — the early return fires immediately and the function returns an empty string `''`. This makes it safe to concatenate the return value unconditionally into any template, since an unverified user contributes nothing to the output. If `verified` is the boolean `true` (the only truthy value the type permits), the branch is not taken and the function returns a hard-coded HTML string. That string is a single `<span>` element carrying four attributes: `title="Verified Gladiator"`, `aria-label="Verified Gladiator"`, an inline `style` string that sets `display:inline-block`, a left margin of `4px`, `font-size:0.9em`, `line-height:1`, `vertical-align:middle`, and `cursor:default`, and a class of `vg-badge`. The content of the span is the `🎖️` emoji. The returned string is a plain JavaScript string; no DOM node is created by this function itself — rendering is left to the caller.

## Agent 05

### vgBadge

`vgBadge` accepts a single parameter `verified` typed as `boolean | null | undefined` and returns a `string`. It has no side effects — no DOM mutations, no network calls, no storage reads or writes, no external function calls.

The function has two code paths determined by a single truthiness check on `verified`. If `verified` is falsy — meaning it is `false`, `null`, or `undefined` — the condition `!verified` evaluates to `true` and the function immediately returns an empty string `''`. If `verified` is `true` (the only remaining truthy value given the declared type), the condition `!verified` evaluates to `false` and the function falls through to return a fixed string literal containing a `<span>` element. That string is `'<span title="Verified Gladiator" aria-label="Verified Gladiator" style="display:inline-block;margin-left:4px;font-size:0.9em;line-height:1;vertical-align:middle;cursor:default;" class="vg-badge">🎖️</span>'`. The span carries a tooltip via `title`, an accessibility label via `aria-label`, inline CSS that renders it as an inline block with a 4px left margin sized at 0.9em vertically centered, a `cursor:default` to suppress the text cursor, the class `vg-badge`, and the 🎖️ emoji as its text content. This string is never mutated; the function returns the same literal on every call where `verified` is truthy. The return value in both cases is a plain string, making it safe to concatenate into any template literal or string expression without a null check at the call site.
