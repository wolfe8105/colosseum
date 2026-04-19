# Stage 2 Outputs — groups.create.ts

## Agent 01

### setCreateOpenGroupCallback
Reads the parameter `fn`, a function that accepts a string and returns void. Writes module-level state: `_openGroup` is set to the provided function reference. No DOM operations. No other functions called. No async operations. No branches or early returns. Returns undefined.

### openCreateModal
Reads module-level state `currentUser` and performs an early return check: if `currentUser` is falsy, the function sets `window.location.href` to 'moderator-plinko.html' and returns early. In the happy path, queries the DOM for an element with id 'create-modal' using `document.getElementById`, adds the 'open' CSS class to that element, and returns undefined. Non-null assertion is used on the DOM query result. No module state is written. No async operations. No other functions called.

### closeCreateModal
Queries the DOM for an element with id 'create-modal' using `document.getElementById`, removes the 'open' CSS class from that element, and returns undefined. Non-null assertion is used on the DOM query result. Does not read or write module state. No other functions called. No async operations. No branches.

### selectEmoji
Reads the parameter `el`, an HTMLElement. Uses `document.querySelectorAll` to select all elements matching the '.emoji-opt' selector and iterates through the collection, removing the 'selected' class from each element in the first loop. Then adds the 'selected' class to the parameter element `el`. Calls `setSelectedEmoji` passing `el.dataset.emoji` if it exists, otherwise an empty string. Reads the `data-emoji` HTML attribute from the parameter element. Writes to module state via the `setSelectedEmoji` call and modifies multiple DOM elements. No async operations. No branches or early returns. Returns undefined.

### submitCreateGroup
This is an async function that reads from multiple DOM elements and module state `selectedEmoji`, then performs an RPC call with conditional logic and error handling. The function reads: the value of the input element with id 'group-name' (cast to HTMLInputElement), the button element with id 'create-submit-btn', the value of the input element with id 'group-desc-input', the value of the select element with id 'group-category', and the module-level state `selectedEmoji`. It validates the group name length synchronously and returns early with an alert if validation fails. Sets `btn.disabled` to true and `btn.textContent` to 'CREATING…'. Calls `safeRpc` with async/await, passing 'create_group' and a parameter object. Checks the error field of the response; if present, throws it. Parses the data field if it is a string. On success, calls `closeCreateModal`, clears the value of both 'group-name' and 'group-desc-input' input elements, and conditionally calls the `_openGroup` callback if both `result.group_id` exists and `_openGroup` is not null. The catch block alerts the error message or a fallback string. The finally block always restores `btn.disabled` to false and `btn.textContent` to 'CREATE GROUP'. No module-level state is written directly.

## Agent 02

### setCreateOpenGroupCallback
This function receives a callback function parameter and stores it in the module-level `_openGroup` variable. The function reads the `fn` parameter and writes it to `_openGroup`. It performs no DOM access, makes no other function calls, and has no branching. It is synchronous.

### openCreateModal
This function reads `currentUser` from module state. If `currentUser` is falsy, it redirects the window to `'moderator-plinko.html'` and returns early without proceeding. If `currentUser` is truthy, it queries the DOM for an element with id `'create-modal'` and adds the `'open'` class to it. The function performs no other API calls and is synchronous.

### closeCreateModal
This function queries the DOM for an element with id `'create-modal'` and removes the `'open'` class from it. It reads no parameters or state, makes no other function calls, and has no branching. It is synchronous.

### selectEmoji
This function receives an HTMLElement parameter. It queries all elements with class `'emoji-opt'`, iterates over them, and removes the `'selected'` class from each. Then it adds the `'selected'` class to the passed element. It reads the `data-emoji` attribute from the element (defaulting to an empty string if absent) and passes that value to `setSelectedEmoji` from the `groups.state.ts` module. The function has no branching and is synchronous.

