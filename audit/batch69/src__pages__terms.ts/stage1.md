# Stage 1 Outputs — terms.ts

## Agent 01
1. comment (lines 1-8)
2. comment (lines 10-12)
3. bind name to type: `LegalTab` (line 14)
4. bind name to value: `TAB_MAP` (line 16)
5. bind name to function definition: `showTab` (line 18)
6. top-level statement (line 33)
7. top-level statement (line 34)
8. top-level statement (lines 37-43)
9. top-level statement (lines 46-49)

## Agent 02
1. comment — lines 1–8 (file header docstring)
2. comment — lines 10–12 (section header comment)
3. bind name to type — line 14: `LegalTab` (type alias)
4. bind name to value — line 16: `TAB_MAP` (const binding)
5. bind name to function definition — line 18: `showTab` (function definition)
6. top-level statement — line 33 (if hash check for privacy)
7. top-level statement — line 34 (if hash check for community)
8. comment — line 36
9. top-level statement — lines 37–43 (document.addEventListener delegated click handler)
10. comment — line 45
11. top-level statement — lines 46–49 (back link handler)

## Agent 03
1. Comment (lines 1–8)
2. Comment (lines 10–12)
3. Bind name to type: `LegalTab` (line 14)
4. Bind name to value: `TAB_MAP` (line 16)
5. Bind name to function definition: `showTab` (not exported) (lines 18–30)
6. Top-level statement (line 33)
7. Top-level statement (line 34)
8. Top-level statement (lines 37–43)
9. Top-level statement (lines 46–49)

## Agent 04
1. comment (lines 1–8)
2. comment (lines 10–12)
3. bind name to type — `LegalTab` (line 14)
4. bind name to value — `TAB_MAP` (line 16)
5. bind name to function definition — `showTab` (exported) (lines 18–30) [NOTE: source has no export keyword — agent error]
6. top-level statement (line 33)
7. top-level statement (line 34)
8. top-level statement (lines 37–43)
9. top-level statement (lines 46–49)

## Agent 05
1. comment
2. bind name to type: `LegalTab`
3. bind name to value: `TAB_MAP`
4. bind name to function definition: `showTab`
5. top-level statement: `if (window.location.hash === '#privacy')`
6. top-level statement: `if (window.location.hash === '#community')`
7. top-level statement: `document.addEventListener('click', ...)`
8. top-level statement: `document.getElementById('terms-back-link')?.addEventListener('click', ...)`
