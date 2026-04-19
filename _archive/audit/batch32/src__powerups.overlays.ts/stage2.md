# Stage 2 Outputs — powerups.overlays.ts

## Agent 01

### renderSilenceOverlay
This function creates a fixed-position DOM overlay that displays a silence notification. It reads the optional `opponentName` parameter (defaulting to 'Opponent' if not provided) and calls `escapeHTML()` on it. The function creates a `div` element with id `'powerup-silence-overlay'`, populates its innerHTML with styled content including an escaped opponent name, a muted emoji, and a countdown element initialized to "10", then appends the element to `document.body`. It initializes a module-local variable `remaining` to 10 and starts a `setInterval` callback that runs every 1000 milliseconds. Inside the interval callback, `remaining` is decremented, the countdown element's text content is updated via `document.getElementById('silence-countdown')`, and when `remaining` reaches 0 or below, the interval is cleared and the overlay element is removed from the DOM. The function returns the interval ID as a `ReturnType<typeof setInterval>`.

### renderRevealPopup
This function creates and displays a modal popup showing an opponent's equipped power-ups. It reads the `equipped` parameter (an array of `EquippedItem` objects) and first removes any existing popup by querying `document.getElementById('powerup-reveal-popup')`. It then maps over the equipped items, looking up each power-up in the imported `CATALOG` object using the `power_up_id` field, and constructing HTML for each item that displays an icon (from the item or catalog, with fallback to '?') and a name (from the item or catalog, with fallback to the power-up ID). Both icon and name are escaped via `escapeHTML()`. If the items array is empty after mapping, an alternative HTML string indicating "No power-ups equipped" is used. A new `div` is created with id `'powerup-reveal-popup'`, styled with fixed positioning and overlay background, and its innerHTML is set to a modal containing the title "👁️ OPPONENT'S LOADOUT", the mapped items (or empty state), and a dismiss button. The popup is appended to `document.body`. An event listener is attached that removes the popup if the user clicks the popup itself or the dismiss button. Additionally, a `setTimeout` callback is scheduled to automatically remove the popup after 8000 milliseconds, and this callback runs asynchronously without being awaited.

### renderShieldIndicator
This function creates and displays a small fixed-position indicator in the top-right corner of the page. It creates a `div` element with id `'powerup-shield-indicator'`, sets its text content to `'🛡️ SHIELD ACTIVE'`, applies inline CSS styles for positioning and appearance, appends it to `document.body`, and immediately returns the created element as an `HTMLDivElement`.

### removeShieldIndicator
This function removes the shield indicator from the DOM. It queries for an element with id `'powerup-shield-indicator'` using `document.getElementById()` and calls the optional chaining operator to invoke `.remove()` if the element exists, with no effect if the element is not found.

### hasMultiplier
This function returns a boolean indicating whether the equipped items array contains a multiplier power-up. It reads the `equipped` parameter (an array of `EquippedItem` objects), treats it as an empty array if falsy, and uses `.some()` to check whether any equipped item has a `power_up_id` equal to the string `'multiplier_2x'`. It returns `true` if such an item exists, `false` otherwise.

---

## Agent 02

### renderSilenceOverlay
Creates a fixed-position DOM overlay at the top of the page displaying "SILENCED" status with a 10-second countdown timer. The function receives an optional `opponentName` parameter (defaults to "Opponent") and reads the `escapeHTML` utility and DOM. It creates a div element with id `powerup-silence-overlay`, sets CSS properties for positioning and styling (linear gradient background, z-index 200), and inserts HTML with the escaped opponent name, a 🤫 emoji, and a countdown element initialized to "10". The function appends this overlay to `document.body`. It creates and starts a `setInterval` timer that decrements a local `remaining` variable from 10 each second, updating the text content of the `silence-countdown` element by querying the DOM, and when `remaining` reaches 0 or below, clears the interval and removes the overlay from the DOM. The function returns the timer handle from `setInterval`.

### renderRevealPopup
Displays a fixed-position modal overlay showing the opponent's equipped power-ups in a grid layout. The function receives an `equipped` array of `EquippedItem` objects. It first removes any existing element with id `powerup-reveal-popup` if present by querying the DOM. It reads the `CATALOG` object and maps over the `equipped` array (or empty array if falsy), looking up each item's metadata in `CATALOG` by `power_up_id` and building HTML strings that use `escapeHTML` to sanitize the icon and name from either the equipped item or the catalog entry. It creates a div element with id `powerup-reveal-popup`, sets CSS for a centered fixed overlay with z-index 300, and populates its innerHTML with a modal container containing the title "👁️ OPPONENT'S LOADOUT", the mapped items joined as HTML, or a fallback message if no items exist, and a dismiss button. The overlay is appended to `document.body`. The function attaches a click event listener that removes the popup if the click targets either the popup itself or the close button. It also calls `setTimeout` to automatically remove the popup after 8000 milliseconds regardless of user interaction. The function returns `void`.

