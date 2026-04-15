# Stage 2 Outputs — arena-feed-spec-chat.ts

## Agent 01

### initSpecChat

`initSpecChat` accepts a single `debateId` string. It writes `activeDebateId` to that value and resets `chatOpen` to `false`. It then reads the DOM element with id `feed-spec-chat-panel` and returns immediately if no such element exists. It calls `getCurrentProfile()` and coerces the return value to a boolean `isLoggedIn`. It then overwrites the panel's `innerHTML` with a template that builds the chat UI: a collapsible wrapper with a header row, a body `div` initially set to `display:none`, a message list container seeded with an empty-state placeholder, and — conditionally on `isLoggedIn` — either a text input plus send button or a login prompt anchor. An error display `div` is also injected, hidden by default.

After building the DOM, the function attaches a `click` listener on `spec-chat-hdr` that calls `toggleSpecChat`. If `isLoggedIn` is true, it attaches a `click` listener on `spec-chat-send` that fires `handleSend()` as a fire-and-forget `void` call, and a `keydown` listener on `spec-chat-input` that calls `handleSend()` the same way when `Enter` is pressed without `Shift` (calling `e.preventDefault()` first). It then calls `loadMessages()` as a fire-and-forget void call for the initial population, and sets `pollInterval` to a `setInterval` that calls `loadMessages()` every 5000 milliseconds. The function is synchronous and returns `void`.

### cleanupSpecChat

`cleanupSpecChat` reads module-level `pollInterval`. If it is non-null, it calls `clearInterval(pollInterval)` and then sets `pollInterval` to `null`. It then unconditionally writes `null` to `lastMessageTime`, `null` to `activeDebateId`, and `false` to `chatOpen`. It does not touch the DOM, makes no network calls, and returns `void`. It is synchronous.

### toggleSpecChat

`toggleSpecChat` reads module-level `chatOpen`, inverts it, and writes the new value back to `chatOpen`. It then reads the DOM elements with ids `spec-chat-body` and `spec-chat-toggle`. If `spec-chat-body` is found, it sets its `style.display` to `'flex'` when `chatOpen` is now `true` or `'none'` when `false`. If `spec-chat-toggle` is found, it sets its `textContent` to `'▲'` when open or `'▼'` when closed. If `chatOpen` has just become `true`, it calls `scrollToBottom()`. The function is synchronous, makes no network calls, and returns `void`.

### loadMessages

`loadMessages` is async. It reads module-level `activeDebateId` and returns immediately if it is null. Inside a `try` block it calls `safeRpc('get_spectator_chat', { p_debate_id: activeDebateId, p_limit: 100 })` and awaits the result, destructuring `data` and `error`. If `error` is truthy or `data` is falsy, it returns without doing anything further. It casts `data` to `SpecChatMessage[]` and if the array is empty, returns. It reads the `created_at` field of the last element in the array as `newest`. If `newest` equals module-level `lastMessageTime`, it returns — the server has no new messages. Otherwise it writes `newest` to `lastMessageTime` and calls `renderMessages(msgs)`. The `catch` block is empty and swallows all exceptions. The function returns `Promise<void>`.

### renderMessages

`renderMessages` accepts an array of `SpecChatMessage` objects. It reads the DOM element with id `spec-chat-msgs` and returns immediately if none is found. If the array is empty, it sets the container's `innerHTML` to a static empty-state placeholder and returns. Otherwise it calls `getCurrentProfile()` and reads the `id` property of the result as `myId` (which may be `undefined` if there is no profile). It then maps each message object to an HTML string: each item becomes a `div.spec-chat-msg`, with the CSS class `mine` added when `m.user_id === myId`. Each message renders `m.display_name` passed through `escapeHTML()` in a `span`, `m.message` passed through `escapeHTML()` in another `span`, and a report button whose `onclick` attribute sets `window.location.href` to a `mailto:` URL constructed with `encodeURIComponent(m.id)` and `encodeURIComponent(m.message)`. The mapped strings are joined and assigned to `container.innerHTML`. After setting `innerHTML`, `renderMessages` calls `scrollToBottom()`. The function is synchronous and returns `void`.

