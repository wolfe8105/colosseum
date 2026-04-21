# Stage 2 Outputs — api/profile.helpers.js

## Agent 01

### escapeHtml

The function reads a single string parameter `str`. It returns an empty string if the parameter is falsy. Otherwise, it applies a chain of four `.replace()` calls to the input string, performing literal character replacements in sequence: ampersands become `&amp;`, less-than signs become `&lt;`, greater-than signs become `&gt;`, double quotes become `&quot;`, and single quotes become `&#039;`. The function performs no I/O, accesses no external state, and does not call any other functions. The return value is the escaped string.

### sanitizeAvatarUrl

The function reads a single string parameter `url`. It returns `null` if the parameter is falsy. It tests the URL against a case-insensitive regex pattern to check whether it starts with `https://`. If the test passes, the function returns the original `url` parameter unchanged. If the test fails, the function returns `null`. No other functions are called, and no external state is accessed or modified.

### getRankTier

The function reads a single numeric parameter `elo`. It compares `elo` against four threshold values (1800, 1500, 1300, 1100) in descending order, evaluating each condition left-to-right with early return on the first match. If `elo` is 1800 or greater, it returns an object with `name: 'Legendary'`, `color: '#d4a843'`, and `icon: '👑'`. If `elo` is 1500 or greater (but below 1800), it returns `{ name: 'Champion', color: '#d4a843', icon: '⚔️' }`. If `elo` is 1300 or greater (but below 1500), it returns `{ name: 'Contender', color: '#7aa3d4', icon: '🛡️' }`. If `elo` is 1100 or greater (but below 1300), it returns `{ name: 'Gladiator', color: '#5b8abf', icon: '⚡' }`. For all other values of `elo` (below 1100), the function returns `{ name: 'Rookie', color: '#a0a8b8', icon: '🏛️' }`. No functions are called, and no state is accessed or modified.

### formatDate

The function reads a single parameter `dateStr` that is expected to be a date string. If `dateStr` is falsy, the function returns the string `'Unknown'`. Otherwise, it constructs a new `Date` object by passing `dateStr` to the `Date` constructor. It then calls the `toLocaleDateString()` method on the constructed date object with the locale `'en-US'` and options `{ month: 'short', year: 'numeric' }`. The return value is the formatted date string, for example `'Jan 2026'`. No other functions are called, and no external state is accessed.

### getInitials

The function reads two string parameters, `displayName` and `username`. It selects the first truthy value from the sequence `displayName`, `username`, or the fallback string `'?'`, storing the result in a local variable `name`. It then calls `charAt(0)` on `name` to retrieve the first character, applies `toUpperCase()` to that character, and returns the result. The return value is a single uppercase letter or character, or `'?'` if both input parameters are falsy. No other functions are called, and no state is accessed or modified.

### parseEmojiAvatar

The function reads a single parameter `avatarUrl`. If `avatarUrl` is falsy or its type is not `'string'`, the function returns `null`. It then calls `startsWith('emoji:')` on the parameter. If the result is true, the function calls `slice(6)` on `avatarUrl` to remove the first six characters, and returns the substring. If `startsWith()` returns false, the function returns `null`. The function performs no I/O and calls no other functions. The return value is either a substring without the `'emoji:'` prefix, or `null`.

## Agent 02

### escapeHtml

Reads the `str` parameter. Returns an empty string if `str` is falsy. Otherwise, applies four consecutive string replace operations in order: replaces all `&` with `&amp;`, all `<` with `&lt;`, all `>` with `&gt;`, all `"` with `&quot;`, and all `'` with `&#039;`. Returns the escaped string. This function has no external state access, no module-level state, and no side effects.

### sanitizeAvatarUrl

Reads the `url` parameter. Returns `null` if `url` is falsy. Tests whether `url` matches the regex pattern `/^https:\/\//i` (case-insensitive check for `https://` prefix). If the pattern matches, returns `url` unchanged. If the pattern does not match, returns `null`. This function has no external state access, no module-level state, and no side effects.

### getRankTier

Reads the `elo` parameter. Evaluates a sequence of conditional branches in order: if `elo >= 1800`, returns `{ name: 'Legendary', color: '#d4a843', icon: '👑' }`; if `elo >= 1500`, returns `{ name: 'Champion', color: '#d4a843', icon: '⚔️' }`; if `elo >= 1300`, returns `{ name: 'Contender', color: '#7aa3d4', icon: '🛡️' }`; if `elo >= 1100`, returns `{ name: 'Gladiator', color: '#5b8abf', icon: '⚡' }`; if none hold, returns `{ name: 'Rookie', color: '#a0a8b8', icon: '🏛️' }`. This function has no external state access, no module-level state, and no side effects.

