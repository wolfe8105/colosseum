# Anchor List — terms.ts

1. showTab (line 18)

## Resolution notes

All five agents identified `showTab` (line 18) as the only function definition. Agent 04 (Stage 1) incorrectly marked it as "exported" — source has no export keyword. Inline callbacks in addEventListener calls (lines 37-43, 46-49) excluded. TAB_MAP is a value binding to an object literal — excluded.
