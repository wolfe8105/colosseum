# Stage 2 Outputs — groups.settings.ts

## Agent 01

### openGroupSettings

`openGroupSettings` receives a `GroupDetail` object `g` and a `callbacks` object containing two functions. It immediately reads the module-level `callerRole` imported from `groups.state.ts` and returns without doing anything else if that value is not `'leader'`. When the caller is a leader, it writes both module-level state variables: `onSettingsSaved` is set to `callbacks.onSaved` and `onGroupDeleted` is set to `callbacks.onDeleted`. It then calls `_populateSettings(g)`, which fills every form field in the settings view with data from `g`. After `_populateSettings` returns, it reads two DOM elements by ID — `view-detail` and `view-settings` — and sets their `style.display` properties: `view-detail` is hidden and `view-settings` is shown as `flex`. The function is synchronous and returns `void`.

### closeGroupSettings

`closeGroupSettings` takes no parameters and reads no module-level state. It queries the DOM for `view-settings` and sets its `style.display` to `'none'`, then queries `view-detail` and sets its `style.display` to `'flex'`, reversing the visibility swap performed by `openGroupSettings`. It then calls `_hideDeleteConfirm`, which hides the delete confirmation panel if it is visible. The function is synchronous and returns `void`.

### onJoinModeChange

`onJoinModeChange` receives a `mode` string. It reads two DOM elements by ID: `settings-requirements-section` and `settings-audition-section`. For each element, if the element exists in the DOM (both are guarded by a truthiness check), it sets the element's `style.display`. `settings-requirements-section` is set to `'block'` when `mode` is `'requirements'` and `'none'` otherwise. `settings-audition-section` is set to `'block'` when `mode` is `'audition'` and `'none'` otherwise. No state is written to module-level variables. The function is synchronous and returns `void`.

### submitGroupSettings

`submitGroupSettings` is async. It immediately reads the DOM element `settings-save-btn`, casts it as `HTMLButtonElement`, sets its `disabled` to `true`, and sets its `textContent` to `'SAVING…'`. All subsequent work is wrapped in a `try/catch/finally` block.

In the try block, it reads the currently checked radio button with `name="join-mode"` to get `joinMode`, falling back to `'open'` if none is checked. It then reads four DOM elements to build the `entryReq` object: the text value of `settings-min-elo` (converted to a number if non-empty), the value of `settings-min-tier` (included if non-empty), and the checked state of `settings-req-profile` (included as `true` if checked). It reads four more elements to build the `audConfig` object: the value of `settings-aud-rule` (always included as `rule`), and optionally `settings-aud-topic`, `settings-aud-category`, `settings-aud-ruleset`, and `settings-aud-rounds` (each included in the object only if the DOM value is truthy, with `locked_total_rounds` cast to a number). The function then calls `safeRpc('update_group_settings', {...})` and awaits the result. The payload includes `currentGroupId` from `groups.state.ts`, the trimmed description (or `null`), category, `is_public`, avatar emoji from `settings-emoji-selected`'s `data-emoji` attribute, `joinMode`, and conditionally the `entryReq` object (passed as `p_entry_requirements` only when `joinMode` is `'requirements'`, otherwise `{}`) and `audConfig` (passed as `p_audition_config` only when `joinMode` is `'audition'`, otherwise `{}`). If the returned `error` is truthy, it throws that error. On success, it calls `showToast('Settings saved')`, then calls `closeGroupSettings`, then calls `onSettingsSaved?.()` (a fire-and-forget invocation of the saved callback if it is non-null).

In the catch block, it calls `showToast` with the error's message property, falling back to `'Could not save settings'`. In the finally block, regardless of outcome, it sets `btn.disabled` back to `false` and resets `btn.textContent` to `'SAVE'`.

### showDeleteConfirm

`showDeleteConfirm` takes no parameters and reads no module-level state. It reads the DOM element `settings-delete-confirm` and sets its `style.display` to `'block'`. It then reads the input element `settings-delete-name-input` and clears its value to an empty string. Finally, it calls `scrollIntoView({ behavior: 'smooth' })` on `settings-delete-confirm`, causing the browser to scroll that element into the viewport with a smooth animation. The function is synchronous and returns `void`.

### submitDeleteGroup

`submitDeleteGroup` is async. It reads the value of the input element `settings-delete-name-input`, trims it, and assigns it to `confirmName`. If `confirmName` is falsy (empty after trimming), it calls `showToast('Type the group name to confirm')` and returns early; no network call is made. Otherwise, it reads `settings-delete-submit-btn` as `HTMLButtonElement`, sets its `disabled` to `true`, and sets its `textContent` to `'DELETING…'`.

The remaining work is in a `try/catch` block with no `finally`. In the try block, it calls `safeRpc('delete_group', { p_group_id: currentGroupId, p_confirm_name: confirmName })` and awaits the result. `currentGroupId` is read from `groups.state.ts`. If the returned `error` is truthy, it throws that error. On success, it reads `view-settings` from the DOM and sets its `style.display` to `'none'`, then calls `onGroupDeleted?.()` (fire-and-forget invocation of the module-level deleted callback). In the catch block, it calls `showToast` with the error's message or `'Could not delete group'`, then sets `btn.disabled` back to `false` and resets `btn.textContent` to `'DELETE FOREVER'`. Unlike `submitGroupSettings`, there is no `finally` block, so the button is only re-enabled on the error path — on the success path, the settings view is hidden and the callback fires without restoring the button state.

### selectSettingsEmoji

`selectSettingsEmoji` receives an `HTMLElement` parameter `el`. It queries all elements matching the CSS class `.settings-emoji-opt` and removes the `'selected'` class from every one of them via a `forEach` loop. It then adds `'selected'` to `el`'s class list. It reads the DOM element `settings-emoji-selected` as an `HTMLElement`. It sets that element's `textContent` to `el.dataset.emoji`, falling back to `'⚔️'` if that dataset value is absent. It also sets `display.dataset.emoji` to the same value with the same fallback. The function is synchronous and returns `void`.

### _populateSettings

`_populateSettings` receives a `GroupDetail` object `g` and writes directly to the DOM, setting field values from the object's properties with defaults where properties are absent.

It writes `g.description` (or `''`) to the `value` of `settings-desc`, `g.category` (or `'general'`) to the `value` of `settings-category`, and `g.is_public` (or `true`) to the `checked` property of `settings-is-public`. It reads `settings-emoji-selected` and writes both its `textContent` and `dataset.emoji` to `g.avatar_emoji` (defaulting to `'⚔️'`). It then iterates over all `.settings-emoji-opt` elements with `querySelectorAll`, toggling each element's `'selected'` class based on whether that element's `data-emoji` attribute equals the resolved avatar emoji.

Next it determines `mode` as `g.join_mode ?? 'open'`, queries the radio input `input[name="join-mode"][value="${mode}"]`, and sets its `checked` to `true` if found. It then calls `onJoinModeChange(mode)` to show or hide the requirements and audition sections to match the selected mode.

It reads `g.entry_requirements ?? {}` as `req` and writes three fields: `settings-min-elo` gets `req.min_elo` converted to a string (or `''`), `settings-min-tier` gets `req.min_tier` (or `''`), and `settings-req-profile` gets `req.require_profile_complete` (or `false`). It reads `g.audition_config ?? {}` as `aud` and writes five fields: `settings-aud-rule` gets `aud.rule` (or `'allowed_by_leader'`), `settings-aud-topic` gets `aud.locked_topic` (or `''`), `settings-aud-category` gets `aud.locked_category` (or `''`), `settings-aud-ruleset` gets `aud.locked_ruleset` (or `''`), and `settings-aud-rounds` gets `aud.locked_total_rounds` converted to a string (or `''`). Finally it calls `_hideDeleteConfirm` to collapse the delete confirmation panel. The function is synchronous and returns `void`.

### _hideDeleteConfirm

`_hideDeleteConfirm` takes no parameters and reads no module-level state. It reads the DOM element `settings-delete-confirm`. If that element exists (the check is a truthiness guard), it sets the element's `style.display` to `'none'`. If the element is not found in the DOM, the function does nothing. The function is synchronous and returns `void`.

## Agent 02

### openGroupSettings

`openGroupSettings` receives a `GroupDetail` object `g` and a `callbacks` object containing `onSaved` and `onDeleted` functions. It reads the module-level `callerRole` imported from `groups.state.ts` and returns immediately without doing anything else if that value is not `'leader'`. When the caller is a leader, it writes the module-level variables `onSettingsSaved` and `onGroupDeleted` with the two callbacks, then calls `_populateSettings(g)` to fill every form field with the current group data. After `_populateSettings` returns, it reads the DOM elements with IDs `view-detail` and `view-settings` and writes their `style.display` properties, hiding the detail view and showing the settings view as a flex container. The function is synchronous and returns `void`.

### closeGroupSettings

`closeGroupSettings` takes no parameters and reads no module-level state. It writes `style.display` on the `view-settings` DOM element to `'none'` and on the `view-detail` element to `'flex'`, reversing the visibility swap performed by `openGroupSettings`. It then calls `_hideDeleteConfirm`, which reads the `settings-delete-confirm` DOM element and hides it if present. The function is synchronous and returns `void`.

### onJoinModeChange

`onJoinModeChange` receives a `mode` string as its sole parameter. It reads no module-level state. It queries the DOM for elements with IDs `settings-requirements-section` and `settings-audition-section`. If `settings-requirements-section` exists, it sets that element's `style.display` to `'block'` when `mode` is `'requirements'` and to `'none'` for any other value. If `settings-audition-section` exists, it sets that element's `style.display` to `'block'` when `mode` is `'audition'` and to `'none'` otherwise. Both branches are guarded by null checks, so if either element is absent from the DOM the corresponding assignment is silently skipped. The function is synchronous and returns `void`.

### submitGroupSettings

`submitGroupSettings` is async. It first reads the DOM element with ID `settings-save-btn`, disables it, and sets its text to `'SAVING…'`. The remainder of the body is wrapped in a try/catch/finally block.

