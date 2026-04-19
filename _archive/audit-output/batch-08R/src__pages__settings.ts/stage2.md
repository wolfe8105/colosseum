# Stage 2 Outputs — src/pages/settings.ts

## Agent 01

### toast

`toast` is a synchronous function that takes a single `msg` string parameter. It calls `document.getElementById('toast')` to locate the toast element in the DOM. If no element is found, the function returns immediately without doing anything further. When the element is found, it sets `el.textContent` to `msg`, then adds the CSS class `'show'` to the element's class list. It then calls `setTimeout` to schedule removal of the `'show'` class after 2500 milliseconds, at which point `el.classList.remove('show')` fires. The function returns `void` and writes no module-level state.

### getEl

`getEl` is a synchronous generic function parameterized on `T extends HTMLElement`, defaulting to `HTMLElement`. It takes a single `id` string parameter. It calls `document.getElementById(id)`, casts the result to `T | null`, and returns that value directly. It reads no module-level state and writes nothing. It is a thin typed wrapper around the DOM API.

### getChecked

`getChecked` is a synchronous function that takes a single `id` string parameter. It calls `getEl<HTMLInputElement>(id)` to retrieve the element. If the element exists, it reads the element's `.checked` property and returns it as a boolean. If the element does not exist — that is, `getEl` returns `null` — the optional chaining short-circuits and the nullish coalescing operator returns `false`. The function never throws and always returns a boolean.

### setChecked

`setChecked` is a synchronous function that takes an `id` string and a `val` boolean. It calls `getEl<HTMLInputElement>(id)` to retrieve the element. If the element is non-null, it assigns `val` to `el.checked`, mutating the DOM input's checked state. If `getEl` returns `null`, the `if` block is skipped and the function does nothing. The function returns `void` and writes no module-level state.

### validateTier

`validateTier` is a synchronous function that takes a single `raw` parameter of type `string | undefined`. It calls `VALID_TIERS.includes(raw as ValidTier)` to test whether `raw` is one of the four members of the `VALID_TIERS` constant array (`'free'`, `'contender'`, `'champion'`, `'creator'`). If the test passes, it returns `raw` cast to `ValidTier`. If the test fails — including when `raw` is `undefined` — it returns the string literal `'free'`. The function reads the module-level constant `VALID_TIERS` and writes nothing.

### loadSettings

`loadSettings` is a synchronous function that takes no parameters. It begins by reading `localStorage.getItem('colosseum_settings')`, wrapping the `JSON.parse` call in a `try/catch`. On a parse failure, `saved` is set to an empty object `{}` and `localStorage.removeItem('colosseum_settings')` is called to clear the corrupt entry.

With `saved` in hand, the function populates the DOM in a fixed sequence. It calls `getEl<HTMLInputElement>('set-display-name')`, `getEl<HTMLInputElement>('set-username')`, and `getEl<HTMLTextAreaElement>('set-bio')` and, when each element exists, assigns the corresponding value from `saved` or an empty string fallback. It then reads `getEl('set-bio-count')` and sets its `textContent` to the bio length followed by `'/160'`. It reads `getEl('set-email-display')` and sets its `textContent` to `saved.email` or `'—'`. It calls `validateTier(saved.subscription_tier)` to obtain a safe tier value, then reads `getEl('set-tier-badge')` and, when present, sets its `textContent` to the corresponding label from `TIER_LABELS` and sets its `className` to `'tier-badge '` plus the tier name when the tier is not `'free'`, or `'tier-badge '` with an empty suffix when it is `'free'`.

The function then calls `setChecked` eleven times for the notification, audio, and privacy toggles. For all notification toggles and most privacy and audio toggles, the default when the saved value is absent is `true` (using the `!== false` comparison). The `set-audio-mute` toggle defaults to `false` (using `=== true`). After the toggles, it reads `getEl<HTMLSelectElement>('set-language')` and sets its value to `saved.preferred_language` or `'en'`. It then reads `document.documentElement.getAttribute('data-theme')` and calls `setChecked('set-dark-mode', ...)` with `true` when the attribute is not `'light'`.

In the second phase, the function calls `getCurrentProfile()` from the auth module. If a profile is returned, it overrides the localStorage-derived values. The `display_name`, `username`, and `bio` fields are re-assigned to their DOM elements, preferring the profile value over `saved`. The bio character counter is updated again. `getCurrentUser()` is called to retrieve the current user's email, and `emailDisp.textContent` is updated. `validateTier` is called again with `p.subscription_tier` from the profile, and the badge element is re-populated. If `p.preferred_language` is a string, the language select is updated. If `p.is_private` is a boolean, `setChecked('set-privacy-public', !p.is_private)` is called, inverting the boolean so that `is_private: true` produces an unchecked "public" toggle. If `getCurrentProfile()` returns `null`, this entire second phase is skipped. The function returns `void`.

### saveSettings

`saveSettings` is a synchronous function (it does not use `async`/`await` at its call site, though it fires async operations internally). It takes no parameters.

At entry, it calls `getEl<HTMLButtonElement>('save-btn')` and checks `saveBtn?.disabled`. If the button is already disabled, the function returns immediately without doing anything. Otherwise, it disables the button and sets its text to `'⏳ Saving...'`.