### renderShieldIndicator
Creates and returns a fixed-position div element at the top right of the page that displays shield status. The function has no parameters and reads the DOM. It creates a div with id `powerup-shield-indicator`, sets CSS properties for top-right positioning (fixed, top 0, right 16px), border-radius with rounded bottom corners, z-index 100, and styling using CSS variables. It sets the text content to "🛡️ SHIELD ACTIVE" and appends the element to `document.body`. The function returns the created indicator element (an HTMLDivElement).

### removeShieldIndicator
Removes the shield indicator element from the DOM. The function has no parameters, no return value, and performs one operation: it queries for an element with id `powerup-shield-indicator` and calls `.remove()` on it if found using optional chaining.

### hasMultiplier
Returns a boolean indicating whether the equipped items array contains a multiplier power-up. The function receives an `equipped` array of `EquippedItem` objects. It calls `.some()` on the array (coalescing to empty array if falsy) to check if any item has `power_up_id` equal to the string `'multiplier_2x'`. Returns `true` if such an item exists, otherwise `false`.

---

## Agent 03

### renderSilenceOverlay
This function accepts an optional `opponentName` parameter (defaulting to 'Opponent') and creates a fixed-position overlay at the top of the page. It creates a div element with id 'powerup-silence-overlay' and populates it with inline styles including a gradient background, flexbox layout, and a fade-in animation. The innerHTML contains three elements: an emoji span (🤫), a heading span with the escaped opponent name followed by " SILENCED", and a countdown span with id 'silence-countdown' showing an initial value of 10. The div is appended to document.body. The function then initializes a local variable `remaining` to 10 and sets up a setInterval timer that fires every 1000 milliseconds. On each interval tick, `remaining` decrements, the countdown span's text content updates to the current remaining value, and when remaining reaches 0 or below, the interval clears itself and removes the overlay element from the DOM. The function returns the timer interval ID (the return value from setInterval).

### renderRevealPopup
This function accepts an `equipped` parameter of type `EquippedItem[]` and reads from the module-level CATALOG object imported from powerups.types.ts. The function first removes any existing element with id 'powerup-reveal-popup'. It then maps over the equipped array (or an empty array if equipped is falsy), and for each item, looks up the corresponding entry in CATALOG using the power_up_id, extracting icon and name properties with fallback chains. Each item is transformed into an HTML string representing a flex container with the item's icon and name, falling back to the item's power_up_id if name is absent. A new popup div is created with id 'powerup-reveal-popup' and fixed positioning that covers the entire viewport with z-index 300. The innerHTML constructs a centered modal containing a header "👁️ OPPONENT'S LOADOUT", the mapped items (or a "No power-ups equipped" message if the array is empty), and a dismiss button. The popup is appended to document.body. An event listener is attached that removes the popup if the user clicks either the popup background or the dismiss button with id 'reveal-close-btn'. Additionally, a setTimeout schedules the popup to be removed after 8000 milliseconds, regardless of user interaction.

### renderShieldIndicator
This function takes no parameters and creates a new div element with id 'powerup-shield-indicator'. It applies inline styles that position the indicator as fixed at the top right of the page (top: 0, right: 16px) with padding, background color from the CSS variable --mod-accent-border, a border, and text styling including font, size, weight, and letter spacing. The textContent is set to '🛡️ SHIELD ACTIVE'. The div is appended to document.body and the function returns the div element itself.

### removeShieldIndicator
This function takes no parameters and removes the HTML element with id 'powerup-shield-indicator' from the DOM if it exists (the optional chaining operator `?.` ensures no error if the element is not found).

### hasMultiplier
This function accepts an `equipped` parameter of type `EquippedItem[]` and returns a boolean. It calls the `some` method on the equipped array (or an empty array if equipped is falsy), checking if any item in the array has a power_up_id property with the exact value 'multiplier_2x'. The function returns true if at least one match is found, or false otherwise.

---

## Agent 04

### renderSilenceOverlay
The function accepts an optional `opponentName` string parameter. It reads the DOM to create and append new elements. It creates a `div` element with id 'powerup-silence-overlay' and sets inline styles including a fixed position, flex layout, and gradient background. It uses `escapeHTML()` to sanitize the opponent name, defaulting to 'Opponent' if not provided, and inserts the HTML into the overlay containing an emoji, the opponent name with "SILENCED" text, and a countdown element. It appends the overlay to `document.body`. The function initializes a local variable `remaining` to 10 and calls `setInterval()` with a callback that decrements `remaining` every 1000 milliseconds, queries the DOM for the element with id 'silence-countdown', updates its `textContent` to the remaining value if the element exists, and when `remaining` reaches 0 or below, calls `clearInterval()` to stop the timer and removes the overlay from the DOM with `overlay.remove()`. The function returns the interval ID from `setInterval()`.

