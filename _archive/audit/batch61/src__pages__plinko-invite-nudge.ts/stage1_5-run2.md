# Anchor List — plinko-invite-nudge.ts

1. injectInviteNudge  (line 5)

## Resolution notes
- The anonymous async arrow function passed to `addEventListener('click', async () => { ... })` at line 30: excluded — inline callback passed to an event listener, not a top-level named binding.
