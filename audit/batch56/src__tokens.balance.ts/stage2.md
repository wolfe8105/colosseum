# Stage 2 Outputs — tokens.balance.ts

## Agent 01

### _updateBalanceDisplay

Receives a `newBalance` parameter of type `number | null | undefined` and an optional `broadcast` boolean (defaults to `true`). If `newBalance` is null or undefined, the function returns early. Otherwise, it writes the value to the module-level `lastKnownBalance` variable. It then queries the DOM for all elements with a `data-token-balance` attribute and updates their `textContent` to the localized string representation of `newBalance`. It also queries for an element with ID `token-balance` and updates its `textContent` if found. If `broadcast` is true and the module-level `_bc` variable is not null, it attempts to post the numeric message to the BroadcastChannel; any exception from `postMessage` is silently caught and ignored.

### updateBalance

Takes a `newBalance` number parameter. It calls `_updateBalanceDisplay` with the new balance and `broadcast` defaulting to `true`. It then reads the current profile via `getCurrentProfile()` and, if a profile exists, casts it to a `Record<string, unknown>` and writes `newBalance` to its `token_balance` property.

### _rpc

An async function that receives a `fnName` string parameter and an optional `args` object (defaulting to an empty object). It reads the result of `getIsPlaceholderMode()` and if true, returns null. It then reads the result of `getCurrentUser()` and if falsy, returns null. It then awaits `safeRpc(fnName, args)`, destructuring the returned object into `data` and `error`. If `error` exists, it logs a warning to the console with the error message (or the error itself if no message property exists), and returns null. If no error, it returns `data` cast as a `ClaimResult`. If the await throws an exception, the exception is caught, logged as a warning to the console, and null is returned.

### requireTokens

Takes an `amount` number and an optional `actionLabel` string. It calls `getCurrentProfile()` and, if the result is falsy, returns true immediately. Otherwise, it reads the `token_balance` property from the profile (defaulting to 0) and compares it against `amount`. If balance is greater than or equal to amount, it returns true. If balance is insufficient, it calculates the deficit as `amount - balance`, calls `showToast()` with a message including the amount and deficit (using `actionLabel` if provided, otherwise a default string), and returns false.

### getSummary

An async function with no parameters. It awaits the result of `_rpc('get_my_token_summary')` with no arguments. If the result is null or its `success` property is falsy, it returns null. Otherwise, it calls `_updateBalanceDisplay` with the `token_balance` property from the result (cast as `TokenSummary`), passing `broadcast` as its default value of true. It then returns the result cast as `TokenSummary`.

### getBalance

A synchronous function with no parameters that returns the module-level `lastKnownBalance` variable as-is.

### _initBroadcast

A synchronous function with no parameters. It attempts to instantiate a new `BroadcastChannel` with the channel name `'mod-token-balance'` and assign it to the module-level `_bc` variable. It then sets the `onmessage` handler on `_bc` to a callback that checks if the message data is a number, and if so, calls `_updateBalanceDisplay` with that number and `broadcast` set to false. If the `BroadcastChannel` constructor or handler assignment throws an exception, the exception is silently caught and ignored.

## Agent 02

### _updateBalanceDisplay

Accepts a new balance value (number or null/undefined) and an optional broadcast flag defaulting to true. If the new balance is null or undefined, the function returns early without action. Otherwise, it writes the balance to the module-level variable lastKnownBalance, then iterates through all DOM elements with the attribute data-token-balance and sets their text content to the localized string representation of the new balance. It also finds the element with id token-balance and sets its text content to the same localized value if that element exists. If the broadcast flag is true and the module-level variable _bc (a BroadcastChannel) is not null, it attempts to post the new balance as a message on that channel; any error during this postMessage operation is caught and ignored.

### updateBalance

Takes a new balance number as its only parameter. It calls _updateBalanceDisplay with the new balance and the default broadcast flag of true. It then retrieves the current profile object via getCurrentProfile(); if a profile exists, it casts it to a Record and writes the new balance to its token_balance property.

