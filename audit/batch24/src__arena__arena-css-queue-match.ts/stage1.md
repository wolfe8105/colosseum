# Stage 1 Outputs — arena-css-queue-match.ts

## Agent 01
1. comment — JSDoc block (lines 1–3)
2. blank — line 4
3. bind name to function definition [export] — `injectQueueMatchCSS` (line 5)
4. blank — line 50

## Agent 02
1. comment (lines 1–3) — JSDoc
2. blank (line 4)
3. bind name to function definition [exported] — `injectQueueMatchCSS` (line 5)
4. top-level statement (inside function, line 6): `const style = document.createElement('style')`
5. top-level statement (inside function, lines 7–47): `style.textContent = \`...\``
6. top-level statement (inside function, line 48): `document.head.appendChild(style)`
7. blank (line 50)

## Agent 03
1. comment (lines 1-3) — JSDoc
2. blank (line 4)
3. bind name to function definition, exported — `injectQueueMatchCSS` (line 5)
4. blank (line 49)

## Agent 04
1. comment (lines 1-3) — JSDoc
2. blank (line 4)
3. bind name to function definition, exported — `injectQueueMatchCSS` (lines 5-49)
4. blank (line 50)

## Agent 05
1. [L1-3] comment — JSDoc
2. [L4] blank
3. [L5] bind name to function definition, exported — `injectQueueMatchCSS`
4. [L6-48] top-level statements inside function body (style create, textContent assign, head.appendChild)
5. [L49] end of file
