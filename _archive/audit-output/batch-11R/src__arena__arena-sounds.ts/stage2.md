# Stage 2 Outputs — arena-sounds.ts

## Agent 01

### getCtx

When called, this function checks whether the module-level variable `_ctx` holds an AudioContext. If it does not, it attempts to construct one by calling `new (window.AudioContext || (window as any).webkitAudioContext)()` to support both standard and webkit-prefixed APIs. If construction fails, it logs a warning to the console and returns null. If construction succeeds, or if `_ctx` already existed, the function then checks whether the context's state is 'suspended' and calls `_ctx.resume()` if so, required by browsers that require a user gesture to begin audio playback. It returns either the AudioContext or null.

### sfxEnabled

When called, this function attempts to read the string value at the localStorage key 'moderator_settings', defaulting to '{}' if the key does not exist. It parses that string as JSON and reads the `audio_sfx` property. It returns true if that property is either absent or explicitly not false; it returns true if parsing fails. The function returns false only if the property is explicitly set to false.

### osc

This function receives an AudioContext, an oscillator type (sine, triangle, square, or sawtooth), a frequency in Hz, a start time offset, an end time offset, and a gain level, all as parameters. It creates an Oscillator node and a Gain node. It sets the oscillator's type and frequency to the supplied values. It sets the gain to the supplied level at `ctx.currentTime + start`, then ramps the gain exponentially down to 0.001 at `ctx.currentTime + end`. It connects the oscillator to the gain node, then the gain node to the audio destination. It calls start on the oscillator at `ctx.currentTime + start` and calls stop at `ctx.currentTime + end + 0.05`, extending the stop time by 50ms beyond the end parameter. The function returns undefined.

### noise

This function receives an AudioContext, a start time offset, a duration in seconds, and a gain level. It calculates a buffer size by multiplying the context's sample rate by the duration parameter. It creates a mono AudioBuffer of that size. It fills the buffer's single channel by iterating over its sample indices and writing random values in the range -1 to 1, scaled by 0.3. It creates a BufferSource, assigns the buffer to it, and creates a Gain node. It sets the gain to the supplied level at `ctx.currentTime + start`, then ramps the gain exponentially down to 0.001 at `ctx.currentTime + start + duration`. It connects the buffer source to the gain node and the gain node to the destination. It calls start on the source at `ctx.currentTime + start` and calls stop at `ctx.currentTime + start + duration + 0.05`. The function returns undefined.

### sndRoundStart

When called with an AudioContext, this function calls osc three times with different frequencies and timings to produce an ascending two-tone bell. It starts a sine wave at 523 Hz (C5) that plays from time 0 to 0.15 with gain 0.25. It starts a sine wave at 659 Hz (E5) that plays from time 0.08 to 0.25 with gain 0.25. It starts a triangle wave at 1047 Hz (C6) that plays from time 0.05 to 0.3 with gain 0.1 as a shimmer effect. The function returns undefined.

### sndTurnSwitch

When called with an AudioContext, this function calls osc twice to produce a quick distinct blip sound. It starts a sine wave at 880 Hz (A5) from time 0 to 0.08 with gain 0.2. It starts a sine wave at 1047 Hz (C6) from time 0.04 to 0.12 with gain 0.15. The function returns undefined.

### sndPointsAwarded

When called with an AudioContext, this function calls osc three times and noise once to produce a metallic cha-ching sound. It creates triangle waves at 1047 Hz (C6) from 0 to 0.12 with gain 0.2, at 1319 Hz (E6) from 0.06 to 0.18 with gain 0.2, and at 1568 Hz (G6) from 0.1 to 0.3 with gain 0.15. It then calls noise with start 0, duration 0.05, and gain 0.15 to add a metallic attack. The function returns undefined.

### sndReferenceDrop

When called with an AudioContext, this function calls osc twice and noise once to produce a deep thud plus high ping sound. It creates a sine wave at 131 Hz (C3) from 0 to 0.2 with gain 0.3 for the thud. It creates a sine wave at 2093 Hz (C7) from 0.1 to 0.35 with gain 0.12 for the ping. It then calls noise with start 0, duration 0.04, and gain 0.2 to add an impact component. The function returns undefined.

### sndChallenge

When called with an AudioContext, this function calls osc three times to produce a warning sound with descending tones. It creates a square wave at 659 Hz (E5) from 0 to 0.12 with gain 0.12. It creates a square wave at 523 Hz (C5) from 0.1 to 0.25 with gain 0.12. It creates a square wave at 440 Hz (A4) from 0.2 to 0.35 with gain 0.1. The function returns undefined.

### sndTimerWarning

When called with an AudioContext, this function calls noise once and osc once to produce a subtle tick sound. It calls noise with start 0, duration 0.03, and gain 0.1. It calls osc with a sine wave at 1000 Hz from 0 to 0.04 with gain 0.08. The function returns undefined.

### sndDebateEnd

When called with an AudioContext, this function calls osc five times to produce an ascending celebration arpeggio. It creates sine waves at 523 Hz (C5) from 0 to 0.2 with gain 0.2, at 659 Hz (E5) from 0.12 to 0.3 with gain 0.2, at 784 Hz (G5) from 0.24 to 0.45 with gain 0.2, and at 1047 Hz (C6) from 0.36 to 0.7 with gain 0.25. It creates a triangle wave at 1047 Hz (C6) from 0.36 to 0.8 with gain 0.1 as a shimmer. The function returns undefined.

### playSound

This function receives a SoundName string parameter. If sfxEnabled returns false, it returns early. It calls getCtx to obtain an AudioContext. If the context is null, it returns early. It looks up the SoundName in the module-level SOUNDS object. If a function is found, it calls that function with the AudioContext. The function returns undefined.

### vibrate

This function receives an optional millisecond parameter (defaulting to 50). If sfxEnabled returns false, it returns early. If the navigator object has a vibrate method, it calls navigator.vibrate with the millisecond value. The function returns undefined.

### introGladiator

When called with an AudioContext, this function synthesizes a triumphant C major fanfare. It creates an array of seven note frequencies and a parallel array of start times. It iterates over the frequencies and calls osc with triangle waves at each frequency, each playing from its start time to start time plus 0.35 seconds with gain 0.22. It calls osc to create a sine wave at 261 Hz (C2 bass root) from 0 to 1.6 with gain 0.12. It calls noise three times: at start 0 with duration 0.06 and gain 0.18, at start 0.5 with duration 0.06 and gain 0.15, and at start 1.1 with duration 0.1 and gain 0.2. The function returns undefined.

### introThunder

When called with an AudioContext, this function synthesizes heavy drums and a power chord. It creates an array of seven hit times. For each hit time, it calls noise with duration 0.15 and gain 0.4 on even indices or 0.2 on odd indices, and calls osc with a sine wave. The sine wave frequency is 55 plus (index mod 3) times 20, played from the hit time to hit time plus 0.18 with gain 0.3. It calls osc to create a sawtooth wave at 110 Hz from 0 to 1.8 with gain 0.08. The function returns undefined.

### introScholar

When called with an AudioContext, this function synthesizes a Bach-like ascending motif in C major. It creates an array of eight melody frequencies and iterates over them, calling osc with sine waves at each frequency. Each wave starts at index times 0.18, plays for 0.28 seconds, and has gain 0.18. It creates a harmony array of four frequencies and iterates over them, calling osc with sine waves at each frequency. Each harmony wave starts at index times 0.36, plays for 0.5 seconds, and has gain 0.08. The function returns undefined.

### introPhantom