Next, it reads three DOM input values: the trimmed value of `'set-display-name'`, `'set-username'`, and `'set-bio'`, defaulting each to an empty string if the element is absent. Three sequential validation branches follow. If `username` is non-empty and fails either the length check (3–20 characters) or the character pattern check (`/^[a-zA-Z0-9_]+$/`), `toast` is called with an error message, the button is re-enabled with its original label, and the function returns. If `displayName` is non-empty and exceeds 30 characters, the same re-enable-and-return path executes. If `bio` exceeds 160 characters, the same path executes. Each validation failure is an early return; none reach the save logic.

If all validations pass, a `settings` object of type `SettingsData` is assembled. It reads the email from `getEl('set-email-display')?.textContent`, the language from `getEl<HTMLSelectElement>('set-language')?.value`, and calls `getChecked` eleven times for the toggle fields. The assembled object is serialized and written to `localStorage.setItem('colosseum_settings', JSON.stringify(settings))`.

The function then checks the module-level constant `isPlaceholder`. When `isPlaceholder` is `false`, two fire-and-forget async calls are dispatched. First, `updateProfile(...)` is called with profile fields and `.catch`ed to log a warning; it is not awaited. Second, `safeRpc('save_user_settings', {...})` is called with all toggle fields and `.then`/`.catch`ed to log warnings on failure; it is also not awaited. When `isPlaceholder` is `true`, both calls are skipped entirely.

Regardless of the `isPlaceholder` branch, `toast('✅ Settings saved')` is called and the save button is re-enabled with its original label. The function returns `void`.

### loadModeratorSettings

`loadModeratorSettings` is a synchronous function that takes no parameters. It calls `getCurrentProfile()` from the auth module. If the return value is `null` or falsy, the function returns immediately without reading or writing anything further.

When a profile is present, it casts it to `Record<string, unknown>` and reads two boolean-coerced values: `isMod` from `p.is_moderator` and `isAvail` from `p.mod_available`. It calls `setChecked('set-mod-enabled', isMod)` and `setChecked('set-mod-available', isAvail)`.

It then calls `getEl('mod-available-row')` and, if found, sets `style.display` to `'flex'` when `isMod` is `true` and `'none'` when `false`. It calls `getEl('mod-stats')` and applies the same `'block'`/`'none'` display toggle.

Next, it reads `p.mod_categories` cast to `string[]`, defaulting to an empty array. It calls `document.querySelectorAll<HTMLButtonElement>('.mod-cat-chip')` and iterates over every matching button. For each chip, it reads `chip.dataset.cat` (defaulting to an empty string) and calls `chip.classList.toggle('selected', cats.includes(cat))`, so chips whose `data-cat` value appears in the profile's `mod_categories` array receive the `'selected'` class and others lose it.

It then calls `getEl('mod-dot')` and, when found, sets `style.background` to `'var(--success)'` when `isAvail` is `true` or `'var(--white-dim)'` when `false`.

When `isMod` is `true`, four stat display elements are populated: `'mod-stat-rating'` is set to `((p.mod_rating as number) ?? 50).toFixed(1)`; `'mod-stat-debates'` is set to `String((p.mod_debates_total as number) ?? 0)`; `'mod-stat-rulings'` is set to `String((p.mod_rulings_total as number) ?? 0)`; `'mod-stat-approval'` is set to `((p.mod_approval_pct as number) ?? 0).toFixed(0) + '%'`. Each stat element is retrieved via `getEl` before its text is set; if any element is absent, that particular assignment is skipped. When `isMod` is `false`, this entire stats block is not entered. The function returns `void`.

## Agent 02

### toast

`toast` is synchronous. It takes a single string parameter `msg`. It calls `document.getElementById('toast')` to locate a DOM element with the id `"toast"`. If no such element exists, it returns immediately without further action. If the element is found, it sets `el.textContent` to `msg`, adds the CSS class `"show"` to the element's class list, then registers a `setTimeout` callback for 2500 milliseconds that removes the `"show"` class when it fires. The function does not return a value. It does not read or write any module-level state.

### getEl

`getEl` is synchronous and generic. It takes a single string parameter `id` and calls `document.getElementById(id)`, casting the result to `T | null` where `T` defaults to `HTMLElement`. It returns that cast result directly. It performs no null checks and writes nothing. It is a thin wrapper around the DOM query API.

### getChecked

`getChecked` is synchronous. It takes a single string parameter `id`. It calls `getEl<HTMLInputElement>(id)` to retrieve the element. If the element is found, it reads and returns the element's `checked` property. If `getEl` returns `null`, the optional-chaining expression short-circuits and the nullish coalescing operator returns `false`. It writes nothing and reads no module-level state.

### setChecked

`setChecked` is synchronous. It takes a string parameter `id` and a boolean parameter `val`. It calls `getEl<HTMLInputElement>(id)` to locate the element. If the result is non-null, it assigns `val` to the element's `checked` property. If the element is not found, the `if` branch is skipped and the function exits silently. It returns nothing and writes no module-level state.

