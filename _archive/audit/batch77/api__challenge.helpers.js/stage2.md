# Stage 2 Outputs — challenge.helpers.js

## Agent 01

### escapeHtml

When called with a string parameter, this function reads that string and returns an HTML-escaped version of it. If the input is falsy (undefined, null, empty string, zero, false, or NaN), it returns an empty string and exits early. Otherwise, it chains five sequential string replacements to escape HTML special characters: it replaces all ampersands with `&amp;`, all less-than signs with `&lt;`, all greater-than signs with `&gt;`, all double quotes with `&quot;`, and all single quotes with `&#039;`. Each replacement is a global regex substitution that modifies the entire string and passes the result to the next replacement. The function returns the fully escaped string.

### getCategoryLabel

When called with a category string parameter, this function reads the category value and looks it up in a hardcoded map object containing seven entries: 'politics' maps to '🏛️ Politics', 'sports' to '🏆 Sports', 'entertainment' to '🎬 Entertainment', 'couples-court' to '💑 Couples Court', 'music' to '🎵 Music', 'movies' to '🎥 Movies', and 'cars' to '🚗 Cars'. If the category exists as a key in the map, the function returns the corresponding emoji-prefixed label. If the category does not match any key in the map, the function returns the default fallback string '🎙️ Open Debate'. No state is read or written outside the function scope.

### getModeLabel

When called with a mode string parameter, this function reads the mode value and looks it up in a hardcoded map object containing four entries: 'text' maps to 'Text Battle', 'voice_memo' to 'Voice Memo', 'live_audio' to 'Live Audio', and 'ai_sparring' to 'AI Sparring'. If the mode exists as a key in the map, the function returns the corresponding label string. If the mode does not match any key in the map, the function returns the default fallback string 'Debate'. No state is read or written outside the function scope.

## Agent 02

### escapeHtml

Reads a single parameter `str`. If `str` is falsy, the function returns an empty string immediately. Otherwise, it returns the result of a sequence of four string replace operations applied in order: replacing all ampersands with `&amp;`, all less-than signs with `&lt;`, all greater-than signs with `&gt;`, all double quotes with `&quot;`, and all single quotes with `&#039;`. Each replace operation uses a global regex flag to match all occurrences in the string. The function is synchronous and does not call other functions.

### getCategoryLabel

Reads a single parameter `category` and references a local object literal map containing five key-value pairs mapping category strings to emoji-prefixed labels. The function returns the value associated with the `category` key if it exists in the map, otherwise it returns the default string `'🎙️ Open Debate'`. The map contains entries for 'politics', 'sports', 'entertainment', 'couples-court', and 'music', 'movies', and 'cars'. The function is synchronous and does not call other functions.

### getModeLabel

Reads a single parameter `mode` and references a local object literal map containing four key-value pairs mapping mode strings to display labels. The function returns the value associated with the `mode` key if it exists in the map, otherwise it returns the default string `'Debate'`. The map contains entries for 'text', 'voice_memo', 'live_audio', and 'ai_sparring'. The function is synchronous and does not call other functions.

## Agent 03

### escapeHtml

This function accepts a string parameter. If the parameter is falsy, it returns an empty string immediately. Otherwise, it reads the string and applies five sequential string replace operations on it using regex patterns with global flags, replacing ampersands with `&amp;`, less-than signs with `&lt;`, greater-than signs with `&gt;`, double quotes with `&quot;`, and single quotes with `&#039;`. Each replace invocation is chained synchronously to the previous one. The function returns the result of the final replace operation as a string. The function does not call any other functions, does not access external state or parameters beyond the input, and is not async. There are no loops or branches beyond the initial falsy check.

### getCategoryLabel

This function accepts a category string parameter and reads from a hardcoded object literal map containing six specific category keys paired with emoji-prefixed label strings. The function performs a single object key lookup using bracket notation on the map with the category parameter as the key. If the key exists in the map, the associated label string is returned. If the key does not exist, the function returns the default fallback string `'🎙️ Open Debate'`. The function does not call any other functions, does not access external state, and is not async.