When called with an AudioContext, this function synthesizes a dark descending minor pattern. It creates an array of eight descending frequencies and iterates over them, calling osc with sawtooth waves at each frequency. Each wave starts at index times 0.2, plays for 0.35 seconds, and has gain 0.12. It calls osc to create a sine wave at 110 Hz from 0 to 2.0 with gain 0.15. It calls noise with start 0, duration 2.0, and gain 0.04 to add an eerie hiss. The function returns undefined.

### introPhoenix

When called with an AudioContext, this function synthesizes a sweeping gliding rise with shimmer. It creates an Oscillator and Gain node. It sets the oscillator type to sine and sets the frequency to 220 Hz at the current time. It calls exponentialRampToValueAtTime to sweep the frequency up to 1760 Hz over 1.8 seconds. It sets the gain to 0.01 at the current time, ramps it linearly to 0.25 at 0.6 seconds, then ramps it linearly down to 0.01 at 1.9 seconds. It connects the oscillator to the gain and gain to the destination. It calls start at the current time and stop at current time plus 2.0 seconds. It then calls osc three times to create triangle waves at 1047, 1319, and 1568 Hz, each starting at 1.4 plus (index times 0.12), playing for 0.3 seconds, with gain 0.2. It calls noise with start 1.4, duration 0.3, and gain 0.2 to add a burst. The function returns undefined.

### introColossus

When called with an AudioContext, this function synthesizes massive low impacts. It creates an array of four impact times: 0, 0.55, 0.9, and 1.3. For each time, it calls osc twice: a sine wave at 55 Hz from time to time plus 0.4 with gain 0.35, and a sine wave at 82 Hz from time plus 0.02 to time plus 0.35 with gain 0.2. For each time, it also calls noise with start at that time, duration 0.12, and gain 0.35. It calls osc to create a sawtooth wave at 110 Hz from 0 to 1.8 with gain 0.06. The function returns undefined.

### introViper

When called with an AudioContext, this function synthesizes rapid staccato tension with chromatic jabs. It creates an array of eight frequencies in a repeating chromatic pattern starting at 659 Hz. It sets an interval constant to 0.16 seconds. It iterates over the frequencies and calls osc with square waves at each frequency, each starting at index times interval, playing for 0.1 seconds, with gain 0.14. It then iterates six times and calls noise at start 1.4 plus (index times 0.06), duration 0.04, and gain 0.15 to create a tail rattle. The function returns undefined.

### introOracle

When called with an AudioContext, this function synthesizes sustained mystical pads using perfect fifths. It creates two chord arrays, each containing three frequencies. For each chord (at iteration index i), it sets a base time to i times 0.9. For each frequency in the chord, it calls osc with a sine wave starting at base time plus a small offset (0, 0.1, or 0.2 for the three frequencies), ending at base time plus 1.4 minus a corresponding offset (1.4, 1.3, or 1.2), with gains 0.12, 0.1, and 0.08 respectively. It calls noise once with start 0, duration 1.8, and gain 0.03. The function returns undefined.

### introChampion

When called with an AudioContext, this function synthesizes a military march rhythm with a bugle call. It creates an array of seven snare hit times: 0, 0.25, 0.5, 0.75, 1.0, 1.25, and 1.5. For each hit time, it calls noise with duration 0.06 and gain 0.2 on even indices or 0.1 on odd indices. It creates a bugle array of seven frequencies and a parallel array of start times. For each frequency and start time pair, it calls osc with a triangle wave playing from the start time to start time plus 0.28 with gain 0.2. The function returns undefined.

### introGhost

When called with an AudioContext, this function synthesizes sparse eerie pulses. It creates an array of four pulse times: 0, 0.7, 1.2, and 1.6. For each pulse time at index i, it calls osc with a sine wave at 220 plus (i times 30) Hz, starting at pulse time, playing for 0.6 seconds with gain 0.08. For each pulse time at index i, it calls osc with a sine wave at 440 plus (i times 15) Hz, starting at pulse time plus 0.1, playing for 0.4 seconds (ending at pulse time plus 0.5) with gain 0.04. It calls noise with start 0, duration 1.8, and gain 0.025. It calls osc to create a sine wave at 2093 Hz from 1.5 to 1.9 with gain 0.06 as a single high ping at the end. The function returns undefined.

### playIntroMusic

When called with a track ID string and optional custom URL, this function first checks sfxEnabled and returns early if sound is disabled. It pauses and nullifies any currently playing intro audio element referenced by `_introAudioEl`. If the track ID is 'custom' and a custom URL is provided, it creates a new Audio element, sets its volume to 0.7, stores it in `_introAudioEl`, and calls play() on it. If play() fails (due to autoplay blocking), the error is silently caught. The function then returns early. For any other track ID, the function looks up the track ID in the INTRO_SYNTHS object, defaulting to 'gladiator' if not found. It calls getCtx to obtain an AudioContext. If the context is null, it returns early. Otherwise, it calls the synthesizer function with the context. The function returns undefined.

### stopIntroMusic

When called, this function checks whether `_introAudioEl` holds an audio element reference. If it does, it calls pause() on that element and sets the reference to null. The function returns undefined.

## Agent 02

### getCtx

Checks whether the module-level variable `_ctx` (an AudioContext or null) is already initialized. If it is null, attempts to construct a new AudioContext by calling `window.AudioContext` or, as a fallback for older browsers, `window.webkitAudioContext`. If construction throws an exception, logs a warning to the console and returns null; otherwise assigns the constructed context to `_ctx`. If the context's state is 'suspended', calls the `resume()` method on it. Finally, returns `_ctx`, which will be an AudioContext instance or null.

### sfxEnabled

Reads the 'moderator_settings' key from localStorage (defaulting to '{}' if absent) and parses it as JSON. If parsing throws an exception, returns true. Otherwise, returns true unless the parsed object has an `audio_sfx` property that is explicitly false; the property defaults to enabled if missing.

### osc

Creates an oscillator node and a gain node from the provided AudioContext. Sets the oscillator's type (sine, triangle, square, or sawtooth) and frequency to the provided values. Schedules the gain to start at the specified gain value at time `ctx.currentTime + start`, then exponentially ramp to 0.001 gain at time `ctx.currentTime + end`. Connects the oscillator to the gain node, and the gain node to the context's destination. Starts the oscillator at `ctx.currentTime + start` and stops it at `ctx.currentTime + end + 0.05`. Returns nothing.

### noise

Calculates the total number of samples for the specified duration based on the context's sample rate and creates an audio buffer with that many samples in a single channel. Fills the buffer's channel data with random values between -0.3 and 0.3 (white noise). Creates a buffer source and sets its buffer to the created buffer. Creates a gain node, schedules it to start at the specified gain value at time `ctx.currentTime + start`, then exponentially ramp to 0.001 at time `ctx.currentTime + start + duration`. Connects the buffer source to the gain node and the gain node to the destination. Starts the buffer source at `ctx.currentTime + start` and stops it at `ctx.currentTime + start + duration + 0.05`. Returns nothing.

### sndRoundStart

Creates three overlapping oscillators in the provided context: a sine at 523 Hz (C5) from time 0 to 0.15 with gain 0.25, a sine at 659 Hz (E5) from time 0.08 to 0.25 with gain 0.25, and a triangle at 1047 Hz (C6) from time 0.05 to 0.3 with gain 0.1. Each call to `osc` creates, connects, and schedules the oscillators to play. Returns nothing.

### sndTurnSwitch

Creates two overlapping oscillators: a sine at 880 Hz (A5) from time 0 to 0.08 with gain 0.2, and a sine at 1047 Hz (C6) from time 0.04 to 0.12 with gain 0.15. Returns nothing.

