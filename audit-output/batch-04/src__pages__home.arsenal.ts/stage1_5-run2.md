# Anchor List — home.arsenal.ts

1. loadArsenalScreen  (line 11)
2. loadMyArsenal  (line 23)
3. loadArmory  (line 28)
4. loadForge  (line 32)
5. wireArsenalButtons  (line 56)

---

**Resolution notes**

- `document.querySelectorAll('[data-arsenal-tab]').forEach(...)` (lines 82–99): excluded — this is a top-level module-init statement that passes an inline callback to `forEach`; it is not a named callable binding.
- Callbacks passed to `showForgeForm` inside `loadForge` (lines 35–52): excluded — inline callbacks passed as arguments, not named top-level bindings.
- Edit/click handlers registered via `addEventListener` inside `wireArsenalButtons` (lines 59–63, 66–78): excluded — inline callbacks, not named top-level bindings.