### submitCreateGroup
This async function queries the DOM for an input element with id `'group-name'` and reads its trimmed value. If the name is empty or shorter than 2 characters, it displays an alert and returns early. It then queries for the submit button element with id `'create-submit-btn'`, disables it, and changes its text to `'CREATING…'`. Inside a try block, it calls `safeRpc('create_group', ...)` with parameters including the name, a description read from the `'group-desc-input'` element, a category read from `'group-category'`, a public flag set to true, and the `selectedEmoji` from module state. If `safeRpc` returns an error, it throws that error. Otherwise, it parses the data (handling both string and object responses) and checks if `result.group_id` exists; if so and `_openGroup` is not null, it calls `_openGroup(result.group_id)`. The function then calls `closeCreateModal()` and clears the values of both the name and description input elements. In the catch block, it displays an alert with the error message. The finally block re-enables the button and restores its text to `'CREATE GROUP'`. The function is async and awaits the `safeRpc` call.

## Agent 03

### setCreateOpenGroupCallback
Reads the function parameter `fn`, which is a callback function with signature `(id: string) => void`. Writes the parameter to the module-level state variable `_openGroup`. This is a synchronous setter. Does not interact with the DOM or external APIs.

### openCreateModal
Reads the module-level state variable `currentUser` imported from groups.state.ts. If `currentUser` is falsy, performs a synchronous redirect by setting `window.location.href` to 'moderator-plinko.html' and returns early. If `currentUser` is truthy, reads the DOM element with id 'create-modal' (uses non-null assertion) and writes by adding the 'open' class to its classList. This is synchronous.

### closeCreateModal
Reads the DOM element with id 'create-modal' (uses non-null assertion) and writes by removing the 'open' class from its classList. This is synchronous and does not depend on any module state, parameters, or other functions.

### selectEmoji
Reads the parameter `el`, an HTMLElement, and accesses its dataset.emoji property with a fallback to empty string. Reads all DOM elements matching the selector '.emoji-opt' via querySelectorAll. Writes by removing the 'selected' class from all matched elements, then adds the 'selected' class to the parameter element. Calls setSelectedEmoji from the groups.state module with the extracted emoji value. This is synchronous with a forEach loop over the querySelectorAll results.

### submitCreateGroup
This is an async function. Reads from multiple DOM input elements: 'group-name' (text input), 'group-desc-input' (text input), and 'group-category' (select), extracting and trimming their values. Reads module-level state variables `selectedEmoji` and `_openGroup`. If the group name is missing or shorter than 2 characters, displays an alert and returns early. Disables the 'create-submit-btn' button and sets its textContent to 'CREATING…'. Calls the async safeRpc function with 'create_group' operation and parameters derived from the DOM reads, awaiting the result. If the response contains an error, throws it. Otherwise, parses the data (handling both string and object types) and checks if result.group_id exists. Clears the group-name and group-desc-input DOM values. If result.group_id and _openGroup are both truthy, calls _openGroup with the group_id. A catch block displays an alert with the error message or a fallback message. The finally block always re-enables the button and restores its textContent to 'CREATE GROUP', executing regardless of success or error paths.

## Agent 04

### setCreateOpenGroupCallback
This function takes a callback parameter of type `(id: string) => void` and assigns it to the module-level variable `_openGroup`. It reads nothing from DOM or external state. It writes only to `_openGroup`, setting it to the provided function reference. There are no control flow branches, loops, or async operations. The function is synchronous.

### openCreateModal
This function reads the module-level `currentUser` from `groups.state.ts`. It has two code paths: if `currentUser` is falsy, it sets `window.location.href` to 'moderator-plinko.html' and returns early. Otherwise, it reads the DOM element with id 'create-modal' and adds the class 'open' to it. The function calls no other functions besides the DOM API and does not write to module state. It is synchronous.

### closeCreateModal
This function reads the DOM element with id 'create-modal' and removes the class 'open' from it. It reads no parameters, module state, or external state. It writes only to the DOM. The function calls no other functions besides the DOM API and has no control flow branches. It is synchronous.