### formatDate

Reads the `dateStr` parameter. Returns the string `'Unknown'` if `dateStr` is falsy. Otherwise, constructs a `Date` object by calling `new Date(dateStr)` and stores it in `d`. Calls `d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })` to format the date in US English with abbreviated month and full year, then returns the formatted string. This function has no external state access, no module-level state, and no side effects.

### getInitials

Reads the `displayName` and `username` parameters. Assigns the value of `displayName` to the variable `name` if truthy, otherwise assigns `username` if truthy, otherwise assigns `'?'`. Calls `name.charAt(0)` to retrieve the first character, then calls `toUpperCase()` on that character and returns the result. This function has no external state access, no module-level state, and no side effects.

### parseEmojiAvatar

Reads the `avatarUrl` parameter. Returns `null` if `avatarUrl` is falsy. Returns `null` if `avatarUrl` is not a string (via `typeof avatarUrl !== 'string'`). Tests whether `avatarUrl` starts with the string `'emoji:'` using `avatarUrl.startsWith('emoji:')`; if true, calls `avatarUrl.slice(6)` to extract the substring from index 6 onward and returns it. If `avatarUrl` does not start with `'emoji:'`, returns `null`. This function has no external state access, no module-level state, and no side effects.

## Agent 03

### escapeHtml

This function reads a string parameter. If the parameter is falsy, it returns an empty string. Otherwise, it applies the `replace` method four times in sequence: first replacing all `&` with `&amp;`, then all `<` with `&lt;`, then all `>` with `&gt;`, then all `"` with `&quot;`, and finally all `'` with `&#039;`. It returns the result of these chained replacements.

### sanitizeAvatarUrl

This function reads a URL parameter. If the parameter is falsy, it returns null. If the parameter is truthy, it tests it against the regex `/^https:\/\//i` (case-insensitive check for a URL beginning with "https://"). If the test succeeds, it returns the original URL unchanged. If the test fails, it returns null.

### getRankTier

This function reads an elo parameter and performs a series of conditional checks in order. If elo is greater than or equal to 1800, it returns an object with name "Legendary", color "#d4a843", and icon "👑". If elo is greater than or equal to 1500, it returns an object with name "Champion", color "#d4a843", and icon "⚔️". If elo is greater than or equal to 1300, it returns an object with name "Contender", color "#7aa3d4", and icon "🛡️". If elo is greater than or equal to 1100, it returns an object with name "Gladiator", color "#5b8abf", and icon "⚡". If none of the preceding conditions match, it returns an object with name "Rookie", color "#a0a8b8", and icon "🏛️".

### formatDate

This function reads a dateStr parameter. If the parameter is falsy, it returns the string "Unknown". If the parameter is truthy, it constructs a Date object from the parameter, then calls `toLocaleDateString` on that object with locale "en-US" and options specifying month as "short" and year as "numeric", and returns the result.

### getInitials

This function reads a displayName parameter and a username parameter. It evaluates the expression `displayName || username || '?'` to determine the name variable. It calls `charAt(0)` on the name variable to get the first character, then calls `toUpperCase` on that character, and returns the result.

### parseEmojiAvatar

This function reads an avatarUrl parameter. If the parameter is falsy or its type is not "string", it returns null. If the parameter is truthy and is a string, it tests whether the string begins with "emoji:" using the `startsWith` method. If it does, it calls `slice(6)` on the parameter to remove the first six characters and returns the result. If the string does not start with "emoji:", it returns null.

## Agent 04

### escapeHtml

Reads a string parameter `str`. If the string is falsy, returns an empty string immediately. Otherwise, applies four string replacements in sequence via the `replace()` method with global regex flags: `&` becomes `&amp;`, `<` becomes `&lt;`, `>` becomes `&gt;`, `"` becomes `&quot;`, and `'` becomes `&#039;`. Returns the escaped string. The function is synchronous and performs no I/O or external calls.

### sanitizeAvatarUrl

Reads a URL string parameter `url`. If the URL is falsy, returns `null`. Otherwise, tests the URL against a case-insensitive regex pattern `/^https:\/\//i` to check if it starts with `https://`. If the test passes, returns the URL unchanged. If the test fails, returns `null`. The function is synchronous and performs no I/O or external calls.

### getRankTier