### handleSend

`handleSend` is async. It reads module-level `activeDebateId` and returns immediately if null. It reads DOM elements `spec-chat-input` (cast to `HTMLInputElement | null`) and `spec-chat-send-error`. If `input` is null it returns. It reads `input.value`, trims it, and returns if the trimmed string is empty. It reads `spec-chat-send` cast to `HTMLButtonElement | null` and, if found, sets `disabled` to `true`. Inside a `try` block it calls `safeRpc('send_spectator_chat', { p_debate_id: activeDebateId, p_message: text })` and awaits the result. It checks three conditions for failure: `error` is truthy, `data` is falsy, or `data.success` is not `true`. On failure it reads `data.error` as a message string, falling back to `'Could not send'`, then — if `errorEl` exists — sets its `textContent` to that string, sets its `display` to `'block'`, and schedules a `setTimeout` to hide it again after 3000 milliseconds; this timeout is fire-and-forget. On success it sets `input.value` to an empty string, hides `errorEl` if present, and awaits `loadMessages()` to refresh the message list immediately. The `catch` block is empty and swallows exceptions. The `finally` block unconditionally re-enables the send button (if found) and calls `input.focus()`. The function returns `Promise<void>`.

### scrollToBottom

`scrollToBottom` reads the DOM element with id `spec-chat-msgs`. If the element exists, it sets `element.scrollTop` to `element.scrollHeight`. The function makes no network calls, reads or writes no module-level state, and returns `void`. It is synchronous.

---

## Agent 02

### initSpecChat

`initSpecChat` receives a `debateId` string parameter. It writes `activeDebateId` to that value and sets `chatOpen` to `false`. It then queries the DOM for an element with id `feed-spec-chat-panel`; if that element is not found it returns immediately without doing anything else. If the element is found, it calls `getCurrentProfile()` to read the current user's profile from module state in `auth.ts`, then derives `isLoggedIn` as a boolean from whether that profile is truthy. It overwrites `panel.innerHTML` with a full template string that builds the panel structure: a header div containing a label and a toggle arrow, and a body div initially styled `display:none`. If `isLoggedIn` is true the body contains a text input capped at 280 characters and a send button; if false, it contains a login link pointing to `/moderator-login.html`. Either branch includes a hidden error div with id `spec-chat-send-error`. After injecting the HTML, the function queries for `spec-chat-hdr` and attaches a `click` listener that calls `toggleSpecChat`. If `isLoggedIn` is true, it queries for `spec-chat-send` and attaches a `click` listener that calls `handleSend` as a fire-and-forget void expression, and queries for `spec-chat-input` and attaches a `keydown` listener that calls `handleSend` (also fire-and-forget) when Enter is pressed without Shift, preventing default. Finally, it calls `loadMessages()` fire-and-forget for the initial load, then assigns `setInterval(() => void loadMessages(), 5000)` to module-level `pollInterval`, starting a 5-second polling loop.

### cleanupSpecChat

`cleanupSpecChat` takes no parameters and returns nothing. It reads `pollInterval` and, if it is non-null, calls `clearInterval(pollInterval)` to stop the polling loop, then sets `pollInterval` to `null`. It then unconditionally sets `lastMessageTime` to `null`, `activeDebateId` to `null`, and `chatOpen` to `false`, resetting all four module-level state variables to their initial values. It does not touch the DOM.

### toggleSpecChat

`toggleSpecChat` takes no parameters and returns nothing. It inverts the module-level `chatOpen` boolean. It then queries the DOM for `spec-chat-body` and `spec-chat-toggle`. If `body` is found, it sets `body.style.display` to `'flex'` when `chatOpen` is now true, or `'none'` when false. If `toggle` is found, it sets `toggle.textContent` to `'▲'` when `chatOpen` is true, or `'▼'` when false. If `chatOpen` is true after the inversion, it calls `scrollToBottom`. No branches run `scrollToBottom` on collapse.

