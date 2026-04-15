# Anchor List — async.fetch.ts

1. `fetchTakes` — exported async function declaration, line 19
2. `fetchPredictions` — exported async function declaration, line 117
3. `fetchStandaloneQuestions` — exported async function declaration, line 167

## Resolution notes

All five agents identified the same three candidates unanimously. Direct inspection of the source confirms all three are top-level exported async function declarations (`export async function`), meeting the definition criteria. No additional function definitions were found on direct scan. Inner callbacks (.map(), .forEach()) are inline and excluded per rules. No candidates excluded from the final list.