In the try branch, it reads the checked radio input named `join-mode` from the DOM; if none is checked the value defaults to `'open'`. It reads five more DOM inputs to build an `entryReq` plain object: the `settings-min-elo` text input (converted to a `Number` if non-empty), the `settings-min-tier` select, and the `settings-req-profile` checkbox. Only non-empty or truthy values are written into `entryReq`, so the object may be empty. It then reads four more DOM elements to build an `audConfig` plain object seeded with `{ rule: audRule }`, conditionally extending it with `locked_topic`, `locked_category`, `locked_ruleset`, and `locked_total_rounds` when the corresponding fields are non-empty. It awaits `safeRpc('update_group_settings', ...)`, passing `currentGroupId` from `groups.state.ts` plus all form values including the emoji from `settings-emoji-selected`'s `data-emoji` attribute. The `entry_requirements` parameter is set to `entryReq` only when `joinMode === 'requirements'`, otherwise `{}`; `audition_config` is set to `audConfig` only when `joinMode === 'audition'`, otherwise `{}`. If `safeRpc` returns an error object, it is thrown. On success, `showToast('Settings saved')` is called, then `closeGroupSettings()` is called to hide the settings view and show the detail view, then the module-level `onSettingsSaved` callback is invoked if non-null.

In the catch branch, `showToast` is called with the error's message or a fallback string. In the finally block, the button is re-enabled and its text reset to `'SAVE'` regardless of outcome.

### showDeleteConfirm

`showDeleteConfirm` takes no parameters and reads no module-level state. It reads the `settings-delete-confirm` DOM element and sets its `style.display` to `'block'`. It then reads `settings-delete-name-input` and clears its value to an empty string. Finally it calls `scrollIntoView({ behavior: 'smooth' })` on the `settings-delete-confirm` element, scrolling it into the viewport. The function is synchronous and returns `void`.

### submitDeleteGroup

`submitDeleteGroup` is async. It reads the trimmed value of the `settings-delete-name-input` DOM input as `confirmName`. If `confirmName` is empty, it calls `showToast('Type the group name to confirm')` and returns early without proceeding. Otherwise it reads the `settings-delete-submit-btn` button element, disables it, and sets its text to `'DELETING…'`.

The rest of the body is in a try/catch block with no finally. In the try branch, it awaits `safeRpc('delete_group', { p_group_id: currentGroupId, p_confirm_name: confirmName })`. If `safeRpc` returns an error, that error is thrown. On success, it writes `style.display = 'none'` on the `view-settings` DOM element (without restoring `view-detail`) and invokes the module-level `onGroupDeleted` callback if non-null. In the catch branch, `showToast` is called with the error message or a fallback string, and the button is re-enabled with its text reset to `'DELETE FOREVER'`. Because there is no finally block, the button is only re-enabled on the error path; on the success path the settings view is hidden and control passes to the `onGroupDeleted` callback, leaving the button in its disabled state.

### selectSettingsEmoji

`selectSettingsEmoji` receives an `HTMLElement` as its sole parameter, expected to be one of the emoji option elements. It queries all DOM elements with class `settings-emoji-opt` and removes the `selected` class from every one of them. It then adds `selected` to the passed element `el`. It reads the `settings-emoji-selected` DOM element and writes its `textContent` and `data-emoji` dataset property to `el.dataset.emoji`, falling back to `'⚔️'` if that attribute is absent. The function is synchronous and returns `void`.

### _populateSettings

`_populateSettings` receives a `GroupDetail` object `g` and reads no module-level state. It performs a series of DOM writes in five logical groups.

First, it sets the `value` of `settings-desc` to `g.description ?? ''`, the `value` of `settings-category` to `g.category ?? 'general'`, and the `checked` state of `settings-is-public` to `g.is_public ?? true`.

Second, it writes the group's current emoji to `settings-emoji-selected`'s `textContent` and `data-emoji` attribute, using `'⚔️'` as a fallback. It then iterates all `.settings-emoji-opt` elements, toggling the `selected` class on each based on whether its own `data-emoji` attribute matches the group's emoji.

Third, it reads `g.join_mode ?? 'open'` as `mode`, queries the DOM for the matching radio input using a template selector, and checks that radio if found. It then calls `onJoinModeChange(mode)`, which shows or hides the requirements and audition sections based on the mode value.

Fourth, it reads `g.entry_requirements ?? {}` and sets the values of `settings-min-elo`, `settings-min-tier`, and `settings-req-profile`, converting `min_elo` to a string if present.

Fifth, it reads `g.audition_config ?? {}` and sets the values of `settings-aud-rule`, `settings-aud-topic`, `settings-aud-category`, `settings-aud-ruleset`, and `settings-aud-rounds`, converting `locked_total_rounds` to a string if present.

After all field assignments, it calls `_hideDeleteConfirm` to ensure the delete confirmation section is hidden when the settings view is opened. The function is synchronous and returns `void`.

### _hideDeleteConfirm

`_hideDeleteConfirm` takes no parameters and reads no module-level state. It queries the DOM for the element with ID `settings-delete-confirm` and, if that element exists, sets its `style.display` to `'none'`. The null check means no error is thrown if the element is absent. The function is synchronous and returns `void`.

## Agent 03

### openGroupSettings

`openGroupSettings` receives a `GroupDetail` object `g` and a `callbacks` object carrying two functions: `onSaved` and `onDeleted`. It first reads the module-level `callerRole` imported from `groups.state.ts`; if `callerRole` is not `'leader'`, it returns immediately without doing anything else. When the guard passes, it writes both module-level state variables: `onSettingsSaved` is set to `callbacks.onSaved` and `onGroupDeleted` is set to `callbacks.onDeleted`. It then calls `_populateSettings(g)` to fill the settings form with the group's current data. Finally it reads the DOM elements `view-detail` and `view-settings` by ID and sets their `style.display` to `'none'` and `'flex'` respectively, switching the visible view. The function is synchronous and returns nothing.

### closeGroupSettings

`closeGroupSettings` takes no parameters and reads no module-level state. It reads the DOM elements `view-settings` and `view-detail` by ID and reverses the display swap performed by `openGroupSettings`: `view-settings` is set to `'none'` and `view-detail` is set to `'flex'`. It then calls `_hideDeleteConfirm()`, which hides the delete confirmation sub-panel if it is present. The function is synchronous and returns nothing.

### onJoinModeChange

`onJoinModeChange` receives a `mode` string. It reads two DOM elements by ID: `settings-requirements-section` and `settings-audition-section`. For each element, if it exists in the DOM, it sets `style.display` conditionally: `settings-requirements-section` is shown (`'block'`) only when `mode === 'requirements'`, and `settings-audition-section` is shown (`'block'`) only when `mode === 'audition'`; both are set to `'none'` for any other mode value. Neither null-check produces an early return from the function; the absence of one element does not prevent the other from being processed. The function is synchronous, reads no module-level state, and returns nothing.

### submitGroupSettings

`submitGroupSettings` is async. It begins by reading the DOM element `settings-save-btn` and immediately disabling it and setting its text to `'SAVING…'`. The entire subsequent work is wrapped in a try/catch/finally block.

In the try branch, it reads the currently checked radio button with name `join-mode` to determine `joinMode`, defaulting to `'open'` if none is checked. It then reads several DOM form elements to build two JSONB payloads. For `entry_requirements`, it reads `settings-min-elo` (trimmed string), `settings-min-tier` (select value), and `settings-req-profile` (checkbox); it conditionally adds `min_elo` as a `Number`, `min_tier`, and `require_profile_complete: true` to the `entryReq` object only when each value is truthy. For `audition_config`, it reads `settings-aud-rule`, `settings-aud-topic`, `settings-aud-category`, `settings-aud-ruleset`, and `settings-aud-rounds`; it initializes `audConfig` with `rule` always set, then conditionally adds `locked_topic`, `locked_category`, `locked_ruleset`, and `locked_total_rounds` (cast to `Number`) when each value is truthy.

It then awaits `safeRpc('update_group_settings', ...)`, passing the module-level `currentGroupId` (imported from `groups.state.ts`) alongside all the form-derived values. The `p_entry_requirements` parameter receives `entryReq` only when `joinMode === 'requirements'`, otherwise `{}`; `p_audition_config` receives `audConfig` only when `joinMode === 'audition'`, otherwise `{}`. If `safeRpc` returns an `error` object, that error is thrown. On success, it calls `showToast('Settings saved')`, then calls `closeGroupSettings()` to return to the detail view and hide the delete panel, then calls `onSettingsSaved?.()` as an optional fire-and-forget invocation of the module-level callback.

In the catch block, it calls `showToast` with the error's `.message` or a fallback string. In the finally block, regardless of outcome, the button is re-enabled and its text is reset to `'SAVE'`.

### showDeleteConfirm

`showDeleteConfirm` takes no parameters and reads no module-level state. It reads the DOM element `settings-delete-confirm` by ID and sets its `style.display` to `'block'`. It then reads `settings-delete-name-input` by ID and clears its value to an empty string. Finally it calls `scrollIntoView({ behavior: 'smooth' })` on `settings-delete-confirm`, scrolling that element into the viewport with smooth animation. The function is synchronous and returns nothing.

### submitDeleteGroup

`submitDeleteGroup` is async. It begins by reading the trimmed value of `settings-delete-name-input`; if that value is empty, it calls `showToast('Type the group name to confirm')` and returns immediately. Otherwise it reads `settings-delete-submit-btn`, disables it, and sets its text to `'DELETING…'`.

The remaining work is in a try/catch block with no finally. In the try branch, it awaits `safeRpc('delete_group', ...)`, passing the module-level `currentGroupId` and the `confirmName` string. If `safeRpc` returns an `error`, that error is thrown. On success, it reads `view-settings` by ID and sets its `style.display` to `'none'` directly (without calling `closeGroupSettings`), then calls `onGroupDeleted?.()` as an optional fire-and-forget invocation of the module-level callback. The button is not re-enabled on the success path, and `view-detail` is not re-shown — that is left to the caller via the `onGroupDeleted` callback.

In the catch block, `showToast` is called with the error's `.message` or a fallback string, and then the button is re-enabled with its text reset to `'DELETE FOREVER'`.

### selectSettingsEmoji

`selectSettingsEmoji` receives a single `HTMLElement` parameter `el`. It reads all DOM elements matching the class selector `.settings-emoji-opt` and removes the `'selected'` class from each via `forEach`. It then adds `'selected'` to `el` specifically. It reads the DOM element `settings-emoji-selected` by ID and sets two properties on it: `textContent` is set to `el.dataset.emoji` or `'⚔️'` if that dataset attribute is absent or falsy, and `dataset.emoji` is set to the same resolved value. The function is synchronous, reads no module-level state, and returns nothing.

### _populateSettings

`_populateSettings` receives a `GroupDetail` object `g`. It writes to the DOM in five groups, all synchronous, with no early returns.