### sndPointsAwarded

Creates three triangle-wave oscillators at frequencies 1047 Hz, 1319 Hz, and 1568 Hz with overlapping timings and gains between 0.15 and 0.2, and calls `noise` to add a 0.05-second metallic attack at the beginning with gain 0.15. Returns nothing.

### sndReferenceDrop

Creates two sine-wave oscillators (one at 131 Hz from 0 to 0.2 with gain 0.3, another at 2093 Hz from 0.1 to 0.35 with gain 0.12) and calls `noise` to add a 0.04-second impact sound at the beginning with gain 0.2. Returns nothing.

### sndChallenge

Creates three square-wave oscillators at descending frequencies: 659 Hz from 0 to 0.12 with gain 0.12, 523 Hz from 0.1 to 0.25 with gain 0.12, and 440 Hz from 0.2 to 0.35 with gain 0.1. Returns nothing.

### sndTimerWarning

Calls `noise` to create a 0.03-second noise burst at the beginning with gain 0.1, and calls `osc` to create a sine-wave oscillator at 1000 Hz from 0 to 0.04 with gain 0.08. Returns nothing.

### sndDebateEnd

Creates four sine-wave oscillators at 523 Hz, 659 Hz, 784 Hz, and 1047 Hz with staggered start times and increasing durations (0.2 to 0.7 seconds), all with gain 0.2 to 0.25, plus an additional triangle-wave oscillator at 1047 Hz with the same timing as the last sine oscillator but with gain 0.1. Returns nothing.

### playSound

Reads the `sfxEnabled()` return value; if false, returns early without playing sound. Calls `getCtx()` and returns early if the result is null. Looks up the provided sound name in the `SOUNDS` object, and if found, calls that function with the audio context. Returns nothing.

### vibrate

Reads the `sfxEnabled()` return value; if false, returns early. If `navigator.vibrate` is defined, calls it with the provided millisecond duration (defaulting to 50 if no argument is passed). Returns nothing.

### introGladiator

Creates an array of seven frequencies and corresponding start times, then iterates through them, calling `osc` to create triangle-wave oscillators at each frequency with a duration of 0.35 seconds and gain of 0.22. Also calls `osc` to create a sine oscillator at 261 Hz (the bass root) that lasts the entire 1.6 seconds with gain 0.12. Calls `noise` three times: at time 0 for 0.06 seconds with gain 0.18, at time 0.5 for 0.06 seconds with gain 0.15, and at time 1.1 for 0.1 seconds with gain 0.2. Returns nothing.

### introThunder

Creates an array of seven hit times and iterates through them. At each time, calls `noise` with a duration of 0.15 seconds and alternating gains (0.4 for even indices, 0.2 for odd), and calls `osc` to create a sine oscillator with a frequency that varies based on the index modulo 3 (55, 75, or 95 Hz), starting at the hit time and lasting 0.18 seconds with gain 0.3. Also calls `osc` to create a sawtooth oscillator at 110 Hz lasting 1.8 seconds with gain 0.08. Returns nothing.

### introScholar

Creates an eight-note melody array with frequencies representing a C major scale ascending from 392 Hz to 784 Hz, and iterates through it, calling `osc` to create sine oscillators that start at `i * 0.18` and last 0.28 seconds with gain 0.18. Also creates a four-note harmony array with lower frequencies and iterates through it, calling `osc` to create sine oscillators that start at `i * 0.36` and last 0.5 seconds with gain 0.08. Returns nothing.

### introPhantom

Creates an eight-note descending sequence in A minor (starting at 880 Hz and descending) and iterates through it, calling `osc` to create sawtooth oscillators that start at `i * 0.2` and last 0.35 seconds with gain 0.12. Also calls `osc` to create a sine oscillator at 110 Hz lasting 2.0 seconds with gain 0.15, and calls `noise` for the entire 2.0 seconds with gain 0.04. Returns nothing.

### introPhoenix

Creates a single oscillator and gain node directly from the context without using the `osc` helper. Sets the oscillator to sine type and its frequency to 220 Hz at the current time, then exponentially ramps the frequency to 1760 Hz over 1.8 seconds. Schedules the gain to start at 0.01 at the current time, linearly ramp to 0.25 at 0.6 seconds, then linearly ramp back to 0.01 at 1.9 seconds. Connects the oscillator and gain, starts the oscillator at the current time, and stops it at 2.0 seconds. Additionally, creates a three-note burst by iterating through frequencies [1047, 1319, 1568], calling `osc` to create triangle oscillators that start at `1.4 + i * 0.12` and last 0.3 seconds with gain 0.2. Calls `noise` at time 1.4 for 0.3 seconds with gain 0.2. Returns nothing.

### introColossus

Creates an array of four impact times and iterates through them. At each time, calls `osc` to create a sine oscillator at 55 Hz lasting 0.4 seconds with gain 0.35, calls `osc` to create a sine oscillator at 82 Hz starting 0.02 seconds after the impact time and lasting 0.33 seconds with gain 0.2, and calls `noise` at the impact time for 0.12 seconds with gain 0.35. Also calls `osc` to create a sawtooth oscillator at 110 Hz lasting 1.8 seconds with gain 0.06. Returns nothing.

### introViper

Creates an eight-note chromatic pattern array and iterates through it with an interval of 0.16 seconds, calling `osc` to create square-wave oscillators that start at `i * 0.16` and last 0.1 seconds with gain 0.14. Additionally, loops six times, calling `noise` at times 1.4, 1.46, 1.52, 1.58, 1.64, and 1.7 (increments of 0.06), each for 0.04 seconds with gain 0.15. Returns nothing.

### introOracle

Creates a two-element array of pitch triads, each containing three frequencies. Iterates through them with a stagger time of 0.9 seconds for each triad. For each triad, calls `osc` three times to create sine oscillators at the three frequencies, each starting at the stagger time plus an offset (0, 0.1, or 0.2) and lasting 0.4 to 1.3 seconds with gains between 0.08 and 0.12. Also calls `noise` for the entire 1.8 seconds with gain 0.03. Returns nothing.

### introChampion

Creates an array of seven snare hit times and iterates through them, calling `noise` at each time for 0.06 seconds with alternating gains (0.2 for even indices, 0.1 for odd). Creates a bugle motif array with seven notes in G major and an array of seven corresponding times, then iterates through the frequencies, calling `osc` to create triangle oscillators at the note frequencies that start at the corresponding bugle time and last 0.28 seconds with gain 0.2. Returns nothing.

### introGhost

Creates an array of four time points [0, 0.7, 1.2, 1.6] and iterates through them, calling `osc` twice at each point to create sine oscillators with frequencies varying by index. The first oscillator starts at the time point with frequency `220 + i * 30` and lasts 0.6 seconds with gain 0.08; the second starts 0.1 seconds after the time point with frequency `440 + i * 15` and lasts 0.4 seconds with gain 0.04. Also calls `noise` for the entire 1.8 seconds with gain 0.025, and calls `osc` to create a single sine oscillator at 2093 Hz from 1.5 to 1.9 seconds with gain 0.06. Returns nothing.

### playIntroMusic

Reads the `sfxEnabled()` return value; if false, returns early. If `_introAudioEl` (the module-level HTMLAudioElement reference) is not null, pauses it and sets it to null. If the trackId is 'custom' and a customUrl is provided, creates a new Audio element with the URL, sets its volume to 0.7, stores it in `_introAudioEl`, and calls its `play()` method, catching any exception silently (if autoplay is blocked, the exception is ignored). If the trackId is not 'custom' or no URL is provided, looks up the trackId in the `INTRO_SYNTHS` object (defaulting to 'gladiator' if not found), calls `getCtx()`, and if the context is not null, calls the corresponding synthesizer function with the context. Returns nothing.

