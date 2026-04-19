1. `registerNavigate` — exported function declaration, line 15
2. `navigateTo` — exported function declaration, line 20

---

**Resolution notes**

No candidates were excluded. All five agents agreed unanimously on exactly two function definitions (`registerNavigate` and `navigateTo`). No additional function definitions were found on direct scan of the source. The remaining top-level bindings (`NavigateFn` at line 11 and `_navigate` at line 12) are a type alias and a plain variable binding respectively — neither is a callable function definition.