For general fields, it sets the `value` of `settings-desc` to `g.description ?? ''`, the `value` of `settings-category` to `g.category ?? 'general'`, and the `checked` property of `settings-is-public` to `g.is_public ?? true`.

For the emoji display, it reads `settings-emoji-selected` and sets both `textContent` and `dataset.emoji` to `g.avatar_emoji ?? '⚔️'`. It then iterates all `.settings-emoji-opt` elements via `querySelectorAll` and uses `classList.toggle` to add `'selected'` to whichever option's `dataset.emoji` matches the resolved emoji value, removing it from all others.

For join mode, it resolves `mode` from `g.join_mode ?? 'open'`, queries for the radio input with `name="join-mode"` and the matching `value` attribute, and if found sets its `checked` property to `true`. It then calls `onJoinModeChange(mode)`, which toggles the visibility of the requirements and audition sub-sections.

For entry requirements, it reads `g.entry_requirements ?? {}` and sets the `value` of `settings-min-elo` to the stringified `min_elo` or `''`, the `value` of `settings-min-tier` to `min_tier ?? ''`, and the `checked` of `settings-req-profile` to `require_profile_complete ?? false`.

For audition config, it reads `g.audition_config ?? {}` and sets the `value` of each of the five audition DOM elements (`settings-aud-rule`, `settings-aud-topic`, `settings-aud-category`, `settings-aud-ruleset`, `settings-aud-rounds`) to their corresponding fields, using per-field fallbacks and stringifying numeric values. Finally it calls `_hideDeleteConfirm()` to collapse the delete confirmation panel regardless of its current state.

### _hideDeleteConfirm

`_hideDeleteConfirm` takes no parameters and reads no module-level state. It reads the DOM element `settings-delete-confirm` by ID. If the element exists, it sets `style.display` to `'none'`. If the element is not found, the null-check prevents any error and the function exits silently. The function is synchronous and returns nothing.

## Agent 04

### openGroupSettings

`openGroupSettings` receives a `GroupDetail` object `g` and a `callbacks` object carrying two functions, `onSaved` and `onDeleted`. Its first action is to read the module-level import `callerRole` from `groups.state.ts`; if that value is not `'leader'`, the function returns immediately without doing anything else. When the role check passes, it writes both module-level state variables: `onSettingsSaved` is set to `callbacks.onSaved` and `onGroupDeleted` is set to `callbacks.onDeleted`. It then calls `_populateSettings(g)`, passing the full `GroupDetail` through to pre-fill every form field. After `_populateSettings` returns, it reads two DOM elements by ID — `view-detail` and `view-settings` — and sets the first to `display: none` and the second to `display: flex`, switching the visible panel. The function is synchronous and returns `void`.

### closeGroupSettings

`closeGroupSettings` takes no parameters and reads nothing from module-level state. It sets `view-settings` to `display: none` and `view-detail` to `display: flex`, reversing the panel swap performed by `openGroupSettings`. It then calls `_hideDeleteConfirm()`, which hides the delete-confirmation section if it is visible. The function is synchronous and returns `void`.

### onJoinModeChange

`onJoinModeChange` receives a single string `mode`. It reads two DOM elements by ID: `settings-requirements-section` and `settings-audition-section`. For the requirements section, if the element exists, it sets its `display` style to `'block'` when `mode === 'requirements'` and `'none'` otherwise. For the audition section, if the element exists, it sets its `display` style to `'block'` when `mode === 'audition'` and `'none'` otherwise. Both element lookups guard against `null` with an `if` check before writing. The function has no return value and is synchronous.

### submitGroupSettings

`submitGroupSettings` is `async` and returns `Promise<void>`. It immediately reads the DOM element `settings-save-btn`, casts it to `HTMLButtonElement`, disables it, and sets its text to `'SAVING…'`. The entire remaining logic is inside a `try/catch/finally` block.

In the `try` branch it reads the currently checked radio button with `document.querySelector('input[name="join-mode"]:checked')`, falling back to `'open'` if nothing is checked. It then reads five more DOM elements to build the `entryReq` object: the `settings-min-elo` input (coerced to `Number` if non-empty), the `settings-min-tier` select, and the `settings-req-profile` checkbox. Only fields with truthy values are written into `entryReq`. It then reads four more elements to build `audConfig`: the `settings-aud-rule` select always populates the `rule` key; `settings-aud-topic`, `settings-aud-category`, `settings-aud-ruleset`, and `settings-aud-rounds` are each added to `audConfig` only when they have non-empty values, with `locked_total_rounds` coerced through `Number`. It then `await`s `safeRpc('update_group_settings', …)`, passing `currentGroupId` from `groups.state.ts` alongside all the collected values; `p_entry_requirements` is sent as `entryReq` only when `joinMode === 'requirements'`, otherwise as `{}`; `p_audition_config` is sent as `audConfig` only when `joinMode === 'audition'`, otherwise as `{}`. If `safeRpc` resolves with a non-null `error`, it throws that error. On success it calls `showToast('Settings saved')`, then calls `closeGroupSettings()`, then invokes `onSettingsSaved?.()` as a fire-and-forget optional call.

In the `catch` branch it calls `showToast` with the error message or the fallback string `'Could not save settings'`. The `finally` block always re-enables the button and restores its text to `'SAVE'`.

### showDeleteConfirm

`showDeleteConfirm` takes no parameters. It reads `settings-delete-confirm` by ID and sets its `display` style to `'block'`. It then reads `settings-delete-name-input`, casts it to `HTMLInputElement`, and clears its value to an empty string. Finally it calls `scrollIntoView({ behavior: 'smooth' })` on the `settings-delete-confirm` element, scrolling the confirmation panel into the viewport. The function is synchronous.

### submitDeleteGroup

`submitDeleteGroup` is `async` and returns `Promise<void>`. It reads `settings-delete-name-input` by ID, trims its value into `confirmName`, and performs an early return after calling `showToast('Type the group name to confirm')` if `confirmName` is empty. When `confirmName` is non-empty, it reads `settings-delete-submit-btn`, casts it to `HTMLButtonElement`, disables it, and sets its text to `'DELETING…'`.

The remainder runs inside a `try/catch` block with no `finally`. In the `try` branch it `await`s `safeRpc('delete_group', { p_group_id: currentGroupId, p_confirm_name: confirmName })`, reading `currentGroupId` from module-level state. If the resolved `error` is non-null it throws it. On success it hides `view-settings` by setting `display: none` and then calls `onGroupDeleted?.()` fire-and-forget, without re-enabling the button (the view is leaving anyway). In the `catch` branch it calls `showToast` with the error message or `'Could not delete group'` and then re-enables the button and restores its text to `'DELETE FOREVER'`. Unlike `submitGroupSettings`, there is no `finally` block, so button restoration only happens on the error path.

### selectSettingsEmoji

`selectSettingsEmoji` receives a single `HTMLElement` `el`. It first queries all elements matching `.settings-emoji-opt` and removes the `'selected'` class from every one of them. It then adds `'selected'` to `el`. It reads `settings-emoji-selected` by ID and writes two things to it: `textContent` is set to `el.dataset.emoji` falling back to `'⚔️'` if the dataset property is absent, and `dataset.emoji` on the display element is set to the same value. The function is synchronous, makes no RPC calls, and returns `void`.

### _populateSettings

`_populateSettings` is a private synchronous function that receives one `GroupDetail` parameter `g` and returns `void`. It performs a series of DOM writes in five logical groups, reading fields from `g` with nullish-coalescing fallbacks throughout.

First it sets general fields: the `settings-desc` textarea value to `g.description ?? ''`, the `settings-category` select value to `g.category ?? 'general'`, and the `settings-is-public` checkbox checked state to `g.is_public ?? true`.

Second it populates the emoji display: it sets both `textContent` and `dataset.emoji` on `settings-emoji-selected` to `g.avatar_emoji ?? '⚔️'`, then iterates all `.settings-emoji-opt` elements via `querySelectorAll` and toggles the `'selected'` class on each based on whether that element's `dataset.emoji` matches the resolved avatar emoji.

Third it sets the join mode: it resolves `mode` as `g.join_mode ?? 'open'`, queries for the radio input with that value under `input[name="join-mode"]`, and if found sets `checked = true`. It then calls `onJoinModeChange(mode)`, which shows or hides the requirements and audition sections based on the resolved mode.

Fourth it writes the entry requirements fields: `settings-min-elo` gets `String(req.min_elo)` or `''`, `settings-min-tier` gets `req.min_tier ?? ''`, and `settings-req-profile` gets `req.require_profile_complete ?? false`, where `req` is `g.entry_requirements ?? {}`.

Fifth it writes the audition config fields: `settings-aud-rule` gets `aud.rule ?? 'allowed_by_leader'`, `settings-aud-topic` gets `aud.locked_topic ?? ''`, `settings-aud-category` gets `aud.locked_category ?? ''`, `settings-aud-ruleset` gets `aud.locked_ruleset ?? ''`, and `settings-aud-rounds` gets `String(aud.locked_total_rounds)` or `''` depending on whether the value is non-null. `aud` is `g.audition_config ?? {}`.

Finally it calls `_hideDeleteConfirm()` to reset the danger zone to its hidden state.

### _hideDeleteConfirm

`_hideDeleteConfirm` takes no parameters. It reads the element `settings-delete-confirm` by ID into a local variable `el`. If `el` is non-null it sets `el.style.display = 'none'`; if the element is not found in the DOM the `if` guard prevents any write. The function is synchronous and returns `void`.

## Agent 05

### openGroupSettings

`openGroupSettings` receives a `GroupDetail` object `g` and a `callbacks` object containing two callback functions. It first reads the module-level `callerRole` import from `groups.state.ts` and immediately returns without doing anything if `callerRole` is not `'leader'`. When the role check passes, it writes both module-level state variables: `onSettingsSaved` is set to `callbacks.onSaved` and `onGroupDeleted` is set to `callbacks.onDeleted`. It then calls `_populateSettings(g)` to fill all form fields with the group's current data, after which it hides the detail view by setting `document.getElementById('view-detail').style.display` to `'none'` and shows the settings view by setting `document.getElementById('view-settings').style.display` to `'flex'`. It is synchronous and returns `void`.

### closeGroupSettings

`closeGroupSettings` reads no parameters and no module-level state. It sets `document.getElementById('view-settings').style.display` to `'none'` and `document.getElementById('view-detail').style.display` to `'flex'`, reversing the visibility swap that `openGroupSettings` performed. It then calls `_hideDeleteConfirm()`, which hides the delete confirmation panel if it is present in the DOM. It is synchronous and returns `void`.