### stopIntroMusic

Checks if `_introAudioEl` is not null; if so, pauses it and sets it to null. Returns nothing.

## Agent 03

### getCtx

This function retrieves or initializes a singleton `AudioContext` instance stored in the module-level `_ctx` variable. If `_ctx` is null, the function attempts to create a new `AudioContext` (or `webkitAudioContext` as a fallback for older browsers) and assigns it to `_ctx`. If context creation throws an exception, the function logs a warning to the console and returns null. If `_ctx` already exists and its state is `'suspended'`, the function calls `_ctx.resume()` to wake it up, since browsers require a user gesture to start audio. The function always returns either the `AudioContext` instance or null.

### sfxEnabled

This function reads the `moderator_settings` key from localStorage and attempts to parse it as JSON; if the key does not exist, it treats the raw value as the empty object string `'{}'`. It then accesses the `audio_sfx` property from the parsed settings object. If `audio_sfx` is explicitly set to false, the function returns false; otherwise it returns true (the default). If JSON parsing throws an exception during the try block, the catch block swallows the error and the function returns true.

### osc

This function synthesizes a single oscillator sound using Web Audio API. It reads the `ctx` parameter (the AudioContext), the oscillator `type` (e.g. 'sine', 'triangle', 'square', 'sawtooth'), a `freq` value for the frequency in Hz, `start` and `end` times in seconds relative to the current audio time, and a `gain` value for volume. The function creates an oscillator node and a gain node, sets the oscillator type and frequency, schedules the gain to start at the given value and exponentially decay to 0.001 by the end time, connects the oscillator to the gain and the gain to the audio destination, and then starts the oscillator at the start time and stops it at the end time plus 50 milliseconds.

### noise

This function synthesizes white noise by creating an audio buffer with a duration matching the `duration` parameter. The function calculates the buffer size in samples based on the context's sample rate, allocates a mono buffer, fills the buffer channel with random values scaled to the range -0.3 to 0.3, and then creates a buffer source to play back that buffer. A gain node is connected to the source and scheduled to start at the given value and exponentially decay to 0.001 over the duration. The noise is started at the `start` time and stopped at the start time plus duration plus 50 milliseconds.

### sndRoundStart

This function plays an ascending two-tone bell sound by calling `osc` three times with different frequencies and timings. The first oscillator plays a sine wave at C5 (523 Hz) starting immediately for 0.15 seconds with 0.25 gain. The second oscillator plays a sine wave at E5 (659 Hz) starting after 0.08 seconds for 0.17 seconds with the same gain. The third oscillator plays a triangle wave at C6 (1047 Hz) starting after 0.05 seconds for 0.25 seconds with lower gain of 0.1. All calls pass the `ctx` parameter to `osc`.

### sndTurnSwitch

This function plays a quick blip sound by calling `osc` twice. The first oscillator plays a sine wave at A5 (880 Hz) starting immediately for 0.08 seconds with 0.2 gain. The second oscillator plays a sine wave at C6 (1047 Hz) starting after 0.04 seconds for 0.08 seconds with 0.15 gain.

### sndPointsAwarded

This function plays a metallic cha-ching sound by calling `osc` three times for the melodic part, followed by one call to `noise`. The oscillators are triangle waves at C6 (1047 Hz), E6 (1319 Hz), and G6 (1568 Hz), with staggered start times from 0 to 0.1 seconds and durations ranging from 0.12 to 0.2 seconds. A brief noise burst at the start provides the metallic attack.

### sndReferenceDrop

This function plays a deep thud followed by a high ping by calling `osc` twice and `noise` once. The first oscillator is a sine wave at C3 (131 Hz) starting immediately for 0.2 seconds with 0.3 gain. The second oscillator is a sine wave at C7 (2093 Hz) starting after 0.1 seconds for 0.25 seconds with 0.12 gain. A brief noise burst starting immediately lasts 0.04 seconds with 0.2 gain to provide an impact sound.

### sndChallenge

This function plays a warning sound using descending square wave tones by calling `osc` three times. The first oscillator plays at E5 (659 Hz) for 0.12 seconds starting immediately with 0.12 gain. The second plays at C5 (523 Hz) starting at 0.1 seconds for 0.15 seconds with the same gain. The third plays at A4 (440 Hz) starting at 0.2 seconds for 0.15 seconds with 0.1 gain.

### sndTimerWarning

This function plays a subtle tick sound by calling `noise` once and `osc` once. The noise burst starts immediately and lasts 0.03 seconds with 0.1 gain. The oscillator is a sine wave at 1000 Hz starting immediately for 0.04 seconds with 0.08 gain.

### sndDebateEnd

This function plays an ascending celebration arpeggio by calling `osc` five times. Four sine waves play at C5 (523 Hz), E5 (659 Hz), G5 (784 Hz), and C6 (1047 Hz) with staggered start times from 0 to 0.36 seconds and durations from 0.2 to 0.34 seconds. A final triangle wave at C6 (1047 Hz) adds a shimmer, starting at 0.36 seconds and lasting 0.44 seconds with 0.1 gain.

### playSound

This function reads the `name` parameter and plays the corresponding sound effect if sound effects are enabled. The function first calls `sfxEnabled()` and returns early if sound effects are disabled. It then calls `getCtx()` to retrieve the AudioContext, returning early if the context is null. The function looks up the sound name in the module-level `SOUNDS` object and, if a matching synthesizer function is found, calls that function with the context.

### vibrate

This function triggers haptic feedback by reading the `ms` parameter (defaulting to 50 milliseconds if not provided) and checking whether sound effects are enabled by calling `sfxEnabled()`. If sound effects are disabled, the function returns early. If the `navigator.vibrate` API is available, the function calls `navigator.vibrate(ms)` to trigger the device vibration; if the API is not available, no action is taken.

### introGladiator

This function synthesizes a triumphant fanfare in C major by calling `osc` seven times for the melodic notes, once for the bass root, and three times for noise bursts. The notes are triangle waves at frequencies [523, 659, 784, 1047, 784, 1047, 1319] Hz with staggered start times [0, 0.15, 0.3, 0.5, 0.75, 0.9, 1.1] seconds, each lasting 0.35 seconds with 0.22 gain. A sine wave bass plays at C (261 Hz) for the entire 1.6 seconds at 0.12 gain. Three noise bursts add attack and texture at times 0, 0.5, and 1.1 seconds with gains of 0.18, 0.15, and 0.2.

### introThunder

This function synthesizes heavy drums plus a power chord by iterating over an array of seven hit times [0, 0.4, 0.6, 0.8, 1.0, 1.2, 1.5] seconds. For each hit, the function calls `noise` with gain 0.4 on even indices and 0.2 on odd indices, and calls `osc` with a sine wave at a frequency that varies based on the index (55, 75, or 95 Hz), each lasting 0.18 seconds with 0.3 gain. A sawtooth wave bass plays at 110 Hz for the entire 1.8 seconds at 0.08 gain.

### introScholar

This function synthesizes a Bach-like ascending motif in C major by first calling `osc` eight times for the melody: sine waves at frequencies [392, 440, 494, 523, 587, 659, 698, 784] Hz with start times [0, 0.18, 0.36, 0.54, 0.72, 0.9, 1.08, 1.26] seconds, each lasting 0.28 seconds with 0.18 gain. The function then calls `osc` four times for harmony: sine waves at frequencies [261, 330, 392, 440] Hz with start times [0, 0.36, 0.72, 1.08] seconds, each lasting 0.5 seconds with 0.08 gain.

