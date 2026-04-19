# Stage 2 Outputs — plinko-helpers.ts

## Agent 01

### getReturnTo
This function reads the URL query parameters from `window.location.search` by constructing a `URLSearchParams` object. It retrieves the `returnTo` parameter. If that parameter exists and passes three validation checks—it starts with `/`, does not start with `//`, and does not contain a backslash—the function returns that parameter value as-is. If the parameter fails any check or does not exist, the function returns the fallback string `'index.html?screen=arena'`.

### updateProgress
This function reads the module-level state variable `currentStep` and `TOTAL_STEPS`. It queries the DOM for an element with id `progress`. If such an element exists, this function sets its `style.width` to a percentage calculated as `(currentStep / TOTAL_STEPS) * 100`, appending the `%` unit. If the element does not exist, no error is thrown and the function completes with no side effects.

### goToStep
This function takes a number parameter `n`. It first queries the DOM for all elements with class `plinko-step` and removes the `active` class from each of them. It then queries the DOM for an element with id `step-` concatenated with `n`. If that element exists, it adds the `active` class to it. The function then calls `set_currentStep(n)` to update the module-level state, and immediately calls `updateProgress()` to recalculate and update the progress bar. If `n` equals 5, the function performs a dynamic import of `plinko-invite-nudge.ts`, calls the `injectInviteNudge()` function from the imported module via `.then()`, and attaches a `.catch()` handler that logs any error to the console with the prefix `'[plinko]'`. The dynamic import is fire-and-forget (prefixed with `void`); it does not block the rest of the function from completing.

### showMsg
This function takes three parameters: `id` (a string), `text` (a string), and `type` (either `'success'` or `'error'`). It queries the DOM for an element with the given `id`. If no such element exists, the function returns early without side effects. If the element exists, the function sets its `className` to the string `'form-msg '` concatenated with the `type` parameter, and sets its `textContent` to the `text` parameter.

### clearMsg
This function takes a string parameter `id`. It queries the DOM for an element with the given `id`. If no such element exists, the function returns early without side effects. If the element exists, the function sets its `className` to `'form-msg'` and sets its `textContent` to an empty string.

### getAge
This function takes three number parameters: `month`, `day`, and `year`. It creates a `Date` object representing today by calling `new Date()` with no arguments. It creates a second `Date` object representing the birth date by calling `new Date(year, month - 1, day)`, subtracting 1 from the month parameter to convert from 1-indexed to 0-indexed. It calculates `age` as the difference between today's full year and the birth date's full year. It then calculates `m` as the difference between today's month and the birth date's month. If `m` is negative or if `m` is 0 and today's day is less than the birth date's day, the function decrements `age` by 1. The function returns the final `age` value.

## Agent 02

### getReturnTo
This function reads the `returnTo` query parameter from the current page's URL via `window.location.search`. It creates a URLSearchParams object to parse the query string and calls `params.get('returnTo')` to retrieve the value. The function then validates the returned destination string against three conditions: it must exist, must start with a forward slash, must not start with a double forward slash, and must not contain a backslash. If all validations pass, it returns the `dest` string. If any validation fails or the parameter is absent, the function returns the hardcoded fallback string `'index.html?screen=arena'`.

### updateProgress
This function reads the module-level variable `currentStep` and the imported constant `TOTAL_STEPS` from plinko-state.ts. It queries the DOM for an element with id `'progress'`. If the element exists, the function writes to its `style.width` property by calculating `((currentStep) / TOTAL_STEPS) * 100` and appending the `'%'` unit. If the element does not exist, the function does nothing.

### goToStep
This function receives a numeric parameter `n` representing the target step. It first queries all DOM elements matching the selector `'.plinko-step'` and removes the `'active'` class from each one. It then queries the DOM for an element with id `'step-' + n` and, if found, adds the `'active'` class to that element. The function calls `set_currentStep(n)` to update the module-level step state, then calls `updateProgress()` to refresh the progress bar. If the step number equals 5, the function executes a dynamic import of `'./plinko-invite-nudge.ts'` and chains a `.then()` handler that calls `m.injectInviteNudge()`. The promise is awaited via the async call chain, but wrapped with `void` to ignore the result; a `.catch()` handler logs any import or execution errors to the console using `console.error()`. The import and invocation are fire-and-forget operations that do not block the function's return.