### renderRevealPopup
The function accepts an `equipped` parameter of type `EquippedItem[]`. It reads from the DOM by querying and removing any existing element with id 'powerup-reveal-popup', reads from the `CATALOG` object to look up power-up metadata (icon and name) for each equipped item, and accesses `document.body` to append the new popup. It creates a `div` element with id 'powerup-reveal-popup' and transforms the `equipped` array by mapping each item to HTML markup that includes the item's icon (falling back to the catalog icon), the item's name (falling back to the catalog name or power_up_id), and escapes HTML in all inserted values using `escapeHTML()`. The popup contains a grid of equipped items or a fallback message if the array is empty. It appends the popup to `document.body` and attaches a click event listener that removes the popup if the click target is the popup itself or the 'reveal-close-btn' button. It also calls `setTimeout()` to remove the popup after 8000 milliseconds as a fire-and-forget operation. The function returns `void`.

### renderShieldIndicator
The function takes no parameters and reads from the DOM by accessing `document.body`. It creates a `div` element with id 'powerup-shield-indicator', sets inline styles including fixed positioning with top: 0, right: 16px, and sets the text content to '🛡️ SHIELD ACTIVE'. It appends the element to `document.body` and returns the created `HTMLDivElement` element.

### removeShieldIndicator
The function takes no parameters, reads from the DOM by querying for an element with id 'powerup-shield-indicator', and if found, removes it by calling the `remove()` method. The function returns `void` and has no branches or error handling.

### hasMultiplier
The function accepts an `equipped` parameter of type `EquippedItem[]`. It reads the parameter directly and calls the `some()` method on the array (with an empty array fallback if `equipped` is falsy), iterating through the array to check if any element has a `power_up_id` property equal to the string 'multiplier_2x'. It returns a boolean value: `true` if at least one equipped item matches the condition, `false` otherwise.

---

## Agent 05

### renderSilenceOverlay
This function accepts an optional `opponentName` string parameter and creates a fixed-position DOM overlay element. It creates a new div with id `powerup-silence-overlay`, sets its CSS styling with flexbox layout and a gradient background, and populates its innerHTML with markup containing the muted speaker emoji, opponent name (escaped via escapeHTML, defaulting to 'Opponent'), and a countdown span initialized to "10". The function appends this overlay to document.body. It then initializes a module-level `remaining` variable to 10 and creates an interval timer using setInterval that fires every 1000 milliseconds; on each tick, it decrements `remaining`, queries the DOM for the element with id `silence-countdown`, updates its textContent to the string representation of `remaining` if the element exists, and when `remaining` reaches 0 or below, calls clearInterval to stop the timer and invokes remove() on the overlay element to delete it from the DOM. The function returns the setInterval object itself.

### renderRevealPopup
This function accepts an `equipped` parameter of type EquippedItem array and returns void. It first removes any existing element with id `powerup-reveal-popup` using optional chaining. It then maps over the equipped array (or an empty array if equipped is falsy) to generate HTML item markup: for each item, it reads the power_up_id from the item, looks up the corresponding catalog entry in the CATALOG module-level object using that power_up_id cast as PowerUpId, and constructs a div with the item's icon (or catalog icon, or '?'), and the item's name (or catalog name, or power_up_id), all escaped via escapeHTML. The function creates a new div element with id `powerup-reveal-popup`, sets its CSS for fixed full-screen positioning with flex centering, and sets its innerHTML to a modal structure containing the header "👁️ OPPONENT'S LOADOUT", either the joined item markup or a "No power-ups equipped" message if the items array is empty, and a dismiss button. The popup is appended to document.body. The function then attaches a click event listener that removes the popup if the click target is either the popup div itself or the button with id `reveal-close-btn`. Additionally, it calls setTimeout with a callback that removes the popup after 8000 milliseconds, regardless of user interaction.

### renderShieldIndicator
This function accepts no parameters and returns an HTMLDivElement. It creates a new div element with id `powerup-shield-indicator`, sets its CSS styling with fixed positioning at the top-right of the viewport (using `right:16px`), applies padding, background color, border, border-radius, and typography properties, sets its textContent to '🛡️ SHIELD ACTIVE', appends it to document.body, and returns the div element itself.

### removeShieldIndicator
This function accepts no parameters and returns void. It queries the DOM for an element with id `powerup-shield-indicator` and calls remove() on it if it exists, using optional chaining to safely handle the case where no such element is found.

### hasMultiplier
This function accepts an `equipped` parameter of type EquippedItem array and returns a boolean. It coalesces the equipped parameter to an empty array if it is falsy, calls some() on the result to test whether any element in the array has a power_up_id property equal to the string literal 'multiplier_2x', and returns the boolean result of that test.
