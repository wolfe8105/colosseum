# Anchor List — arena-room-setup.ts

1. showPreDebate  (line 34)
2. showPreDebateLoadout  (line 189)
3. enterRoom  (line 207)
4. _renderRoom  (line 231)

## Resolution notes

- injectAdSlot (line 90): called as a function but defined elsewhere (imported implicitly or injected globally); no top-level binding for it exists in this file, so it is not a candidate
- Anonymous async IIFE at line 316 (`(async () => { ... })()`): immediately-invoked, anonymous, not a named binding — excluded
- All arrow callbacks passed to `.addEventListener`, `.then`, `.catch`, `.finally`, `.map`, etc.: inline callbacks, not top-level named bindings — excluded
- `onReveal` async arrow at line 373: object literal method passed as a property of an options object to `wireActivationBar` — excluded