### introPhantom

This function synthesizes a dark descending minor scale in A minor by calling `osc` eight times for the melodic notes as sawtooth waves at frequencies [880, 831, 784, 740, 698, 659, 587, 523] Hz with staggered start times from 0 to 1.4 seconds, each lasting 0.35 seconds with 0.12 gain. A sine wave bass plays at 110 Hz for the entire 2.0 seconds with 0.15 gain. A noise burst for 2.0 seconds starting at time 0 with 0.04 gain adds an eerie hiss.

### introPhoenix

This function synthesizes a sweeping rise by directly manipulating oscillator and gain nodes. The function creates an oscillator and gain node, sets the oscillator type to sine, and schedules the frequency to exponentially ramp from 220 Hz at the start to 1760 Hz over 1.8 seconds. The gain is scheduled to start at 0.01, linearly ramp to 0.25 at 0.6 seconds, then linearly decay to 0.01 at 1.9 seconds. The oscillator is started immediately and stopped at 2.0 seconds. Afterward, the function calls `osc` three times to add burst notes at the top (triangle waves at 1047, 1319, and 1568 Hz), each starting at staggered times from 1.4 to 1.64 seconds with 0.3-second durations and 0.2 gain. A noise burst at 1.4 seconds lasting 0.3 seconds with 0.2 gain completes the effect.

### introColossus

This function synthesizes massive low impacts by iterating over an array of four impact times [0, 0.55, 0.9, 1.3] seconds. For each impact, the function calls `osc` twice with sine waves at 55 Hz and 82 Hz, both lasting 0.4 and 0.33 seconds respectively with gains of 0.35 and 0.2, and calls `noise` with 0.12-second duration and 0.35 gain. A sawtooth wave bass plays at 110 Hz for 1.8 seconds at 0.06 gain.

### introViper

This function synthesizes rapid staccato tension using a chromatic pattern by iterating over an array of eight frequencies [659, 622, 659, 587, 659, 554, 659, 523] Hz with an interval of 0.16 seconds between each. For each frequency, the function calls `osc` with a square wave, starting at `i * interval` seconds and lasting 0.1 seconds with 0.14 gain. After the main pattern, the function iterates six times to call `noise`, starting at 1.4 seconds plus `i * 0.06` seconds, each lasting 0.04 seconds with 0.15 gain to create a tail rattle.

### introOracle

This function synthesizes sustained mystical pads by iterating over two arrays of note triads: [[196, 293, 392], [220, 330, 440]]. For the first triad starting at time 0, the function calls `osc` three times with sine waves at the three frequencies, starting at times [0, 0.1, 0.2] seconds and lasting [1.4, 1.3, 1.2] seconds respectively with gains of [0.12, 0.1, 0.08]. The second triad begins at 0.9 seconds with the same relative timing and durations. A noise burst at time 0 lasts 1.8 seconds with 0.03 gain.

### introChampion

This function synthesizes a military march rhythm plus bugle call by iterating over an array of seven snare hit times [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5] seconds. For each hit, the function calls `noise` with 0.06-second duration and alternating gains of 0.2 on even indices and 0.1 on odd indices. The function then iterates over a bugle motif array with seven frequencies [392, 523, 659, 784, 659, 784, 1047] Hz and corresponding start times [0.1, 0.3, 0.5, 0.7, 1.0, 1.2, 1.5] seconds, calling `osc` with triangle waves, each lasting 0.28 seconds with 0.2 gain.

### introGhost

This function synthesizes sparse eerie pulses by iterating four times over an array of pulse times [0, 0.7, 1.2, 1.6] seconds. For each pulse at index `i`, the function calls `osc` twice: once with a sine wave at `220 + i * 30` Hz starting at the pulse time and lasting 0.6 seconds with 0.08 gain, and once with a sine wave at `440 + i * 15` Hz starting 0.1 seconds later, lasting 0.4 seconds, with 0.04 gain. A noise burst at time 0 lasts 1.8 seconds with 0.025 gain. Finally, the function calls `osc` once more with a sine wave at 2093 Hz starting at 1.5 seconds and lasting 0.4 seconds with 0.06 gain to add a single high ping at the end.

### playIntroMusic

This function reads the `trackId` and optional `customUrl` parameters. If sound effects are not enabled, the function returns early. If a custom audio element is currently stored in the module-level `_introAudioEl`, the function pauses it and nullifies the reference. If `trackId` is `'custom'` and `customUrl` is provided, the function creates a new `HTMLAudioElement` with the custom URL, sets its volume to 0.7, stores it in `_introAudioEl`, calls `play()` and catches any autoplay-blocked errors silently, then returns. Otherwise, the function looks up the `trackId` in the `INTRO_SYNTHS` object, defaulting to the `'gladiator'` synthesizer if no match is found. It then retrieves the AudioContext via `getCtx()` and returns early if the context is null. Finally, it calls the retrieved synthesizer function with the context.

### stopIntroMusic

This function stops custom intro audio by checking if `_introAudioEl` (the module-level reference to a currently-playing custom audio element) is not null. If it is not null, the function pauses the element and sets `_introAudioEl` to null; otherwise no action is taken.

## Agent 04

### getCtx

Reads the module-level state variable `_ctx`. If `_ctx` is null, attempts to construct a new AudioContext using either the standard `window.AudioContext` or the webkit-prefixed fallback `window.webkitAudioContext`. If construction throws an error, logs a warning to console and returns null, leaving `_ctx` null. If construction succeeds, assigns the new context to `_ctx`. After construction (or if `_ctx` already exists), checks if the context state is 'suspended' and calls `resume()` on it if so. Returns the AudioContext (which may be null if construction failed).

### sfxEnabled

Attempts to parse the `moderator_settings` item from localStorage as JSON, defaulting to an empty object if the item does not exist. Returns the value of the `audio_sfx` property from the parsed settings, with the interpretation that missing or undefined values are treated as true (returns false only if `audio_sfx` is explicitly set to false). If JSON parsing throws an error, the catch block returns true, making sound effects enabled by default on parse failure.

### osc

Receives an AudioContext, an OscillatorType, a frequency, start and end times (in seconds), and a gain value. Creates an oscillator node with the specified type and frequency. Creates a gain node and sets its gain to the specified value at the current time plus the start offset. Ramps the gain exponentially from that value down to 0.001 at the current time plus the end offset. Connects the oscillator to the gain node and the gain node to the context destination. Starts the oscillator at the current time plus the start offset and stops it at the current time plus the end offset plus 0.05 seconds. Does not return a value.

### noise

Receives an AudioContext, a start time, a duration, and a gain value. Calculates a buffer size based on the context's sample rate and the duration. Creates a mono audio buffer with that size. Fills the buffer's single channel with random values scaled to approximately -0.3 to 0.3. Creates a buffer source and assigns the generated buffer to it. Creates a gain node, sets its gain to the specified value at the current time plus the start offset, and ramps it exponentially down to 0.001 at the current time plus the start offset plus the duration. Connects the buffer source to the gain node and the gain node to the context destination. Starts the buffer source at the current time plus the start offset and stops it at the current time plus the start offset plus the duration plus 0.05 seconds. Does not return a value.

### sndRoundStart