### validateTier

`validateTier` is synchronous. It takes a single parameter `raw` of type `string | undefined`. It tests whether `raw` is a member of the module-level constant `VALID_TIERS` (`['free', 'contender', 'champion', 'creator']`) using `Array.includes`. If the test passes, it returns `raw` cast to `ValidTier`. If the test fails — including when `raw` is `undefined` — it returns the string literal `'free'`. It writes nothing and reads no state beyond the module-level `VALID_TIERS` constant.

### loadSettings

`loadSettings` is synchronous. It reads from `localStorage` under the key `'colosseum_settings'` and from the DOM, and it calls `getCurrentProfile()` and `getCurrentUser()` from the auth module. It returns nothing.

The function opens a try/catch block. Inside the try, it parses `localStorage.getItem('colosseum_settings')`, defaulting to `'{}'` if the item is absent. If `JSON.parse` throws, the catch block sets `saved` to an empty object and calls `localStorage.removeItem('colosseum_settings')` to clear the corrupt entry.

With `saved` in hand, the function makes a series of DOM writes. It uses `getEl` to locate input elements for display name, username, and bio, setting their `.value` properties to the corresponding fields from `saved`, defaulting to empty string if the field is absent. It locates the bio counter element and sets its `textContent` to the bio length plus `'/160'`. It sets the email display element's `textContent` to `saved.email` or `'—'`. It then calls `validateTier(saved.subscription_tier)` to obtain a safe tier string, locates the tier badge element, and assigns its `textContent` to the corresponding entry in `TIER_LABELS` and its `className` to `'tier-badge '` plus the tier name (omitting the tier suffix when tier is `'free'`).

Next, it calls `setChecked` eleven times to populate notification, audio, and privacy toggles. For the six notification toggles and the three privacy toggles and `set-audio-sfx`, the default is `true` (toggled on) unless the saved value is explicitly `false`. For `set-audio-mute`, the default is `false` (toggled off) and it is set to `true` only when `saved.audio_mute === true`. It then sets the language `<select>` value to `saved.preferred_language` or `'en'`. It calls `setChecked('set-dark-mode', ...)` by reading `document.documentElement.getAttribute('data-theme')` — if the attribute is not `'light'`, the dark-mode toggle is set to `true`.

After populating from `saved`, the function calls `getCurrentProfile()`. If it returns a non-null profile object, the function enters a second population pass that overwrites values set from `localStorage`. It writes display name, username, and bio from the profile, updates the bio counter, calls `getCurrentUser()` to read the email and writes it to the email display element, calls `validateTier` again on `profile.subscription_tier`, and updates the badge text and class. If `profile.preferred_language` is a string, it overwrites the language select. If `profile.is_private` is a boolean, it calls `setChecked('set-privacy-public', !p.is_private)` — inverting the boolean because the toggle represents public visibility, not private.

### saveSettings

`saveSettings` is synchronous in structure but fires two asynchronous operations as fire-and-forget. It reads from the DOM and from the module-level constant `isPlaceholder`, writes to `localStorage` and the DOM, and calls `updateProfile`, `safeRpc`, and `toast`. It returns nothing.

The function locates the save button via `getEl`. If the button is found and its `disabled` property is `true`, it returns immediately. Otherwise it sets `saveBtn.disabled = true` and changes its text to `'⏳ Saving...'`. It reads and trims the display name, username, and bio from their respective input elements.

It then runs three sequential validation branches. If `username` is non-empty and fails the length (3–20 characters) or character pattern (`/^[a-zA-Z0-9_]+$/`) check, it calls `toast` with an error message, re-enables the save button, restores its label, and returns early. The same early-return structure applies if `displayName` exceeds 30 characters, or if `bio` exceeds 160 characters.

After passing all validations, the function assembles a `SettingsData` object by reading the email display element's `textContent`, the language select's `value`, and calling `getChecked` for each of the eleven toggle IDs. It writes this object to `localStorage.setItem('colosseum_settings', JSON.stringify(settings))`.

If `isPlaceholder` is `false`, the function fires two asynchronous operations without awaiting them. First, it calls `updateProfile(...)` with display name, username, bio, preferred language, and `is_private` (the inverse of `privacy_public`); the `.catch` handler logs a warning to the console if the call rejects. Second, it calls `safeRpc('save_user_settings', ...)` with all eleven toggle values as named parameters; the `.then` handler logs a warning if the resolved result contains an `.error` property, and the `.catch` handler logs a warning if the promise rejects. Both fire-and-forget calls execute before the function completes its remaining synchronous steps.

Regardless of the `isPlaceholder` branch, the function calls `toast('✅ Settings saved')` and then unconditionally re-enables the save button and restores its label text to `'💾 SAVE CHANGES'`.

### loadModeratorSettings

`loadModeratorSettings` is synchronous. It reads from the auth module by calling `getCurrentProfile()`, writes to the DOM, and calls `setChecked`. It returns nothing.

The function calls `getCurrentProfile()`. If the result is null, it returns immediately without further action. Otherwise it casts the profile to `Record<string, unknown>` and reads `is_moderator` and `mod_available`, coercing each to a boolean with `!!`.

