# Stage 2 Outputs — profile-depth.state.ts

## Agent 01

### setAnswer
Writes to the `answers` module-level object. Reads the `id` parameter (a string) and the `val` parameter (an AnswerValue, which can be a string, number, array of strings, or undefined). Assigns `val` to the key `id` in the `answers` object. Returns undefined. Does not call any other functions.

### setActiveSection
Writes to the `activeSection` module-level variable. Reads the `id` parameter, which is a string or null. Assigns `id` to `activeSection`. Returns undefined. Does not call any other functions.

### setServerQuestionsAnswered
Writes to the `serverQuestionsAnswered` module-level variable. Reads the `n` parameter, which is a number. Assigns `n` to `serverQuestionsAnswered`. Returns undefined. Does not call any other functions.

### addCompletedSection
Writes to the `completedSections` module-level Set. Reads the `id` parameter, which is a string. Calls the `add` method on `completedSections` to insert the id. Returns undefined. Does not call any other functions on the anchor list.

### sanitizeAnswers
Reads the `raw` parameter of type unknown and the `SECTIONS` constant imported from `profile-depth.data.ts`. Validates the input: if `raw` is falsy, not an object, or an array, returns an empty object. Creates a new object `clean` using `Object.create(null)`, then constructs a `validIds` Set by iterating through all questions in all sections and collecting their ids. Iterates through the keys of `raw` as an object; for each key that appears in `validIds`, validates the corresponding value. Accepts strings of length 500 or less, finite numbers, or arrays of 20 or fewer strings where each string is 200 characters or less. For valid values, assigns them to `clean[key]` with their original type preserved. Returns the `clean` object. Does not modify module-level state, call other functions on the anchor list, or interact with external APIs.

### sanitizeCompleted
Reads the `raw` parameter of type unknown and the `SECTIONS` constant. If `raw` is not an array, returns a new empty Set. Constructs a `validIds` Set by mapping over `SECTIONS` and collecting section ids. Filters the `raw` array to include only entries that are strings and exist in `validIds`, then wraps the result in a new Set and returns it. Does not modify module-level state, call other functions on the anchor list, or interact with external APIs.

### snapshotAnswered
Reads the `answers` module-level object and the `SECTIONS` constant. Clears the `previouslyAnsweredIds` module-level Set. Iterates through all sections and their questions, and for each question calls `hasAnswer` with `answers[q.id]` as the argument. If `hasAnswer` returns true, adds the question id to `previouslyAnsweredIds`. Returns undefined. Writes to `previouslyAnsweredIds` and calls `hasAnswer` for each question. A comment in the code (labeled LANDMINE [LM-DEPTH-002]) notes that this function may over-count if called multiple times across sessions and may trigger on cold starts when `serverQuestionsAnswered` is genuinely 0 but localStorage contains data from a prior session.

### hasAnswer
Reads the `val` parameter of type AnswerValue or undefined. Returns false if `val` is undefined, an empty string, or null. Returns false if `val` is an array with zero length. Otherwise returns true. Does not modify module-level state, call other functions, or interact with external APIs.

## Agent 02

### setAnswer
Reads the parameter `id` (a string) and `val` (an AnswerValue, which based on context is either a string, number, or array of strings). Writes the value to the module-level `answers` object by assigning it to the key matching the `id` parameter. Returns undefined. Does not call any other functions or external APIs.

### setActiveSection
Reads the parameter `id` (a string or null). Writes this value directly to the module-level `activeSection` variable, replacing its previous value. Returns undefined. Does not call any other functions or external APIs.

### setServerQuestionsAnswered
Reads the parameter `n` (a number). Writes this number to the module-level `serverQuestionsAnswered` variable, replacing its previous value. Returns undefined. Does not call any other functions or external APIs.

### addCompletedSection
Reads the parameter `id` (a string). Calls the `add` method on the module-level `completedSections` Set, adding the `id` to the set. Returns undefined. Does not call any other exported functions.

