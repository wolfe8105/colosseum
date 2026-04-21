# Stage 2 Outputs — arena-css.ts

## Agent 01

### injectCSS

When called, `injectCSS()` reads module-level state `cssInjected` from `arena-state.ts`. If `cssInjected` is true, the function returns early without executing further. Otherwise, it calls `set_cssInjected(true)` to write to module state, then sequentially invokes 22 separate CSS injection functions in this exact order: `injectLobbyCSS()`, `injectModeSelectCSS()`, `injectQueueMatchCSS()`, `injectRoomCSS()`, `injectRoomInputCSS()`, `injectPostDebateCSS()`, `injectMiscCSS()`, `injectReferencesCSS()`, `injectRankedCSS()`, `injectPreDebateCSS()`, `injectAfterEffectsCSS()`, `injectModeratorCSS()`, `injectTranscriptCSS()`, `injectUnpluggedCSS()`, `injectFeedRoomCSS()`, `injectFeedSpecChatCSS()`, `injectFeedStreamCSS()`, `injectFeedControlsCSS()`, `injectFeedFireworksCSS()`, `injectReferencesPhase3CSS()`, and `injectFeedPhase4_5CSS()`. Each of these functions appends its own `<style>` element to the DOM, with order preserved by call order. The function is synchronous and returns `void`. If any injector throws, the cascade stops and the exception propagates.

## Agent 02

### injectCSS

At runtime, `injectCSS` first reads the module-level `cssInjected` state variable from `arena-state.ts` and returns early if it is `true`. If `false`, it calls `set_cssInjected(true)` to write that state before proceeding synchronously. It then invokes 23 section-specific `injectXxxCSS()` functions in sequence—spanning core arena sections (lobby, mode select, queue, room, input, post-debate, misc, references, ranked, pre-debate, after-effects, moderator, transcript, unplugged) followed by F-51 feed room sections (feed-room, spec-chat, stream, controls, fireworks, references-phase3, feed-phase4-5)—each function appending its own `<style>` element to the DOM. The function returns `void` and is fully synchronous with no async operations.

## Agent 03

### injectCSS

When `injectCSS()` is called, it reads the module-level `cssInjected` state flag from `arena-state.ts`; if the flag is truthy, the function returns immediately. If `cssInjected` is false, the function calls `set_cssInjected(true)` to set the flag to true synchronously, then executes a synchronous sequence of 22 `injectXxxCSS()` calls in order (lobby, mode-select, queue-match, room, room-input, post-debate, misc, references, ranked, pre-debate, after-effects, moderator, transcript, unplugged, feed-room, feed-spec-chat, feed-stream, feed-controls, feed-fireworks, references-phase3, feed-phase4-5), with each call appending a `<style>` element to the DOM in the call order sequence. The function is synchronous and returns `void`.

## Agent 04

### injectCSS

When called, `injectCSS` reads the module-level boolean `cssInjected` from `arena-state.ts`; if true, the function returns immediately without further action. If false, it calls `set_cssInjected(true)` to set the state variable, then synchronously invokes in order: `injectLobbyCSS()`, `injectModeSelectCSS()`, `injectQueueMatchCSS()`, `injectRoomCSS()`, `injectRoomInputCSS()`, `injectPostDebateCSS()`, `injectMiscCSS()`, `injectReferencesCSS()`, `injectRankedCSS()`, `injectPreDebateCSS()`, `injectAfterEffectsCSS()`, `injectModeratorCSS()`, `injectTranscriptCSS()`, `injectUnpluggedCSS()`, `injectFeedRoomCSS()`, `injectFeedSpecChatCSS()`, `injectFeedStreamCSS()`, `injectFeedControlsCSS()`, `injectFeedFireworksCSS()`, `injectReferencesPhase3CSS()`, and finally `injectFeedPhase4_5CSS()`. Each sub-function appends its own `<style>` element to the DOM. The function is synchronous with no async operations and returns void.

## Agent 05

### injectCSS

When called, `injectCSS()` reads module-level state `cssInjected` from `arena-state.ts`. If `cssInjected` is `true`, the function returns early without executing further. Otherwise, it calls `set_cssInjected(true)` to write to module state, then sequentially invokes 22 named section injection functions in sequence, each of which appends its own `<style>` element to the DOM in the order called. The function performs no async operations, returns `void`, and has no error handling—if any injector throws, the cascade stops and the exception propagates.