It calls `setChecked('set-mod-enabled', isMod)` and `setChecked('set-mod-available', isAvail)` to set the two moderator toggle checkboxes. It then locates the `mod-available-row` element and sets its `style.display` to `'flex'` if `isMod` is true, or `'none'` if false. It does the same for `mod-stats`, setting it to `'block'` or `'none'`. These two DOM writes hide or show conditional rows depending on whether the user is a moderator.

It reads `profile.mod_categories`, defaulting to an empty array if absent. It then queries all elements matching `.mod-cat-chip` and for each chip reads `chip.dataset.cat`, calling `chip.classList.toggle('selected', cats.includes(cat))` to set the selected state based on whether that category appears in the profile's category list.

It locates the element with id `mod-dot` and sets its `style.background` to `'var(--success)'` if `isAvail` is true, or `'var(--white-dim)'` otherwise.

Finally, if `isMod` is true, the function enters a stats block. It locates four stat display elements (`mod-stat-rating`, `mod-stat-debates`, `mod-stat-rulings`, `mod-stat-approval`) and sets their `textContent`. Rating is written as `(p.mod_rating ?? 50).toFixed(1)`. Debates and rulings are written as `String(value ?? 0)`. Approval is written as `(p.mod_approval_pct ?? 0).toFixed(0) + '%'`. If `isMod` is false, none of the stat elements are touched.

## Agent 03

### toast

`toast` is synchronous. It takes a single string parameter `msg`. It calls `document.getElementById` to look up the element with id `'toast'`. If that element is not found, the function returns immediately without doing anything. If the element is found, it sets `el.textContent` to `msg`, adds the CSS class `'show'` to the element's class list, and schedules a `setTimeout` callback for 2500 milliseconds that removes the `'show'` class. The function returns `void`. It writes only to the DOM and the browser's timer queue.

### getEl

`getEl` is synchronous and generic over `T extends HTMLElement`. It takes a single string parameter `id`. It calls `document.getElementById(id)` and casts the result to `T | null` before returning it. It reads nothing from module-level state and writes nothing. It is a thin wrapper around the native DOM lookup API.

### getChecked

`getChecked` is synchronous. It takes a single string parameter `id`. It calls `getEl<HTMLInputElement>(id)` to retrieve the element, then reads the `.checked` property of the result. If `getEl` returns `null`, the optional-chaining short-circuits and the nullish coalescing operator returns `false`. The function returns a `boolean` and writes nothing.

### setChecked

`setChecked` is synchronous. It takes a string parameter `id` and a boolean parameter `val`. It calls `getEl<HTMLInputElement>(id)` to retrieve the element. If the element is not found, the function does nothing and returns. If the element is found, it assigns `val` to `el.checked`. The function returns `void` and writes only to the DOM.

### validateTier

`validateTier` is synchronous. It takes a single parameter `raw` typed as `string | undefined`. It checks whether `raw` is a member of the module-level constant `VALID_TIERS` (the tuple `['free', 'contender', 'champion', 'creator']`) using `Array.prototype.includes`. If the check passes, it returns `raw` cast to `ValidTier`. If the check fails — including when `raw` is `undefined` — it returns the string literal `'free'`. The function writes nothing and reads no external state.

### loadSettings

`loadSettings` is synchronous. It reads from `localStorage` under the key `'colosseum_settings'` using `JSON.parse`. If `JSON.parse` throws, the catch block assigns an empty object to `saved` and calls `localStorage.removeItem('colosseum_settings')` to discard the corrupt entry.

With `saved` in hand, the function calls `getEl` repeatedly to locate several DOM elements: the inputs `'set-display-name'`, `'set-username'`, `'set-bio'`, the elements `'set-bio-count'`, `'set-email-display'`, and `'set-tier-badge'`. For each located element it writes values sourced from `saved`, falling back to empty strings or `'—'`. For the tier badge it calls `validateTier(saved.subscription_tier)` to obtain a safe tier value, then reads `TIER_LABELS` (a module-level record) to set `badge.textContent`, and sets `badge.className` by appending the tier name when the tier is not `'free'`. It then calls `setChecked` eleven times to populate the notification, audio, and privacy toggles. Notification and privacy toggles default to `true` when the corresponding `saved` value is `undefined` (using `!== false`); the mute toggle defaults to `false` (using `=== true`). It locates `'set-language'` and sets its value to `saved.preferred_language ?? 'en'`. It calls `setChecked('set-dark-mode', ...)` with the result of reading `document.documentElement.getAttribute('data-theme') !== 'light'`.

The function then calls `getCurrentProfile()` from the auth module. If the return value is non-null, it enters a second population pass that overwrites the first. In this pass it re-sets the display name, username, bio, and bio counter using profile data, falling back to `saved` values when the profile fields are absent. It calls `getCurrentUser()` to obtain the user's email and writes that to `'set-email-display'`. It calls `validateTier` again on `p.subscription_tier` and re-sets the tier badge. If `p.preferred_language` is a string, it overwrites the language select value. If `p.is_private` is a boolean, it calls `setChecked('set-privacy-public', !p.is_private)` — inverting the DB boolean so that a private account unchecks the "public" toggle. The function returns `void`.