### onJoinModeChange

`onJoinModeChange` receives a `mode` string parameter and reads no module-level state. It queries the DOM for two elements by ID: `settings-requirements-section` and `settings-audition-section`. For each element, if it exists, the function sets its `style.display`: `settings-requirements-section` is shown as `'block'` only when `mode === 'requirements'`, otherwise it is set to `'none'`; `settings-audition-section` is shown as `'block'` only when `mode === 'audition'`, otherwise it is set to `'none'`. Both null-checks are independent, so neither branch affects the other. The function is synchronous and returns `void`.

### submitGroupSettings

`submitGroupSettings` is async. It reads the `currentGroupId` module-level import from `groups.state.ts`. It begins by querying the DOM for the save button (`settings-save-btn`), disabling it, and setting its text to `'SAVING…'`. The entire body executes inside a `try/catch/finally` block.

In the `try` branch, it reads the checked join-mode radio input (defaulting to `'open'` if none is checked), then reads five entry-requirements fields from the DOM: `settings-min-elo` (trimmed string), `settings-min-tier` (select value), and `settings-req-profile` (checkbox). It builds an `entryReq` object conditionally: `min_elo` is added only when the raw string is non-empty (cast with `Number()`), `min_tier` only when the select has a value, and `require_profile_complete: true` only when the checkbox is checked. It then reads five audition-config fields: `settings-aud-rule` (always included), `settings-aud-topic`, `settings-aud-category`, `settings-aud-ruleset`, and `settings-aud-rounds`. The `audConfig` object starts with `{ rule: audRule }` and gains `locked_topic`, `locked_category`, `locked_ruleset`, and `locked_total_rounds` conditionally when those fields are non-empty. It then awaits `safeRpc('update_group_settings', {...})`, passing `currentGroupId`, the description and category and `is_public` and `avatar_emoji` DOM values, `joinMode`, and—conditionally—either `entryReq` or `{}` for `p_entry_requirements` (populated only when `joinMode === 'requirements'`), and either `audConfig` or `{}` for `p_audition_config` (populated only when `joinMode === 'audition'`). If the RPC returns an error, the error is thrown. On success, it calls `showToast('Settings saved')`, then calls `closeGroupSettings()`, then fires the `onSettingsSaved` module-level callback if it is non-null.

In the `catch` block, it calls `showToast()` with the error's `.message` property, falling back to `'Could not save settings'`. The `finally` block always re-enables the button and resets its text to `'SAVE'`, regardless of success or failure.

### showDeleteConfirm

`showDeleteConfirm` reads no parameters and no module-level state. It sets `document.getElementById('settings-delete-confirm').style.display` to `'block'`, clears the confirmation name input (`settings-delete-name-input`) by setting its `.value` to an empty string, and then calls `.scrollIntoView({ behavior: 'smooth' })` on the `settings-delete-confirm` element to scroll it into the viewport. It is synchronous and returns `void`. There is no null-check on the element; if it does not exist in the DOM, this would throw at runtime.

### submitDeleteGroup

`submitDeleteGroup` is async. It reads the `currentGroupId` module-level import from `groups.state.ts`. It first reads the trimmed value from `settings-delete-name-input`. If that value is empty, it calls `showToast('Type the group name to confirm')` and returns early. Otherwise it queries the delete submit button (`settings-delete-submit-btn`), disables it, and sets its text to `'DELETING…'`.

The remainder executes inside a `try/catch` block with no `finally`. In the `try` branch, it awaits `safeRpc('delete_group', { p_group_id: currentGroupId, p_confirm_name: confirmName })`. If the RPC returns an error, the error is thrown. On success, it hides the settings view by setting `document.getElementById('view-settings').style.display` to `'none'`, then fires the `onGroupDeleted` module-level callback if it is non-null. Notably, the button is not re-enabled on success, which is intentional because the view is being torn down.

In the `catch` block, it calls `showToast()` with the error's `.message` or `'Could not delete group'`, then re-enables the button and resets its text to `'DELETE FOREVER'`. Unlike `submitGroupSettings`, there is no `finally` block, so button state is only restored on the error path.

### selectSettingsEmoji

`selectSettingsEmoji` receives an `HTMLElement` parameter `el`. It first queries all elements matching `.settings-emoji-opt` in the document and removes the `'selected'` class from each via `forEach`. It then adds `'selected'` to `el`. It reads `document.getElementById('settings-emoji-selected')` and writes both its `.textContent` and its `dataset.emoji` to `el.dataset.emoji`, falling back to `'⚔️'` if `el.dataset.emoji` is absent. The function is synchronous and returns `void`.

### _populateSettings

`_populateSettings` is a private synchronous function that receives a `GroupDetail` object `g`. It writes directly to multiple DOM elements. In order: it sets the `settings-desc` textarea to `g.description ?? ''`, the `settings-category` select to `g.category ?? 'general'`, and the `settings-is-public` checkbox to `g.is_public ?? true`. It then sets the `settings-emoji-selected` element's `textContent` and `dataset.emoji` to `g.avatar_emoji ?? '⚔️'`, and iterates over all `.settings-emoji-opt` elements with `querySelectorAll`, toggling the `'selected'` class on each by comparing its own `dataset.emoji` to the resolved avatar emoji.

For join mode, it reads `g.join_mode ?? 'open'`, queries the matching radio input using an attribute selector, checks it if found, then calls `onJoinModeChange(mode)` to show or hide the requirements and audition sections accordingly.

For entry requirements, it reads `g.entry_requirements ?? {}` and writes to three fields: `settings-min-elo` (stringified if non-null, empty string otherwise), `settings-min-tier` (empty string fallback), and `settings-req-profile` (boolean, defaulting to false).

For audition config, it reads `g.audition_config ?? {}` and writes to five fields: `settings-aud-rule` (defaulting to `'allowed_by_leader'`), `settings-aud-topic`, `settings-aud-category`, `settings-aud-ruleset`, and `settings-aud-rounds` (stringified if non-null, empty string otherwise).

Finally, it calls `_hideDeleteConfirm()` to collapse the delete confirmation panel, resetting the danger zone to its initial hidden state.

### _hideDeleteConfirm

`_hideDeleteConfirm` reads no parameters and no module-level state. It queries the DOM for the element with ID `settings-delete-confirm`. Unlike `showDeleteConfirm`, it includes a null-check: if the element does not exist, the function exits without error. If the element is found, it sets its `style.display` to `'none'`. It is synchronous and returns `void`.

## Agent 06

### openGroupSettings

`openGroupSettings` receives a `GroupDetail` object `g` and a callbacks object containing `onSaved` and `onDeleted` functions. It reads the module-level `callerRole` imported from `groups.state.ts` and returns immediately without doing anything if `callerRole` is not `'leader'`. When the role check passes, it writes both module-level state variables: `onSettingsSaved` is set to `callbacks.onSaved` and `onGroupDeleted` is set to `callbacks.onDeleted`. It then calls `_populateSettings(g)` to fill every form field with the group's current data. Finally it manipulates two DOM elements by ID — `view-detail` is hidden by setting its `style.display` to `'none'` and `view-settings` is shown by setting its `style.display` to `'flex'`. The function is synchronous and returns nothing.

### closeGroupSettings

`closeGroupSettings` takes no parameters and reads no module-level state. It reverses the panel swap performed by `openGroupSettings`: it sets `view-settings` to `display: none` and `view-detail` to `display: flex`. It then calls `_hideDeleteConfirm()`, which collapses the delete-confirmation sub-section if it is visible. The function is synchronous and returns nothing.

### onJoinModeChange

`onJoinModeChange` receives a single string `mode`. It queries the DOM for two elements by ID: `settings-requirements-section` and `settings-audition-section`. For each element, if it exists in the DOM, the function sets its `style.display` based on `mode`: `settings-requirements-section` is shown (`'block'`) only when `mode === 'requirements'`, and `settings-audition-section` is shown (`'block'`) only when `mode === 'audition'`; in all other cases each section is set to `'none'`. Both checks are independent; neither is an early return. The function is synchronous and returns nothing.

### submitGroupSettings

`submitGroupSettings` is async. It first reads the `settings-save-btn` element from the DOM, disables it, and sets its text to `'SAVING…'`. All subsequent work occurs inside a try/catch/finally block. In the try branch it reads the currently-checked radio input named `join-mode` and falls back to `'open'` if none is checked. It then reads five DOM inputs to build an `entryReq` plain object: `settings-min-elo` (cast to `Number` if non-empty), `settings-min-tier` (if non-empty), and `settings-req-profile` (if checked); keys are only added to the object when their values are truthy. It reads four more DOM inputs to build an `audConfig` plain object seeded with `{ rule: audRule }` from `settings-aud-rule`; the remaining four fields (`locked_topic`, `locked_category`, `locked_ruleset`, `locked_total_rounds`) are appended only when their DOM values are non-empty, with `locked_total_rounds` cast to `Number`. The function then awaits `safeRpc('update_group_settings', ...)`, passing `currentGroupId` from `groups.state.ts` plus all form-derived values. The `p_entry_requirements` parameter receives the constructed `entryReq` object only when `joinMode === 'requirements'`; otherwise it receives an empty object. `p_audition_config` receives `audConfig` only when `joinMode === 'audition'`; otherwise an empty object. If the RPC returns a non-null `error`, that error is thrown. On success, `showToast('Settings saved')` is called, then `closeGroupSettings()` is called (which hides the settings panel and calls `_hideDeleteConfirm`), and then the module-level `onSettingsSaved` callback is invoked if non-null. In the catch block, `showToast` is called with the error's message or a fallback string. In the finally block, regardless of outcome, the button is re-enabled and its text reset to `'SAVE'`.

### showDeleteConfirm

`showDeleteConfirm` takes no parameters. It reads the `settings-delete-confirm` element from the DOM and sets its `style.display` to `'block'`. It then reads `settings-delete-name-input` and clears its value to an empty string, resetting any previously typed confirmation text. Finally it calls `scrollIntoView({ behavior: 'smooth' })` on the `settings-delete-confirm` element, causing the browser to animate a scroll to bring that element into the viewport. The function is synchronous and returns nothing.

### submitDeleteGroup