### showMsg
This function accepts three parameters: a string `id`, a string `text`, and a literal type `type` that must be either `'success'` or `'error'`. It queries the DOM for an element with the given id and, if no element is found, returns early without modification. If the element exists, the function writes to its `className` property by concatenating `'form-msg '` with the `type` parameter, then writes to its `textContent` property with the `text` parameter.

### clearMsg
This function accepts a string `id` parameter and queries the DOM for an element with that id. If no element is found, the function returns early. If the element exists, the function writes to its `className` property with the static string `'form-msg'` and writes to its `textContent` property with an empty string.

### getAge
This function receives three numeric parameters: `month`, `day`, and `year`. It creates a Date object representing today using `new Date()` with no arguments, then creates a second Date object representing the birth date using `new Date(year, month - 1, day)`, converting the month parameter to zero-indexed form. The function calculates the age by subtracting the birth year from the current year, then stores the result in a local variable `age`. It computes the month difference by subtracting the birth month from the current month and stores it in variable `m`. The function then checks if the month difference is negative or if the months are equal but the current day is earlier than the birth day; if either condition is true, it decrements `age` by 1. The function returns the computed `age` as a number.

## Agent 03

### getReturnTo
Reads `window.location.search` to extract query parameters. Calls `URLSearchParams.get('returnTo')` to retrieve the destination string. Returns the value of the `returnTo` parameter if it exists, starts with a forward slash, does not start with double slashes, and does not contain backslashes. If any of these conditions fail, returns the fallback string `'index.html?screen=arena'`.

### updateProgress
Reads the module-level `currentStep` and `TOTAL_STEPS` values. Queries the DOM for an element with id `'progress'`. If found, sets its `style.width` to a percentage calculated as `(currentStep / TOTAL_STEPS) * 100`, then appends the `'%'` unit. If the element is not found, the function returns without modifying anything.

### goToStep
Reads the parameter `n` and module-level `TOTAL_STEPS`. Queries all DOM elements with class `'plinko-step'` and removes their `'active'` class. Queries the DOM for an element with id `'step-' + n`. If found, adds the `'active'` class to it. Calls `set_currentStep(n)` to update module-level state. Calls `updateProgress()` to recalculate and render the progress bar. When `n` equals `5`, dynamically imports the module `'./plinko-invite-nudge.ts'` via a fire-and-forget promise chain: the `.then()` handler calls `m.injectInviteNudge()`, and `.catch()` logs any error to the console with prefix `'[plinko]'`. The dynamic import is intentionally not awaited.

### showMsg
Reads the parameters `id`, `text`, and `type`. Queries the DOM for an element with the given `id`. If not found, returns early without further action. If found, sets the element's `className` to the string `'form-msg ' + type`, concatenating the `type` parameter. Sets the element's `textContent` to the `text` parameter.

### clearMsg
Reads the parameter `id`. Queries the DOM for an element with the given `id`. If not found, returns early without further action. If found, sets the element's `className` to `'form-msg'`. Sets the element's `textContent` to an empty string.

### getAge
Reads the parameters `month`, `day`, and `year`. Creates a `Date` object for today by calling `new Date()` without arguments. Creates a `Date` object for the birth date by calling `new Date(year, month - 1, day)`, subtracting 1 from the month parameter to convert from 1-indexed to 0-indexed. Calculates initial age by subtracting the birth year from the current year. Computes the month difference by subtracting the birth month from the current month. If the month difference is negative, or if the month difference is zero and the current day is earlier than the birth day, decrements age by 1. Returns the computed age as an integer.

## Agent 04

### getReturnTo
This function reads the query string from `window.location.search`, constructs a URLSearchParams object, and retrieves the `returnTo` parameter. It checks whether the `dest` parameter exists, starts with a forward slash, does not start with double slashes, and does not contain backslashes. If all these conditions are met, it returns the `dest` value. If the parameter is absent or fails any validation check, it returns the hardcoded string `'index.html?screen=arena'`. The function performs no writes and makes no function calls beyond the built-in URLSearchParams API.

### updateProgress
This function reads the current value of the `currentStep` imported state variable and the `TOTAL_STEPS` imported state variable. It queries the DOM for an element with the id `'progress'`. If that element exists, it writes a new inline style to its `width` property, calculating a percentage based on the ratio of `currentStep` to `TOTAL_STEPS` multiplied by 100. If the element does not exist, the function performs no writes. The function returns no value.

