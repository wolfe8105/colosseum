# Stage 2 Outputs — async.render.wager.ts

## Agent 01

### _showWagerPicker

When called with a `debateId` string and a `side` string, this function clears any existing wager picker from the DOM and then constructs a new prediction wager input form. It begins by calling `_hideWagerPicker()` to remove any active picker. It then reads the current user's token balance from `getCurrentProfile()`, defaulting to 0 if unavailable, and searches the `state.predictions` array for a prediction matching the provided `debateId`. If no matching prediction exists, the function returns early without further action. For predictions that exist, it extracts the side label from the prediction's `p1` or `p2` field depending on whether `side` equals 'a' or 'b', escaping both the label and the `debateId` for safe HTML insertion. It then builds an array of quick-select wager amounts ([10, 25, 50, 100, 250]) filtered to exclude any amount exceeding the minimum of 500 or the user's token balance. The function generates inline HTML for the wager picker UI, including a number input field, buttons for the quick amounts, confirm and cancel buttons, and a warning message if the balance is less than 1 token. It then queries the DOM for a prediction card element matching the escaped `debateId` and a specific background color style. If no such card exists, the function returns without further action. If a card is found, the function sets the module-level `_activeWagerDebateId` variable to the provided `debateId`, creates a new div element with id `wager-picker-wrapper`, sets its innerHTML to the generated picker HTML, appends this element to the card, and focuses the wager amount input field if it exists.

### _hideWagerPicker

When called with no arguments, this function clears the active wager picker state and removes it from the DOM. It sets the module-level `_activeWagerDebateId` variable to `null`. It then queries the DOM for an element with id `wager-picker-wrapper` and, if found, removes it from the DOM using the `remove()` method.

## Agent 02

### _showWagerPicker

The function reads the `debateId` and `side` parameters, the `state.predictions` array to find a prediction matching the debate ID, the current user's token balance from `getCurrentProfile()`, and the module-level variable `_activeWagerDebateId`. It first calls `_hideWagerPicker()` to remove any existing picker. If the prediction is not found, it returns early. It then constructs a safe side value (normalized to 'a' or 'b'), escapes the debate ID and side label using the `esc` function, and filters quick-amount buttons to include only amounts up to the minimum of 500 or the user's balance. The function generates HTML for the picker UI with an input field, quick-amount buttons, and confirm/cancel buttons. It queries the DOM for a prediction card element matching the debate ID by searching for an element with `data-action="predict"` and walking up to find a parent with a specific background color. If the card is not found, the function returns early. It then sets `_activeWagerDebateId` to the debate ID, creates a new div element with id `wager-picker-wrapper`, sets its innerHTML to the generated HTML, appends it to the card, and focuses the input field if it exists. The function writes to the DOM by appending the picker HTML and modifying `_activeWagerDebateId`. It does not return a value and is synchronous.

### _hideWagerPicker

The function reads the module-level variable `_activeWagerDebateId` (though it does not use it in its logic) and queries the DOM for an element with id `wager-picker-wrapper`. It sets `_activeWagerDebateId` to null and, if the element exists, removes it from the DOM. The function writes to the module-level state by setting `_activeWagerDebateId` to null and modifies the DOM by removing the picker wrapper element. It does not return a value and is synchronous.

## Agent 03

### _showWagerPicker

When called with a `debateId` string and a `side` string, this function first calls `_hideWagerPicker()` to remove any existing wager picker from the DOM. It then reads the current user's token balance by calling `getCurrentProfile()` and accessing the `token_balance` property, defaulting to 0 if the profile is not found. It searches the module-level `state.predictions` array for a prediction matching the provided `debateId` and returns early if no match is found. It reads the prediction object to extract `p1` and `p2` field values, then sanitizes them along with the `debateId` using the `esc` function (an alias for `escapeHTML`). It normalizes the `side` parameter to either `'a'` or `'b'`. It computes an array of quick-select wager amounts `[10, 25, 50, 100, 250]` filtered to include only amounts less than or equal to the minimum of 500 and the user's token balance. It constructs an HTML string containing a wager picker card with an input field, quick-amount buttons, confirm and cancel buttons, and a balance-display line; the HTML includes CSS variables for theming and data attributes for action dispatch. It queries the DOM to locate a prediction card matching the escaped `debateId`, walks up to the closest parent `div` with background color styling, and returns early if no card is found. It sets the module-level `_activeWagerDebateId` variable to the provided `debateId`. It creates a new DOM element with id `'wager-picker-wrapper'`, sets its innerHTML to the constructed HTML string, and appends it to the prediction card. It then queries that element for an input field with id `'wager-amount-input'` and focuses it if found. The function is not async and returns `void`.

### _hideWagerPicker

When called, this function sets the module-level `_activeWagerDebateId` variable to `null`. It queries the DOM for an element with id `'wager-picker-wrapper'` and calls `remove()` on it if found. The function is not async and returns `void`.

## Agent 04

### _showWagerPicker

This function reads the current user's token balance from `getCurrentProfile()`, searches the `state.predictions` array for a prediction matching the given `debateId`, and returns early if no matching prediction is found. It retrieves the side labels from the prediction object, escapes them for HTML safety, and normalizes the `side` parameter to either 'a' or 'b'. It filters a hardcoded array of quick-bet amounts `[10, 25, 50, 100, 250]` to include only amounts less than or equal to the minimum of 500 and the user's token balance. It constructs an HTML string for the wager picker UI, incorporating the escaped side label, balance, quick amounts, and debate ID. The function calls `_hideWagerPicker()` at the start to remove any existing picker. It then queries the DOM for a prediction card element matching the debate ID and returns early if not found. It creates a new div element with id 'wager-picker-wrapper', sets its innerHTML to the constructed HTML string, and appends it to the found card. Finally, it sets `_activeWagerDebateId` module-level state to the debate ID and focuses the wager amount input field if it exists in the DOM.

### _hideWagerPicker

This function sets the `_activeWagerDebateId` module-level state variable to null and queries the DOM for an element with id 'wager-picker-wrapper'. If such an element exists, it removes the element from the DOM.

## Agent 05

### _showWagerPicker

When called, this function first invokes _hideWagerPicker to remove any existing wager picker from the DOM. It reads the module-level state variable `_activeWagerDebateId`, the current user's token balance via getCurrentProfile(), and searches the state.predictions array for a prediction matching the provided debateId. If no matching prediction is found, the function returns early without making further changes. For a matching prediction, it retrieves the token balance (defaulting to 0), sanitizes the debateId and side parameters using esc(), and determines a sideLabel by looking up either p1 or p2 from the prediction object depending on whether side is 'a' or 'b'. It then filters an array of quick-wager amounts [10, 25, 50, 100, 250] to include only values less than or equal to the minimum of 500 and the user's balance. The function constructs a multi-part HTML picker interface including a header with the side label and balance display, an input field for manual wager amounts, dynamically generated quick-amount buttons filtered by balance, and confirm/cancel buttons. It then queries the DOM for a prediction card element matching data-action="predict" with the safe debate ID, locating the nearest ancestor div with a blue background style (background:#132240). If no such card is found, the function returns early without appending anything. If found, the function sets the module-level `_activeWagerDebateId` to the provided debateId, creates a new div element with id 'wager-picker-wrapper', sets its innerHTML to the constructed pickerHtml, appends it to the card, and finally focuses the wager amount input field if it exists.

### _hideWagerPicker

This function sets the module-level `_activeWagerDebateId` to null and then queries the DOM for an element with id 'wager-picker-wrapper'. If such an element exists, the function calls its remove() method to delete it from the DOM.
