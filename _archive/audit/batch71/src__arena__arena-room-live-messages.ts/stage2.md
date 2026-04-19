# Stage 2 Outputs — arena-room-live-messages.ts

## Agent 01

### addMessage

When called, `addMessage` reads the DOM element with id `arena-messages`, the module-level variable `currentDebate`, the current user profile via `getCurrentProfile()`, and the `text`, `side`, `round`, and `isAI` parameters. If the `arena-messages` element does not exist in the DOM, the function returns early without further action. If the element exists and `currentDebate` has a `messages` array, the function pushes a message object to that array with a role set to 'user' if `side` matches `currentDebate.role` or 'assistant' otherwise, storing the text and round. The function then determines a name string based on the `isAI` parameter, whether the message is from the current user, the current profile's display name, and the opponent's name. It creates a new div element with classes `arena-msg`, `side-${side}`, and `arena-fade-in`, sets its innerHTML to a multi-line template containing an escaped name label, escaped text, and round information, and appends this div to the `arena-messages` container. Finally, it scrolls the `arena-messages` container to its bottom with smooth behavior by calling `scrollTo()` with `top` set to `scrollHeight`. The function reads from `escapeHTML()` to sanitize both the name and text before inserting them into the DOM.

### addSystemMessage

When called, `addSystemMessage` reads the DOM element with id `arena-messages` and the `text` parameter. If the `arena-messages` element does not exist in the DOM, the function returns early without further action. If the element exists, the function creates a new div element with classes `arena-msg`, `system`, and `arena-fade-in`, sets its textContent to the `text` parameter (which bypasses HTML parsing), and appends this div to the `arena-messages` container. Finally, it scrolls the `arena-messages` container to its bottom with smooth behavior by calling `scrollTo()` with `top` set to `scrollHeight`. Unlike `addMessage`, this function does not modify any module-level state and does not call `escapeHTML()` because `textContent` does not parse HTML.

## Agent 02

### addMessage

When called, `addMessage` receives a `side` parameter indicating debate role, a message text, a round number, and an `isAI` boolean. It reads the DOM element with id 'arena-messages'; if the element does not exist, the function returns early without further action. It reads module-level state `currentDebate` imported from `arena-state.ts`, and if the debate object exists and has a `messages` array, it pushes an object into that array containing a `role` field (set to 'user' if `side` matches `currentDebate.role`, otherwise 'assistant'), the text, and the round number. It reads the current profile from `getCurrentProfile()` imported from `auth.ts`. It constructs a name string determined by three conditions: if `isAI` is true, the name is the Unicode robot emoji followed by 'AI'; otherwise, if `side` equals `currentDebate?.role`, the name is the profile's display_name or defaults to 'You'; otherwise, the name is the debate's opponent name or defaults to 'Opponent'. The function creates a DOM div element with class names `arena-msg`, `side-${side}`, and `arena-fade-in`. It calls `escapeHTML()` imported from `config.ts` on the name and text to sanitize them, then sets the div's innerHTML to a template containing three child divs: one with class `msg-label` displaying the escaped name, one displaying the escaped text, and one with class `msg-round` displaying "Round {round}". The function appends this div to the arena-messages element and calls the `scrollTo()` method with `{top: messages.scrollHeight, behavior: 'smooth'}` to scroll the container to its bottom with smooth animation. The function returns void.

### addSystemMessage

When called, `addSystemMessage` receives a text parameter. It reads the DOM element with id 'arena-messages'; if the element does not exist, the function returns early without further action. It creates a DOM div element with class names `arena-msg`, `system`, and `arena-fade-in`, and sets its `textContent` property to the text parameter (which is plaintext, not HTML). The function appends this div to the arena-messages element and calls the `scrollTo()` method with `{top: messages.scrollHeight, behavior: 'smooth'}` to scroll the container to its bottom with smooth animation. The function returns void.

## Agent 03

### addMessage