### loadMessages

`loadMessages` is async. It reads `activeDebateId` and returns immediately if it is null. Inside a try block, it awaits `safeRpc('get_spectator_chat', { p_debate_id: activeDebateId, p_limit: 100 })`, which returns `{ data, error }`. If `error` is truthy or `data` is falsy, the function returns without further action. It casts `data` to `SpecChatMessage[]` and, if the array is empty, returns without further action. It reads the `created_at` field of the last element in the array as `newest`, then compares it against module-level `lastMessageTime`; if they are equal, the function returns, skipping rendering when no new messages have arrived. If `newest` differs, it writes `newest` to `lastMessageTime` and calls `renderMessages(msgs)` synchronously. The catch block swallows all errors without any logging or side effects.

### renderMessages

`renderMessages` takes a `SpecChatMessage[]` array. It is synchronous. It queries the DOM for `spec-chat-msgs` and returns immediately if that element is not found. If `msgs` is empty, it sets `container.innerHTML` to a single empty-state placeholder div and returns without calling `scrollToBottom`. If `msgs` is non-empty, it calls `getCurrentProfile()` to read the current user's profile and extracts `profile?.id` as `myId`. It then builds a new `innerHTML` string by mapping each message to a div: each div receives the class `mine` when `m.user_id === myId`, and otherwise no extra class. Inside each div it renders the display name through `escapeHTML`, the message text through `escapeHTML`, and a report button whose `onclick` attribute constructs a `mailto:` link to `reports@themoderator.app` using `encodeURIComponent` for both `m.id` and `m.message`. The `display_name`, `avatar_url`, and `created_at` fields from the type are not rendered into the visible message structure (avatar_url and created_at are present in the interface but not referenced in the template). After setting `container.innerHTML`, it calls `scrollToBottom`.

### handleSend

`handleSend` is async. It reads `activeDebateId` and returns immediately if it is null. It queries the DOM for `spec-chat-input` (cast to `HTMLInputElement | null`) and `spec-chat-send-error`, then returns if the input element is not found. It reads and trims `input.value`; if the result is an empty string it returns. It queries for `spec-chat-send` as an `HTMLButtonElement | null` and, if found, sets `sendBtn.disabled = true` to block concurrent sends. Inside a try block it awaits `safeRpc('send_spectator_chat', { p_debate_id: activeDebateId, p_message: text })`. If the response has an error, `data` is falsy, or `(data as { success: boolean }).success` is not true, it reads `(data as { error?: string })?.error` or falls back to the string `'Could not send'`, writes that text to `errorEl.textContent`, sets `errorEl.style.display = 'block'`, and schedules a `setTimeout` after 3000 ms to set `errorEl.style.display = 'none'`. On the success path it clears `input.value`, hides the error element, and awaits `loadMessages()` so the sender sees their own message before the function returns. The catch block swallows all errors silently. The `finally` block, which runs on both success and error paths including exceptions, re-enables `sendBtn` if it was found, and calls `input.focus()`.

### scrollToBottom

`scrollToBottom` takes no parameters and returns nothing. It queries the DOM for `spec-chat-msgs`. If that element is found, it sets `container.scrollTop` to `container.scrollHeight`, which scrolls the message list to its bottom edge. If the element is not found, the function does nothing.

---

## Agent 03

### initSpecChat