### _rpc

An async function that takes a function name string and an optional args object (defaulting to an empty object). It first checks if placeholder mode is active via getIsPlaceholderMode(), returning null if true. It then checks if a current user exists via getCurrentUser(), returning null if no user is present. Inside a try block, it calls the awaited safeRpc function with the function name and args. If the returned error property is truthy, it logs a warning with the error message (or the error itself if no message property exists) and returns null. If no error occurs, it returns the data property cast as a ClaimResult. If the try block throws an exception, the catch block logs a warning with the exception and returns null.

### requireTokens

Takes an amount number and an optional actionLabel string. It calls getCurrentProfile() and returns true immediately if no profile exists. It then reads the token_balance property from the profile (defaulting to 0 if absent) and compares it against the required amount. If the balance is greater than or equal to the amount, the function returns true. If the balance is insufficient, it calculates the deficit, calls showToast with a formatted error message including the amount, the action label (or a default string if not provided), and the deficit amount, then returns false.

### getSummary

An async function with no parameters. It calls the awaited _rpc function with the string 'get_my_token_summary' and no additional arguments. If the result is null or the result's success property is falsy, the function returns null. Otherwise, it casts the result as unknown then as TokenSummary and calls _updateBalanceDisplay with the token_balance property from that summary object. It then returns the summary cast as TokenSummary.

### getBalance

Takes no parameters and returns the current value of the module-level variable lastKnownBalance, which can be a number or null.

### _initBroadcast

Takes no parameters and has no return value. Inside a try block, it instantiates a new BroadcastChannel with the name 'mod-token-balance' and assigns it to the module-level variable _bc. It then assigns a handler function to the _bc.onmessage property; this handler checks if the incoming message data is a number, and if so, calls _updateBalanceDisplay with that number and a broadcast flag of false. If the BroadcastChannel constructor or any other operation in the try block throws an error, the catch block ignores the error silently.

## Agent 03

### _updateBalanceDisplay

Takes a numeric balance value, an optional broadcast flag (defaults to true), and returns void. If the balance is null or undefined, the function returns early without further execution. When a valid balance is provided, it writes to the module-level variable `lastKnownBalance`. The function then calls `document.querySelectorAll('[data-token-balance]')` to find all DOM elements with the data-token-balance attribute and sets their textContent to the localized string representation of the balance. It also queries for an element with id 'token-balance' and sets its textContent if the element exists. If the broadcast parameter is true and the module-level `_bc` variable is truthy, the function calls `_bc.postMessage(newBalance)` inside a try-catch block, silently ignoring any exceptions.

### updateBalance

Takes a numeric balance value and returns void. It calls `_updateBalanceDisplay(newBalance)` without specifying a broadcast argument, so it uses the default true value. It then calls `getCurrentProfile()` to read the current user profile from external state. If a profile object is returned, the function casts it as `Record<string, unknown>` and writes the new balance to its `token_balance` property.

### _rpc

An async function that takes a function name string and an optional object of arguments (defaulting to an empty object) and returns a Promise resolving to `ClaimResult | null`. The function first calls `getIsPlaceholderMode()` and returns null early if placeholder mode is active. It then calls `getCurrentUser()` and returns null early if no user is present. Inside a try-catch block, it calls `await safeRpc(fnName, args)` and destructures the result into `data` and `error`. If error is truthy, it logs a warning to the console using either the error's message property or the error itself, then returns null. If error is falsy, it returns data cast as `ClaimResult`. Any exceptions thrown during execution are caught, logged as a warning, and the function returns null.

### requireTokens