### sanitizeAnswers
Reads the parameter `raw` (of unknown type) and the imported `SECTIONS` constant from `profile-depth.data.ts`. Returns an `Answers` object (which is a map-like type). First checks if `raw` is falsy, not an object, or an array; if so, returns an empty object created with `Object.create(null)`. Otherwise, builds a Set named `validIds` by iterating through `SECTIONS` and collecting all question IDs. Then iterates through all keys of `raw` as a Record. For each key, checks if it exists in `validIds`; if not, skips it. For keys in `validIds`, inspects the value: if it is a string with length 500 or less, adds it to the clean object; if it is a finite number, adds it; if it is an array with 20 or fewer elements where every element is a string of 200 characters or less, adds it as a string array. Returns the clean object. Does not call any other functions.

### sanitizeCompleted
Reads the parameter `raw` (of unknown type) and the imported `SECTIONS` constant. Returns a Set of strings. First checks if `raw` is an array; if not, returns an empty Set. Otherwise, builds a Set named `validIds` from the `id` field of each element in `SECTIONS`. Then creates and returns a new Set by filtering `raw`: for each element, checks if it is a string and exists in `validIds`; if so, includes it in the returned set. Does not call any other functions.

### snapshotAnswered
Reads the module-level `answers` object and the imported `SECTIONS` constant. Writes to the module-level `previouslyAnsweredIds` Set. Returns undefined. Calls the `clear` method on `previouslyAnsweredIds` to empty it. Then iterates through `SECTIONS`, and for each section iterates through its questions. For each question, calls `hasAnswer` with `answers[q.id]` as the argument; if `hasAnswer` returns true, calls `add` on `previouslyAnsweredIds` to add the question ID. The control flow includes nested loops but no branching other than the conditional call to `add`. Not async. The function contains a comment labeled "LANDMINE [LM-DEPTH-002]" describing potential overcounting when called multiple times on cold starts where server-side answers are zero.

### hasAnswer
Reads the parameter `val` (an AnswerValue or undefined). Returns a boolean. Checks if `val` is strictly equal to undefined, an empty string, or null; if so, returns false. If `val` is an array and has length zero, returns false. Otherwise returns true. Contains no loops, async operations, or external calls. The function performs only value comparisons on the input parameter.

## Agent 03

### setAnswer
The function accepts a string `id` and an `AnswerValue` parameter `val`. It writes to the module-level `answers` object by assigning the value at the key `id`. This is a synchronous setter with no branching or early returns. It does not read external state, does not call other functions, and does not return a value.

### setActiveSection
The function accepts either a string or null as the `id` parameter. It writes to the module-level `activeSection` variable by assignment. This is a synchronous setter with no branching or early returns. It does not read external state, does not call other functions, and does not return a value.

### setServerQuestionsAnswered
The function accepts a number parameter `n`. It writes to the module-level `serverQuestionsAnswered` variable by assignment. This is a synchronous setter with no branching or early returns. It does not read external state, does not call other functions, and does not return a value.

### addCompletedSection
The function accepts a string parameter `id`. It calls the `add` method on the module-level `completedSections` Set, passing `id` as the argument. This is a synchronous setter with no branching or early returns. It does not read external state beyond the Set object itself, does not call other functions, and does not return a value.

### sanitizeAnswers
The function accepts an `unknown` parameter `raw` and returns an `Answers` object. It first performs type checking: if `raw` is falsy, not an object, or is an array, it returns an empty object immediately. It then creates a new `Answers` object using `Object.create(null)` and populates a `validIds` Set by iterating through the module-level `SECTIONS` array, calling `forEach` on each section's `questions` array and adding each question's `id`. It then iterates over the keys of `raw` as a record. For each key, it checks whether the key exists in `validIds`; if not, it continues to the next iteration. If the key is valid, it retrieves the value and applies three separate type checks: if the value is a string with length at most 500, it assigns it to the clean object; if the value is a finite number, it assigns it; if the value is an array with at most 20 elements where all elements are strings with length at most 200, it assigns the array. Any value that does not match one of these three type checks is rejected and not assigned to the clean object. After processing all keys, it returns the clean object.

### sanitizeCompleted
The function accepts an `unknown` parameter `raw` and returns a Set of strings. If `raw` is not an array, it returns a new empty Set immediately. Otherwise, it creates a `validIds` Set by mapping over the module-level `SECTIONS` array and extracting each section's `id`. It then creates a new Set by filtering `raw` to include only elements that are strings and exist in `validIds`, then spreads the filtered result into a Set constructor and returns it.