`initSpecChat` takes a single `debateId` string parameter. It writes `activeDebateId` to that value and resets `chatOpen` to `false`. It then reads the DOM element with id `feed-spec-chat-panel`; if that element is not found, the function returns immediately without doing anything further. If the element is found, it calls `getCurrentProfile()` to read the current session profile and sets a local boolean `isLoggedIn` based on whether the return value is truthy. It writes a full HTML structure into `panel.innerHTML`, injecting a collapsed chat wrapper with a header, a message list container, and conditionally either an input row with a text field and send button (when `isLoggedIn` is true) or a login prompt link (when `isLoggedIn` is false). It then attaches a `click` event listener to the element with id `spec-chat-hdr` that calls `toggleSpecChat`. If `isLoggedIn` is true, it also attaches a `click` listener to `spec-chat-send` that fires `handleSend` as a fire-and-forget void call, and attaches a `keydown` listener to `spec-chat-input` that calls `handleSend` the same way when `Enter` is pressed without `Shift`. After wiring events, it calls `loadMessages()` once as a fire-and-forget void call for the initial load, then sets `pollInterval` to the return value of `setInterval`, which will call `loadMessages()` as a fire-and-forget void call every 5000 milliseconds. The function returns `void` synchronously.

### cleanupSpecChat

`cleanupSpecChat` takes no parameters. It reads `pollInterval`: if it is non-null, it calls `clearInterval(pollInterval)` and then writes `pollInterval` back to `null`. It then writes `lastMessageTime` to `null`, `activeDebateId` to `null`, and `chatOpen` to `false`. It does not touch the DOM and returns nothing.

### toggleSpecChat

`toggleSpecChat` takes no parameters. It writes `chatOpen` to its boolean inverse. It then reads the DOM elements with ids `spec-chat-body` and `spec-chat-toggle`. If `spec-chat-body` is found, it sets `body.style.display` to `'flex'` when `chatOpen` is now `true`, or `'none'` when it is `false`. If `spec-chat-toggle` is found, it sets its `textContent` to `'▲'` when `chatOpen` is `true` or `'▼'` when it is `false`. If `chatOpen` is `true` after the toggle, it calls `scrollToBottom()`. The function is synchronous and returns nothing.

### loadMessages

`loadMessages` is async and returns `Promise<void>`. It reads `activeDebateId`; if it is `null`, it returns immediately. Inside a `try` block, it calls `await safeRpc('get_spectator_chat', { p_debate_id: activeDebateId, p_limit: 100 })` and destructures `data` and `error` from the result. If `error` is truthy or `data` is falsy, it returns without further action. It casts `data` to `SpecChatMessage[]` and if the array is empty, returns without further action. It reads `msgs[msgs.length - 1].created_at` as the timestamp of the newest message and compares it to `lastMessageTime`; if they are equal, it returns, treating the response as containing nothing new. If the timestamps differ, it writes `lastMessageTime` to the newest timestamp and then calls `renderMessages(msgs)`. The `catch` block is empty and swallows all exceptions silently.

### renderMessages

`renderMessages` takes a `SpecChatMessage[]` parameter named `msgs`. It reads the DOM element with id `spec-chat-msgs`; if not found, it returns immediately. If `msgs` is empty, it writes a placeholder div into `container.innerHTML` and returns. Otherwise, it calls `getCurrentProfile()` to read the current user profile and extracts `profile?.id` as `myId`. It then maps over `msgs`, building an HTML string for each message: it calls `escapeHTML(m.display_name)` and `escapeHTML(m.message)` to produce safe output for both fields, and compares `m.user_id` to `myId` to conditionally add the `mine` CSS class. Each message element also contains a report button whose `onclick` attribute constructs a `mailto:` URL using `encodeURIComponent(m.id)` and `encodeURIComponent(m.message)` — notably, these values are embedded directly into an HTML attribute string rather than going through `escapeHTML`. The joined string is written to `container.innerHTML`. After writing the DOM, it calls `scrollToBottom()`. The function is synchronous and returns nothing.

### handleSend

