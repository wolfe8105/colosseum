# Stage 2 Outputs — arena-config-round-picker.ts

## Agent 01

### roundPickerCSS
This function takes no parameters and reads no external state. It returns a CSS string containing style rules for a round picker component and its child elements. The string is constructed via a template literal that includes selectors and declarations for `.arena-round-picker`, `.arena-round-label`, `.arena-round-row`, `.arena-round-btn` (with `:active` and `.selected` pseudo-class/state combinations), `.arena-round-count`, and `.arena-round-time`. The styles reference CSS custom properties such as `--mod-font-ui`, `--mod-text-muted`, `--mod-accent`, and others, applying typography, spacing, colors, borders, backgrounds, and transitions. The function has no control flow and is synchronous.

### roundPickerHTML
This function takes no parameters and reads the module-level exports `ROUND_OPTIONS` from `arena-constants.ts` and `DEBATE.defaultRounds` from `config.ts`. It returns an HTML string constructed via a template literal. The template wraps a container div with class `arena-round-picker` containing a label div and a grid div. Within the grid, it maps over `ROUND_OPTIONS`, creating a button element for each option. Each button has class `arena-round-btn`, a `data-rounds` attribute set to the option's rounds value, and conditionally includes the class `selected` if the option's rounds value equals `DEBATE.defaultRounds`. Within each button, two span elements display the option's rounds count and time values. The map result is joined into a single string with no separator. The function has no control flow beyond the array mapping and is synchronous.

### wireRoundPicker
This function takes an `HTMLElement` parameter (container) and writes to module-level state by calling `set_selectedRounds(DEBATE.defaultRounds)`, initializing the selected rounds to the default value. It then calls `container.querySelectorAll('.arena-round-btn')` to obtain all round button elements within the container and iterates over them using `forEach`. For each button, it attaches a click event listener. When a button is clicked, the listener first queries all round buttons again via `container.querySelectorAll('.arena-round-btn')` and removes the `selected` class from each one. It then adds the `selected` class to the clicked button and calls `set_selectedRounds()` with the rounds value parsed from the button's `data-rounds` attribute using `parseInt()` with a radix of 10 and a default value of `'4'`. The function returns void and is synchronous; all operations are imperative DOM manipulation and state updates with no async calls.

## Agent 02

### roundPickerCSS
When called, this function reads no parameters or external state and returns a single string containing CSS rule definitions. The string is a template literal that defines styling for seven CSS classes: `.arena-round-picker`, `.arena-round-label`, `.arena-round-row`, `.arena-round-btn`, `.arena-round-btn:active` and `.arena-round-btn.selected`, `.arena-round-count`, and `.arena-round-time`. The CSS references custom properties like `--mod-font-ui`, `--mod-text-muted`, `--mod-accent`, and others but does not read or write any module-level state, DOM elements, or external state. The function is synchronous and makes no function or API calls.

### roundPickerHTML
When called, this function reads two external values: the `ROUND_OPTIONS` constant imported from `arena-constants.ts` and the `DEBATE.defaultRounds` property from the config imported from `config.ts`. It returns a single string containing HTML markup structured as a template literal. The markup includes a container div with class `arena-round-picker`, a label div, and a row div that contains multiple button elements. For each object in `ROUND_OPTIONS`, the function calls the `.map()` method to generate a button element with a `data-rounds` attribute, a span displaying the `rounds` count, and a span displaying the `time` value. The button receives the `selected` class if its `rounds` value matches `DEBATE.defaultRounds`. The resulting array of button strings is joined into a single string with `.join('')`. The function reads no module-level state, makes no DOM queries, and is synchronous with no external calls beyond accessing the constants.

### wireRoundPicker
When called, this function accepts an `HTMLElement` parameter named `container` and returns undefined. It first calls `set_selectedRounds(DEBATE.defaultRounds)`, passing the default round count to update module-level state. It then calls `container.querySelectorAll('.arena-round-btn')` to retrieve all button elements matching the selector within the provided container, and iterates over each button using `.forEach()`. For each button, it attaches a `click` event listener. When a button is clicked, the handler performs these steps in order: queries all arena-round-btn buttons again within the container, removes the `selected` class from each button, adds the `selected` class to the clicked button, parses the `data-rounds` attribute from the button element (defaulting to `'4'` if undefined), converts it to an integer, and calls `set_selectedRounds()` with this integer value. The function is synchronous and does not use await.

## Agent 03

### roundPickerCSS
When called, this function reads no parameters and accesses no external state. It returns a static string containing CSS rule definitions for the round picker UI. The returned string defines styles for `.arena-round-picker`, `.arena-round-label`, `.arena-round-row`, `.arena-round-btn`, `.arena-round-count`, and `.arena-round-time`. The function calls no other functions or APIs. It has no control flow, branches, loops, or error handling.

