# Anchor List — auth.profile.ts

1. updateProfile  (line 13)
2. deleteAccount  (line 46)
3. getPublicProfile  (line 64)
4. showUserProfile  (line 90)

## Resolution notes

All five agents identified the same four function definitions unanimously. No candidates were excluded. No additional top-level function definitions were found upon direct source inspection. All inner arrow functions (the `forEach` callback at line 34, the `click` event listener at line 106, the `click` handler at line 171, the `click` handler for follow at line 179, and the `click` handler for rival at line 204) are inline callbacks passed to event-listener and iterator methods and are excluded per the rules.
