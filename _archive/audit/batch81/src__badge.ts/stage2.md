# Stage 2 Outputs — badge.ts

## Agent 01

### vgBadge
The function accepts a boolean, null, or undefined parameter `verified`. If `verified` is falsy, it immediately returns an empty string. Otherwise, it returns a static string containing an HTML span element with inline styles and the shield emoji (🎖️) character. The span is configured with a title attribute for tooltip text, an aria-label for accessibility, inline CSS for sizing and positioning (4px left margin, 0.9em font size, middle vertical alignment, default cursor), a class name "vg-badge", and the emoji as text content. The function performs no state mutations, makes no external calls, contains no branching beyond the initial falsy check, and is synchronous.

## Agent 02

### vgBadge
When called, vgBadge reads its single parameter (a boolean, null, or undefined value indicating verification status) and returns a string. If the verified parameter is falsy, the function immediately returns an empty string. If verified is truthy, the function returns a complete inline HTML span element styled as a 0.9em badge with 4px left margin, centered vertical alignment, and containing the medal emoji (🎖️), along with title and aria-label attributes set to "Verified Gladiator". The function is synchronous and does not call any other functions or perform any I/O operations beyond string construction.

## Agent 03

### vgBadge
The function accepts a single parameter `verified` of type `boolean | null | undefined`. At runtime, it immediately checks the truthiness of the `verified` parameter; if it is falsy (false, null, or undefined), the function returns an empty string, terminating execution. If `verified` is truthy, the function returns an inline HTML string containing a `<span>` element with a medal emoji (🎖️), styled with inline CSS for proper alignment and spacing after a username (4px left margin, 0.9em font size, middle vertical alignment), along with accessibility attributes (`title` and `aria-label` set to "Verified Gladiator") and a CSS class `vg-badge`. The function is synchronous and does not use async/await.

## Agent 04

### vgBadge
When vgBadge is called synchronously with a boolean, null, or undefined parameter, it reads the verified argument and immediately returns either an empty string (if the value is falsy) or an inline HTML span element. The span element contains a medal emoji (🎖️) styled as a small badge with specific CSS properties (inline-block display, 4px left margin, 0.9em font size, and middle vertical alignment) and accessibility attributes (title and aria-label both set to "Verified Gladiator"). The function is not async and executes in a single synchronous pass, returning a string that can be safely concatenated after usernames regardless of verification status.

## Agent 05

### vgBadge
When vgBadge is called at runtime, it accepts a single `verified` parameter of type `boolean | null | undefined`. The function first checks if the verified parameter is falsy; if so, it immediately returns an empty string. Otherwise, it returns a complete span element containing the medal emoji (🎖️) with inline styles and attributes that position it as a small badge next to usernames. The function is synchronous and has no async operations—it simply performs a single conditional check and returns either an empty string or a pre-built HTML string.