### snapshotAnswered
The function takes no parameters and returns void. It calls `clear()` on the module-level `previouslyAnsweredIds` Set. It then iterates through the module-level `SECTIONS` array, and for each section, iterates through that section's `questions` array. For each question, it calls the module-level `hasAnswer` function with `answers[q.id]` as the argument. If `hasAnswer` returns true, it calls `add()` on `previouslyAnsweredIds` with the question's `id`. This is a synchronous function with no branches or early returns. A comment on lines 74-76 indicates a known issue: the function fires on every cold start where `serverQuestionsAnswered` is 0, which may cause over-counting if called multiple times across sessions when a user has local localStorage data but genuinely zero server-side answers.

### hasAnswer
The function accepts an `AnswerValue | undefined` parameter `val` and returns a boolean. It checks whether `val` is `undefined`, an empty string, or `null`, and returns `false` if any of these conditions hold. It then checks whether `val` is an array and has zero length, and returns `false` in that case. If none of these conditions are true, it returns `true`. This function has three early return points and no loops or external state access.

## Agent 04

### setAnswer
Reads the `id` parameter (a string) and the `val` parameter (an AnswerValue, which can be a string, number, or string array based on the sanitizers). Writes to the module-level `answers` object by setting `answers[id]` to `val`. Returns nothing. Makes no function calls. Has no branches or loops.

### setActiveSection
Reads the `id` parameter (a string or null). Writes to the module-level `activeSection` variable, setting it to the value of `id`. Returns nothing. Makes no function calls. Has no branches or loops.

### setServerQuestionsAnswered
Reads the `n` parameter (a number). Writes to the module-level `serverQuestionsAnswered` variable, setting it to the value of `n`. Returns nothing. Makes no function calls. Has no branches or loops.

### addCompletedSection
Reads the `id` parameter (a string). Calls the `add` method on the module-level `completedSections` Set, passing `id`. Returns nothing. Makes no other function calls. Has no branches or loops.

### sanitizeAnswers
Reads the `raw` parameter (of type `unknown`). Returns an `Answers` object. First, checks if `raw` is falsy, not an object, or an array; if so, returns an empty object created with `Object.create(null)`. Otherwise, iterates through `SECTIONS` (imported from profile-depth.data.ts) by calling `forEach` on it, then `forEach` on each section's `questions` array, collecting all question IDs into a `validIds` Set. Then iterates through the keys of `raw` cast as a `Record<string, unknown>`. For each key, checks if it exists in `validIds`; if not, skips it with `continue`. If the key is valid, reads the value at that key and checks its type: if it is a string with length at most 500, adds it to the `clean` object; if it is a finite number, adds it to `clean`; if it is an array with 20 or fewer elements where every element is a string of length at most 200, adds it to `clean` (cast as a string array). Finally returns the `clean` object. Makes no async calls. Has three branches within the type-checking condition: one for strings, one for numbers, and one for arrays.

### sanitizeCompleted
Reads the `raw` parameter (of type `unknown`). Returns a `Set<string>`. First checks if `raw` is not an array; if so, returns a new empty Set. Otherwise, creates a `validIds` Set by mapping `SECTIONS` (imported from profile-depth.data.ts) to their IDs. Then returns a new Set constructed from the result of filtering `raw`: keeps only elements that are strings and exist in `validIds`, casting the filtered array to `string[]`. Makes no async calls. Has one branch: if `raw` is not an array, return early.

### snapshotAnswered
Reads the module-level `SECTIONS` constant (imported from profile-depth.data.ts) and the module-level `answers` object. Writes to the module-level `previouslyAnsweredIds` Set by first calling `clear()` on it, then iterating through `SECTIONS` with nested `forEach` calls: outer loop over sections, inner loop over each section's questions. For each question, reads its ID and the corresponding value in the `answers` object, then calls `hasAnswer` (another function on the anchor list) with that value. If `hasAnswer` returns true, calls `add` on `previouslyAnsweredIds` with the question's ID. Returns nothing. Makes no async calls. Contains nested loops and a conditional call to `hasAnswer`. A landmine comment at lines 73–76 notes that this function may over-count answers if called multiple times across sessions, particularly when `serverQuestionsAnswered` is 0 on cold start.

