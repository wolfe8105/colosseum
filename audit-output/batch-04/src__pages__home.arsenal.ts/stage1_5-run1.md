# Anchor List — home.arsenal.ts

1. loadArsenalScreen  (line 11)
2. loadMyArsenal  (line 23)
3. loadArmory  (line 28)
4. loadForge  (line 32)
5. wireArsenalButtons  (line 56)

---

## Resolution notes

- `document.querySelectorAll('[data-arsenal-tab]').forEach(...)` at line 82: excluded — this is a top-level imperative statement (module-load side effect), not a named callable binding. The forEach callback is an inline anonymous callback, not a top-level function definition.
- No candidates were found that all five agents missed when scanning the source directly.
