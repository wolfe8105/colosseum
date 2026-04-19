# Stage 2 Outputs — settings.helpers.ts

## Agent 01

### toast
Reads the `msg` string parameter. Queries the DOM for an element with id 'toast' using `document.getElementById`. If the element does not exist, the function returns early with no further action. If the element exists, sets its `textContent` to the `msg` parameter, adds the 'show' class to its `classList`, and schedules a callback via `setTimeout` with a 2500 millisecond delay that removes the 'show' class from the element. The function is synchronous and returns `void`.

### getEl
Reads the `id` string parameter. Calls `document.getElementById(id)` to query the DOM and returns the result cast as type `T` (generic, defaults to `HTMLElement`) or `null`. The function is synchronous and performs a simple DOM lookup with no side effects.

### getChecked
Reads the `id` string parameter. Calls `getEl<HTMLInputElement>(id)` to retrieve a DOM element, then accesses the `checked` property on the result. If `getEl` returns `null`, the nullish coalescing operator `??` provides a default return value of `false`. The function is synchronous and returns a `boolean`.

### setChecked
Reads the `id` string parameter and the `val` boolean parameter. Calls `getEl<HTMLInputElement>(id)` to retrieve a DOM element and stores it in a local variable. If the element exists, sets its `checked` property to the `val` parameter. If the element does not exist, no action is taken. The function is synchronous and returns `void`.

### validateTier
Reads the `raw` parameter which is a `string | undefined`. Checks whether `raw` is included in the `VALID_TIERS` array by using `VALID_TIERS.includes(raw as ValidTier)`. If the check passes, casts `raw` to the `ValidTier` type and returns it. If the check fails, returns the string literal `'free'` as the default tier. The function is synchronous and always returns a `ValidTier`.

## Agent 02

### toast
The function reads a parameter `msg` of type `string` and the DOM element with id 'toast'. It queries the DOM using `document.getElementById('toast')`. If the element does not exist, the function returns early without further action. If the element exists, it writes the `msg` parameter to the element's `textContent` property and adds the CSS class 'show' to the element's `classList`. The function then calls `setTimeout` with a callback that removes the 'show' class from the element after 2500 milliseconds. The function is synchronous and returns `void`.

### getEl
The function reads a parameter `id` of type `string` and queries the DOM using `document.getElementById(id)`, casting the result to a generic type `T` that extends `HTMLElement` with a default of `HTMLElement`. It returns the result directly as either a typed HTML element or `null` if no element with the given id exists. The function is synchronous and performs a single DOM query with a type assertion.

### getChecked
The function reads a parameter `id` of type `string` and calls `getEl<HTMLInputElement>(id)` to retrieve a DOM element. It accesses the `checked` property of the returned element using optional chaining (`?.`), defaulting to `false` if the element does not exist or is `null`. The function is synchronous and returns a boolean value representing the checked state of an input element or `false` as a fallback.

### setChecked
The function reads a parameter `id` of type `string` and a parameter `val` of type `boolean`. It calls `getEl<HTMLInputElement>(id)` to retrieve a DOM element. If the element exists (truthy check), the function writes the `val` parameter to the element's `checked` property. If the element does not exist, no write occurs. The function is synchronous and returns `void`.

### validateTier
The function reads a parameter `raw` of type `string | undefined` and reads the module-level constant `VALID_TIERS`. It checks whether `raw` (cast to type `ValidTier`) is included in the `VALID_TIERS` array using the `includes` method. If the check is true, the function returns `raw` cast as `ValidTier`; if false, it returns the string literal `'free'`. The function is synchronous and returns a value of type `ValidTier`.

## Agent 03

### toast
The function accepts a string message parameter. It queries the DOM for an element with id "toast"; if no such element exists, the function returns without side effects. If the element exists, the function sets its text content to the message parameter, then adds the CSS class "show" to the element's class list. The function then schedules a callback via setTimeout that removes the "show" class after 2500 milliseconds (2.5 seconds). The function is synchronous and returns void. The timer is created unconditionally and is the only external API called besides document.getElementById() and DOM mutation methods.

### getEl
The function is a generic utility that accepts a string id parameter and an optional generic type argument (defaults to HTMLElement). It calls document.getElementById() with the provided id and casts the result using TypeScript's "as" operator to the specified generic type (or HTMLElement | null if not specified). The function is synchronous and returns the cast element or null if no element with that id exists. No state is read or written beyond querying the DOM.