### saveSettings

`saveSettings` is synchronous at the top level but fires two fire-and-forget async operations. It begins by calling `getEl<HTMLButtonElement>('save-btn')`. If the button exists and is already `disabled`, the function returns immediately. Otherwise, if the button exists, it sets `disabled = true` and changes the button text to `'⏳ Saving...'`.

It then reads the trimmed string values from the DOM inputs `'set-display-name'`, `'set-username'`, and `'set-bio'` using `getEl`, falling back to empty strings via nullish coalescing. Three sequential validation branches follow. If `username` is non-empty and fails the length (3–20 characters) or character-set (`/^[a-zA-Z0-9_]+$/`) check, `toast` is called with an error message, the button is re-enabled and relabeled, and the function returns. If `displayName` is non-empty and longer than 30 characters, the same re-enable-and-return sequence runs. If `bio` is longer than 160 characters, the same sequence runs. None of these branches throw; they all exit via `return`.

If validation passes, the function assembles a `settings` object of type `SettingsData` by reading from the DOM: it reads the email from `'set-email-display'`'s `textContent`, the language from `'set-language'`'s `value`, and calls `getChecked` eleven times for the toggle fields. It writes this object to `localStorage` under `'colosseum_settings'` via `JSON.stringify`.

If the module-level constant `isPlaceholder` is `false`, two fire-and-forget calls are made. First, `updateProfile` is called with display name, username, bio, preferred language, and the inverted value of `privacy_public` for `is_private`; a `.catch` callback logs a warning on failure. Second, `safeRpc('save_user_settings', ...)` is called with all eleven toggle fields as named parameters; its `.then` callback inspects the result for an `error` property and logs a warning if present, and its `.catch` logs warnings on rejection. Neither call is awaited; both run concurrently after `saveSettings` returns.

After the conditional block, `toast('✅ Settings saved')` is called unconditionally, and the save button is re-enabled and relabeled. The function returns `void`.

### loadModeratorSettings

`loadModeratorSettings` is synchronous. It calls `getCurrentProfile()`. If the result is `null`, the function returns immediately without reading or writing anything else.

When a profile is present, it casts it to `Record<string, unknown>` and reads `p.is_moderator` and `p.mod_available`, coercing both to booleans with `!!`. It calls `setChecked('set-mod-enabled', isMod)` and `setChecked('set-mod-available', isAvail)`.

It then calls `getEl('mod-available-row')` and, if found, sets its `style.display` to `'flex'` when `isMod` is true or `'none'` when false. It calls `getEl('mod-stats')` and similarly sets its `style.display` to `'block'` or `'none'`. These two elements are shown only when the user is a moderator.

The function reads `p.mod_categories` and casts it to `string[]`, defaulting to an empty array. It calls `document.querySelectorAll<HTMLButtonElement>('.mod-cat-chip')` and iterates each chip; for each chip, it reads `chip.dataset.cat` and calls `chip.classList.toggle('selected', cats.includes(cat))` to mark or unmark the chip based on whether its category is in the profile's categories list.

It calls `getEl('mod-dot')` and, if found, sets `dot.style.background` to `'var(--success)'` when `isAvail` is true or `'var(--white-dim)'` when false.

If `isMod` is true, the function enters a stats block. It locates `'mod-stat-rating'` and sets its `textContent` to `((p.mod_rating as number) ?? 50).toFixed(1)`. It locates `'mod-stat-debates'` and sets its `textContent` to `String((p.mod_debates_total as number) ?? 0)`. It locates `'mod-stat-rulings'` and sets its `textContent` to `String((p.mod_rulings_total as number) ?? 0)`. It locates `'mod-stat-approval'` and sets its `textContent` to `((p.mod_approval_pct as number) ?? 0).toFixed(0) + '%'`. If `isMod` is false, none of these four elements are written. The function returns `void`.

## Agent 04

### toast

`toast` is synchronous. It receives a single string parameter `msg`. It calls `document.getElementById('toast')` to locate the toast element in the DOM. If no element is found, the function returns immediately without doing anything. If the element exists, it sets the element's `textContent` to `msg`, adds the CSS class `'show'` to the element's class list, and then schedules a `setTimeout` callback for 2500 milliseconds that removes the `'show'` class. The function does not return a value and does not read or write any module-level state.

### getEl

`getEl` is synchronous and generic, parameterized on `T extends HTMLElement`. It receives a single string parameter `id`. It calls `document.getElementById(id)` and casts the result to `T | null`, then returns that value. It reads no module-level state and writes nothing. It is a thin wrapper over the browser DOM API with no branching or error handling.

### getChecked

`getChecked` is synchronous. It receives a single string parameter `id`. It calls `getEl<HTMLInputElement>(id)` to retrieve an element cast as `HTMLInputElement`, then accesses its `.checked` property using optional chaining. If the element is not found, the `??` operator causes the function to return `false`. If the element is found, it returns the boolean value of `.checked`. It reads no module-level state and writes nothing.

### setChecked

