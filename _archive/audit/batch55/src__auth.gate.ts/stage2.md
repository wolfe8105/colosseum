# Stage 2 Outputs — auth.gate.ts

## Agent 01

### esc
When called, esc receives a string, null, or undefined parameter `s`. It immediately calls `escapeHTML(s)` (imported from `./config.ts`) and returns its result. The function has no conditional logic, side effects, or async behavior—it acts as a pass-through wrapper to the `escapeHTML` function. Whether `escapeHTML` handles null/undefined internally or throws is not evident from this file alone.

### requireAuth
When called, requireAuth reads the current user state via `getCurrentUser()` and placeholder mode state via `getIsPlaceholderMode()`. If a user is logged in and not in placeholder mode, it immediately returns `true`. If either condition fails, it proceeds with modal creation. It first removes any existing element with id `'auth-gate-modal'` from the DOM, then escapes the `actionLabel` parameter using `esc()` (defaulting to the string `'do that'` if not provided). It creates a new div element with id `'auth-gate-modal'`, sets inline styles for fixed positioning and overlay appearance, constructs an HTML string containing a sign-up modal with two links (to `moderator-plinko.html` and `moderator-login.html`, both with a `returnTo` query parameter built from the current pathname and search) and a close button, and injects this HTML via `innerHTML`. The modal is appended to `document.body`. Two event listeners are then attached: one to the close button that removes the modal, and one to the modal itself that removes it if the click target is the modal element itself (backdrop click). Finally, the function returns `false`. The function is synchronous and makes no external API calls beyond DOM manipulation and reading from imported functions.

## Agent 02

### esc
Reads the `s` parameter (string or null/undefined) and calls `escapeHTML(s)` from the config module, returning the escaped string result. Does not read module state or external state. Synchronous function with no side effects. Always returns a string (escapeHTML handles null/undefined conversion).

### requireAuth
Reads the current user state by calling `getCurrentUser()` and `getIsPlaceholderMode()`. If user exists and not in placeholder mode, returns `true` immediately. Otherwise, reads `window.location.pathname` and `window.location.search` to construct a return URL. Reads the optional `actionLabel` parameter (string), escapes it via `esc()`, then writes to the DOM by creating a modal div with id `auth-gate-modal`, setting inline styles and innerHTML containing sign-up/login links and a close button, appending it to `document.body`. Reads the DOM to remove any existing `auth-gate-modal` before creating the new one. Attaches two click event listeners: one on the close button that removes the modal, one on the modal itself that removes it if clicked on the backdrop. Returns `false` in all non-authenticated paths. Synchronous; no async operations.

## Agent 03

### esc
Reads the input string parameter (string, null, or undefined). Calls escapeHTML() from config.ts with the input and returns its result. No state reads, DOM access, or side effects. Synchronous. Returns a string regardless of input type.

### requireAuth
Reads the result of two synchronous function calls: getCurrentUser() and getIsPlaceholderMode(). If both conditions pass (user exists and not in placeholder mode), returns true immediately without further execution. Otherwise, reads the current window.location pathname and search properties to construct a URL-encoded returnTo parameter. Creates a div DOM element with id 'auth-gate-modal', sets its inline CSS styles, and populates innerHTML with a template string containing two links with query parameters and a button. Before creation, queries and removes any existing element with id 'auth-gate-modal'. Appends the new modal to document.body. Attaches two event listeners: one on the close button (id 'auth-gate-close-btn') that removes the modal when clicked, and one on the modal itself that removes it when the click target is the modal element itself (not child elements). The actionLabel parameter (if provided) is escaped via esc() before interpolation into innerHTML; if not provided, defaults to the literal string 'do that'. Returns false after the modal is displayed. Synchronous, no error handling.

## Agent 04

### esc
Reads the `s` parameter (string, null, or undefined). Calls `escapeHTML(s)` from the config module and returns the result. No state access or modification. Synchronous, no control flow. Returns a string. If `escapeHTML` is not yet loaded, the module-level import will defer execution until that dependency is available.

### requireAuth
Reads `getCurrentUser()` and `getIsPlaceholderMode()` from the auth.core module, along with `window.location.pathname`, `window.location.search`, and the DOM (querying for any existing element with id 'auth-gate-modal'). Removes any pre-existing element with that id. If both user is logged in and not in placeholder mode, returns `true` immediately. Otherwise, creates a new `div` element, sets its id to 'auth-gate-modal', applies fixed positioning with overlay styling, constructs a modal template with escaped `actionLabel` (defaulting to 'do that' if undefined), encodes the current location as a URL parameter for return navigation, and injects the template as innerHTML. Appends the modal to the document body, then attaches two click handlers: one to the close button that removes the modal, and one to the modal backdrop that removes the modal if the click target is the modal itself (event delegation). Returns `false`. Synchronous. The modal persists in the DOM until dismissed or `requireAuth` is called again.

## Agent 05

### esc
Accepts a string, null, or undefined parameter. Calls `escapeHTML()` from the imported `config.ts` module and returns its result as a string. Always delegates to the external function without conditional logic or fallback behavior despite the JSDoc comment stating "Falls back to inline escape if config not loaded yet"—that behavior does not exist in the implementation.

### requireAuth
Calls `getCurrentUser()` and `getIsPlaceholderMode()` from the imported `auth.core.ts` module; if both conditions are met (user exists and placeholder mode is off), returns `true` immediately. Otherwise, reads `document.getElementById('auth-gate-modal')` and removes any existing modal element. Calls `esc()` to escape the `actionLabel` parameter (defaulting to `'do that'` if undefined), then constructs a new `div` element with `id='auth-gate-modal'`, sets inline CSS and populated `innerHTML` containing form links and a close button. The HTML includes `encodeURIComponent(window.location.pathname + window.location.search)` to capture the current page URL as a `returnTo` query parameter. Appends the modal to `document.body`, then attaches two click event listeners: one on the close button element (removes the modal), and one on the modal itself (removes it only if the click target is the modal backdrop, not nested children). Returns `false`. The function is synchronous with no async operations or error handling.