Takes an amount parameter (number) and an optional action label string, returning a boolean. It calls `getCurrentProfile()` to read the current profile from external state. If no profile exists, the function returns true immediately. It then reads the `token_balance` property from the profile (defaulting to 0 if absent) and compares it to the amount. If the balance is greater than or equal to the amount, the function returns true. If the balance is insufficient, it calculates the deficit as the difference between amount and balance, calls `showToast()` to display an error message that includes the required amount, the action label (or a default string), and the deficit value, then returns false.

### getSummary

An async function taking no parameters and returning a Promise resolving to `TokenSummary | null`. It calls `await _rpc('get_my_token_summary')` with no arguments. If the result is falsy or its success property is falsy, the function returns null. Otherwise, it calls `_updateBalanceDisplay()` with the token_balance property extracted from the result (using type coercion through `unknown`), then returns the result cast as `TokenSummary`.

### getBalance

Takes no parameters and returns `number | null`. The function performs a single read of the module-level variable `lastKnownBalance` and returns its value directly.

### _initBroadcast

Takes no parameters and returns void. Inside a try block, it instantiates a new `BroadcastChannel` with the channel name 'mod-token-balance' and writes the instance to the module-level variable `_bc`. It then assigns a message event handler to `_bc.onmessage` that receives a `MessageEvent`. The handler checks if `e.data` is a number and, if so, calls `_updateBalanceDisplay(e.data, false)`. Any exceptions thrown during BroadcastChannel instantiation or setup are caught and silently ignored.

## Agent 04

### _updateBalanceDisplay

Receives a `newBalance` parameter (number, null, or undefined) and an optional `broadcast` boolean (defaults to true). Reads the module-level `_bc` variable. If `newBalance` is null or undefined, the function returns early with no side effects. Otherwise, it writes `newBalance` to the module-level `lastKnownBalance` variable, then selects all DOM elements with the `data-token-balance` attribute and updates their `textContent` with `newBalance.toLocaleString()`. It also queries for an element with id `token-balance` and updates its `textContent` if the element exists. If `broadcast` is true and `_bc` is not null, it calls `_bc.postMessage(newBalance)` inside a try-catch block that silently ignores exceptions.

### updateBalance

Receives a `newBalance` parameter (number). Calls `_updateBalanceDisplay(newBalance)` with the default `broadcast` value of true. Then calls `getCurrentProfile()` and if a profile is returned, casts it to `Record<string, unknown>` and sets the `token_balance` property to `newBalance`. The function returns void.

### _rpc

An async function that receives a `fnName` parameter (string) and an optional `args` parameter (Record<string, unknown>, defaults to empty object). Calls `getIsPlaceholderMode()` and if true, returns null. Calls `getCurrentUser()` and if it returns falsy, returns null. Inside a try block, awaits `safeRpc(fnName, args)`, destructuring the result into `data` and `error` properties. If `error` exists, logs a warning message using `console.warn` and returns null; otherwise casts `data` to `ClaimResult` and returns it. If an exception is caught, logs the exception with `console.warn` and returns null.

### requireTokens

Receives an `amount` parameter (number) and an optional `actionLabel` parameter (string). Calls `getCurrentProfile()` and if the profile is falsy, returns true immediately. Reads `profile.token_balance` (defaulting to 0) and compares it with `amount`; if `balance >= amount`, returns true. Otherwise, calculates `deficit` as `amount - balance`, calls `showToast()` with a formatted error message that includes the `amount`, the provided `actionLabel` or the default string `'do that'`, and the `deficit`, then returns false.

### getSummary

An async function that takes no parameters. Awaits `_rpc('get_my_token_summary')` with no arguments. If the result is falsy or its `success` property is falsy, returns null. Otherwise, casts the result as an unknown `TokenSummary`, extracts its `token_balance` property, and passes it to `_updateBalanceDisplay()` with the default `broadcast` value of true. Returns the result cast to `TokenSummary`.

### getBalance

A synchronous function that takes no parameters and returns the value of the module-level `lastKnownBalance` variable, which may be a number or null.

### _initBroadcast

