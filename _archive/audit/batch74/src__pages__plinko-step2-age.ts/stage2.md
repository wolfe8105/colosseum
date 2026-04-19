# Stage 2 Outputs — plinko-step2-age.ts

## Agent 01

### attachStep2

When called, `attachStep2` retrieves the DOM element with id `btn-age-next` and attaches a click event listener to it. The listener executes the following sequence each time the button is clicked: it calls `clearMsg('step2-msg')` to clear previous messages, then reads the `value` properties from three HTML select elements with ids `dob-month`, `dob-day`, and `dob-year` (defaulting to empty strings if elements don't exist), and reads the `checked` property from an HTML input element with id `tos-check` (defaulting to false if it doesn't exist). The listener then performs validation: if any of the three date fields are empty, it calls `showMsg` with an error message about entering a date of birth and returns early; if the TOS checkbox is unchecked, it calls `showMsg` with an error message about agreeing to the Terms of Service and returns early. If validation passes, the listener calls `getAge` with the parsed month, day, and year as numbers, and if the returned age is less than 13, it calls `showMsg` with an error message about minimum age and returns early. If all checks pass, it calls `set_signupDob` with a formatted date string of the form `YYYY-MM-DD`, calls `set_isMinor` with a boolean indicating whether the age is less than 18, and finally calls `goToStep(3)`. The function returns void and is not async.

## Agent 02

### attachStep2

This function attaches a click event listener to the HTML element with id `btn-age-next`. When the button is clicked, the listener callback executes.

The callback reads the current values from three HTML select elements with ids `dob-month`, `dob-day`, and `dob-year` (or empty strings if those elements don't exist), and reads the checked state of an HTML checkbox with id `tos-check` (or false if it doesn't exist). It calls `clearMsg('step2-msg')` to clear any prior message. It then validates that all three date-of-birth fields contain values; if any are empty, it calls `showMsg()` to display an error message to `step2-msg` and returns early. Next it validates that the checkbox is checked; if not, it displays a different error message and returns early.

If both validations pass, it parses the month, day, and year as integers and calls `getAge()` with these values to calculate the user's age. It then checks whether the age is less than 13; if so, it displays an age restriction error message and returns early. Otherwise, it calls `set_signupDob()` with a formatted date string in YYYY-MM-DD format (zero-padded), calls `set_isMinor()` with a boolean indicating whether the age is less than 18, and finally calls `goToStep(3)` to navigate to the next step. The function itself returns void and is not async.

## Agent 03

### attachStep2

When called, `attachStep2` finds the DOM element with id `btn-age-next` and attaches a click event listener to it. The listener reads the values of four DOM elements by id: `dob-month`, `dob-day`, `dob-year` (all as `HTMLSelectElement`), and `tos-check` (as `HTMLInputElement`). If any of these elements are not found, their values default to empty string or `false` respectively. The listener invokes `clearMsg('step2-msg')` to clear any prior message, then checks three conditions in order: whether month, day, and year are all non-empty (if not, it calls `showMsg` with an error and returns early); whether `tos` is `true` (if not, it calls `showMsg` with an error and returns early); and whether the age computed from the date of birth is at least 13 (if not, it calls `showMsg` with an error and returns early). If all three conditions pass, the listener calls `set_signupDob` with a formatted date string in `YYYY-MM-DD` format (padding month and day to two digits), then calls `set_isMinor` with a boolean indicating whether the age is less than 18, then calls `goToStep(3)`. The function itself returns `undefined` and is not async.

## Agent 04

### attachStep2

When called, this function registers a click event listener on the DOM element with ID `btn-age-next`. Upon click, the listener executes the following sequence: it calls `clearMsg('step2-msg')` to clear any prior messages from the UI, then reads the values of three HTML select elements with IDs `dob-month`, `dob-day`, and `dob-year`, casting them to `HTMLSelectElement` and extracting their `.value` property—each defaults to an empty string if the element does not exist or the property is inaccessible. It also reads the `.checked` property of an HTML input element with ID `tos-check`, casting it to `HTMLInputElement` and defaulting to `false` if the element does not exist.

The function then validates the date of birth and terms of service. If `month`, `day`, or `year` is an empty string, it calls `showMsg('step2-msg', 'Please enter your date of birth.', 'error')` and returns early. If `tos` is `false`, it calls `showMsg('step2-msg', 'You must agree to the Terms of Service.', 'error')` and returns early. It then parses the month, day, and year strings to integers and passes them to `getAge()`, which returns a numeric age. If the age is less than 13, it calls `showMsg('step2-msg', 'You must be at least 13 years old to use The Moderator.', 'error')` and returns early.

If all validations pass, the function constructs a date-of-birth string in `YYYY-MM-DD` format by padding the month and day to two digits and calls `set_signupDob()` with that string. It then calls `set_isMinor(age < 18)` to record whether the user is under 18. Finally, it calls `goToStep(3)` to navigate to the next step. The function itself returns `void` and is not async; the event listener is added once at the time `attachStep2` is invoked, and the listener's callback executes only when the user clicks the button.

## Agent 05

### attachStep2

The function reads the DOM to retrieve three date picker values (month, day, year) via element IDs `dob-month`, `dob-day`, and `dob-year` as select elements, and reads a checkbox element with ID `tos-check` to determine whether the Terms of Service were accepted. It reads no module-level state and calls no external APIs except the DOM API. The function attaches a click event listener to the element with ID `btn-age-next`, which means it executes synchronously and does not return until the event listener is registered.

When the button is clicked, the listener executes: it clears any existing message in the `step2-msg` element, extracts and trims the form values (defaulting empty selects to empty strings and an unchecked checkbox to false), and performs three validation checks in order. If the month, day, or year fields are empty, it calls `showMsg` to display an error message saying "Please enter your date of birth." and returns early. If the TOS checkbox is unchecked, it calls `showMsg` with an error message saying "You must agree to the Terms of Service." and returns early. If both checks pass, it calls `getAge` with the parsed integers from the month, day, and year fields; if the age is less than 13, it calls `showMsg` with an error message saying "You must be at least 13 years old to use The Moderator." and returns early.

If all validations pass, the listener writes module state by calling `set_signupDob` with a formatted ISO-like date string constructed from the year, month (zero-padded to 2 digits), and day (zero-padded to 2 digits), then calls `set_isMinor` with a boolean indicating whether the age is less than 18, and finally calls `goToStep(3)` to advance to the next step. All calls are synchronous; the function is not async and contains no await expressions or try-catch blocks.