### getModeLabel

This function accepts a mode string parameter and reads from a hardcoded object literal map containing four mode keys paired with label strings. The function performs a single object key lookup using bracket notation on the map with the mode parameter as the key. If the key exists in the map, the associated label string is returned. If the key does not exist, the function returns the default fallback string `'Debate'`. The function does not call any other functions, does not access external state, and is not async.

## Agent 04

### escapeHtml

The function accepts a single string parameter `str`. If `str` is falsy, the function returns an empty string immediately. Otherwise, it chains five `.replace()` calls on the string: the ampersand character is replaced with `&amp;`, the less-than character with `&lt;`, the greater-than character with `&gt;`, the double-quote character with `&quot;`, and the single-quote character with `&#039;`. Each replacement uses a global flag to replace all occurrences. The function returns the result of the final replace operation, which is the fully escaped string. The function is synchronous and does not call any other functions or access external state.

### getCategoryLabel

The function accepts a single parameter `category`. It creates a local constant object `map` that maps string category keys to display label strings, each label containing an emoji followed by text: 'politics' maps to '🏛️ Politics', 'sports' to '🏆 Sports', 'entertainment' to '🎬 Entertainment', 'couples-court' to '💑 Couples Court', 'music' to '🎵 Music', 'movies' to '🎥 Movies', and 'cars' to '🚗 Cars'. The function accesses the `map` object using the `category` parameter as a key. If the key exists in the map, that value is returned; if the key does not exist, the logical OR operator returns the default string '🎙️ Open Debate'. The function is synchronous and does not call any other functions or access external state.

### getModeLabel

The function accepts a single parameter `mode`. It creates a local constant object `map` that maps string mode keys to display label strings: 'text' maps to 'Text Battle', 'voice_memo' to 'Voice Memo', 'live_audio' to 'Live Audio', and 'ai_sparring' to 'AI Sparring'. The function accesses the `map` object using the `mode` parameter as a key. If the key exists in the map, that value is returned; if the key does not exist, the logical OR operator returns the default string 'Debate'. The function is synchronous and does not call any other functions or access external state.

## Agent 05

### escapeHtml

The function reads a single parameter, `str`, and checks if it is falsy; if so, it returns an empty string immediately. Otherwise, it calls the `replace` method on the string parameter four times in sequence: first replacing all occurrences of `&` with `&amp;`, then all `<` with `&lt;`, then all `>` with `&gt;`, then all `"` with `&quot;`, and finally all single quotes `'` with `&#039;`. Each `replace` call uses the global flag `/g` to match all occurrences. The function returns the result of the final replace call. It does not call any other functions, does not branch beyond the initial falsy check, has no loop constructs other than those internal to `replace`, and is synchronous.

### getCategoryLabel

The function reads a single parameter, `category`, and creates a local constant object that maps six string keys to string values with emoji prefixes: `'politics'` to `'🏛️ Politics'`, `'sports'` to `'🏆 Sports'`, `'entertainment'` to `'🎬 Entertainment'`, `'couples-court'` to `'💑 Couples Court'`, `'music'` to `'🎵 Music'`, `'movies'` to `'🎥 Movies'`, and `'cars'` to `'🚗 Cars'`. The function then reads from this map using the `category` parameter as a key and returns the corresponding value; if the key does not exist in the map, it returns the default string `'🎙️ Open Debate'`. It does not call any other functions, has no control flow beyond the lookup, and is synchronous.

### getModeLabel

The function reads a single parameter, `mode`, and creates a local constant object that maps four string keys to string values: `'text'` to `'Text Battle'`, `'voice_memo'` to `'Voice Memo'`, `'live_audio'` to `'Live Audio'`, and `'ai_sparring'` to `'AI Sparring'`. The function then reads from this map using the `mode` parameter as a key and returns the corresponding value; if the key does not exist in the map, it returns the default string `'Debate'`. It does not call any other functions, has no control flow beyond the lookup, and is synchronous.