`submitDeleteGroup` is async. It reads the trimmed value from the `settings-delete-name-input` DOM input. If that value is empty, it calls `showToast('Type the group name to confirm')` and returns immediately — this is the sole early return. When the value is non-empty, it reads the `settings-delete-submit-btn` button from the DOM, disables it, and sets its text to `'DELETING…'`. All remaining work is inside a try/catch block with no finally. In the try branch it awaits `safeRpc('delete_group', { p_group_id: currentGroupId, p_confirm_name: confirmName })`, where `currentGroupId` comes from `groups.state.ts`. If the RPC returns a non-null `error`, it is thrown. On success, the `view-settings` element is hidden by setting `style.display` to `'none'`, and the module-level `onGroupDeleted` callback is invoked if non-null. Notably the button is not re-enabled on success — the settings view is simply removed from display. In the catch block, `showToast` is called with the error's message or the fallback string `'Could not delete group'`, and the button is re-enabled with its text reset to `'DELETE FOREVER'`.

### selectSettingsEmoji

`selectSettingsEmoji` receives an `HTMLElement` `el`. It queries all elements matching `.settings-emoji-opt` and removes the `'selected'` class from each, clearing any previously active selection. It then adds `'selected'` to `el`. It reads the `settings-emoji-selected` element from the DOM and writes to it in two ways: `textContent` is set to `el.dataset.emoji` with a fallback of `'⚔️'`, and `dataset.emoji` on the display element is also set to the same value. The fallback applies in both assignments when `el.dataset.emoji` is undefined or an empty string. The function is synchronous and returns nothing.

### _populateSettings

`_populateSettings` receives a `GroupDetail` object `g` and writes values from it into the settings form. It is synchronous. First it populates three general fields: the `settings-desc` textarea is set to `g.description` or `''`; the `settings-category` select is set to `g.category` or `'general'`; and the `settings-is-public` checkbox is set to `g.is_public` or `true`. Next it populates the emoji display element `settings-emoji-selected` with `g.avatar_emoji` (falling back to `'⚔️'`) in both `textContent` and `dataset.emoji`, then iterates all `.settings-emoji-opt` elements to toggle the `'selected'` class on whichever one has a `data-emoji` attribute matching the group's avatar emoji. For join mode, it reads `g.join_mode` (defaulting to `'open'`), locates the matching radio input by querying `input[name="join-mode"][value="${mode}"]`, checks it if found, and then calls `onJoinModeChange(mode)` — which shows or hides the requirements and audition sub-sections according to that mode. For entry requirements, it reads `g.entry_requirements` (defaulting to `{}`), and writes `min_elo` as a string or `''`, `min_tier` or `''`, and `require_profile_complete` boolean or `false` into the corresponding DOM inputs. For audition config, it reads `g.audition_config` (defaulting to `{}`), and writes `rule` (defaulting to `'allowed_by_leader'`), `locked_topic`, `locked_category`, `locked_ruleset`, and `locked_total_rounds` (converted to string when non-null) into the corresponding DOM inputs. Finally it calls `_hideDeleteConfirm()` to ensure the delete-confirmation section starts hidden.

### _hideDeleteConfirm

`_hideDeleteConfirm` takes no parameters. It reads the `settings-delete-confirm` element from the DOM and, if the element exists, sets its `style.display` to `'none'`. The existence check is the only branch: if the element is absent from the DOM nothing happens and no error is thrown. The function is synchronous and returns nothing.

## Agent 07

### openGroupSettings

`openGroupSettings` receives a `GroupDetail` object `g` and a `callbacks` object carrying two functions, `onSaved` and `onDeleted`. Its first action is to read the module-level import `callerRole` from `groups.state.ts` and return immediately without doing anything else if that value is not `'leader'`. When the role check passes, it writes both module-level state variables: `onSettingsSaved` is set to `callbacks.onSaved` and `onGroupDeleted` is set to `callbacks.onDeleted`. It then calls `_populateSettings(g)`, which fills every field in the settings view from the data in `g`. After that returns, it reads the DOM for two elements by ID — `view-detail` and `view-settings` — and sets `view-detail` to `display: none` and `view-settings` to `display: flex`, performing the visual panel swap. The function is synchronous and returns `void`.

### closeGroupSettings

`closeGroupSettings` takes no parameters and reads no module-level state. It reads the DOM for `view-settings` and `view-detail` and reverses the panel swap performed by `openGroupSettings`: `view-settings` is set to `display: none` and `view-detail` is set to `display: flex`. It then calls `_hideDeleteConfirm()`, which collapses the delete confirmation block if it is visible. The function is synchronous and returns `void`.

### onJoinModeChange

`onJoinModeChange` receives a single string `mode`. It reads the DOM for two elements: `settings-requirements-section` and `settings-audition-section`. If `settings-requirements-section` exists, its `display` style is set to `'block'` when `mode` is `'requirements'` and `'none'` otherwise. If `settings-audition-section` exists, its `display` style is set to `'block'` when `mode` is `'audition'` and `'none'` otherwise. Both checks are guarded by null checks on the element reference, so if either element is absent the corresponding assignment is skipped without error. The function is synchronous and returns `void`.

### submitGroupSettings

`submitGroupSettings` is async and returns `Promise<void>`. It begins by reading the DOM for the button element `settings-save-btn`, disabling it, and setting its text to `'SAVING…'`. The remainder of the function body is wrapped in a `try/catch/finally` block. In the try branch, it reads the currently checked radio input matching `input[name="join-mode"]:checked` and captures its `value`, falling back to `'open'` if no radio is checked. It then reads five DOM inputs to build the `entryReq` object: the raw text of `settings-min-elo` (converted with `Number()` if non-empty), the value of `settings-min-tier`, and the checked state of `settings-req-profile`; fields are only added to `entryReq` when they carry meaningful values. Next it reads five more DOM inputs to build `audConfig`: `settings-aud-rule` is always included as `rule`; `settings-aud-topic`, `settings-aud-category`, `settings-aud-ruleset`, and `settings-aud-rounds` are included only when non-empty, with `locked_total_rounds` converted via `Number()`. It then calls `await safeRpc('update_group_settings', {...})`, passing `currentGroupId` from the `groups.state.ts` import alongside all the form values. The `entry_requirements` payload is the populated `entryReq` object when `joinMode` is `'requirements'` and an empty object otherwise; `audition_config` is the populated `audConfig` when `joinMode` is `'audition'` and an empty object otherwise. If `safeRpc` returns an `error`, that error is thrown. On success, `showToast('Settings saved')` is called, then `closeGroupSettings()` is called (which hides the settings panel and calls `_hideDeleteConfirm()`), and then the module-level `onSettingsSaved` callback is invoked if it is non-null. In the catch branch, `showToast` is called with the caught error's `.message` property, or the string `'Could not save settings'` if no message is present. The finally block unconditionally re-enables the button and resets its text to `'SAVE'`.

### showDeleteConfirm

`showDeleteConfirm` takes no parameters. It reads the DOM for `settings-delete-confirm` and sets its `display` style to `'block'`. It then reads `settings-delete-name-input` as an `HTMLInputElement` and clears its value to an empty string. Finally, it calls `scrollIntoView({ behavior: 'smooth' })` on the `settings-delete-confirm` element, causing the browser to smoothly scroll the confirmation block into the viewport. There is no null guard on either element; if either is absent, a runtime error will be thrown. The function is synchronous and returns `void`.

### submitDeleteGroup

`submitDeleteGroup` is async and returns `Promise<void>`. It reads the DOM for `settings-delete-name-input`, trims its value, and stores it as `confirmName`. If `confirmName` is empty (falsy after trim), it calls `showToast('Type the group name to confirm')` and returns early without making any network call. Otherwise, it reads `settings-delete-submit-btn` as an `HTMLButtonElement`, disables it, and sets its text to `'DELETING…'`. The rest of the function body is in a `try/catch` block with no `finally`. In the try branch, it calls `await safeRpc('delete_group', { p_group_id: currentGroupId, p_confirm_name: confirmName })`. If `safeRpc` returns an `error`, that error is thrown. On success, it sets `view-settings` `display` to `'none'` directly via the DOM (without calling `closeGroupSettings`), and then invokes the module-level `onGroupDeleted` callback if it is non-null. In the catch branch, `showToast` is called with the error message or `'Could not delete group'`, and the button is re-enabled with its text reset to `'DELETE FOREVER'`. Unlike `submitGroupSettings`, there is no `finally` block, meaning the button is only re-enabled on the error path — on the success path the entire settings view is hidden so the button state becomes irrelevant.

### selectSettingsEmoji

`selectSettingsEmoji` receives an `HTMLElement` `el`, expected to be one of the emoji option elements in the picker. It calls `document.querySelectorAll('.settings-emoji-opt')` to get all emoji option elements and removes the `'selected'` class from each via `forEach`. It then adds the `'selected'` class to the passed `el`. Next it reads the DOM for `settings-emoji-selected` as an `HTMLElement`. It sets that element's `textContent` to `el.dataset.emoji` if present, falling back to `'⚔️'`, and sets `display.dataset.emoji` to the same value using the same fallback. The function is synchronous and returns `void`.

### _populateSettings

`_populateSettings` receives a `GroupDetail` object `g` and writes to the DOM in five sequential phases; it is synchronous and private to the module. In the first phase it sets the `value` of `settings-desc` to `g.description` (or empty string), the `value` of `settings-category` to `g.category` (or `'general'`), and the `checked` state of `settings-is-public` to `g.is_public` (or `true`). In the second phase it reads `settings-emoji-selected`, sets its `textContent` and `dataset.emoji` to `g.avatar_emoji` (falling back to `'⚔️'`), then iterates all `.settings-emoji-opt` elements with `querySelectorAll` and toggles the `'selected'` class on each one based on whether its own `dataset.emoji` matches the group's avatar emoji. In the third phase it reads `g.join_mode` (defaulting to `'open'`), queries for the matching radio input `input[name="join-mode"][value="${mode}"]`, and sets that radio's `checked` to `true` if the element exists. It then calls `onJoinModeChange(mode)`, which shows or hides the requirements and audition sections according to the resolved mode. In the fourth phase it reads `g.entry_requirements` (defaulting to an empty object) and writes `settings-min-elo` value, `settings-min-tier` value, and `settings-req-profile` checked state from the corresponding fields. In the fifth phase it reads `g.audition_config` (defaulting to an empty object) and writes `settings-aud-rule`, `settings-aud-topic`, `settings-aud-category`, `settings-aud-ruleset`, and `settings-aud-rounds` from the corresponding config fields, converting `locked_total_rounds` to a string when non-null. After all field writes, it calls `_hideDeleteConfirm()` to collapse the delete confirmation block, resetting the danger zone to its default hidden state.

### _hideDeleteConfirm