### roundPickerHTML
When called, this function reads no parameters and accesses two module-level constants: `ROUND_OPTIONS` and `DEBATE.defaultRounds`. It returns a static string containing an HTML template with a container div, label div, and row div. The row contains buttons generated by mapping over `ROUND_OPTIONS`; for each option, a button is created with a `data-rounds` attribute, class `arena-round-btn` (plus `selected` if the option's rounds value matches `DEBATE.defaultRounds`), and two nested spans displaying rounds count and time. The function calls no other functions or APIs beyond map and join.

### wireRoundPicker
When called, this function reads one parameter: `container`, an HTMLElement, and reads `DEBATE.defaultRounds`. It performs three operations in sequence. First, it calls `set_selectedRounds(DEBATE.defaultRounds)`, writing to module-level state. Second, it queries the DOM via `container.querySelectorAll('.arena-round-btn')` and iterates with `.forEach()`. For each button, it calls `addEventListener('click', ...)`. When a button is clicked, the handler queries the DOM again, iterates all buttons to remove `selected` from each, then adds `selected` to the clicked button, and calls `set_selectedRounds()` with the button's `data-rounds` parsed as a base-10 integer (defaulting to 4). The function returns `void` and is synchronous.

## Agent 04

### roundPickerCSS
The function reads no parameters, module state, or external state. It constructs and returns a string containing CSS rules for the round picker UI. The returned string defines styles for `.arena-round-picker`, `.arena-round-label`, `.arena-round-row`, `.arena-round-btn`, `.arena-round-count`, and `.arena-round-time`. The styles reference CSS custom properties for fonts, colors, spacing, borders, and transitions. The function calls no other functions or APIs and performs no side effects. It is synchronous.

### roundPickerHTML
The function reads two sources of state: `ROUND_OPTIONS` from `arena-constants.ts` and `DEBATE.defaultRounds` from `config.ts`. It constructs and returns an HTML string containing a container div with class `arena-round-picker`. The HTML structure includes a label and a `arena-round-row` div. Within the row, it calls `ROUND_OPTIONS.map()` to iterate each option, constructing a button element with `data-rounds` attribute, `arena-round-btn` class (plus `selected` if rounds equals `DEBATE.defaultRounds`), and two span elements showing rounds count and time. The function performs no side effects and is synchronous.

### wireRoundPicker
The function reads one parameter: `container`, an HTMLElement, and reads `DEBATE.defaultRounds`. It calls `set_selectedRounds()` once with `DEBATE.defaultRounds`, initializing selected rounds state. It then queries the DOM via `container.querySelectorAll('.arena-round-btn')` and calls `forEach()` on each button. For each button, it attaches a click event listener. When clicked, the listener queries the container again, removes `selected` from all buttons, adds `selected` to the clicked button, parses the `data-rounds` attribute as a base-10 integer with fallback `'4'`, and calls `set_selectedRounds()` with that integer. The function does not return a value and is synchronous.

## Agent 05

### roundPickerCSS
This function takes no parameters and reads no external state. It returns a string containing CSS rules for the round picker UI component. The returned string defines styles for `.arena-round-picker`, `.arena-round-label`, `.arena-round-row`, `.arena-round-btn`, `.arena-round-count`, and `.arena-round-time`. The styles reference CSS custom properties for fonts, colors, spacing, borders, and transitions. The function does not call any other functions or write to any state. It is synchronous.

### roundPickerHTML
This function takes no parameters and reads two pieces of external state: `ROUND_OPTIONS` from `arena-constants.ts` and `DEBATE.defaultRounds` from the imported `DEBATE` config. It returns a string containing HTML markup for a round picker container. The HTML includes a label and a grid row of buttons, one per entry in `ROUND_OPTIONS`. Each button is rendered via `ROUND_OPTIONS.map()`, with the button's `data-rounds` attribute set to the round count from each option and text content showing the round count and estimated time. The button matching the default rounds value gets the `selected` class. The function does not call any other functions or write to any state.

### wireRoundPicker
This function takes a single parameter, `container` (HTMLElement). At runtime, it first calls `set_selectedRounds(DEBATE.defaultRounds)` to initialize module-level state. It then queries the DOM within the container for all `.arena-round-btn` elements and loops through each. For each button, it attaches a click event listener. When a button is clicked, the listener first queries the container again for all `.arena-round-btn` elements and removes `selected` from each, then adds `selected` to the clicked button, and calls `set_selectedRounds()` with `parseInt(btn.dataset.rounds ?? '4', 10)`. The function is synchronous, does not return a value, and does not perform any error handling — it assumes the DOM structure and attribute values are present.