Reads a numeric parameter `elo` representing an ELO rating. Evaluates a chain of four conditional branches, each with an integer threshold. If `elo >= 1800`, returns `{ name: 'Legendary', color: '#d4a843', icon: '👑' }`. If `elo >= 1500`, returns `{ name: 'Champion', color: '#d4a843', icon: '⚔️' }`. If `elo >= 1300`, returns `{ name: 'Contender', color: '#7aa3d4', icon: '🛡️' }`. If `elo >= 1100`, returns `{ name: 'Gladiator', color: '#5b8abf', icon: '⚡' }`. If none of these conditions are met, returns `{ name: 'Rookie', color: '#a0a8b8', icon: '🏛️' }`. The function is synchronous and performs no I/O or external calls.

### formatDate

Reads a date string parameter `dateStr`. If the string is falsy, returns the literal string `'Unknown'`. Otherwise, constructs a new `Date` object by passing `dateStr` to the `Date` constructor. Calls the `toLocaleDateString()` method on that Date object with locale `'en-US'` and options `{ month: 'short', year: 'numeric' }`. Returns this formatted string. The function is synchronous and performs no I/O or external calls.

### getInitials

Reads two string parameters: `displayName` and `username`. Evaluates the logical OR expression `displayName || username || '?'` to select the first truthy value, assigning it to the local variable `name`. Calls the `charAt(0)` method on `name` to extract the first character, then calls `toUpperCase()` on that character to convert it to uppercase. Returns the uppercase character. The function is synchronous and performs no I/O or external calls.

### parseEmojiAvatar

Reads the input parameter `avatarUrl`. Returns `null` if `avatarUrl` is falsy or if `typeof avatarUrl !== 'string'`. If `avatarUrl` is a string, calls `.startsWith('emoji:')` to test if it begins with the prefix `'emoji:'`. If the test succeeds, calls `.slice(6)` to remove the first six characters and returns the resulting substring. If the test fails, returns `null`. The function is synchronous and performs no I/O or external calls.

## Agent 05

### escapeHtml

Reads the input parameter `str` and returns an empty string if it is falsy. If `str` is truthy, applies four sequential string replacements via `.replace()` in this order: replaces all `&` characters with `&amp;`, then all `<` with `&lt;`, then all `>` with `&gt;`, then all `"` with `&quot;`, then all `'` with `&#039;`. Returns the resulting escaped string. No external state is read or written. No other functions are called.

### sanitizeAvatarUrl

Reads the input parameter `url` and returns `null` if it is falsy. If `url` is truthy, tests it against the regex `/^https:\/\//i` (case-insensitive match for `https://` at the start). If the regex matches, returns `url` unchanged. If the regex does not match, returns `null`. No external state is read or written. No other functions are called.

### getRankTier

Reads the input parameter `elo` and performs four sequential numeric comparisons. Returns different objects based on which threshold `elo` meets: if `elo >= 1800`, returns `{ name: 'Legendary', color: '#d4a843', icon: '👑' }`. If `elo >= 1500` (but not 1800), returns `{ name: 'Champion', color: '#d4a843', icon: '⚔️' }`. If `elo >= 1300` (but not 1500), returns `{ name: 'Contender', color: '#7aa3d4', icon: '🛡️' }`. If `elo >= 1100` (but not 1300), returns `{ name: 'Gladiator', color: '#5b8abf', icon: '⚡' }`. If `elo` is below 1100, returns `{ name: 'Rookie', color: '#a0a8b8', icon: '🏛️' }`. No external state is read or written. No other functions are called.

### formatDate

Reads the input parameter `dateStr` and returns the string `'Unknown'` if it is falsy. If `dateStr` is truthy, constructs a `Date` object by passing `dateStr` to the `Date` constructor. Calls `.toLocaleDateString()` on the constructed date with the locale `'en-US'` and an options object specifying `month: 'short'` and `year: 'numeric'`. Returns the resulting formatted string. No external state is read or written. No other functions are called.

### getInitials

Reads the input parameters `displayName` and `username`. Uses the logical OR operator to select a string: `displayName` if truthy, otherwise `username` if truthy, otherwise the fallback string `'?'`. Calls `.charAt(0)` on the selected string to extract the first character, then calls `.toUpperCase()` on that character. Returns the uppercase first character. No external state is read or written. No other functions are called.

### parseEmojiAvatar

Reads the input parameter `avatarUrl`. Returns `null` if `avatarUrl` is falsy or if `typeof avatarUrl !== 'string'`. If `avatarUrl` is a string, calls `.startsWith('emoji:')` to test if it begins with the prefix `'emoji:'`. If the test succeeds, calls `.slice(6)` to remove the first six characters (`'emoji:'`) and returns the resulting substring. If the test fails, returns `null`. No external state is read or written. No other functions are called.