`_hideDeleteConfirm` takes no parameters. It reads the DOM for `settings-delete-confirm` and, if the element exists, sets its `display` style to `'none'`. The null check means the function exits silently if the element is absent. The function is synchronous and returns `void`.

## Agent 08

### openGroupSettings

`openGroupSettings` receives a `GroupDetail` object `g` and a `callbacks` object containing `onSaved` and `onDeleted` functions. It reads the module-level `callerRole` variable imported from `groups.state.ts` and returns immediately without doing anything if `callerRole` is not `'leader'`. When the role check passes, it writes both module-level variables `onSettingsSaved` and `onGroupDeleted` with the supplied callbacks. It then calls `_populateSettings(g)` to fill the DOM form fields from `g`. After that it reads two DOM elements by ID — `view-detail` and `view-settings` — and sets `view-detail` to `display: none` and `view-settings` to `display: flex`, switching the visible panel in the groups UI. The function is synchronous and returns nothing.

### closeGroupSettings

`closeGroupSettings` takes no parameters and reads no module-level state. It queries the DOM for `view-settings` and `view-detail` and reverses the visibility set by `openGroupSettings`: `view-settings` becomes `display: none` and `view-detail` becomes `display: flex`. It then calls `_hideDeleteConfirm()`, which hides the delete confirmation panel if it is present. The function is synchronous and returns nothing.

### onJoinModeChange

`onJoinModeChange` receives a single string `mode`. It queries the DOM for the elements `settings-requirements-section` and `settings-audition-section`. For each element, it checks whether the element exists before writing to it. If `mode` is `'requirements'`, it sets `settings-requirements-section` to `display: block` and `settings-audition-section` to `display: none`. If `mode` is `'audition'`, it sets `settings-audition-section` to `display: block` and `settings-requirements-section` to `display: none`. For any other `mode` value both sections are hidden. The function is synchronous, performs no network calls, writes no module-level state, and returns nothing.

### submitGroupSettings

`submitGroupSettings` is async. It reads the DOM element `settings-save-btn` as an `HTMLButtonElement`, immediately disables it, and sets its text to `'SAVING…'`. All remaining logic runs inside a `try/catch/finally` block.

In the `try` branch, the function reads the checked radio input with name `'join-mode'`, defaulting to `'open'` if none is checked. It then reads five DOM inputs to construct an `entry_requirements` object: `settings-min-elo` (cast to `Number` if non-empty), `settings-min-tier` (if non-empty), and `settings-req-profile` (included as `true` if checked). It reads five more DOM inputs to construct an `audition_config` object: `settings-aud-rule` (always present as `rule`), plus `locked_topic`, `locked_category`, `locked_ruleset`, and `locked_total_rounds` (the last cast to `Number`), each included only if the corresponding input has a non-empty value. It then calls the awaited `safeRpc('update_group_settings', ...)`, passing the module-level `currentGroupId` imported from `groups.state.ts` along with all the form values. If `joinMode` is not `'requirements'`, `p_entry_requirements` is sent as an empty object; if it is not `'audition'`, `p_audition_config` is sent as an empty object. If `safeRpc` returns a truthy `error`, the error is thrown. On success, the function calls `showToast('Settings saved')`, then calls `closeGroupSettings()` to flip the views and hide the delete panel, then invokes the module-level `onSettingsSaved` callback if it is non-null.

In the `catch` block, the function calls `showToast` with the error's `.message` property or the fallback string `'Could not save settings'`. In the `finally` block, regardless of success or failure, the button is re-enabled and its text is reset to `'SAVE'`.

### showDeleteConfirm

`showDeleteConfirm` takes no parameters and reads no module-level state. It reads the DOM element `settings-delete-confirm` and sets its `style.display` to `'block'`. It then reads `settings-delete-name-input` as an `HTMLInputElement` and clears its value to an empty string. Finally, it calls `scrollIntoView({ behavior: 'smooth' })` on `settings-delete-confirm` to scroll the confirmation panel into the viewport. The function is synchronous and returns nothing.

### submitDeleteGroup

`submitDeleteGroup` is async. It reads the value of the `settings-delete-name-input` element and trims it. If the trimmed value is empty, it calls `showToast('Type the group name to confirm')` and returns early without doing anything further. If the value is non-empty, the function reads `settings-delete-submit-btn` as an `HTMLButtonElement`, disables it, and sets its text to `'DELETING…'`.

Inside the `try` block, the function awaits `safeRpc('delete_group', ...)`, passing the module-level `currentGroupId` and the trimmed confirmation name as `p_confirm_name`. If `safeRpc` returns a truthy `error`, it is thrown. On success, the function sets `view-settings` to `display: none` directly (it does not call `closeGroupSettings`), then invokes the module-level `onGroupDeleted` callback if it is non-null.

In the `catch` block, `showToast` is called with the error's `.message` or the fallback `'Could not delete group'`, and the button is re-enabled with its text reset to `'DELETE FOREVER'`. Unlike `submitGroupSettings`, there is no `finally` block — the button is only restored on the error path; on the success path, the settings view is hidden and the page transitions away, making button state irrelevant.

### selectSettingsEmoji

`selectSettingsEmoji` receives an `HTMLElement` `el` that represents the emoji option the user clicked. It queries all elements matching `.settings-emoji-opt` and removes the `'selected'` class from every one of them. It then adds `'selected'` to `el`. Next, it reads the DOM element `settings-emoji-selected` and sets both its `textContent` and its `dataset.emoji` to `el.dataset.emoji`, falling back to `'⚔️'` if `el.dataset.emoji` is undefined. The function writes no module-level state, performs no network calls, and returns nothing.

### _populateSettings

`_populateSettings` receives a `GroupDetail` object `g` and writes DOM state from it. It is synchronous, private to the module, and returns nothing.

It begins with the three general fields: it sets `settings-desc` textarea to `g.description ?? ''`, `settings-category` select to `g.category ?? 'general'`, and `settings-is-public` checkbox to `g.is_public ?? true`. It then reads `settings-emoji-selected` and sets both its `textContent` and `dataset.emoji` to `g.avatar_emoji ?? '⚔️'`. It iterates all `.settings-emoji-opt` elements and toggles the `'selected'` class on each based on whether its own `dataset.emoji` matches the group's avatar emoji.

For the join mode, it reads `g.join_mode ?? 'open'` and queries for the radio input with the matching value under `input[name="join-mode"]`. If that radio is found, it sets `checked = true`. It then calls `onJoinModeChange(mode)` to show or hide the requirements and audition sections immediately.

For entry requirements, it reads `g.entry_requirements ?? {}` and sets `settings-min-elo` to `String(req.min_elo)` if `min_elo` is non-null, otherwise to empty string; sets `settings-min-tier` to `req.min_tier ?? ''`; and sets `settings-req-profile` checked state to `req.require_profile_complete ?? false`.

For audition config, it reads `g.audition_config ?? {}` and sets `settings-aud-rule` to `aud.rule ?? 'allowed_by_leader'`, `settings-aud-topic` to `aud.locked_topic ?? ''`, `settings-aud-category` to `aud.locked_category ?? ''`, `settings-aud-ruleset` to `aud.locked_ruleset ?? ''`, and `settings-aud-rounds` to `String(aud.locked_total_rounds)` if non-null, otherwise to empty string.

Finally, `_populateSettings` calls `_hideDeleteConfirm()` to reset the danger zone to its hidden state before the settings panel is shown.

### _hideDeleteConfirm

`_hideDeleteConfirm` takes no parameters and reads no module-level state. It queries the DOM for `settings-delete-confirm`. If the element exists, it sets `style.display` to `'none'`. The existence check means the function does not throw if the element is absent. The function is synchronous and returns nothing.

## Agent 09

### openGroupSettings

`openGroupSettings` receives a `GroupDetail` object `g` and a `callbacks` object carrying two functions, `onSaved` and `onDeleted`. Its first action is to read the module-level import `callerRole` from `groups.state.ts`; if that value is not the string `'leader'`, the function returns immediately without doing anything else. When the role check passes, it writes both module-level state variables: `onSettingsSaved` is set to `callbacks.onSaved` and `onGroupDeleted` is set to `callbacks.onDeleted`. It then calls `_populateSettings(g)`, passing the full `GroupDetail` object through to that private function, which fills every form field in the settings view. After `_populateSettings` returns, the function reads two DOM elements by ID — `view-detail` and `view-settings` — and sets their `style.display` properties to `'none'` and `'flex'` respectively, switching the visible panel from the detail view to the settings view. The function is synchronous and returns nothing.

### closeGroupSettings

`closeGroupSettings` takes no parameters and reads no module-level state. It reads the DOM elements `view-settings` and `view-detail` by ID and reverses the panel swap that `openGroupSettings` performed: `view-settings` is hidden by setting `style.display` to `'none'` and `view-detail` is shown by setting `style.display` to `'flex'`. It then calls `_hideDeleteConfirm()`, which collapses the delete-confirmation sub-panel if it is visible. The function is synchronous and returns nothing.

### onJoinModeChange

`onJoinModeChange` receives a single string parameter `mode`. It queries the DOM for two elements, `settings-requirements-section` and `settings-audition-section`, assigning each to a local variable with a null-safe reference. If `reqSection` is non-null, its `style.display` is set to `'block'` when `mode` equals `'requirements'` and `'none'` otherwise. If `audSection` is non-null, its `style.display` is set to `'block'` when `mode` equals `'audition'` and `'none'` otherwise. The two mode values are mutually exclusive in practice, so at most one section is visible at a time. The function does not read or write module-level state, is synchronous, and returns nothing.

### submitGroupSettings

`submitGroupSettings` is async. It begins by reading the DOM element `settings-save-btn`, casting it to `HTMLButtonElement`, then immediately disabling it and setting its text to `'SAVING…'`. All subsequent work is inside a `try/catch/finally` block.

In the `try` branch, it reads the checked radio input named `'join-mode'` to obtain `joinMode`, defaulting to `'open'` if no radio is checked. It then reads five DOM elements to build the `entryReq` object: the raw value of `settings-min-elo` (converted to a `Number` if non-empty), the value of `settings-min-tier` (included only if non-empty), and the checked state of `settings-req-profile` (included only if true). It reads four more elements to build `audConfig`: `settings-aud-rule` always supplies the `rule` key, while `settings-aud-topic`, `settings-aud-category`, `settings-aud-ruleset`, and `settings-aud-rounds` each contribute optional keys when their values are non-empty. `locked_total_rounds` is cast to `Number` when present.

