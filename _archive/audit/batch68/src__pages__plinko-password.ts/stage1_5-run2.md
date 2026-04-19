# Anchor List — plinko-password.ts

1. validatePasswordComplexity  (line 6)
2. checkHIBP  (line 16)

## Resolution notes

All five agents reached unanimous agreement on exactly two function definitions. Both are exported function declarations at the top level of the file. No agents listed any additional candidates, and a direct scan of the source confirms no other top-level callable bindings exist. The file contains no inner helpers, no callbacks, no class bodies, and no object literal methods. `checkHIBP` is an `async` function; `validatePasswordComplexity` is synchronous — both qualify under the definition criteria.