When called, `addMessage` reads the DOM element with id 'arena-messages', returning early if it doesn't exist. It reads the module-level `currentDebate` object to check if it has a `messages` array, and if so, pushes a new message object containing the role ('user' if the `side` parameter matches the debate's own role, otherwise 'assistant'), the text parameter, and round parameter. It reads the profile returned by `getCurrentProfile()` and compares the `side` parameter to the debate's role to determine whether the message is from the user. It constructs a display name: if `isAI` is true, it uses the literal string 'AI' with a robot emoji; otherwise it uses the current profile's `display_name` if `side` matches the debate's role, falling back to 'You', or if not, uses the debate's `opponentName`, falling back to 'Opponent'. It creates a new `div` element, sets its class to `arena-msg side-${side} arena-fade-in`, and sets its innerHTML to a three-section structure: a label div containing the escaped display name, a content div containing the escaped text, and a round indicator div. It appends this element to the messages container and calls `scrollTo` on the container with smooth scroll behavior to move to the bottom.

### addSystemMessage

When called, `addSystemMessage` reads the DOM element with id 'arena-messages', returning early if it doesn't exist. It creates a new `div` element, sets its class to `arena-msg system arena-fade-in`, and sets its textContent to the text parameter. It appends this element to the messages container and calls `scrollTo` on the container with smooth scroll behavior to move to the bottom.

## Agent 04

### addMessage

When called, `addMessage` reads the DOM element with id `arena-messages` and returns early if it doesn't exist. It reads the module-level `currentDebate` state object and the result of calling `getCurrentProfile()` to get the user's profile. It reads the `side`, `text`, `round`, and `isAI` parameters. It determines whether the caller is the user by comparing `side` to `debate?.role`.

It updates module-level state by pushing an object with `role`, `text`, and `round` properties into `debate.messages` if the `currentDebate` object exists and has a `messages` property. The `role` property is set to `'user'` if the side matches the debate role, otherwise `'assistant'`.

It constructs a name string by branching on `isAI`: if true, uses the robot emoji (U+1F916) and `'AI'`; if false and `isMe` is true, uses the display name from the profile or the string `'You'`; otherwise uses the opponent name from the debate object or `'Opponent'`. It calls `escapeHTML()` to sanitize the name and text parameters.

It creates a new DOM `div` element, sets its `className` to a computed string `arena-msg side-${side} arena-fade-in`, sets its `innerHTML` to a template containing three nested divs for the label (escaped name), message text (escaped), and round number, then appends it to the `messages` container. It calls `messages.scrollTo()` with an object specifying `top` set to the element's `scrollHeight` and `behavior` set to `'smooth'`. The function is synchronous and returns `void`.

### addSystemMessage

When called, `addSystemMessage` reads the DOM element with id `arena-messages` and returns early if it doesn't exist. It creates a new DOM `div` element and sets its `className` to `'arena-msg system arena-fade-in'`. It sets the element's `textContent` property to the `text` parameter (which prevents HTML interpretation). It appends the element to the `messages` container and calls `messages.scrollTo()` with an object specifying `top` set to the element's `scrollHeight` and `behavior` set to `'smooth'`. The function is synchronous and returns `void`.

## Agent 05

### addMessage

When called, `addMessage` reads the DOM element with id `arena-messages` and returns early if it does not exist. It reads the module-level `currentDebate` state and the current user profile via `getCurrentProfile()`. If `currentDebate` has a `messages` array property, the function pushes a new message object into that array with role set to `'user'` if the `side` parameter matches `currentDebate.role`, otherwise `'assistant'`; the text and round are stored as-is. The function then constructs a display name by reading the `isAI` parameter, comparing `side` against `currentDebate?.role`, and falling back to properties of the profile and debate objects. It creates a new `div` element with className combining `arena-msg`, `side-${side}`, and `arena-fade-in`, populates its innerHTML with escaped HTML containing the name, escaped text, and round number (via calls to `escapeHTML()`), appends this element to the `arena-messages` DOM node, and scrolls the messages container to its bottom with smooth scrolling behavior.

### addSystemMessage

When called, `addSystemMessage` reads the DOM element with id `arena-messages` and returns early if it does not exist. It creates a new `div` element with className `arena-msg system arena-fade-in`, sets its textContent to the provided text parameter (avoiding HTML parsing), appends the element to the `arena-messages` DOM node, and scrolls the messages container to its bottom with smooth scrolling behavior.