`setChecked` is synchronous. It receives a string parameter `id` and a boolean parameter `val`. It calls `getEl<HTMLInputElement>(id)` to look up an element cast as `HTMLInputElement`. If the result is non-null, it sets `el.checked = val`. If the element is not found, the function does nothing. It reads no module-level state, writes no module-level state, and returns no value.

### validateTier

`validateTier` is synchronous. It receives a single parameter `raw` typed as `string | undefined`. It tests whether `raw` is a member of the module-level constant `VALID_TIERS` (the tuple `['free', 'contender', 'champion', 'creator']`) using `Array.includes`. If the test passes, it returns `raw` cast to `ValidTier`. If the test fails — including when `raw` is `undefined` — it returns the string literal `'free'`. It reads no external or DOM state, writes nothing, and has no error path beyond the fallback return.

### loadSettings

`loadSettings` is synchronous. It reads from `localStorage` under the key `'colosseum_settings'` and attempts `JSON.parse` on the result, defaulting to `'{}'` if the key is absent. If `JSON.parse` throws, the catch block assigns `saved` to an empty object and calls `localStorage.removeItem('colosseum_settings')` to purge the malformed entry. The parsed value is typed as `Partial<SettingsData>`.

In the first pass over the DOM, the function calls `getEl` to locate several input and display elements by ID and writes to them from `saved`: it sets `.value` on the display-name input, username input, and bio textarea; sets the bio counter element's `textContent` to the bio length followed by `'/160'`; and sets the email display element's `textContent` to `saved.email ?? '—'`. It then calls `validateTier(saved.subscription_tier)` to obtain a `ValidTier` and writes the corresponding label from `TIER_LABELS` into the tier badge element's `textContent`, also setting `badge.className`. Next, it calls `setChecked` eleven times — once for each toggle ID — using `!== false` defaulting for notification and privacy toggles (defaulting to `true` when absent) and `=== true` for `audio_mute` (defaulting to `false` when absent). It then sets the language dropdown's `.value`. Finally, it calls `setChecked('set-dark-mode', ...)` where the boolean is derived by reading `document.documentElement.getAttribute('data-theme')` and checking whether it is not `'light'`.

In the second pass, it calls `getCurrentProfile()` to retrieve the in-memory profile object. If the profile is non-null, it overwrites the text-field DOM values with profile data, preferring the profile's `display_name`, `username`, and `bio` over the `saved` values and updating the bio counter accordingly. It calls `getCurrentUser()` and uses the result's `.email` for the email display, falling back to `saved.email`. It calls `validateTier` again with the profile's `subscription_tier` and re-writes the badge text and class. If the profile has a string `preferred_language`, it overwrites the language dropdown's value. If the profile has a boolean `is_private`, it calls `setChecked('set-privacy-public', !p.is_private)`, inverting the value. The function returns no value.

### saveSettings

`saveSettings` is synchronous at the top level but fires two asynchronous operations as fire-and-forget. It begins by calling `getEl<HTMLButtonElement>('save-btn')` to locate the save button. If the button exists and is already disabled, the function returns immediately. Otherwise, if the button exists, it sets `disabled = true` and changes its `textContent` to `'⏳ Saving...'`.

It then reads trimmed string values from the display-name input, username input, and bio textarea via `getEl`. Three sequential validation checks follow with early returns on failure: if `username` is non-empty and fails a length or character-set test (`< 3`, `> 20`, or not matching `/^[a-zA-Z0-9_]+$/`), it calls `toast` with an error message, re-enables the button, and returns; if `displayName` is non-empty and exceeds 30 characters, same pattern; if `bio` exceeds 160 characters, same pattern. In all three early-return paths the button is restored to `disabled = false` and `textContent = '💾 SAVE CHANGES'` before returning.

If all validations pass, the function assembles a `SettingsData` object by reading the email display element's `textContent`, the language dropdown's value via `getEl`, and eleven boolean values via eleven `getChecked` calls. It writes the assembled object to `localStorage` under `'colosseum_settings'` via `JSON.stringify`.

If the module-level `isPlaceholder` constant is `false`, two asynchronous fire-and-forget calls are launched. First, `updateProfile(...)` is called with `display_name`, `username`, `bio`, `preferred_language`, and `is_private` (the inverse of `privacy_public`); the `.catch` callback logs a warning to `console.warn` if it rejects. Second, `safeRpc('save_user_settings', {...})` is called with all eleven toggle parameters; its `.then` callback checks for an `error` property on the result and logs a warning if present, and its `.catch` callback also logs a warning. Neither promise is awaited; execution continues immediately.

Finally, `toast('✅ Settings saved')` is called, and the save button is restored to `disabled = false` and `textContent = '💾 SAVE CHANGES'`. The function returns no value.

### loadModeratorSettings

`loadModeratorSettings` is synchronous. It calls `getCurrentProfile()` to obtain the current profile. If the profile is null, it returns immediately with no further action.

