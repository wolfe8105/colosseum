# Anchor List — src/pages/settings.ts

1. toast  (line 59)
2. getEl  (line 67)
3. getChecked  (line 71)
4. setChecked  (line 75)
5. validateTier  (line 80)
6. loadSettings  (line 88)
7. saveSettings  (line 173)
8. loadModeratorSettings  (line 348)

---

## Resolution notes

All five agents agreed on exactly the same eight function definitions listed above. No agent nominated any additional candidates, and a direct scan of the source file found no top-level named callable bindings that the agents missed.

The following items appeared in stage 1 as top-level statements but are excluded because they are anonymous callbacks passed to `addEventListener` or `forEach`, not named bindings:

- Dark mode `change` handler (line 255) — anonymous arrow function passed to `addEventListener`, not a named binding.
- Bio `input` handler (line 265) — anonymous arrow function passed to `addEventListener`, not a named binding.
- `logout-btn` click handler (line 275) — anonymous async arrow function passed to `addEventListener`.
- `reset-pw-btn` click handler (line 285) — anonymous async arrow function passed to `addEventListener`.
- `delete-btn` click handler (line 308) — anonymous arrow function passed to `addEventListener`.
- `delete-confirm-input` input handler (line 318) — anonymous arrow function passed to `addEventListener`.
- `delete-cancel` click handler (line 324) — anonymous arrow function passed to `addEventListener`.
- `delete-modal` click handler (line 328) — anonymous arrow function passed to `addEventListener`.
- `delete-confirm` click handler (line 332) — anonymous async arrow function passed to `addEventListener`.
- `set-mod-enabled` change handler (line 390) — anonymous async arrow function passed to `addEventListener`.
- `set-mod-available` change handler (line 406) — anonymous async arrow function passed to `addEventListener`.
- `.mod-cat-chip` forEach callback (line 424) — anonymous arrow function passed to `forEach`, with inner anonymous click handler; neither is a named binding.
- `DOMContentLoaded` handler (line 455) — anonymous async arrow function passed to `addEventListener`.
