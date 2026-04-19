# Stage 2 Outputs — spectate.share.ts

## Agent 01

### wireShareButtons

When called, `wireShareButtons` reads the SpectateDebate object passed as a parameter (extracting `spectator_count` and `topic`), and reads the current window location URL from `window.location.href`. It constructs a share text string that conditionally includes the spectator count if greater than 1, followed by the debate topic or a fallback "Live Debate" string. The function then attaches click event listeners to four DOM elements queried by ID: `share-copy`, `share-x`, `share-wa`, and `share-native`.

The `share-copy` listener invokes `navigator.clipboard.writeText()` with the URL and, upon successful promise resolution, temporarily modifies the button's text content to "✓ Copied!" before reverting it back to "📋 Copy Link" after 2000 milliseconds using `setTimeout`; if the clipboard operation rejects, it logs a warning but does not re-throw. The `share-x` and `share-wa` listeners each open a new browser window via `window.open()` to pre-filled social media intent URLs (Twitter and WhatsApp respectively), encoding the text and URL parameters. The `share-native` listener checks for `navigator.share()` availability; if present, it calls the Web Share API with the topic as title and constructed text/URL, silently catching any rejection; if the API is unavailable, it falls back to copying the URL to the clipboard via `navigator.clipboard.writeText()`, again logging warnings on failure. The function is synchronous and does not return a value; all clipboard and window operations are non-awaited, with their `.catch()` handlers used for error suppression or logging.

## Agent 02

### wireShareButtons

The function reads the current page URL via `window.location.href` and accesses a `SpectateDebate` object passed as parameter `d`, extracting `d.spectator_count` and `d.topic`. It constructs a share text string that optionally includes the spectator count and debate topic. The function then queries the DOM for four button elements by ID: `share-copy`, `share-x`, `share-wa`, and `share-native`, attaching click event listeners to each via the optional chaining operator.

When the copy button is clicked, the function asynchronously writes the page URL to the clipboard via `navigator.clipboard.writeText()`, then updates the button text to "✓ Copied!" and schedules a timeout (fire-and-forget) to revert the text after 2 seconds; clipboard errors are logged to the console but not thrown. When the X (Twitter) or WhatsApp buttons are clicked, the function opens new browser windows to their respective share URLs, encoding the constructed text and page URL. When the native share button is clicked, the function checks if `navigator.share` exists; if present, it asynchronously invokes the Web Share API with the debate topic, share text, and URL (catching errors silently), otherwise it falls back to copying the URL to the clipboard with error logging. The function returns void.

## Agent 03

### wireShareButtons

The function is synchronous and reads the `SpectateDebate` object parameter `d`, the current window URL via `window.location.href`, and the DOM elements with IDs `share-copy`, `share-x`, `share-wa`, and `share-native`. It constructs text for sharing that includes a sword emoji, an optional spectator count (preceded by "watching — "), the debate topic or fallback text "Live Debate", and an app attribution line. It returns void.

The function attaches click event listeners to four DOM elements. When `share-copy` is clicked, it calls `navigator.clipboard.writeText()` to copy the URL to the clipboard (awaited via `.then()`), then if the button element exists, updates its text content to "✓ Copied!" and fires a `setTimeout` callback (fire-and-forget) to revert the text after 2000ms; clipboard failures are caught and logged as a warning. When `share-x` is clicked, it opens a Twitter/X intent URL in a new window with the constructed text and URL encoded as query parameters. When `share-wa` is clicked, it opens WhatsApp with the text and URL appended together. When `share-native` is clicked, it branches on browser capability: if `navigator.share` exists, it calls `navigator.share()` with the topic as title and constructed text and URL (caught errors are suppressed with an empty catch), otherwise it falls back to copying the URL to the clipboard with warnings logged on failure. All event listeners are chained with optional chaining (`?.addEventListener`), so if a button element does not exist in the DOM, no error occurs.

## Agent 04

### wireShareButtons

The function takes a `SpectateDebate` object as a parameter and reads the current page URL via `window.location.href`, the spectator count from the debate object, and the debate topic. It constructs a share text string by concatenating a sword emoji, an optional spectator count prefix (only if greater than 1), the topic or a default label, and a branded suffix. It then calls `document.getElementById()` four times to find share button elements by IDs ('share-copy', 'share-x', 'share-wa', 'share-native') and attaches click event listeners to each. The function returns void and does not write to any return value.

For the copy-link button, clicking calls `navigator.clipboard.writeText(url)` and, if successful, updates the button's `textContent` to '✓ Copied!' then schedules a timeout to revert it back to '📋 Copy Link' after 2000 milliseconds; failures log a warning to the console. For the X (Twitter) button, clicking opens a URL via `window.open()` pointing to an X tweet intent with encoded text and URL parameters in a new blank window. For the WhatsApp button, clicking opens a `wa.me` URL with encoded text and URL in a new blank window. For the native share button, clicking checks if `navigator.share` exists; if present, it calls that API with the topic as title, the constructed text, and the URL, catching and silently discarding any rejection; if the API is not available, it falls back to `navigator.clipboard.writeText()` with a warning logged on failure. All clipboard and share API calls use promise-based async patterns with `.then()` and `.catch()`, but none are awaited by the function itself.

## Agent 05

### wireShareButtons

The function reads the current window URL via `window.location.href` and extracts spectator count from the `d.spectator_count` property, converting it to a number and defaulting to 0 if missing. It constructs a share text string that conditionally includes the spectator count with "watching" text if count exceeds 1, followed by the debate topic or a fallback text. The function then attaches click event listeners to four DOM elements identified by IDs: 'share-copy', 'share-x', 'share-wa', and 'share-native'.

When the copy button is clicked, the function calls `navigator.clipboard.writeText()` with the URL, then upon success updates the button's text content to "✓ Copied!" and schedules a timeout to revert it to "📋 Copy Link" after 2 seconds, suppressing any clipboard errors via `.catch()`. When the X (Twitter) button is clicked, it opens a new window to Twitter's intent/tweet endpoint with the share text and URL as query parameters. When the WhatsApp button is clicked, it opens a new window to the WhatsApp share API with the share text and URL. When the native share button is clicked, it checks for `navigator.share` support and either calls `navigator.share()` with the topic as title, the text, and URL (silently catching errors), or falls back to copying the URL to the clipboard if the API is unavailable. The function is synchronous and returns void.