### hasAnswer
Reads the `val` parameter (of type `AnswerValue | undefined`). Returns a boolean. Checks if `val` is strictly equal to `undefined`, an empty string, or `null`; if so, returns `false`. Checks if `val` is an array with length 0; if so, returns `false`. Otherwise returns `true`. Makes no function calls. Has two branches: one for the null/empty-string case, one for the empty-array case, with an implicit default return of `true`.

## Agent 05

### setAnswer
When called, this function writes its second parameter (`val`) to the `answers` module-level state object, keying it by the first parameter (`id`). It performs a simple assignment: `answers[id] = val`. The function reads the current `answers` object and the two parameters, writes the new or updated property to `answers`, and returns nothing (void). It calls no other functions and has no branching.

### setActiveSection
When called, this function writes its parameter (`id`) directly to the module-level `activeSection` variable. It performs a simple assignment: `activeSection = id`. The function reads the parameter and the current state of `activeSection`, overwrites `activeSection` with the new value, and returns nothing (void). It calls no other functions and has no branching. The parameter can be a string or null, and either value is written directly.

### setServerQuestionsAnswered
When called, this function writes its parameter (`n`) directly to the module-level `serverQuestionsAnswered` variable. It performs a simple assignment: `serverQuestionsAnswered = n`. The function reads the parameter and the current state of `serverQuestionsAnswered`, overwrites `serverQuestionsAnswered` with the new value, and returns nothing (void). It calls no other functions and has no branching.

### addCompletedSection
When called, this function invokes the `add` method on the module-level `completedSections` Set, passing its parameter (`id`) as the argument. The function reads the `completedSections` Set and the parameter, mutates the Set by adding the id, and returns nothing (void). It calls no other functions and has no branching. If the id already exists in the Set, the Set remains unchanged.

### sanitizeAnswers
When called with a `raw` parameter, this function validates and filters data intended to be stored as answers. It first checks whether `raw` is a non-null object that is not an array; if not, it returns an empty `Answers` object. It then creates a new empty object using `Object.create(null)`. It iterates through `SECTIONS` from module-level state to build a `validIds` Set containing all question IDs across all sections. It then iterates through the keys of the raw object. For each key, it checks whether the key is in `validIds`; if not, it skips that property. For valid keys, it inspects the corresponding value and includes it in the returned object only if the value is a string with length ≤ 500, a finite number, or an array with length ≤ 20 where every element is a string with length ≤ 200. The function returns the sanitized object. It calls no other functions; it reads `SECTIONS` and the raw input parameter, and returns a new `Answers` object without modifying module-level state.

### sanitizeCompleted
When called with a `raw` parameter, this function validates and filters data intended to be stored as completed section IDs. It first checks whether `raw` is an array; if not, it returns an empty Set. It builds a `validIds` Set from `SECTIONS` by mapping each section to its `id`. It then filters the raw array, keeping only elements that are strings and exist as valid section IDs. The function returns a new Set containing the filtered string IDs. It calls no other functions; it reads `SECTIONS` and the raw input parameter, and returns a new Set without modifying module-level state.

### snapshotAnswered
When called, this function clears the module-level `previouslyAnsweredIds` Set and repopulates it based on the current state of `answers`. It iterates through `SECTIONS` to visit every question across every section. For each question, it calls `hasAnswer` with `answers[q.id]` as the argument. If `hasAnswer` returns true, the question's ID is added to `previouslyAnsweredIds`. The function reads `SECTIONS`, the `answers` object, and the `previouslyAnsweredIds` Set. It mutates `previouslyAnsweredIds` by clearing it and adding IDs, and returns nothing (void). The control flow contains two nested loops with a conditional branch inside. A comment at lines 74–76 notes a landmine: this function may over-count if called multiple times across sessions when `serverQuestionsAnswered` is genuinely 0, because it may re-add IDs from localStorage data that persists across sessions.

### hasAnswer
When called with a value parameter, this function returns a boolean indicating whether the value represents a meaningful answer. It checks whether the value is `undefined`, an empty string `''`, or `null`; if any of these is true, it returns false. It checks whether the value is an array with length 0; if so, it returns false. Otherwise, it returns true. The function reads the parameter and performs no writes to state. It has no branching at the top level but contains three separate conditional checks with early returns on each condition where the answer is considered absent.
