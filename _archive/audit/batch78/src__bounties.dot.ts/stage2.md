# Stage 2 Outputs — bounties.dot.ts

## Agent 01

### loadBountyDotSet
This async function reads from external state via the `safeRpc` API and writes to the module-level `_bountyDotSet` variable. It first checks the result of `getIsPlaceholderMode()` and returns early (without awaiting anything) if placeholder mode is active. If not in placeholder mode, it awaits a call to `safeRpc<{ user_id: string }[]>('get_bounty_dot_user_ids')`. If the RPC response contains an error, it throws that error. Otherwise, it extracts the `user_id` field from each record in the returned data array (defaulting to an empty array if data is null or undefined) and constructs a new Set from these user IDs, which overwrites `_bountyDotSet`. If any exception occurs during the RPC call or subsequent processing, the catch block logs a warning via `console.warn()` and suppresses the error. The function returns `Promise<void>`.

### userHasBountyDot
This function reads the `userId` parameter and the module-level `_bountyDotSet` variable and returns a boolean. It first checks whether `userId` is falsy (null, undefined, or empty string); if so, it returns false immediately. Otherwise, it calls the `has()` method on `_bountyDotSet` with the `userId` as the argument and returns the result. The function is synchronous.

### bountyDot
This function reads the `userId` parameter and returns a string. It calls `userHasBountyDot(userId)` and checks the result. If that call returns false, the function returns an empty string immediately. If `userHasBountyDot(userId)` returns true, the function returns a string containing an HTML `<span>` element with a yellow circle emoji (🟡), various styling attributes, an aria-label, and a CSS class. The function is synchronous.

## Agent 02

### loadBountyDotSet
This async function populates the module-level state variable `_bountyDotSet` with user IDs that have an active bounty. It first checks if placeholder mode is enabled by calling `getIsPlaceholderMode()` and returns early without modification if true. Otherwise, it calls `safeRpc()` with the RPC method name `'get_bounty_dot_user_ids'` and awaits the result. If the RPC returns an error, the error is thrown. If successful, `_bountyDotSet` is reassigned to a new Set constructed from the `user_id` field of each record in the returned data array (defaulting to an empty array if data is null). The entire operation is wrapped in a try-catch block that logs a warning to the console if any error occurs, then silently returns without propagating the exception.

### userHasBountyDot
This synchronous function checks whether a given user has an active bounty dot. It takes a `userId` parameter that may be a string, null, or undefined. If the userId is falsy, it returns `false` immediately. Otherwise, it calls the `has()` method on `_bountyDotSet` with the userId and returns the boolean result, indicating whether that user ID exists in the set.

### bountyDot
This synchronous function generates an HTML string representing a bounty dot indicator for a given user, or an empty string if the user does not have an active bounty. It first calls `userHasBountyDot(userId)` to check the user's bounty status. If the check returns `false`, the function returns an empty string. If `true`, it returns a complete HTML `<span>` element with the content being a yellow circle emoji (🟡), styled with inline CSS properties that set display to inline-block, add left margin, reduce font size to 0.85em, set line-height to 1, apply middle vertical alignment, and use a default cursor, while also assigning the class `"bounty-dot"` and including title and aria-label attributes for accessibility.

## Agent 03

### loadBountyDotSet
This async function loads bounty dot user IDs from a remote source and populates the module-level `_bountyDotSet` state. It first calls `getIsPlaceholderMode()` to check if placeholder mode is active; if so, it returns early without making any requests. If not in placeholder mode, it calls `safeRpc<{ user_id: string }[]>('get_bounty_dot_user_ids')` and awaits the result, which returns an object with `data` and `error` properties. If an error is present, it throws the error. If successful, it transforms the returned data array by extracting the `user_id` field from each record and creates a new Set from those IDs, replacing the contents of `_bountyDotSet`. If any error is thrown—either from the RPC call or from the error check—it is caught and logged to the console with a warning message; the function then completes without rethrowing.

