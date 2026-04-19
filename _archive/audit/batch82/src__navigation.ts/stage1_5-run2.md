1. `registerNavigate` — exported function declaration, line 15
2. `navigateTo` — exported function declaration, line 20

---

**Resolution notes**

No candidates were excluded. All five agents agreed on the same two function definitions. No additional function definitions were found by direct scan of the source.

Excluded non-function items (none were candidates, listed for completeness):
- `NavigateFn` (line 11): type alias — excluded per "type signatures" rule.
- `_navigate` (line 12): a `let` binding to `null`, not a function definition.