### getChecked
The function accepts a string id parameter. It calls getEl<HTMLInputElement>() with that id, which returns an HTMLInputElement or null. If the element exists (via optional chaining), it reads the "checked" property; if the element is null, the nullish coalescing operator (??) returns false. The function is synchronous and returns a boolean. No DOM writes occur.

### setChecked
The function accepts a string id parameter and a boolean val parameter. It calls getEl<HTMLInputElement>() with the id to retrieve a potential HTMLInputElement. If the element exists (evaluated via if condition), the function sets the element's "checked" property to the val parameter. If the element does not exist, no action is taken. The function is synchronous, returns void, and performs at most one DOM write (the checked property assignment).

### validateTier
The function accepts a string or undefined parameter named raw. It checks whether raw (cast as ValidTier) is present in the VALID_TIERS array using the includes() method. If the value is found, the function returns raw cast as ValidTier; if the value is not found, the function returns the string literal 'free'. The function is synchronous and always returns a ValidTier. The function reads the module-level VALID_TIERS constant and performs no DOM or external state writes.

## Agent 04

### toast
Reads the parameter `msg` (a string). Queries the DOM for an element with id "toast". If the element does not exist, the function returns early without side effects. If the element exists, writes `msg` to the element's `textContent` property, then adds the CSS class "show" to its `classList`. Calls the `setTimeout` API with a callback function and a delay of 2500 milliseconds; that callback removes the "show" class from the element's `classList`. The function is synchronous and returns `undefined`.

### getEl
Reads the parameter `id` (a string). Calls `document.getElementById(id)` and returns its result cast to the generic type parameter `T | null`, which defaults to `HTMLElement | null`. The function does not interact with module-level state, the DOM beyond the single `getElementById` query, or external APIs. It is synchronous and has no branching, error handling, or early returns.

### getChecked
Reads the parameter `id` (a string). Calls `getEl<HTMLInputElement>(id)` internally to retrieve a DOM element, accessing the `checked` property of the result. Uses the nullish coalescing operator `??` to provide a fallback value of `false` if the element does not exist or if the property is nullish. The function is synchronous and returns a boolean. It does not write to the DOM or module-level state.

### setChecked
Reads the parameter `id` (a string) and the parameter `val` (a boolean). Calls `getEl<HTMLInputElement>(id)` to retrieve a DOM element. If the element exists (truthy check), writes the boolean value `val` to the element's `checked` property; otherwise does nothing. The function is synchronous, returns `undefined`, and does not interact with module-level state or external APIs beyond the internal `getEl` call.

### validateTier
Reads the parameter `raw` (a string or undefined). Checks whether `raw`, cast as `ValidTier`, is included in the `VALID_TIERS` array using the `includes` method. If the check is true, returns `raw` cast as `ValidTier`; if false, returns the string literal `'free'`. The function does not interact with the DOM, module-level state beyond reading the constant `VALID_TIERS`, or external APIs. It is synchronous with no branching other than the conditional expression and no error handling.

## Agent 05

### toast
When called with a string message, the function retrieves the DOM element with id `'toast'`. If the element does not exist, the function returns early without further action. If the element exists, the function writes to it by setting its `textContent` property to the message parameter and adding the CSS class `'show'` to its `classList`. The function then schedules a callback via `setTimeout` with a 2500-millisecond delay that removes the `'show'` class from the element's `classList`. The function is not async and returns `undefined`.

### getEl
When called with a string id, the function calls `document.getElementById` with that id parameter and casts the result to the generic type `T`, defaulting to `HTMLElement` if no type argument is provided. The function performs no control flow branches or conditional returns. It is not async and returns the result of `getElementById` as either an element of type `T` or `null` if no element with that id exists in the DOM.

### getChecked
When called with a string id, the function calls `getEl<HTMLInputElement>` with the id parameter to retrieve a DOM element. If the element exists, the function accesses its `checked` property; if the element does not exist or the property access fails, the nullish coalescing operator `??` defaults the return value to `false`. The function is not async and returns a boolean.

### setChecked
When called with a string id and a boolean value, the function calls `getEl<HTMLInputElement>` with the id parameter to retrieve a DOM element. The function then checks if the element exists; if it does, the function writes to the element by setting its `checked` property to the boolean value parameter. If the element does not exist, no write occurs and the function returns without action. The function is not async and returns `undefined`.

### validateTier
When called with a string or undefined value, the function checks whether the raw parameter, when cast to the `ValidTier` type, is included in the `VALID_TIERS` array using the `includes` method. If the check returns true, the function casts the raw parameter to `ValidTier` and returns it. If the check returns false, the function returns the string literal `'free'`. The function is not async and always returns a value of type `ValidTier`.