With a non-null profile, it reads `p.is_moderator` and `p.mod_available` as booleans using double-negation. It calls `setChecked('set-mod-enabled', isMod)` and `setChecked('set-mod-available', isAvail)`. It then calls `getEl('mod-available-row')` and, if found, sets its `style.display` to `'flex'` when `isMod` is true and `'none'` when false. The same conditional logic applies to the element with ID `'mod-stats'`, setting its `style.display` to `'block'` or `'none'`.

It reads `p.mod_categories` as a string array (defaulting to `[]`), then iterates over all DOM elements matching the selector `'.mod-cat-chip'` via `document.querySelectorAll`. For each chip, it reads `chip.dataset.cat` (defaulting to `''`) and calls `chip.classList.toggle('selected', cats.includes(cat))` — adding the class if the category is in the array, removing it otherwise.

It calls `getEl('mod-dot')` and, if found, sets `dot.style.background` to `'var(--success)'` if `isAvail` is true, or `'var(--white-dim)'` otherwise.

Finally, if `isMod` is true, it writes four stat values into the DOM: it calls `getEl('mod-stat-rating')` and sets its `textContent` to `p.mod_rating` (defaulting to `50`) formatted with one decimal place via `.toFixed(1)`; it calls `getEl('mod-stat-debates')` and sets its `textContent` to `String(p.mod_debates_total ?? 0)`; it calls `getEl('mod-stat-rulings')` with the same pattern using `p.mod_rulings_total`; and it calls `getEl('mod-stat-approval')` and sets its `textContent` to `p.mod_approval_pct` (defaulting to `0`) formatted with zero decimal places followed by `'%'`. If `isMod` is false, this entire block is skipped. The function returns no value.

## Agent 05

### toast

`toast` is synchronous. It takes a single `msg` string parameter. It reads the DOM by calling `document.getElementById('toast')`. If no element with that id exists, the function returns immediately with no effect. When the element is found, it sets `el.textContent` to `msg`, adds the CSS class `'show'` to the element's class list, then schedules a `setTimeout` callback with a 2500ms delay that removes the `'show'` class. The function returns `void` and does not write to any module-level state. It does not call any other function on the anchor list.

### getEl

`getEl` is synchronous and generic. It takes a single `id` string and calls `document.getElementById(id)`, casting the result to `T | null` where `T` defaults to `HTMLElement`. It returns that cast value directly. It has no branches, no side effects, and writes nothing. It is used throughout the module as the sole DOM lookup utility.

### getChecked

`getChecked` is synchronous. It takes an `id` string, calls `getEl<HTMLInputElement>(id)` to obtain an `HTMLInputElement` or `null`, and reads the `.checked` property of that element. If `getEl` returns `null`, the optional chaining short-circuits and the nullish coalescing operator returns `false`. Otherwise it returns the boolean value of `.checked`. It writes nothing and has no side effects.

### setChecked

`setChecked` is synchronous. It takes an `id` string and a `val` boolean. It calls `getEl<HTMLInputElement>(id)`. If the result is non-null, it sets `el.checked = val`. If `getEl` returns `null`, the body of the `if` block is skipped and the function returns without effect. It writes only to the `.checked` property of the located DOM element and returns `void`.

### validateTier

`validateTier` is synchronous. It takes a single `raw` parameter typed as `string | undefined`. It checks whether `raw` is a member of the module-level constant tuple `VALID_TIERS` (`['free', 'contender', 'champion', 'creator']`) using `Array.prototype.includes`. If the check passes, it returns `raw` cast to `ValidTier`. If `raw` is `undefined` or any string not in `VALID_TIERS`, it returns the string literal `'free'`. It reads no external state and writes nothing.

### loadSettings

`loadSettings` is synchronous. It begins with a `try/catch` block that calls `localStorage.getItem('colosseum_settings')` and passes the result (or `'{}'` as a fallback) to `JSON.parse`, storing the result in the local variable `saved` typed as `Partial<SettingsData>`. If `JSON.parse` throws, the catch block sets `saved` to `{}` and calls `localStorage.removeItem('colosseum_settings')` to clear the corrupt entry.

With `saved` established, the function populates DOM elements. It calls `getEl<HTMLInputElement>('set-display-name')`, `getEl<HTMLInputElement>('set-username')`, and `getEl<HTMLTextAreaElement>('set-bio')` and, for each non-null result, sets `.value` to the corresponding field from `saved` (defaulting to `''`). It then calls `getEl('set-bio-count')` and sets its `.textContent` to the bio length plus the string `'/160'`. It calls `getEl('set-email-display')` and sets its `.textContent` to `saved.email` or `'—'`.

It calls `validateTier(saved.subscription_tier)` to obtain a `tier` value, then calls `getEl('set-tier-badge')` and, if found, sets both `.textContent` and `.className` based on `TIER_LABELS[tier]` and whether `tier !== 'free'`.

It then calls `setChecked` eleven times for the toggle ids (`set-notif-challenge`, `set-notif-debate`, `set-notif-follow`, `set-notif-reactions`, `set-notif-rivals`, `set-notif-economy`, `set-audio-sfx`, `set-audio-mute`, `set-privacy-public`, `set-privacy-online`, `set-privacy-challenges`). The notification and most privacy toggles default to `true` by testing `saved.field !== false`; `set-audio-mute` defaults to `false` by testing `saved.audio_mute === true`.