### userHasBountyDot
This synchronous function checks whether a given user ID exists in the module-level `_bountyDotSet`. It takes a nullable/optional `userId` parameter and immediately returns `false` if the userId is falsy (null, undefined, or empty string). If userId is truthy, it returns the boolean result of `_bountyDotSet.has(userId)`.

### bountyDot
This synchronous function returns an HTML string representing a visual bounty indicator or an empty string. It calls `userHasBountyDot(userId)` with the provided nullable/optional `userId` parameter; if that returns `false`, the function returns an empty string. If `userHasBountyDot` returns `true`, the function returns a fixed HTML string containing a span element with styling, aria attributes, and a yellow circle emoji (🟡) with the title and aria-label set to "Active bounty".

## Agent 04

### loadBountyDotSet
This async function reads the state of the module-level variable `_bountyDotSet` and overwrites it with fresh data. At runtime, it first calls `getIsPlaceholderMode()` to determine whether the application is in placeholder mode; if true, the function returns immediately without making any network request. If not in placeholder mode, it calls `safeRpc()` with the RPC method name `'get_bounty_dot_user_ids'`, which fetches an array of objects containing `user_id` fields. The await point is on the `safeRpc` call. If the RPC response contains an error, the function throws that error, which is caught by the surrounding try-catch block. On a successful response, the function transforms the returned data array by mapping each record's `user_id` field into an array, constructs a new Set from that array, and overwrites `_bountyDotSet` with this new Set. If an exception is raised during the RPC call or error handling, the catch block logs a warning message to the console and then returns, leaving `_bountyDotSet` in whatever state it was in before the error.

### userHasBountyDot
This synchronous function reads the `_bountyDotSet` module-level variable and returns a boolean. It takes a `userId` parameter that may be a string, null, or undefined. If the userId is falsy, the function returns `false` immediately. Otherwise, it calls the `has()` method on `_bountyDotSet` to check whether the userId exists in the Set and returns the result.

### bountyDot
This synchronous function reads the module-level variable `_bountyDotSet` indirectly by calling `userHasBountyDot()` with the provided `userId` parameter. If `userHasBountyDot()` returns `false`, indicating the user does not have a bounty dot, the function returns an empty string. If `userHasBountyDot()` returns `true`, the function returns an HTML span element as a string, formatted with inline styles for display properties (margin, font size, line height, vertical alignment, and cursor), an aria-label attribute set to "Active bounty", a title attribute, and a CSS class name "bounty-dot", containing the Unicode character for a yellow circle emoji (🟡).

## Agent 05

### loadBountyDotSet
This async function initializes the module-level `_bountyDotSet` variable from a remote source. It reads nothing from parameters. On entry, it checks if the system is in placeholder mode via `getIsPlaceholderMode()` and returns immediately without side effects if true. Otherwise it calls `safeRpc<{ user_id: string }[]>('get_bounty_dot_user_ids')` and awaits the result, which is a remote procedure call that returns either data or an error. If an error is present, the function throws it. If successful, it transforms the data array by mapping each record to extract the `user_id` field, then writes a new Set containing these user IDs into `_bountyDotSet`. If any exception occurs during the RPC call or data processing, the catch block logs a warning to the console and allows the function to return normally without throwing. The function returns a Promise that resolves to void.

### userHasBountyDot
This synchronous function reads the parameter `userId` and checks membership against the module-level `_bountyDotSet` variable. If `userId` is falsy (null, undefined, or empty string), the function returns false immediately. Otherwise it calls `_bountyDotSet.has(userId)` and returns the boolean result. The function performs no writes and makes no other function calls.

### bountyDot
This synchronous function reads the parameter `userId` and calls `userHasBountyDot(userId)` to check if the user is in the bounty set. If `userHasBountyDot` returns false, the function returns an empty string and exits early. If `userHasBountyDot` returns true, the function returns a fixed HTML string containing a span element with inline styles, aria attributes, and the yellow circle emoji. The function performs no writes to module-level state.