`handleSend` is async and returns `Promise<void>`. It reads `activeDebateId`; if `null`, it returns immediately. It reads the DOM elements `spec-chat-input` (cast to `HTMLInputElement`) and `spec-chat-send-error`. If `input` is not found, it returns immediately. It reads `input.value`, trims it to `text`, and returns immediately if `text` is empty. It reads `spec-chat-send` (cast to `HTMLButtonElement`) and if found, sets `sendBtn.disabled = true`. Inside a `try` block it calls `await safeRpc('send_spectator_chat', { p_debate_id: activeDebateId, p_message: text })` and destructures `data` and `error`. If `error` is truthy, `data` is falsy, or `(data as { success: boolean }).success` is falsy, it reads `(data as { error?: string })?.error` as the error message, falling back to the string `'Could not send'`. If `errorEl` is found, it writes that message to `errorEl.textContent`, sets `errorEl.style.display` to `'block'`, and registers a `setTimeout` of 3000ms that sets `errorEl.style.display` back to `'none'`. On the success path, it writes `input.value` to the empty string, sets `errorEl.style.display` to `'none'` if found, and then calls `await loadMessages()` to reload messages immediately. The `catch` block is empty. The `finally` block unconditionally re-enables `sendBtn` if found and calls `input.focus()`.

### scrollToBottom

`scrollToBottom` takes no parameters. It reads the DOM element with id `spec-chat-msgs`. If found, it writes `container.scrollTop` to the value of `container.scrollHeight`, which scrolls the message list to its bottom edge. The function is synchronous and returns nothing.

---

## Agent 04

### initSpecChat

`initSpecChat` accepts a single `debateId` string parameter. It writes `activeDebateId` to that value and sets `chatOpen` to `false`. It then reads the DOM element with id `feed-spec-chat-panel` and returns immediately if that element is not found. It calls `getCurrentProfile()` from `auth.ts` and derives a boolean `isLoggedIn` from whether the result is truthy. It writes the entire inner HTML of the panel element with a static template that contains a collapsible wrapper, a header row with a toggle arrow, a hidden body div containing a messages container, and either an input row (when `isLoggedIn` is true) or a login prompt link (when false). An error display element is also rendered inside the body with `display:none`. After setting `innerHTML`, it attaches a `click` event listener to the header element (`spec-chat-hdr`) that calls `toggleSpecChat`. When `isLoggedIn` is true, it attaches a `click` listener on the send button that calls `handleSend` as a fire-and-forget void expression, and a `keydown` listener on the input that calls `handleSend` the same way whenever `Enter` is pressed without `Shift`. It then calls `loadMessages()` as a fire-and-forget void, and starts a repeating interval that calls `loadMessages()` every 5000 milliseconds, storing the interval ID in the module-level `pollInterval`. The function is synchronous and returns `void`.

### cleanupSpecChat

`cleanupSpecChat` reads `pollInterval`. If it is not null it calls `clearInterval(pollInterval)` and sets `pollInterval` to `null`. It then sets `lastMessageTime` to `null`, `activeDebateId` to `null`, and `chatOpen` to `false`. It does not touch the DOM. It has no branches beyond the null-check on `pollInterval`, no error path, and no return value. It is synchronous.

### toggleSpecChat

`toggleSpecChat` flips `chatOpen` to its boolean opposite. It reads the DOM elements with ids `spec-chat-body` and `spec-chat-toggle`. If `body` is non-null it sets `body.style.display` to `'flex'` when the new value of `chatOpen` is `true` and `'none'` when it is `false`. If `toggle` is non-null it sets its `textContent` to `'▲'` when `chatOpen` is `true` and `'▼'` when it is `false`. If `chatOpen` is now `true`, it calls `scrollToBottom()`. It is synchronous, has no error path, and returns `void`.

### loadMessages

`loadMessages` is async. It reads `activeDebateId` and returns immediately if that value is null. Inside a `try` block it awaits `safeRpc('get_spectator_chat', { p_debate_id: activeDebateId, p_limit: 100 })`. If the response carries an `error` or `data` is falsy, it returns without further action. It casts `data` to `SpecChatMessage[]`. If the array is empty it returns. It reads `created_at` from the last element of the array and compares it to `lastMessageTime`; if they are equal, no new messages have arrived and the function returns. Otherwise it writes the new timestamp to `lastMessageTime` and calls `renderMessages(msgs)`. The `catch` block is empty, so any thrown error is swallowed silently. The function returns `Promise<void>`.

### renderMessages

