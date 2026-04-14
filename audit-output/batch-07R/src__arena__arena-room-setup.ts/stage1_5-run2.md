# Anchor List — arena-room-setup.ts

1. showPreDebate  (line 34)
2. showPreDebateLoadout  (line 189)
3. enterRoom  (line 207)
4. _renderRoom  (line 231)

## Resolution notes

- Anonymous async IIFE inside `_renderRoom` (line 316): inner immediately-invoked function expression used to load power-up data, not a top-level named binding.
- Anonymous arrow callback passed to `addEventListener('click', ...)` (lines 148, 161): inline callbacks, not top-level named bindings.
- Anonymous `.then()`/`.catch()`/`.finally()` callbacks inside `enterRoom` (lines 210, 225–228): inline callbacks passed to promise chains, not top-level named bindings.
- `onSilence`, `onShield`, `onReveal` object literal methods passed to `wireActivationBar` (lines 362–383): inline callbacks inside `_renderRoom`, not top-level named bindings.
