# Anchor List — plinko-helpers.ts (Arbiter Run 2)

1. getReturnTo (line 8)
2. updateProgress (line 15)
3. goToStep (line 20)
4. showMsg (line 34)
5. clearMsg (line 41)
6. getAge (line 48)

## Resolution notes

- daySelect (line 61): const binding to document.getElementById() call, not a function definition
- yearSelect (line 71): const binding to document.getElementById() call, not a function definition
- Inline arrow function at line 30 (.then() callback): inline callback passed to .then(), excluded per definition
- if blocks at lines 62–69 and 72–80: top-level statements containing DOM operations, not function definitions