`renderMessages` accepts a `SpecChatMessage[]` array. It reads the DOM element with id `spec-chat-msgs` and returns immediately if that element is null. If the array is empty it sets `container.innerHTML` to a single empty-state placeholder div and returns. Otherwise it calls `getCurrentProfile()` and reads the `id` field from the result as `myId` (which may be undefined if no profile exists). It maps over the message array, producing an HTML string for each message; messages whose `user_id` matches `myId` receive the CSS class `mine`. Each message string contains `escapeHTML(m.display_name)` and `escapeHTML(m.message)` to prevent XSS. Each message also contains a report button whose `onclick` attribute constructs a `mailto:` URL to `reports@themoderator.app` with the message id and raw message text passed through `encodeURIComponent`. The mapped strings are joined and assigned to `container.innerHTML`. After writing the DOM, it calls `scrollToBottom()`. The function is synchronous and returns `void`.

### handleSend

`handleSend` is async. It reads `activeDebateId` and returns immediately if null. It reads the DOM elements with ids `spec-chat-input` (cast to `HTMLInputElement | null`) and `spec-chat-send-error`. If `input` is null it returns. It reads `input.value`, trims it, and returns if the trimmed string is empty. It reads the send button element (`spec-chat-send`, cast to `HTMLButtonElement | null`) and, if non-null, sets its `disabled` property to `true`. Inside a `try` block it awaits `safeRpc('send_spectator_chat', { p_debate_id: activeDebateId, p_message: text })`. It then checks whether the response carries an `error`, whether `data` is falsy, or whether the `success` field on `data` is not `true`. On that failure branch, it reads `data.error` (falling back to the string `'Could not send'`), sets `errorEl.textContent` to that message, sets `errorEl.style.display` to `'block'`, and schedules a `setTimeout` (not awaited) that hides the error element after 3000 milliseconds. On the success branch it clears `input.value`, hides the error element, and awaits `loadMessages()` so the sender sees their own message. The `catch` block is empty, silently discarding any thrown error. The `finally` block re-enables the send button if it is non-null and calls `input.focus()`. The function returns `Promise<void>`.

### scrollToBottom

`scrollToBottom` reads the DOM element with id `spec-chat-msgs`. If that element is non-null it sets `container.scrollTop` to `container.scrollHeight`, which moves the scroll position to the bottom of the messages container. It has no branches beyond the null-check, no error path, writes no module-level state, and returns `void`. It is synchronous.

---

## Agent 05

### initSpecChat

`initSpecChat` takes a single `debateId` string parameter. It writes `activeDebateId` to that value and resets `chatOpen` to `false`. It then queries the DOM for the element with id `feed-spec-chat-panel` and returns immediately if that element is not found. It calls `getCurrentProfile()` to read the current user profile from module-level auth state and derives a boolean `isLoggedIn` from whether the result is truthy.

It writes a full HTML structure into `panel.innerHTML`, including a header row, a collapsed message area (`display:none`), and either an input row with a send button (when `isLoggedIn` is true) or a login prompt anchor (when `isLoggedIn` is false). It then attaches a `click` event listener to the element with id `spec-chat-hdr`, pointing to `toggleSpecChat`. When `isLoggedIn` is true, it additionally attaches a `click` listener on `spec-chat-send` that calls `handleSend()` as a fire-and-forget void, and a `keydown` listener on `spec-chat-input` that calls `handleSend()` the same way when `Enter` is pressed without `Shift`. After wiring events, it calls `loadMessages()` once as a fire-and-forget void for the initial data load, then sets `pollInterval` to a `setInterval` call that fires `loadMessages()` every 5000 milliseconds. The function has no return value.

### cleanupSpecChat

`cleanupSpecChat` takes no parameters. It checks whether `pollInterval` is non-null; if so, it calls `clearInterval(pollInterval)` and then sets `pollInterval` to `null`. Regardless of whether an interval existed, it then sets `lastMessageTime` to `null`, `activeDebateId` to `null`, and `chatOpen` to `false`. It returns nothing. There is no DOM manipulation and no async behavior.

