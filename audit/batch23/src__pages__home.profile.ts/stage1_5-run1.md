# Anchor List — src/pages/home.profile.ts

1. _renderAvatar  (line 9)
2. _renderNavAvatar  (line 24)
3. updateUIFromProfile  (line 35)
4. loadFollowCounts  (line 76)

Resolution notes
- `avatarBtn` (line 87): excluded — bound to a DOM element, not a function.
- `dropdown` (line 88): excluded — bound to a DOM element, not a function.
- Inline click handler at line 89 (`(e) => { ... }`): excluded — anonymous callback passed to `addEventListener`, not a top-level named binding.
- Inline click handler at line 90 (`() => { ... }`): excluded — anonymous callback passed to `addEventListener`.
- Inline async click handler at lines 93–96 (`async () => { ... }`): excluded — anonymous callback passed to `addEventListener`.
