# Anchor List — home.nav.ts

1. navigateTo (line 19)

## Resolution notes

- forEach callback (lines 52-54): inline callback to .forEach(), not a top-level binding — excluded.
- addEventListener callback (lines 58-82): inline arrow function callback, not a top-level binding — excluded.
