# Anchor List — plinko-auth-return.ts

1. restoreStep5UI (line 17)
2. attachAuthReturnHandler (line 31)

## Resolution notes

Both candidates confirmed. restoreStep5UI: top-level function declaration, not exported. attachAuthReturnHandler: top-level exported function declaration. Callback passed to onAuthStateChange (line 35) excluded — inline callback, not top-level named binding.