A synchronous function that takes no parameters. Inside a try block, instantiates a new `BroadcastChannel` with the channel name `'mod-token-balance'` and assigns it to the module-level `_bc` variable. Sets the `onmessage` handler on `_bc` to a function that checks if the incoming `e.data` is a number and, if so, calls `_updateBalanceDisplay(e.data, false)`. If an exception is caught (indicating `BroadcastChannel` is not supported), execution continues with `_bc` remaining in its previous state.

## Agent 05

### _updateBalanceDisplay

The function reads a `newBalance` parameter (a number, null, or undefined) and a `broadcast` boolean flag defaulting to true. It also reads the module-level variable `_bc` (a BroadcastChannel or null) and the current state of DOM elements with the `data-token-balance` attribute and an element with id `token-balance`. If `newBalance` is null or undefined, the function returns early with no further actions. Otherwise, it writes the `newBalance` to the module-level `lastKnownBalance` variable, then iterates through all DOM elements matching `[data-token-balance]` and sets their textContent to the localized string representation of `newBalance`. It then queries for an element with id `token-balance` and if found, sets its textContent to the same localized string. Finally, if `broadcast` is true and `_bc` is not null, it attempts to call `_bc.postMessage(newBalance)` inside a try-catch block, silently ignoring any exceptions.

### updateBalance

The function takes a `newBalance` number parameter. It calls `_updateBalanceDisplay(newBalance)` with the default broadcast behavior. It then calls `getCurrentProfile()` from the auth module to read the current profile object. If a profile exists, it writes the `newBalance` to the profile's `token_balance` property by casting the profile to a generic record type and assigning to its `token_balance` key.

### _rpc

The function is async and takes a `fnName` string parameter and an optional `args` object parameter (defaulting to an empty object). It reads the result of `getIsPlaceholderMode()` and `getCurrentUser()` calls from the auth module. If placeholder mode is active, it returns null immediately. If there is no current user, it also returns null immediately. Otherwise, it awaits the result of `safeRpc(fnName, args)` from the auth module, destructuring the result into `data` and `error`. If an error exists, it logs a warning to the console using the error's message property (or the error itself if no message property exists) and returns null. If no error occurs, it returns the `data` cast as `ClaimResult`. If an exception is thrown during the `safeRpc` call, the catch block logs the exception as a warning and returns null.

### requireTokens

The function reads an `amount` number parameter and an optional `actionLabel` string parameter. It calls `getCurrentProfile()` to read the current profile. If no profile exists, it returns true immediately. It then reads the `token_balance` property from the profile (defaulting to 0 if missing) and compares it to `amount`. If the balance is greater than or equal to the required amount, it returns true. Otherwise, it calculates the deficit as the difference between `amount` and `balance`, calls `showToast()` from the config module with an error message indicating the token deficit and the provided action label (or a default message if no label provided), and returns false.

### getSummary

The function is async and takes no parameters. It awaits the result of calling `_rpc('get_my_token_summary')` with no arguments. If the result is null or its `success` property is falsy, it returns null. Otherwise, it calls `_updateBalanceDisplay()` passing the `token_balance` property from the result (casting the result as `TokenSummary` through an unknown intermediate cast), and returns the result cast as `TokenSummary`.

### getBalance

The function takes no parameters and returns the current value of the module-level `lastKnownBalance` variable, which is either a number or null.

### _initBroadcast

The function takes no parameters. It wraps its logic in a try-catch block to handle any exceptions. Inside the try block, it creates a new BroadcastChannel with the name 'mod-token-balance' and assigns it to the module-level `_bc` variable. It then sets up a message handler on `_bc` by assigning a function to its `onmessage` property; the handler checks if the message data is a number, and if so, calls `_updateBalanceDisplay(e.data, false)` to update the display without broadcasting further. If any exception occurs during the creation of the BroadcastChannel (for example, if the browser doesn't support the API), the catch block silently ignores it, leaving `_bc` in its previous state.