Receives an AudioContext. Calls osc three times to create an ascending two-tone bell: a sine wave at 523 Hz (C5) starting at 0 and ending at 0.15 seconds with 0.25 gain; a sine wave at 659 Hz (E5) starting at 0.08 and ending at 0.25 seconds with 0.25 gain; and a triangle wave at 1047 Hz (C6) starting at 0.05 and ending at 0.3 seconds with 0.1 gain. Does not return a value.

### sndTurnSwitch

Receives an AudioContext. Calls osc twice to create a quick distinct blip: a sine wave at 880 Hz (A5) starting at 0 and ending at 0.08 seconds with 0.2 gain, and a sine wave at 1047 Hz (C6) starting at 0.04 and ending at 0.12 seconds with 0.15 gain. Does not return a value.

### sndPointsAwarded

Receives an AudioContext. Calls osc three times to create metallic tones: a triangle wave at 1047 Hz (C6) starting at 0 and ending at 0.12 seconds with 0.2 gain; a triangle wave at 1319 Hz (E6) starting at 0.06 and ending at 0.18 seconds with 0.2 gain; a triangle wave at 1568 Hz (G6) starting at 0.1 and ending at 0.3 seconds with 0.15 gain. Then calls noise to add a metallic attack lasting 0.05 seconds starting at 0 with 0.15 gain. Does not return a value.

### sndReferenceDrop

Receives an AudioContext. Calls osc twice: a sine wave at 131 Hz (C3) starting at 0 and ending at 0.2 seconds with 0.3 gain for a deep thud, and a sine wave at 2093 Hz (C7) starting at 0.1 and ending at 0.35 seconds with 0.12 gain for a high ping. Calls noise to add impact lasting 0.04 seconds starting at 0 with 0.2 gain. Does not return a value.

### sndChallenge

Receives an AudioContext. Calls osc three times to create descending warning tones using square waves: at 659 Hz (E5) starting at 0 and ending at 0.12 seconds with 0.12 gain; at 523 Hz (C5) starting at 0.1 and ending at 0.25 seconds with 0.12 gain; at 440 Hz (A4) starting at 0.2 and ending at 0.35 seconds with 0.1 gain. Does not return a value.

### sndTimerWarning

Receives an AudioContext. Calls noise to produce 0.03 seconds of noise starting at 0 with 0.1 gain. Calls osc to produce a sine wave at 1000 Hz starting at 0 and ending at 0.04 seconds with 0.08 gain. Does not return a value.

### sndDebateEnd

Receives an AudioContext. Calls osc four times for ascending tones using sine waves: at 523 Hz (C5) from 0 to 0.2 seconds with 0.2 gain; at 659 Hz (E5) from 0.12 to 0.3 seconds with 0.2 gain; at 784 Hz (G5) from 0.24 to 0.45 seconds with 0.2 gain; at 1047 Hz (C6) from 0.36 to 0.7 seconds with 0.25 gain. Then calls osc once more with a triangle wave at 1047 Hz from 0.36 to 0.8 seconds with 0.1 gain for shimmer. Does not return a value.

### playSound

Receives a SoundName string. Calls sfxEnabled and returns early (without playing anything) if sounds are disabled. Calls getCtx to obtain an AudioContext and returns early if null. Looks up the sound name in the SOUNDS object to get the corresponding function. If a matching function is found, calls it with the AudioContext. Does not return a value.

### vibrate

Receives an optional duration parameter in milliseconds (defaulting to 50). Calls sfxEnabled and returns early if sounds are disabled. Checks if navigator.vibrate exists and calls it with the duration if available. Does not return a value.

### introGladiator

Receives an AudioContext. Defines an array of seven note frequencies in C major and a corresponding array of start times. Iterates over the notes, calling osc for each with a triangle wave, the note's frequency, the start time, the start time plus 0.35 seconds for the end time, and 0.22 gain. Calls osc separately with a sine wave at 261 Hz (bass root) from 0 to 1.6 seconds with 0.12 gain. Calls noise three times: 0.06 seconds at 0 with 0.18 gain, 0.06 seconds at 0.5 with 0.15 gain, and 0.1 seconds at 1.1 with 0.2 gain. Does not return a value.

### introThunder

Receives an AudioContext. Defines an array of seven hit times. Iterates over these times with an index. For each hit, calls noise with a duration of 0.15 seconds and gain alternating between 0.4 and 0.2 based on whether the index is even or odd. For each hit, also calls osc with a sine wave at a frequency of 55 plus (index modulo 3) times 20 Hz, from the hit time to hit time plus 0.18 seconds, with 0.3 gain. Calls osc separately with a sawtooth wave at 110 Hz from 0 to 1.8 seconds with 0.08 gain. Does not return a value.

### introScholar

Receives an AudioContext. Defines an array of eight ascending frequencies and iterates over them, calling osc for each with a sine wave, the frequency, the start time of index times 0.18 seconds, the end time of index times 0.18 plus 0.28 seconds, and 0.18 gain. Defines a four-note harmony array and iterates over it, calling osc for each with a sine wave, the frequency, the start time of index times 0.36 seconds, the end time of index times 0.36 plus 0.5 seconds, and 0.08 gain. Does not return a value.

### introPhantom

Receives an AudioContext. Defines an array of eight descending note frequencies in A minor. Iterates over the notes, calling osc for each with a sawtooth wave, the frequency, the start time of index times 0.2 seconds, the end time of index times 0.2 plus 0.35 seconds, and 0.12 gain. Calls osc separately with a sine wave at 110 Hz from 0 to 2.0 seconds with 0.15 gain. Calls noise with a duration of 2.0 seconds starting at 0 with 0.04 gain for eerie hiss. Does not return a value.

### introPhoenix

Receives an AudioContext. Creates a gain node and an oscillator node. Sets the oscillator to sine type. Sets its initial frequency to 220 Hz at the current time. Ramps the frequency exponentially up to 1760 Hz at the current time plus 1.8 seconds. Sets the gain to 0.01 at the current time, ramps it linearly up to 0.25 at the current time plus 0.6 seconds, then ramps it linearly back down to 0.01 at the current time plus 1.9 seconds. Connects the oscillator to the gain and the gain to the context destination. Starts the oscillator at the current time and stops it at the current time plus 2.0 seconds. Defines an array of three burst note frequencies and iterates over them, calling osc for each with a triangle wave, the frequency, the start time of 1.4 plus index times 0.12 seconds, the end time of 1.4 plus index times 0.12 plus 0.3 seconds, and 0.2 gain. Calls noise with a duration of 0.3 seconds starting at 1.4 with 0.2 gain. Does not return a value.

### introColossus

Receives an AudioContext. Defines an array of four impact times. Iterates over the times. For each impact, calls osc twice: first with a sine wave at 55 Hz from the impact time to impact time plus 0.4 seconds with 0.35 gain, then with a sine wave at 82 Hz from the impact time plus 0.02 to impact time plus 0.35 seconds with 0.2 gain. For each impact, also calls noise with duration 0.12 seconds at the impact time with 0.35 gain. Calls osc separately with a sawtooth wave at 110 Hz from 0 to 1.8 seconds with 0.06 gain. Does not return a value.

### introViper

Receives an AudioContext. Defines an array of eight frequencies in a chromatic pattern and a fixed interval of 0.16 seconds. Iterates over the frequencies, calling osc for each with a square wave, the frequency, the start time of index times interval, the end time of index times interval plus 0.1 seconds, and 0.14 gain. Executes a loop from 0 to 5 (inclusive), calling noise for each iteration with duration 0.04 seconds at time 1.4 plus index times 0.06 seconds with 0.15 gain. Does not return a value.

### introOracle

