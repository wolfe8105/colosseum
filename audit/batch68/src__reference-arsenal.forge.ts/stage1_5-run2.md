# Anchor List — reference-arsenal.forge.ts

1. showForgeForm  (line 18)

## Resolution notes

All five agents agreed unanimously on a single top-level function definition: `showForgeForm`, an exported function declaration at line 18.

- render (line 42): inner helper function defined inside `showForgeForm`'s body — excluded.
- Anonymous arrow function returned at line 50: inline return value expression, not a named top-level binding — excluded.

Direct scan confirms no other top-level function definitions exist. The module is a thin orchestrator that delegates to imported helpers.