### goToStep
This function takes a numeric parameter `n` and first queries the DOM for all elements with the class `'plinko-step'`, iterating through the results and removing the `'active'` class from each one. It then queries the DOM for an element with the id `'step-'` concatenated with the parameter value. If that element exists, it adds the `'active'` class to it. It calls `set_currentStep(n)` to write the new step value to module state, then calls `updateProgress()` to update the progress bar. If `n` equals 5, it performs a dynamic import of the `'./plinko-invite-nudge.ts'` module and chains a `.then()` call that invokes the `injectInviteNudge()` function from that module; the promise is prefixed with `void` to indicate it is fire-and-forget. Any error from the import or the function invocation is caught and logged to the console using `console.error()`. The function returns no value.

### showMsg
This function takes three parameters: a string id, a string text, and a type that is either `'success'` or `'error'`. It queries the DOM for an element matching the provided id. If no such element exists, it returns early without writing anything. If the element exists, it writes a new className combining the string `'form-msg '` with the type parameter, and writes the text parameter to the element's textContent property. The function returns no value.

### clearMsg
This function takes a string id parameter and queries the DOM for an element matching that id. If no such element exists, it returns early without writing anything. If the element exists, it sets the className to the string `'form-msg'` with no type suffix, and sets the textContent to an empty string. The function returns no value.

### getAge
This function takes three numeric parameters representing month, day, and year. It reads the current date and time from the `Date()` constructor. It constructs a birth date object using the year parameter, the month parameter minus 1 (to convert from 1-indexed to 0-indexed months), and the day parameter. It calculates the difference between the current year and birth year and stores it in the `age` variable. It then calculates the difference between the current month and birth month and stores it in the `m` variable. It checks whether `m` is negative or whether `m` is zero and the current date of month is less than the birth date of month; if either condition is true, it decrements the `age` variable by 1. It returns the calculated `age` value.

## Agent 05

### getReturnTo
When called, the function constructs a URLSearchParams object from the query string of the current window location. It reads the `returnTo` parameter from the URL. If the parameter exists and starts with a forward slash, does not start with a double slash, and contains no backslashes, the function returns that parameter value as-is. If any of those conditions fail or the parameter does not exist, the function returns the fallback string `'index.html?screen=arena'`. The function reads window.location.search and returns a string without modifying any external state.

### updateProgress
When called, the function retrieves the DOM element with id `'progress'`. If that element exists, it reads the module-level `currentStep` and `TOTAL_STEPS` values imported from plinko-state.ts, calculates the percentage as (currentStep / TOTAL_STEPS) * 100, and sets the element's width style property to that percentage string. If the element does not exist, the function does nothing. The function returns void and does not modify module-level state, only the DOM.

### goToStep
When called with a numeric parameter n, the function first queries all DOM elements with class `'plinko-step'` and removes the `'active'` class from each. It then retrieves the DOM element with id `'step-' + n` and, if that element exists, adds the `'active'` class to it. The function calls `set_currentStep(n)` from the imported plinko-state module to update module-level state, then calls `updateProgress()` to synchronize the progress bar. If n equals 5, the function dynamically imports the plinko-invite-nudge module and calls its `injectInviteNudge()` method; this import is wrapped in a void Promise that catches and logs any errors to the console without propagating them. The function returns void.

### showMsg
When called with an id string, a text string, and a type that is either `'success'` or `'error'`, the function retrieves the DOM element by that id. If the element does not exist, the function returns early without further action. If the element exists, the function sets its className to `'form-msg ' + type` (resulting in a string like `'form-msg success'` or `'form-msg error'`) and sets its textContent to the provided text parameter. The function returns void and does not modify module-level state.

### clearMsg
When called with an id string, the function retrieves the DOM element by that id. If the element does not exist, the function returns early without further action. If the element exists, the function sets its className to `'form-msg'` (removing any type modifier) and sets its textContent to an empty string. The function returns void and does not modify module-level state.

### getAge
When called with month, day, and year parameters (all numbers), the function constructs a Date object representing today and a Date object representing the birth date from the provided parameters. It calculates the difference in full years by subtracting the birth year from the current year. It then reads the month and day of both dates and compares them; if the current month is before the birth month, or the current month equals the birth month but the current day is before the birth day, the function decrements the age by 1 to account for the birthday not yet occurring this year. The function returns the calculated age as a number. It reads only the parameters and the current date via the Date API, writes no external state, and returns a pure computed value.