Receives an AudioContext. Defines a nested array containing two triplets of frequencies representing perfect 5ths. Iterates over the triplets with an outer index. For each triplet, defines a base time as index times 0.9 seconds. For each of the three frequencies in the triplet (a, b, c), calls osc with a sine wave. The first frequency is called from the base time to base time plus 1.4 seconds with 0.12 gain; the second from base time plus 0.1 to base time plus 1.3 seconds with 0.1 gain; the third from base time plus 0.2 to base time plus 1.2 seconds with 0.08 gain. Calls noise once with duration 1.8 seconds starting at 0 with 0.03 gain. Does not return a value.

### introChampion

Receives an AudioContext. Defines an array of seven snare hit times. Iterates over these times with an index, calling noise for each with duration 0.06 seconds at the specified time and gain alternating between 0.2 and 0.1 based on whether the index is even or odd. Defines an array of seven bugle note frequencies in G major and a corresponding array of start times. Iterates over the bugle frequencies with an index, calling osc for each with a triangle wave, the frequency, the start time from the bTimes array, the end time of start time plus 0.28 seconds, and 0.2 gain. Does not return a value.

### introGhost

Receives an AudioContext. Defines an array of four time points. Iterates over these times with an index. For each time, calls osc twice: first with a sine wave at frequency 220 plus index times 30 Hz, from the time to time plus 0.6 seconds with 0.08 gain; second with a sine wave at frequency 440 plus index times 15 Hz, from the time plus 0.1 to time plus 0.5 seconds with 0.04 gain. Calls noise once with duration 1.8 seconds starting at 0 with 0.025 gain. Calls osc separately with a sine wave at 2093 Hz from 1.5 to 1.9 seconds with 0.06 gain for a single high ping at the end. Does not return a value.

### playIntroMusic

Receives a trackId string and an optional customUrl string. Calls sfxEnabled and returns early if sounds are disabled. If `_introAudioEl` (the module-level custom audio element) is not null, pauses it and sets it to null. If trackId is 'custom' and customUrl is provided, creates a new Audio element with the customUrl, sets its volume to 0.7, assigns it to `_introAudioEl`, and calls play() on it. The play() call is not awaited; if it throws an error, the error is caught and silently ignored. Returns early after this. For any other trackId, looks up the corresponding synthesizer function in INTRO_SYNTHS, defaulting to the 'gladiator' synthesizer if the trackId is not found. Calls getCtx to obtain an AudioContext and returns early if null. Calls the synthesizer function with the AudioContext. Does not return a value.

### stopIntroMusic

Checks if `_introAudioEl` (the module-level custom audio element) is not null. If it is not null, pauses the audio element and sets `_introAudioEl` to null. Does not return a value.

## Agent 05

### getCtx

When called, this function reads the module-level `_ctx` variable. If `_ctx` is null, it attempts to create a new AudioContext by calling either `window.AudioContext` or `window.webkitAudioContext`, wrapping the construction in a try-catch block. If the creation fails, the catch block logs a warning to the console and returns null. If an AudioContext was successfully created or already existed, the function checks whether its state is 'suspended'. If suspended, it calls the context's `resume()` method. The function then returns the AudioContext or null, writing back to `_ctx` only if a new context was successfully created.

### sfxEnabled

This function reads the 'moderator_settings' item from localStorage, with '{}' as the fallback if the item does not exist. It then parses the retrieved string as JSON inside a try-catch block. If parsing succeeds, the function reads the `audio_sfx` property from the parsed object and returns false only if that property is explicitly set to false; all other values (undefined, true, or any truthy value) cause the function to return true. If parsing fails, the catch block returns true.

### osc

This function takes an AudioContext and parameters for oscillator type, frequency, start time offset, end time offset, and gain amount. It creates an Oscillator and a Gain node from the context. The oscillator is configured with the given type and frequency. The gain node's gain is set to the provided gain value at the start time (relative to the context's current time), then exponentially ramped down to 0.001 at the end time. The oscillator connects to the gain node, which connects to the context's destination. The oscillator starts at the start time and stops at the end time plus 0.05 seconds. No return value is produced.

### noise

This function takes an AudioContext, a start time offset, a duration, and a gain amount. It calculates a buffer size based on the context's sample rate and the duration. It creates a mono buffer and fills its channel data with random values between -0.3 and 0.3. A buffer source is created and its buffer is set to the generated noise buffer. A gain node is created, configured to hold the provided gain at the start time, then exponentially ramp to 0.001 over the duration. The source connects to the gain, which connects to the destination. The source starts at the start time and stops at the start time plus duration plus 0.05 seconds. No return value is produced.

### sndRoundStart

This function takes an AudioContext. It calls `osc` three times to layer three oscillators: a sine wave at 523 Hz (C5) starting at time 0 and ending at 0.15 with gain 0.25, a sine wave at 659 Hz (E5) starting at 0.08 and ending at 0.25 with gain 0.25, and a triangle wave at 1047 Hz (C6) starting at 0.05 and ending at 0.3 with gain 0.1. No return value is produced.

### sndTurnSwitch

This function takes an AudioContext. It calls `osc` twice: a sine wave at 880 Hz (A5) starting at time 0 and ending at 0.08 with gain 0.2, and a sine wave at 1047 Hz (C6) starting at 0.04 and ending at 0.12 with gain 0.15. No return value is produced.

### sndPointsAwarded

This function takes an AudioContext. It calls `osc` three times to create triangle waves at 1047 Hz (C6) from 0 to 0.12 with gain 0.2, 1319 Hz (E6) from 0.06 to 0.18 with gain 0.2, and 1568 Hz (G6) from 0.1 to 0.3 with gain 0.15. It then calls `noise` once with start time 0, duration 0.05, and gain 0.15 to add a metallic attack. No return value is produced.

### sndReferenceDrop

This function takes an AudioContext. It calls `osc` twice: a sine wave at 131 Hz (C3) from 0 to 0.2 with gain 0.3, and a sine wave at 2093 Hz (C7) from 0.1 to 0.35 with gain 0.12. It then calls `noise` with start time 0, duration 0.04, and gain 0.2 to add an impact sound. No return value is produced.

### sndChallenge

This function takes an AudioContext. It calls `osc` three times with square waves: at 659 Hz (E5) from 0 to 0.12 with gain 0.12, at 523 Hz (C5) from 0.1 to 0.25 with gain 0.12, and at 440 Hz (A4) from 0.2 to 0.35 with gain 0.1. No return value is produced.

### sndTimerWarning

This function takes an AudioContext. It calls `noise` once with start time 0, duration 0.03, and gain 0.1. It then calls `osc` once with a sine wave at 1000 Hz from 0 to 0.04 with gain 0.08. No return value is produced.

### sndDebateEnd

This function takes an AudioContext. It calls `osc` five times: sine waves at 523 Hz (C5) from 0 to 0.2, 659 Hz (E5) from 0.12 to 0.3, 784 Hz (G5) from 0.24 to 0.45, and 1047 Hz (C6) from 0.36 to 0.7 with gain 0.25 for each, followed by a triangle wave at 1047 Hz (C6) from 0.36 to 0.8 with gain 0.1 to create a shimmer effect. No return value is produced.

### playSound

This function takes a sound name string and returns void. It first checks whether sounds are enabled by calling `sfxEnabled()`. If sounds are not enabled, the function returns early without further action. It then calls `getCtx()` to obtain an AudioContext. If the context is null, the function returns early. The function then retrieves the sound synthesis function from the `SOUNDS` object using the sound name as the key. If a matching function is found, it is called with the AudioContext as an argument.

### vibrate

