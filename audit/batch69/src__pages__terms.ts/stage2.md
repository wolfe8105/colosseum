# Stage 2 Outputs — terms.ts

## Agent 01
### showTab
When called with a `tab` parameter of type `LegalTab` (one of 'tos', 'privacy', or 'community'), this function modifies the DOM to display the active legal page and highlight the active tab. It reads the DOM via `document.querySelectorAll()`, `document.getElementById()`, and accesses `TAB_MAP`, a module-level object mapping tab names to numeric indices (tos: 0, privacy: 1, community: 2).

It first removes the 'active' class from all `.legal-page` elements and all `.legal-tab` elements. It then looks up the element with id `'page-' + tab` and adds 'active' to it if found. Next it queries all `.legal-tab` elements, retrieves the index for the tab from `TAB_MAP`, and adds 'active' to the tab element at that index if both the index exists in the map and the element exists in the DOM. Finally, it calls `window.scrollTo(0, 0)` to scroll to the top of the page. The function is synchronous and has no return value (returns `undefined`).

## Agent 02
### showTab
When `showTab` is called with a `tab` parameter of type `LegalTab` (one of 'tos', 'privacy', or 'community'), the function performs the following operations:

First, it reads from the DOM by querying all elements with the classes `.legal-page` and `.legal-tab`, removing the `active` class from each. It then reads the `tab` parameter and the module-level `TAB_MAP` constant to determine a numeric index. It queries the DOM for an element with id `page-` concatenated with the tab name and, if that element exists, adds the `active` class to it. It queries the DOM again for all elements with class `.legal-tab`, looks up the index in `TAB_MAP` for the provided tab name, and if both the index is defined and an element exists at that array position, it adds the `active` class to that element. Finally, it calls `window.scrollTo(0, 0)` to scroll the page to the top-left corner.

The function does not return a value (its return type is `void`). It is synchronous and contains no loops, error handling, or branching on read failures; it simply skips operations if queried elements do not exist or if the tab name does not exist in `TAB_MAP`.

## Agent 03
### showTab
This function reads the `tab` parameter (a `LegalTab` type value: 'tos', 'privacy', or 'community') and module-level state in the form of DOM elements with CSS classes. It reads `window.location` implicitly through the hash check at line 33-34.

The function executes the following operations in order:
1. Calls `document.querySelectorAll('.legal-page')` and removes the 'active' class from all matching elements via `forEach`
2. Calls `document.querySelectorAll('.legal-tab')` and removes the 'active' class from all matching elements via `forEach`
3. Calls `document.getElementById('page-' + tab)` to retrieve a specific page element; if the element exists, adds the 'active' class to it
4. Calls `document.querySelectorAll('.legal-tab')` again to retrieve all tab elements
5. Looks up the `tab` parameter in the `TAB_MAP` object to get its corresponding index; if the index is defined and a tab element exists at that index, adds the 'active' class to it
6. Calls `window.scrollTo(0, 0)` to scroll the page to the top

The function writes to the DOM by adding and removing the 'active' CSS class on elements, which presumably changes their display state. It also writes to the browser viewport scroll position. It has no return value (returns `undefined`).

The function is not async. There are no error paths, try/catch blocks, or early returns—it contains only conditional checks that gracefully fail silently if expected DOM elements do not exist.

## Agent 04
### showTab
When called with a `LegalTab` parameter (one of 'tos', 'privacy', or 'community'), the function performs tab switching on the terms page. It reads the parameter value and reads module-level state via the `TAB_MAP` constant. It does not return a value (void return type).

The function first removes the 'active' class from all DOM elements matching the selectors '.legal-page' and '.legal-tab' by calling `document.querySelectorAll()` twice and iterating through each collection with `forEach()`, calling `classList.remove('active')` on each element. It then constructs a page element ID by concatenating 'page-' with the tab parameter and attempts to retrieve that element using `document.getElementById()`. If the element exists, it adds the 'active' class to it. Next, it retrieves all elements matching '.legal-tab' with another `querySelectorAll()` call, looks up the tab parameter in `TAB_MAP` to get a numeric index, and if the index is defined and the element at that index exists, it adds the 'active' class to that tab element. Finally, it calls `window.scrollTo(0, 0)` to scroll the page to the top. The function is synchronous and contains no error handling or try/catch blocks.

## Agent 05
### showTab
The function is synchronous and takes a `LegalTab` parameter (one of 'tos', 'privacy', or 'community'). It reads from the DOM using `document.querySelectorAll()` and `document.getElementById()`, and reads the module-level `TAB_MAP` object which maps tab names to numeric indices. It does not read any external state beyond the DOM.

The function writes to the DOM by adding and removing CSS classes. It executes in the following order: (1) calls `querySelectorAll('.legal-page')` and removes the 'active' class from all matching elements, (2) calls `querySelectorAll('.legal-tab')` and removes the 'active' class from all matching elements, (3) constructs an element ID using `'page-' + tab` and retrieves it via `getElementById()`, then adds the 'active' class if the element exists, (4) calls `querySelectorAll('.legal-tab')` again and looks up the numeric index from `TAB_MAP[tab]`, then adds the 'active' class to the element at that index if both the index is defined and the element exists, (5) calls `window.scrollTo(0, 0)` to scroll the page to the top. The function returns `void`. There are no branches, loops, or error handling—the conditional checks at steps (3) and (4) silently do nothing if elements are not found or if the index is undefined.
