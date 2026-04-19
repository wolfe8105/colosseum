# Anchor List — home.nav.ts

1. navigateTo (line 19)

## Resolution notes

- VALID_SCREENS (line 17): const binding to array value, not a function — excluded.
- Bottom-nav-btn forEach callback (lines 52-54): inline callback to .forEach(), not top-level named binding — excluded.
- registerNavigate call (line 55): function call statement, not a definition — excluded.
- data-action addEventListener callback (lines 58-82): inline arrow function callback, not a top-level named binding — excluded.
