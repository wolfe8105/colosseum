# Stage 2 Outputs — arena-room-live-input.ts

## Agent 01

### renderInputControls

Reads the `mode` parameter (type `DebateMode`), queries the DOM for element with id `'arena-input-area'`, and returns immediately if that element does not exist. Branches based on the `mode` value.

**Text and AI modes:** Sets `innerHTML` of the input area with a textarea (id `'arena-text-input'`, maxlength `TEXT_MAX_CHARS`), a send button (id `'arena-send-btn'`), and a character count display (id `'arena-char-count'`). Then queries for these elements by id and attaches event listeners: an `'input'` listener on the textarea that updates the displayed character count, sets `scrollHeight`-based auto-resize height capped at 120px, and enables/disables the send button based on textarea length; a `'click'` listener on the send button that calls `submitTextArgument()` fire-and-forget; and a `'keydown'` listener on the textarea that calls `submitTextArgument()` and prevents default when the key is `'Enter'` without the shift modifier.

**Live mode:** Sets `innerHTML` with a canvas (id `'arena-waveform'`, 300×40), a microphone button (id `'arena-mic-btn'`), and an audio status div (id `'arena-audio-status'`). Queries for the mic button and attaches a `'click'` listener that calls `toggleLiveMute()` from `arena-room-live-audio.ts`.

**Voicememo mode:** Sets `innerHTML` with voice memo controls including a status div (id `'arena-vm-status'`), a hidden timer div (id `'arena-vm-timer'`), a record button (id `'arena-record-btn'`), and two hidden action buttons (ids `'arena-vm-cancel'` and `'arena-vm-send'`). Calls `wireVoiceMemoControls()` from `arena-room-voicememo.ts`.

The function does not return a value (returns `undefined`). It is not async.

## Agent 02

### renderInputControls

Retrieves the DOM element with id `arena-input-area`. If absent, returns immediately. Based on the `mode` parameter, renders different input UI:

**text/ai modes:** Injects a textarea (max TEXT_MAX_CHARS), send button, and character counter. Attaches input listeners that update the character count display, disable/enable the send button based on content length, and auto-resize the textarea to fit content (capped at 120px). Enter key submits via `submitTextArgument()` unless Shift is held; clicking send button also calls `submitTextArgument()`.

**live mode:** Injects a waveform canvas and microphone button. Attaches click listener to mic button that invokes `toggleLiveMute()`.

**voicememo mode:** Injects voice memo controls container and calls `wireVoiceMemoControls()` to wire up its event handlers.

Modifies DOM innerHTML and attaches event listeners; does not await async operations itself.

## Agent 03

### renderInputControls

This function queries the DOM element #arena-input-area and early-returns if absent. It switches on the `mode` parameter. For 'text' or 'ai' modes, it writes a textarea, send button, and character count span to inputArea's innerHTML, then queries those elements back and wires them with listeners: the textarea's 'input' event reads its value length, updates the char count text, toggles the send button's disabled state, and auto-resizes the textarea height to a maximum of 120px; the send button's 'click' event and the textarea's 'keydown' event (for Enter without Shift) both call submitTextArgument() without awaiting. For 'live' mode, it writes a canvas, microphone button, and audio status div to inputArea and attaches a 'click' listener to the mic button that calls toggleLiveMute(). For 'voicememo' mode, it writes voice memo controls to inputArea and calls wireVoiceMemoControls(). If mode is not one of these three values, inputArea is not modified.

## Agent 04

### renderInputControls

Reads: `document.getElementById('arena-input-area')` to retrieve the target container; returns early if not found. Reads `mode` parameter to determine which UI variant to render. Reads `TEXT_MAX_CHARS` constant for textarea character limit.

Writes: Sets `inputArea.innerHTML` to render one of three UI layouts. Updates `charCount.textContent` with current input length on every keystroke. Modifies `input.style.height` to auto-expand textarea up to 120px max during input. Sets `sendBtn.disabled` based on whether textarea is empty.

Calls: `document.getElementById()` three times in text/ai branch to retrieve input, button, and counter elements. `input.addEventListener('input', ...)`, `input.addEventListener('keydown', ...)`, `sendBtn.addEventListener('click', ...)`. Calls `submitTextArgument()` fire-and-forget on click or Enter-without-Shift. Calls `toggleLiveMute()` when mic button clicked in live mode. Calls `wireVoiceMemoControls()` after voicememo HTML injection.

Control flow: Switch on four mode values — 'text' and 'ai' share identical setup (fall-through). Optional chaining on all event listener registrations.

Error paths: Returns immediately if `arena-input-area` absent. Event listeners use optional chaining so missing elements don't throw.

## Agent 05

### renderInputControls

The function is synchronous and exported. It accepts a `DebateMode` parameter and performs conditional DOM manipulation based on the debate mode.

First retrieves the element with id `'arena-input-area'` and returns early if it does not exist. Switches on the mode parameter.

For `'text'` and `'ai'` modes (fall-through), writes an HTML template containing a textarea and send button to `inputArea.innerHTML`. Interpolates `TEXT_MAX_CHARS` into the textarea's `maxlength` attribute and character count display. Queries the newly inserted DOM for three elements: the textarea, send button, and character count span. Send button starts disabled. Attaches three event listeners: `'input'` on textarea updates char count, toggles disabled state, auto-resizes height clamped to 120px; `'click'` on send button calls `submitTextArgument()` without awaiting; `'keydown'` on textarea prevents default and calls `submitTextArgument()` when Enter pressed without Shift.

For `'live'` mode, writes HTML with canvas and mic button, attaches `'click'` listener to `#arena-mic-btn` calling `toggleLiveMute`.

For `'voicememo'` mode, writes HTML with record controls and calls `wireVoiceMemoControls()`.

If mode matches none of the four cases, takes no action and leaves `inputArea.innerHTML` unchanged. `TEXT_MAX_CHARS` is a numeric constant, not user-supplied, so no XSS risk from its interpolation.