It calls `getEl<HTMLSelectElement>('set-language')` and sets `.value` to `saved.preferred_language` or `'en'`. It calls `setChecked('set-dark-mode', ...)` where the boolean is derived by reading `document.documentElement.getAttribute('data-theme')` and checking whether it is not `'light'`.

Finally, the function calls `getCurrentProfile()` from the auth module. If the returned `profile` is non-null, a second pass overwrites the DOM values already set from `saved`. It re-sets the display name, username, and bio input values and bio counter text from profile fields, preferring profile values and falling back to `saved` fields. It calls `getCurrentUser()` and sets the email display element's text to `user.email`, falling back to `saved.email` or `'—'`. It calls `validateTier` again with `p.subscription_tier` and updates the tier badge. If `p.preferred_language` is a string, it overrides the language select value. If `p.is_private` is a boolean, it calls `setChecked('set-privacy-public', !p.is_private)`, inverting the boolean because the toggle represents public status. The function returns `void` and writes no module-level state.

### saveSettings

`saveSettings` is synchronous at its top level but fires two unawaited asynchronous calls as fire-and-forget operations. It calls `getEl<HTMLButtonElement>('save-btn')`. If `saveBtn` is non-null and already has `disabled === true`, the function returns immediately with no further action.

If not returning early, it disables the button and sets its `textContent` to `'⏳ Saving...'`. It then reads trimmed values from three DOM elements via `getEl`: `set-display-name` (`.value.trim()`), `set-username` (`.value.trim()`), and `set-bio` (`.value.trim()`), defaulting each to `''` if the element is absent.

Three validation branches follow. If `username` is non-empty and fails length (under 3 or over 20 characters) or character-set validation (`/^[a-zA-Z0-9_]+$/`), the function calls `toast('❌ Username: 3-20 chars, letters/numbers/underscores only')`, re-enables the button, restores its label, and returns. If `displayName` is non-empty and exceeds 30 characters, it calls `toast('❌ Display name: max 30 characters')`, re-enables the button, and returns. If `bio` exceeds 160 characters, it calls `toast('❌ Bio: max 160 characters')`, re-enables the button, and returns.

If all validations pass, it builds a `SettingsData` object by reading the email display element's `.textContent`, the language select's `.value`, and calling `getChecked` eleven times for the toggle ids. It then calls `localStorage.setItem('colosseum_settings', JSON.stringify(settings))`.

It then checks the module-level constant `isPlaceholder` (derived from `isAnyPlaceholder` at import time). If `isPlaceholder` is `false`, two network calls are dispatched without `await`. The first calls `updateProfile(...)` with the profile fields; its returned promise has a `.catch` handler that logs to `console.warn`. The second calls `safeRpc('save_user_settings', ...)` with all eleven toggle parameters; its returned promise has a `.then` handler that checks for `r?.error` and logs to `console.warn` on failure, and a `.catch` handler that also logs to `console.warn`. Neither promise is awaited, so the function does not block for network completion.

After the conditional block, the function calls `toast('✅ Settings saved')`, re-enables the button, and restores its label. It returns `void`.

### loadModeratorSettings

`loadModeratorSettings` is synchronous. It calls `getCurrentProfile()`. If the returned value is `null` or falsy, the function returns immediately with no effect.

With a non-null profile, it reads `p.is_moderator` and `p.mod_available`, coercing both to booleans with `!!`. It calls `setChecked('set-mod-enabled', isMod)` and `setChecked('set-mod-available', isAvail)`.

It then shows or hides two DOM elements based on `isMod`. It calls `getEl('mod-available-row')` and, if found, sets its `style.display` to `'flex'` when `isMod` is `true` or `'none'` when `false`. It calls `getEl('mod-stats')` and sets its `style.display` to `'block'` or `'none'` on the same condition.

It reads `p.mod_categories` as a `string[]`, defaulting to `[]` if absent. It calls `document.querySelectorAll<HTMLButtonElement>('.mod-cat-chip')` and iterates over the resulting NodeList with `forEach`. For each chip, it reads `chip.dataset.cat` (defaulting to `''`) and calls `chip.classList.toggle('selected', cats.includes(cat))`, setting the selected state to match whether the category appears in the profile array.

It calls `getEl('mod-dot')` and, if found, sets `dot.style.background` to `'var(--success)'` when `isAvail` is `true` or `'var(--white-dim)'` when `false`.

If `isMod` is `true`, it enters a stats block. It calls `getEl` for four element ids: `mod-stat-rating`, `mod-stat-debates`, `mod-stat-rulings`, and `mod-stat-approval`. For each non-null element it sets `.textContent`: `mod-stat-rating` receives `((p.mod_rating ?? 50).toFixed(1))`; `mod-stat-debates` receives `String(p.mod_debates_total ?? 0)`; `mod-stat-rulings` receives `String(p.mod_rulings_total ?? 0)`; `mod-stat-approval` receives `((p.mod_approval_pct ?? 0).toFixed(0)) + '%'`. If `isMod` is `false` the stats block is skipped entirely. The function returns `void` and writes no module-level state.