With all local data assembled, the function calls `await safeRpc('update_group_settings', {...})`, passing `currentGroupId` from `groups.state.ts` alongside the collected form values. `p_entry_requirements` is sent as the constructed `entryReq` object only when `joinMode` is `'requirements'`, otherwise an empty object; `p_audition_config` is similarly conditional on `joinMode === 'audition'`. If the RPC returns an `error`, that error is thrown immediately. On success, `showToast('Settings saved')` is called, then `closeGroupSettings()` is called to hide the panel, and then the module-level `onSettingsSaved` callback is invoked if it is non-null.

In the `catch` branch, `showToast` is called with the error's `message` property, falling back to the string `'Could not save settings'`. The `finally` block always re-enables the button and resets its text to `'SAVE'`, regardless of success or failure.

### showDeleteConfirm

`showDeleteConfirm` takes no parameters and reads no module-level state. It reads the DOM element `settings-delete-confirm` by ID and sets its `style.display` to `'block'`, making the delete-confirmation panel visible. It then reads `settings-delete-name-input`, casts it to `HTMLInputElement`, and clears its value to an empty string, resetting any previously typed text. Finally it calls `scrollIntoView({ behavior: 'smooth' })` on the same `settings-delete-confirm` element, scrolling the panel into the viewport with a smooth animation. The function is synchronous and returns nothing. There is no null-guard on either element access, so if either element is absent from the DOM, a runtime error would be thrown.

### submitDeleteGroup

`submitDeleteGroup` is async. It reads the `settings-delete-name-input` DOM element, trims its value, and stores it in `confirmName`. If `confirmName` is empty after trimming, it calls `showToast('Type the group name to confirm')` and returns immediately. Otherwise it reads `settings-delete-submit-btn`, disables it, and sets its text to `'DELETING…'`.

Inside a `try/catch` block it calls `await safeRpc('delete_group', { p_group_id: currentGroupId, p_confirm_name: confirmName })`, reading `currentGroupId` from `groups.state.ts`. If the RPC returns an error, that error is thrown. On success, the function reads `view-settings` from the DOM and hides it by setting `style.display` to `'none'`, then invokes the module-level `onGroupDeleted` callback if it is non-null.

In the `catch` branch, `showToast` is called with the error's message or the fallback string `'Could not delete group'`, and the button is re-enabled with its text reset to `'DELETE FOREVER'`. Notably, unlike `submitGroupSettings`, the button restoration is inside the `catch` block rather than a `finally` block, which means the button stays disabled if the delete succeeds — the panel is hidden and the callback fires instead, so the button state is moot in the success case.

### selectSettingsEmoji

`selectSettingsEmoji` receives a single `HTMLElement` parameter `el`, which is expected to be one of the emoji-option elements in the settings view. It queries the entire document for all elements matching `.settings-emoji-opt` and removes the `'selected'` CSS class from each of them in a `forEach` loop. After clearing the prior selection, it adds `'selected'` to the class list of `el`. It then reads the DOM element `settings-emoji-selected` and writes two properties on it: `textContent` is set to `el.dataset.emoji`, falling back to `'⚔️'` if the data attribute is absent, and `dataset.emoji` is set to the same value. The function does not read or write module-level state, is synchronous, and returns nothing.

### _populateSettings

`_populateSettings` receives a `GroupDetail` object `g` and uses it as the sole data source to fill every field in the settings form. It is synchronous, returns nothing, and writes only to the DOM.

For the general section it writes `g.description` (defaulting to `''`) into the `settings-desc` textarea, `g.category` (defaulting to `'general'`) into the `settings-category` select, and `g.is_public` (defaulting to `true`) into the checked state of `settings-is-public`. For the emoji display it writes `g.avatar_emoji` (defaulting to `'⚔️'`) to both `textContent` and `dataset.emoji` on `settings-emoji-selected`, then iterates every `.settings-emoji-opt` element with `querySelectorAll` and calls `classList.toggle` on each, applying `'selected'` to the one whose `dataset.emoji` matches the group's avatar.

For the join mode, it reads `g.join_mode` (defaulting to `'open'`), queries for the radio input with that value under the name `'join-mode'`, and if found sets `radio.checked = true`. It then calls `onJoinModeChange(mode)`, which shows or hides the requirements and audition sub-sections to match the selected mode.

For the requirements section it reads `g.entry_requirements` (defaulting to `{}`), writing `req.min_elo` as a string (or empty string if null) into `settings-min-elo`, `req.min_tier` (or empty string) into `settings-min-tier`, and `req.require_profile_complete` (or false) into the checked state of `settings-req-profile`. For the audition section it reads `g.audition_config` (defaulting to `{}`), writing `aud.rule` (defaulting to `'allowed_by_leader'`) into `settings-aud-rule`, and the four optional locked fields — `locked_topic`, `locked_category`, `locked_ruleset`, and `locked_total_rounds` — into their respective inputs, converting `locked_total_rounds` to a string when present. Finally it calls `_hideDeleteConfirm()` to collapse the delete-confirmation panel unconditionally.

### _hideDeleteConfirm

`_hideDeleteConfirm` takes no parameters. It reads the DOM element `settings-delete-confirm` by ID into a local variable `el`. If `el` is non-null, it sets `el.style.display` to `'none'`, hiding the delete-confirmation panel. If the element is not found in the DOM, the null check prevents any error and the function exits silently. Unlike the similar access in `showDeleteConfirm`, the null-guard here means this function is safe to call unconditionally, which is why both `closeGroupSettings` and `_populateSettings` call it without preconditions. The function is synchronous and returns nothing.

## Agent 10

### openGroupSettings

`openGroupSettings` receives a `GroupDetail` object `g` and a `callbacks` object carrying two functions, `onSaved` and `onDeleted`. Its first action is to read the module-level import `callerRole` from `groups.state.ts` and return immediately without doing anything else if that value is not `'leader'`. When the role check passes, it writes both module-level state variables: `onSettingsSaved` is set to `callbacks.onSaved` and `onGroupDeleted` is set to `callbacks.onDeleted`. It then calls `_populateSettings(g)`, passing the full `GroupDetail` through to that private function, which fills every form field in the settings view. After that it reads the DOM for two elements by ID — `view-detail` and `view-settings` — and sets `view-detail` to `display: none` and `view-settings` to `display: flex`, performing the visual panel swap. The function is synchronous and returns `void`.

### closeGroupSettings

`closeGroupSettings` takes no parameters and reads no module-level state. It reads the DOM for `view-settings` and `view-detail` and reverses the panel swap performed by `openGroupSettings`: `view-settings` is set to `display: none` and `view-detail` is set to `display: flex`. It then calls `_hideDeleteConfirm()`, which collapses the delete confirmation block if it is visible. The function is synchronous and returns `void`.

### onJoinModeChange

`onJoinModeChange` receives a single string `mode`. It reads the DOM for two elements: `settings-requirements-section` and `settings-audition-section`. If `settings-requirements-section` exists, its `display` style is set to `'block'` when `mode` is `'requirements'` and `'none'` otherwise. If `settings-audition-section` exists, its `display` style is set to `'block'` when `mode` is `'audition'` and `'none'` otherwise. Both checks are guarded by null checks on the element reference, so if either element is absent the corresponding assignment is skipped without error. The function is synchronous and returns `void`.

### submitGroupSettings

`submitGroupSettings` is async and returns `Promise<void>`. It begins by reading the DOM for the button element `settings-save-btn`, disabling it, and setting its text to `'SAVING…'`. The remainder of the function body is wrapped in a `try/catch/finally` block. In the try branch, it reads the currently checked radio input matching `input[name="join-mode"]:checked` and captures its `value`, falling back to `'open'` if no radio is checked. It then reads five DOM inputs to build the `entryReq` object: the raw text of `settings-min-elo` (converted with `Number()` if non-empty), the value of `settings-min-tier`, and the checked state of `settings-req-profile`; fields are only added to `entryReq` when they carry meaningful values. Next it reads five more DOM inputs to build `audConfig`: `settings-aud-rule` is always included as `rule`; `settings-aud-topic`, `settings-aud-category`, `settings-aud-ruleset`, and `settings-aud-rounds` are included only when non-empty, with `locked_total_rounds` converted via `Number()`. It then calls `await safeRpc('update_group_settings', {...})`, passing `currentGroupId` from the `groups.state.ts` import alongside all the form values. The `entry_requirements` payload is the populated `entryReq` object when `joinMode` is `'requirements'` and an empty object otherwise; `audition_config` is the populated `audConfig` when `joinMode` is `'audition'` and an empty object otherwise. If `safeRpc` returns an `error`, that error is thrown. On success, `showToast('Settings saved')` is called, then `closeGroupSettings()` is called (which hides the settings panel and calls `_hideDeleteConfirm()`), and then the module-level `onSettingsSaved` callback is invoked if it is non-null. In the catch branch, `showToast` is called with the caught error's `.message` property, or the string `'Could not save settings'` if no message is present. The finally block unconditionally re-enables the button and resets its text to `'SAVE'`.

### showDeleteConfirm

`showDeleteConfirm` takes no parameters. It reads the DOM for `settings-delete-confirm` and sets its `display` style to `'block'`. It then reads `settings-delete-name-input` as an `HTMLInputElement` and clears its value to an empty string. Finally, it calls `scrollIntoView({ behavior: 'smooth' })` on the `settings-delete-confirm` element, causing the browser to smoothly scroll the confirmation block into the viewport. There is no null guard on either element; if either is absent, a runtime error will be thrown. The function is synchronous and returns `void`.

### submitDeleteGroup

`submitDeleteGroup` is async and returns `Promise<void>`. It reads the DOM for `settings-delete-name-input`, trims its value, and stores it as `confirmName`. If `confirmName` is empty (falsy after trim), it calls `showToast('Type the group name to confirm')` and returns early without making any network call. Otherwise, it reads `settings-delete-submit-btn` as an `HTMLButtonElement`, disables it, and sets its text to `'DELETING…'`. The rest of the function body is in a `try/catch` block with no `finally`. In the try branch, it calls `await safeRpc('delete_group', { p_group_id: currentGroupId, p_confirm_name: confirmName })`. If `safeRpc` returns an `error`, that error is thrown. On success, it sets `view-settings` `display` to `'none'` directly via the DOM (without calling `closeGroupSettings`), and then invokes the module-level `onGroupDeleted` callback if it is non-null. In the catch branch, `showToast` is called with the error message or `'Could not delete group'`, and the button is re-enabled with its text reset to `'DELETE FOREVER'`. Unlike `submitGroupSettings`, there is no `finally` block, meaning the button is only re-enabled on the error path — on the success path the entire settings view is hidden so the button state becomes irrelevant.