### toggleSpecChat

`toggleSpecChat` takes no parameters. It flips the boolean `chatOpen` to its opposite. It then reads the DOM elements with ids `spec-chat-body` and `spec-chat-toggle`. If `spec-chat-body` exists, its `style.display` is set to `'flex'` when `chatOpen` is now `true`, or `'none'` when `chatOpen` is now `false`. If `spec-chat-toggle` exists, its `textContent` is set to `'▲'` or `'▼'` to match. If `chatOpen` is now `true`, it calls `scrollToBottom()`. It returns nothing and is synchronous.

### loadMessages

`loadMessages` is async and returns `Promise<void>`. It first checks `activeDebateId`; if it is null, it returns immediately. Inside a try block, it awaits `safeRpc('get_spectator_chat', { p_debate_id: activeDebateId, p_limit: 100 })`. If the result's `error` is truthy or `data` is falsy, it returns without further action. It casts `data` to `SpecChatMessage[]` and returns without action if that array is empty. It reads `created_at` from the last element of the array as `newest`. If `newest` equals the module-level `lastMessageTime`, it returns without action — this is the deduplication guard. Otherwise it sets `lastMessageTime` to `newest` and calls `renderMessages(msgs)`. The catch block catches any thrown error and does nothing with it, making all failure paths non-fatal. The function has no return value.

### renderMessages

`renderMessages` takes an array of `SpecChatMessage` objects. It queries the DOM for the element with id `spec-chat-msgs` and returns immediately if not found. If `msgs` is empty, it sets `container.innerHTML` to a placeholder string and returns. Otherwise it calls `getCurrentProfile()` to read the current user's profile and extracts `id` as `myId`. It maps over `msgs`, producing an HTML string for each message. For each message it compares `m.user_id` to `myId` and adds the CSS class `mine` to the message div if they match. Both `m.display_name` and `m.message` are passed through `escapeHTML()` before being interpolated into the HTML. Each message includes a report button whose `onclick` attribute constructs a `mailto:` URL to `reports@themoderator.app` with `m.id` and `m.message` passed through `encodeURIComponent` — these two values are interpolated directly into the `onclick` attribute string rather than through `escapeHTML()`. After setting `container.innerHTML` to the joined result, it calls `scrollToBottom()`. The function is synchronous and returns nothing.

### handleSend

`handleSend` is async and returns `Promise<void>`. It returns immediately if `activeDebateId` is null. It reads the DOM elements with ids `spec-chat-input` (cast to `HTMLInputElement | null`) and `spec-chat-send-error`. If the input element is not found, it returns immediately. It reads `input.value`, trims it, and returns without action if the result is an empty string. It reads the send button element with id `spec-chat-send` and, if found, sets `sendBtn.disabled` to `true`.

Inside a try block it awaits `safeRpc('send_spectator_chat', { p_debate_id: activeDebateId, p_message: text })`. On the failure branch — where `error` is truthy, `data` is falsy, or `(data as { success: boolean }).success` is false — it reads `(data as { error?: string })?.error`, defaulting to `'Could not send'` if absent. If `errorEl` exists, it sets its `textContent` to that message, sets `style.display` to `'block'`, and registers a `setTimeout` for 3000 milliseconds that sets `errorEl.style.display` back to `'none'`. On the success branch, it clears `input.value` to an empty string, hides `errorEl` if it exists, then awaits `loadMessages()` to reload the message list immediately. The catch block catches any thrown error and does nothing. The `finally` block always runs: it sets `sendBtn.disabled` to `false` if the button exists, and calls `input.focus()`. The function returns nothing.

### scrollToBottom

`scrollToBottom` takes no parameters and is synchronous. It queries the DOM for the element with id `spec-chat-msgs`. If that element exists, it sets `container.scrollTop` to `container.scrollHeight`, which moves the scroll position to the bottom of the container. If the element is not found, the function does nothing. It returns nothing.