### selectEmoji
This function takes an `HTMLElement` parameter. It queries the DOM for all elements with class 'emoji-opt' and removes the 'selected' class from each, then adds the 'selected' class to the passed element. It reads the `data-emoji` dataset property from the passed element, defaulting to an empty string if absent. It calls `setSelectedEmoji` from `groups.state.ts` with this emoji value. The function writes to the DOM and to module state via `setSelectedEmoji`. It contains a forEach loop over the queried elements. It is synchronous.

### submitCreateGroup
This async function reads values from three DOM input elements: 'group-name' (HTMLInputElement, trimmed), 'group-desc-input' (HTMLInputElement, trimmed or null), and 'group-category' (HTMLSelectElement), along with the module-level state variable `selectedEmoji`. It validates that the group name has at least 2 characters after trimming; if validation fails, it shows an alert and returns early. It reads and disables the 'create-submit-btn' button, setting its text to 'CREATING…'. It then calls `safeRpc('create_group', {...})` with parameters including the trimmed name, description (or null), category, public flag, and selected emoji. If the response contains an error, it throws the error. Otherwise, it parses the response data as JSON if it is a string, then calls `closeCreateModal()`, clears the name and description input fields, and if the result contains a `group_id` and `_openGroup` is set, calls `_openGroup(result.group_id)`. In the catch block, it shows an alert with the error message or a default message. In the finally block, it re-enables the button and restores its text to 'CREATE GROUP'. The function is asynchronous.

## Agent 05

### setCreateOpenGroupCallback
This function receives a callback function as its parameter and assigns it to the module-level variable `_openGroup`. It reads the incoming function parameter, writes it directly to `_openGroup`, calls no other functions, has no branching or error handling, and is synchronous.

### openCreateModal
This function reads the module-level state variable `currentUser` and checks if it is falsy. If `currentUser` is falsy, it sets `window.location.href` to 'moderator-plinko.html' and returns early, navigating the user away from the page. If `currentUser` is truthy, it queries the DOM for an element with id 'create-modal' and adds the 'open' class to its classList. The function calls no other functions, has a single conditional branch, and is synchronous.

### closeCreateModal
This function queries the DOM for an element with id 'create-modal' and removes the 'open' class from its classList. It reads nothing from module state, calls no other functions, has no branching or error handling, and is synchronous.

### selectEmoji
This function receives an HTMLElement parameter, queries the DOM for all elements matching the selector '.emoji-opt', iterates through all matches and removes the 'selected' class from each, then adds the 'selected' class to the passed-in element, and calls `setSelectedEmoji` with the string value of the element's `data-emoji` attribute (defaulting to an empty string if the attribute is undefined). It reads the element parameter and the DOM, writes to the DOM and to module state via `setSelectedEmoji`, has a single loop but no branching, and is synchronous.

### submitCreateGroup
This async function reads values from three DOM input elements: 'group-name' (HTMLInputElement, trimmed), 'group-desc-input' (HTMLInputElement, trimmed or null), and 'group-category' (HTMLSelectElement), along with the module-level state variable `selectedEmoji`. It validates that the group name is non-empty and at least 2 characters long; if validation fails, it alerts the user and returns early. It reads the 'create-submit-btn' button element, disables it, and sets its text to 'CREATING…'. It then calls the `safeRpc` function with the event name 'create_group' and an object containing the read values as parameters. If the RPC response contains an error, it throws the error. Otherwise, it parses the response data (checking if it is a string first), calls `closeCreateModal`, clears the values of the two input fields, and if the parsed result contains a `group_id` and `_openGroup` is not null, it calls `_openGroup` with the group_id. The function has a try/catch/finally structure where the catch block alerts the user with the error message, and the finally block always re-enables the button and restores its text to 'CREATE GROUP'. It is asynchronous due to the await on the `safeRpc` call.