### selectSettingsEmoji

`selectSettingsEmoji` receives an `HTMLElement` `el`, expected to be one of the emoji option elements in the picker. It calls `document.querySelectorAll('.settings-emoji-opt')` to get all emoji option elements and removes the `'selected'` class from each via `forEach`. It then adds the `'selected'` class to the passed `el`. Next it reads the DOM for `settings-emoji-selected` as an `HTMLElement`. It sets that element's `textContent` to `el.dataset.emoji` if present, falling back to `'⚔️'`, and sets `display.dataset.emoji` to the same value using the same fallback. The function is synchronous and returns `void`.

### _populateSettings

`_populateSettings` receives a `GroupDetail` object `g` and writes to the DOM in five sequential phases; it is synchronous and private to the module. In the first phase it sets the `value` of `settings-desc` to `g.description` (or empty string), the `value` of `settings-category` to `g.category` (or `'general'`), and the `checked` state of `settings-is-public` to `g.is_public` (or `true`). In the second phase it reads `settings-emoji-selected`, sets its `textContent` and `dataset.emoji` to `g.avatar_emoji` (falling back to `'⚔️'`), then iterates all `.settings-emoji-opt` elements with `querySelectorAll` and toggles the `'selected'` class on each one based on whether its own `dataset.emoji` matches the group's avatar emoji. In the third phase it reads `g.join_mode` (defaulting to `'open'`), queries for the matching radio input `input[name="join-mode"][value="${mode}"]`, and sets that radio's `checked` to `true` if the element exists. It then calls `onJoinModeChange(mode)`, which shows or hides the requirements and audition sections according to the resolved mode. In the fourth phase it reads `g.entry_requirements` (defaulting to an empty object) and writes `settings-min-elo` value, `settings-min-tier` value, and `settings-req-profile` checked state from the corresponding fields. In the fifth phase it reads `g.audition_config` (defaulting to an empty object) and writes `settings-aud-rule`, `settings-aud-topic`, `settings-aud-category`, `settings-aud-ruleset`, and `settings-aud-rounds` from the corresponding config fields, converting `locked_total_rounds` to a string when non-null. After all field writes, it calls `_hideDeleteConfirm()` to collapse the delete confirmation block, resetting the danger zone to its default hidden state.

### _hideDeleteConfirm

`_hideDeleteConfirm` takes no parameters. It reads the DOM for `settings-delete-confirm` and, if the element exists, sets its `display` style to `'none'`. The null check means the function exits silently if the element is absent. The function is synchronous and returns `void`.

## Agent 11

### openGroupSettings

`openGroupSettings` accepts a `GroupDetail` object `g` and a `callbacks` object with `onSaved` and `onDeleted` functions. It reads the module-level `callerRole` imported from `groups.state.ts` and returns immediately without doing anything else if that value is not `'leader'`. When the caller is a leader, it writes the two module-level state variables `onSettingsSaved` and `onGroupDeleted` from the callbacks object, then calls `_populateSettings(g)` to fill every input in the settings view with the group's current data. After that it reads the DOM elements `view-detail` and `view-settings` by ID and writes their `style.display` properties, hiding the detail view by setting it to `'none'` and revealing the settings view by setting it to `'flex'`. The function is synchronous and returns `void`.

### closeGroupSettings

`closeGroupSettings` takes no parameters and reads no module-level state. It writes `style.display` on two DOM elements: `view-settings` is set to `'none'` and `view-detail` is set to `'flex'`, reversing the visibility swap that `openGroupSettings` performed. It then calls `_hideDeleteConfirm()`, which collapses the delete-confirmation section if it is visible. The function is synchronous and returns `void`.

### onJoinModeChange

`onJoinModeChange` accepts a single string parameter `mode`. It reads two DOM elements by ID — `settings-requirements-section` and `settings-audition-section` — and for each one, if the element exists, writes its `style.display` property. `settings-requirements-section` is shown as `'block'` only when `mode` is `'requirements'`, and `settings-audition-section` is shown as `'block'` only when `mode` is `'audition'`; in all other cases each section is set to `'none'`. The null checks on both elements mean the function does nothing for a missing element rather than throwing. The function is synchronous and returns `void`.

### submitGroupSettings

`submitGroupSettings` is async. It begins by reading the DOM element `settings-save-btn` and immediately setting `btn.disabled = true` and `btn.textContent = 'SAVING…'`. The rest of the body is wrapped in a try/catch/finally block.

In the try branch the function reads the currently checked radio button with name `join-mode` via `document.querySelector`, falling back to `'open'` if nothing is checked. It then reads the values of five DOM elements to build an `entryReq` plain object: `settings-min-elo` (cast to `Number` if non-empty), `settings-min-tier` (included if non-empty), and `settings-req-profile` (included as `true` if checked). Separately, it reads five more elements to build an `audConfig` object: `settings-aud-rule` always sets the `rule` key, while `settings-aud-topic`, `settings-aud-category`, `settings-aud-ruleset`, and `settings-aud-rounds` are each added only when their values are non-empty, with rounds cast to `Number`. The function then calls `safeRpc('update_group_settings', …)` and awaits the result; the payload includes `currentGroupId` from module-level state (imported from `groups.state.ts`), the description/category/is-public/avatar-emoji fields read directly from their DOM elements, the resolved `joinMode`, and either `entryReq` or `audConfig` conditionally based on `joinMode` (`{}` is passed for whichever one does not apply). If the returned `error` is truthy it is thrown. On success, `showToast('Settings saved')` is called, then `closeGroupSettings()` is called to swap views, and then the module-level `onSettingsSaved` callback is invoked if set.

In the catch branch, `showToast` is called with the error's `.message` or a fallback string. In the finally block, regardless of outcome, `btn.disabled` is reset to `false` and `btn.textContent` is reset to `'SAVE'`.

### showDeleteConfirm

`showDeleteConfirm` takes no parameters and reads no module-level state. It reads the DOM element `settings-delete-confirm` and sets its `style.display` to `'block'`. It then reads `settings-delete-name-input` as an `HTMLInputElement` and clears its value to `''`. Finally it calls `scrollIntoView({ behavior: 'smooth' })` on `settings-delete-confirm` again (reading the element a second time by ID), scrolling the confirmation section into the viewport with smooth animation. The function is synchronous and returns `void`. There are no null guards on either element lookup.

### submitDeleteGroup

`submitDeleteGroup` is async. It begins by reading `settings-delete-name-input` and trimming its value into `confirmName`. If `confirmName` is falsy (empty after trim), it calls `showToast('Type the group name to confirm')` and returns early. Otherwise it reads `settings-delete-submit-btn`, sets `btn.disabled = true` and `btn.textContent = 'DELETING…'`, then enters a try/catch block.

In the try branch it calls `safeRpc('delete_group', { p_group_id: currentGroupId, p_confirm_name: confirmName })` and awaits the result, where `currentGroupId` is read from module-level state imported from `groups.state.ts`. If the returned `error` is truthy it is thrown. On success, the function reads `view-settings` from the DOM and sets its `style.display` to `'none'`, then invokes the module-level `onGroupDeleted` callback if set. Notably, unlike `closeGroupSettings`, this success path does not restore the detail view's visibility — it only hides settings, leaving view restoration to the `onGroupDeleted` callback.

In the catch branch, `showToast` is called with the error's `.message` or a fallback string, and `btn.disabled` and `btn.textContent` are reset (`false` / `'DELETE FOREVER'`). There is no finally block, so the button reset only happens on failure; on success the button state is left disabled (the view is expected to be gone).

### selectSettingsEmoji

`selectSettingsEmoji` accepts a single `HTMLElement` parameter `el`. It first calls `document.querySelectorAll('.settings-emoji-opt')` and iterates all matching elements with `forEach`, removing the `selected` CSS class from each. It then adds the `selected` class to `el`. It reads `el.dataset.emoji`, falling back to `'⚔️'` if absent. It reads the DOM element `settings-emoji-selected` and writes both its `textContent` and its own `dataset.emoji` to the resolved emoji value. The function is synchronous and returns `void`.

### _populateSettings

`_populateSettings` accepts a `GroupDetail` parameter `g` and writes to a large set of DOM elements, using nullish fallbacks throughout for every property read from `g`.

It begins with the three general fields: it sets `settings-desc` textarea's `value` to `g.description ?? ''`, `settings-category` select's `value` to `g.category ?? 'general'`, and `settings-is-public` checkbox's `checked` to `g.is_public ?? true`.

For the emoji display it reads `settings-emoji-selected` and sets both `textContent` and `dataset.emoji` to `g.avatar_emoji ?? '⚔️'`. It then queries all `.settings-emoji-opt` elements and calls `classList.toggle('selected', …)` on each, marking as selected whichever option's `dataset.emoji` matches the group's avatar emoji (or `'⚔️'` if none).

For the join mode it resolves `mode = g.join_mode ?? 'open'`, queries the radio input with matching name and value attributes, sets `radio.checked = true` if found (no action if not found), and then calls `onJoinModeChange(mode)` to show or hide the requirements and audition sections accordingly.

For entry requirements it reads `g.entry_requirements ?? {}` and sets three DOM inputs: `settings-min-elo` value to a stringified `min_elo` or `''`, `settings-min-tier` select value to `min_tier ?? ''`, and `settings-req-profile` checkbox checked state to `require_profile_complete ?? false`.

For audition config it reads `g.audition_config ?? {}` and sets five DOM elements: `settings-aud-rule` to `aud.rule ?? 'allowed_by_leader'`, `settings-aud-topic` to `aud.locked_topic ?? ''`, `settings-aud-category` to `aud.locked_category ?? ''`, `settings-aud-ruleset` to `aud.locked_ruleset ?? ''`, and `settings-aud-rounds` to a stringified `locked_total_rounds` or `''`.

Finally it calls `_hideDeleteConfirm()` to collapse the danger zone, resetting any previously expanded delete confirmation. The function is synchronous and returns `void`.

### _hideDeleteConfirm

`_hideDeleteConfirm` takes no parameters and reads no module-level state. It reads the DOM element `settings-delete-confirm` into a local `el` variable and, if the element exists, sets `el.style.display` to `'none'`. Unlike the two element lookups in `showDeleteConfirm`, this function guards against a missing element with an explicit `if (el)` check before writing. The function is synchronous and returns `void`.
