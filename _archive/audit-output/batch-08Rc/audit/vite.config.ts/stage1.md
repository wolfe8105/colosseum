# Stage 1 Outputs — vite.config.ts

## Agent 01
1. import — `defineConfig` from `'vite'`
2. import — `resolve` from `'path'`
3. blank
4. comment — "All HTML entry points — one per page"
5. comment — "During migration, Vite processes these and their <script> tags"
6. bind name to value — `htmlEntries` (object literal mapping page keys to resolved HTML paths; lines 6–21)
7. blank
8. top-level statement — `export default defineConfig({...})` — default export via a bare call expression (lines 23–50); exported in place, not a separate binding

## Agent 02
1. **import** — `defineConfig` from `'vite'` (line 1)
2. **import** — `resolve` from `'path'` (line 2)
3. **blank** (line 3)
4. **comment** (lines 4–5)
5. **bind name to value** — `htmlEntries` (lines 6–21)
6. **blank** (line 22)
7. **bind name to value** — `default` export via `defineConfig(...)` call, exported in place (lines 23–50)

## Agent 03
1. import — `defineConfig` from `'vite'`
2. import — `resolve` from `'path'`
3. blank
4. comment — "All HTML entry points — one per page"
5. comment — "During migration, Vite processes these and their `<script>` tags"
6. bind name to value — `htmlEntries` (object literal mapping page names to resolved HTML paths)
7. blank
8. top-level statement — `export default defineConfig({...})` (exported default expression, not a named binding)

## Agent 04
1. import — `defineConfig` from `'vite'`
2. import — `resolve` from `'path'`
3. blank
4. comment — "All HTML entry points — one per page"
5. comment — "During migration, Vite processes these and their `<script>` tags"
6. bind name to value — `htmlEntries` (object literal mapping page names to resolved HTML paths)
7. blank
8. top-level statement — `export default defineConfig({...})` (exported default call expression; no new binding name, so counted as a top-level statement that is also the module's default export)

## Agent 05
1. import — `defineConfig` from `'vite'`
2. import — `resolve` from `'path'`
3. blank
4. comment — "All HTML entry points — one per page"
5. comment — "During migration, Vite processes these and their `<script>` tags"
6. bind name to value — `htmlEntries` (object literal mapping page names to resolved HTML paths; lines 6–21)
7. blank
8. top-level statement — `export default defineConfig(...)` call with configuration object (exported default, lines 23–50)