This function takes an optional millisecond duration parameter, defaulting to 50 if not provided, and returns void. It first checks whether sounds are enabled by calling `sfxEnabled()`. If sounds are not enabled, the function returns early. It then checks whether `navigator.vibrate` exists on the navigator object. If it does, the function calls `navigator.vibrate()` with the duration parameter.

### introGladiator

This function takes an AudioContext. It defines an array of seven frequencies (in C major: 523, 659, 784, 1047, 784, 1047, 1319) and corresponding start times. It iterates through the frequencies and times, calling `osc` for each with type 'triangle', the specific frequency, start time, end time (start time plus 0.35), and gain 0.22. It then calls `osc` once with a sine wave at 261 Hz (bass root) from 0 to 1.6 with gain 0.12. It calls `noise` three times at start times 0, 0.5, and 1.1 with durations and gains of (0.06, 0.18), (0.06, 0.15), and (0.1, 0.2) respectively. No return value is produced.

### introThunder

This function takes an AudioContext. It defines an array of seven hit times and iterates through them. For each iteration, it calls `noise` with the hit time, duration 0.15, and gain that alternates between 0.4 (even indices) and 0.2 (odd indices). For each iteration, it also calls `osc` with a sine wave at a frequency of 55 plus (i modulo 3) times 20, starting at the hit time, ending at the hit time plus 0.18, with gain 0.3. After the loop, it calls `osc` once with a sawtooth wave at 110 Hz from 0 to 1.8 with gain 0.08. No return value is produced.

### introScholar

This function takes an AudioContext. It defines a melody array of eight frequencies in ascending order (392, 440, 494, 523, 587, 659, 698, 784) and iterates through them, calling `osc` for each with type 'sine', the specific frequency, start time (i times 0.18), end time (start time plus 0.28), and gain 0.18. It then defines a harmony array of four frequencies (261, 330, 392, 440) and iterates through them, calling `osc` for each with type 'sine', the frequency, start time (i times 0.36), end time (start time plus 0.5), and gain 0.08. No return value is produced.

### introPhantom

This function takes an AudioContext. It defines a notes array of eight descending frequencies in A minor (880, 831, 784, 740, 698, 659, 587, 523) and iterates through them, calling `osc` for each with type 'sawtooth', the specific frequency, start time (i times 0.2), end time (start time plus 0.35), and gain 0.12. It then calls `osc` once with a sine wave at 110 Hz from 0 to 2.0 with gain 0.15. It calls `noise` once with start time 0, duration 2.0, and gain 0.04 to create an eerie hiss effect. No return value is produced.

### introPhoenix

This function takes an AudioContext. It creates a gain node and an oscillator node directly from the context (rather than using the `osc` helper). The oscillator is set to sine type. Its frequency is set to 220 Hz at the current time and then exponentially ramped to 1760 Hz over 1.8 seconds. The gain node is set to 0.01 at the current time, linearly ramped to 0.25 at 0.6 seconds, then linearly ramped to 0.01 at 1.9 seconds. The oscillator connects to the gain node, which connects to the destination. The oscillator starts at the current time and stops at the current time plus 2.0 seconds. After setting up the glide, it iterates through three frequencies (1047, 1319, 1568) and calls `osc` for each with type 'triangle', starting at 1.4 plus (i times 0.12), ending at the start time plus 0.3, and gain 0.2. It calls `noise` once with start time 1.4, duration 0.3, and gain 0.2. No return value is produced.

### introColossus

This function takes an AudioContext. It defines an impacts array of four start times (0, 0.55, 0.9, 1.3) and iterates through them. For each impact time, it calls `osc` with a sine wave at 55 Hz starting at the impact time and ending at impact time plus 0.4 with gain 0.35, then calls `osc` with a sine wave at 82 Hz starting at impact time plus 0.02 and ending at impact time plus 0.35 with gain 0.2, then calls `noise` with the impact time, duration 0.12, and gain 0.35. After the loop, it calls `osc` once with a sawtooth wave at 110 Hz from 0 to 1.8 with gain 0.06. No return value is produced.

### introViper

This function takes an AudioContext. It defines a pattern array of eight frequencies in a chromatic tension motif (659, 622, 659, 587, 659, 554, 659, 523) and sets an interval constant to 0.16. It iterates through the pattern, calling `osc` for each with type 'square', the specific frequency, start time (i times interval), end time (start time plus 0.1), and gain 0.14. After the loop, it executes a for loop from i = 0 to i < 6, calling `noise` for each with start time (1.4 plus i times 0.06), duration 0.04, and gain 0.15 to create a tail rattle effect. No return value is produced.

### introOracle

This function takes an AudioContext. It defines an array containing two subarrays of frequencies representing perfect 5th intervals ([[196, 293, 392], [220, 330, 440]]). It iterates through the subarrays (with index i), setting a start time t to i times 0.9. For each subarray, it calls `osc` three times with type 'sine', one for each frequency in the subarray, starting at t plus (0, 0.1, or 0.2) respectively and ending at t plus (1.4, 1.3, or 1.2) with gains 0.12, 0.1, and 0.08 respectively. After iterating through the subarrays, it calls `noise` once with start time 0, duration 1.8, and gain 0.03. No return value is produced.

### introChampion

This function takes an AudioContext. It defines a snare array of seven start times (0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5) and iterates through them, calling `noise` for each with the snare time, duration 0.06, and gain that alternates between 0.2 (even indices) and 0.1 (odd indices). It then defines a bugle array of seven G major frequencies (392, 523, 659, 784, 659, 784, 1047) and a bTimes array of seven start times (0.1, 0.3, 0.5, 0.7, 1.0, 1.2, 1.5). It iterates through the bugle frequencies, calling `osc` for each with type 'triangle', the specific frequency, start time from bTimes, end time (start time plus 0.28), and gain 0.2. No return value is produced.

### introGhost

This function takes an AudioContext. It defines an array of four start times (0, 0.7, 1.2, 1.6) and iterates through them (with index i). For each iteration, it calls `osc` twice: first with a sine wave at frequency (220 plus i times 30), starting at time t, ending at t plus 0.6, with gain 0.08, then with a sine wave at frequency (440 plus i times 15), starting at t plus 0.1, ending at t plus 0.5, with gain 0.04. After the loop, it calls `noise` once with start time 0, duration 1.8, and gain 0.025 to create sparse eerie pulses. Finally, it calls `osc` once with a sine wave at 2093 Hz from 1.5 to 1.9 with gain 0.06 for a high ping at the end. No return value is produced.

### playIntroMusic

This function takes a track ID string and an optional custom URL string or null, and returns void. It first checks whether sounds are enabled by calling `sfxEnabled()`. If sounds are not enabled, the function returns early. It then checks whether the module-level `_introAudioEl` variable is not null. If an HTMLAudioElement exists, the function calls `pause()` on it and sets `_introAudioEl` to null. If the track ID is 'custom' and customUrl is provided, the function creates a new Audio element with the custom URL, sets its volume to 0.7, stores it in `_introAudioEl`, and calls `play()` on it. The `play()` call is not awaited; any rejection (from autoplay being blocked) is caught and silently ignored. The function then returns. For any other track ID, the function retrieves the corresponding synthesis function from the `INTRO_SYNTHS` object, defaulting to the 'gladiator' function if the ID is not found. It calls `getCtx()` to obtain an AudioContext. If the context is null, the function returns early. It then calls the retrieved synthesis function with the AudioContext.

### stopIntroMusic

This function takes no parameters and returns void. It checks whether the module-level `_introAudioEl` variable is not null. If an HTMLAudioElement exists, the function calls `pause()` on it and sets `_introAudioEl` to null.
