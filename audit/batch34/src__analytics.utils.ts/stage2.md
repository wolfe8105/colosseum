# Stage 2 Outputs — analytics.utils.ts

## Agent 01

### migrateKeys

When called, this function first checks the `_migrated` module-level boolean flag. If it is already `true`, the function returns immediately without doing anything. If `_migrated` is `false`, the function sets it to `true`, then iterates over each `[oldKey, newKey]` pair in the `KEY_MIGRATIONS` array (which contains `['colo_vid', 'mod_vid']`, `['colo_src', 'mod_src']`, and `['colo_uid_seen', 'mod_uid_seen']`). For each pair, it attempts to read the old key from localStorage; if a value exists and the new key does not yet have a value, the function writes the old key's value to the new key. Then, if the old key had any value at all, it is deleted from localStorage. All localStorage operations are wrapped in a try-catch block that silently swallows any exceptions (such as those thrown in private browsing mode or when localStorage is blocked).

### isOptedOut

This function reads from localStorage to check if the user has opted out of analytics. It attempts to retrieve the item stored under the key `'mod_analytics_opt_out'`; if that item equals the string `'1'`, the function returns `true`. If the item is not present or has any other value, or if a localStorage exception is caught, the function returns `false`.

### setAnalyticsOptOut

This function accepts a boolean parameter `optOut`. If `optOut` is `true`, it writes the string `'1'` to localStorage under the key `'mod_analytics_opt_out'`. If `optOut` is `false`, it removes that key from localStorage entirely. Both the write and remove operations are wrapped in a try-catch block that silently swallows exceptions.

### getVisitorId

This function begins by calling `migrateKeys()` to ensure any old analytics keys are moved to new ones. It then attempts to read the `'mod_vid'` key from localStorage. If a value is found, the function returns that value immediately. If no value is found, it generates a new ID: if the `crypto` global is available and has a `randomUUID` method, it calls that method; otherwise, it generates a UUID by replacing placeholder characters in the template string `'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'` with random hexadecimal digits (using `Math.random()` to generate them). Once generated, this ID is stored in localStorage under `'mod_vid'` and returned. If a localStorage exception is caught (such as in private browsing mode), the function returns a fallback string formed by concatenating `'ephemeral-'` with a random string derived from `Math.random()`.

### getTrafficSource

This function begins by calling `migrateKeys()`. It then attempts to read the `'mod_src'` key from localStorage; if a cached value exists, the function parses it as JSON and returns it immediately. If no cached value exists, the function constructs a `TrafficSource` object by reading the current page's query string parameters (via `location.search`) and the document referrer. It extracts `utm_source`, `utm_medium`, and `utm_campaign` from the URL search parameters (or `null` if absent), and sets the `referrer` field to `document.referrer` or `null`. This newly constructed object is then stringified and stored in localStorage under `'mod_src'`, and the object itself is returned. If a localStorage or parsing exception is caught, the function returns a fallback `TrafficSource` object with only the `referrer` field populated and all UTM fields set to `null`.

### getUserId

This function attempts to derive the Supabase authentication token key by extracting the project reference from the `SUPABASE_URL` constant (imported from config). It parses the URL, extracts the hostname, splits on `'.'`, and takes the first segment to form a key in the format `'sb-{ref}-auth-token'`. It then reads that key from localStorage; if the key is not present, the function returns `null`. If a value is found, it parses the stored value as JSON and attempts to navigate the structure to find the `user.id` field; if that field is present, it is returned, otherwise `null` is returned. If any exception is caught during URL parsing, localStorage access, or JSON parsing, the function returns `null`.

## Agent 02

### migrateKeys

When called, this function checks the module-level flag `_migrated`. If it is already true, the function returns immediately without doing anything. On first call, it sets `_migrated` to true and then iterates over the KEY_MIGRATIONS array, which contains three pairs of old and new localStorage key names: ['colo_vid', 'mod_vid'], ['colo_src', 'mod_src'], and ['colo_uid_seen', 'mod_uid_seen']. For each pair, it reads the value from localStorage using the old key. If a value exists at the old key and no value exists at the new key, it writes the value to the new key. Then, if a value existed at the old key, it removes the old key from localStorage. This entire sequence is wrapped in a try-catch block that silently ignores any exceptions, accommodating scenarios where localStorage is inaccessible due to private browsing mode or browser restrictions. The function returns void.

### isOptedOut

This function reads the localStorage key 'mod_analytics_opt_out' and returns true if its value is exactly the string '1', otherwise returns false. The read is wrapped in a try-catch block; if any exception occurs when accessing localStorage, the function catches it and returns false. The function is synchronous and returns a boolean.

### setAnalyticsOptOut

This function takes a boolean parameter `optOut`. If `optOut` is true, it writes the string '1' to the localStorage key 'mod_analytics_opt_out'. If `optOut` is false, it removes that key from localStorage. The operation is wrapped in a try-catch block that silently swallows any exceptions from localStorage access failures. The function returns void.

### getVisitorId

When called, this function first calls migrateKeys to ensure any legacy keys have been migrated. It then attempts to read the value from the localStorage key 'mod_vid'. If a value exists, it returns that value immediately. If no value exists, the function generates a new UUID. It first checks whether the global crypto object exists and has a randomUUID method; if so, it calls crypto.randomUUID(). If crypto.randomUUID is not available, it generates a UUID using a fallback implementation that replaces 'x' and 'y' characters in the template string 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' with random hexadecimal digits (calling Math.random() in a loop for each character to be replaced). After generating the ID, it stores the new ID in localStorage under the key 'mod_vid' and returns it. If any exception occurs during this process, the catch block returns a synthetic ephemeral ID constructed from the string 'ephemeral-' concatenated with a substring of Math.random().toString(36). The function is synchronous and returns a string.

### getTrafficSource

When called, this function first calls migrateKeys to migrate any legacy keys. It then attempts to read from the localStorage key 'mod_src'. If a cached value exists, it parses the value as JSON, casts it to TrafficSource type, and returns it immediately. If no cached value exists, it constructs a new TrafficSource object by reading the current document's referrer property and parsing UTM parameters from the current URL search string using new URLSearchParams(location.search). For each UTM parameter (utm_source, utm_medium, utm_campaign), it calls params.get() to extract the value or gets null if the parameter is not present. It then serializes this TrafficSource object to JSON and stores it in localStorage under the key 'mod_src'. Finally, it returns the newly constructed TrafficSource object. The entire sequence is wrapped in a try-catch block; if any exception occurs, the catch block returns a fallback TrafficSource with the document referrer and all UTM fields set to null. The function is synchronous and returns a TrafficSource object.

### getUserId

When called, this function attempts to derive a Supabase auth token key dynamically from the SUPABASE_URL module-level constant imported from config. It parses SUPABASE_URL as a URL object, extracts the hostname, splits it by '.', and takes the first component as the project reference. It constructs the key as 'sb-{ref}-auth-token'. It then reads from localStorage using this derived key. If no value exists, it returns null immediately. If a value exists, it parses the value as JSON and attempts to extract the nested path parsed?.user?.id; if this path exists, it returns the ID string, otherwise it returns null. The entire sequence is wrapped in a try-catch block; if any exception occurs during URL parsing, localStorage access, or JSON parsing, the catch block returns null. The function is synchronous and returns either a string or null.

## Agent 03

### migrateKeys

When called, this function checks the module-level `_migrated` flag and returns immediately if already set to true. On first call, it sets `_migrated` to true and then iterates through `KEY_MIGRATIONS`, an array of old/new localStorage key pairs. For each pair, it reads the old key from localStorage. If a value exists and the new key does not yet exist, it writes the old value to the new key. If a value exists in the old key (regardless of whether the new key was written), it deletes the old key. The function wraps all localStorage operations in a try/catch block that silently swallows exceptions, allowing it to succeed gracefully in private browsing mode or when localStorage is blocked. It returns void.

### isOptedOut

When called, this function attempts to read the 'mod_analytics_opt_out' item from localStorage and returns true if its value is exactly the string '1', otherwise returns false. If localStorage access throws an exception (as in private browsing mode), the catch block returns false. The function has no side effects.

### setAnalyticsOptOut

When called with a boolean parameter, this function writes to localStorage based on the optOut value. If optOut is true, it writes '1' to the 'mod_analytics_opt_out' key. If optOut is false, it removes the 'mod_analytics_opt_out' key from localStorage. All localStorage operations are wrapped in a try/catch block that silently catches exceptions. The function returns void and has no other side effects.

### getVisitorId

When called, this function first calls migrateKeys() to ensure old keys are migrated. It then reads the 'mod_vid' key from localStorage. If a visitor ID exists, it returns that value immediately. If no ID exists, the function generates one using two paths: if `crypto.randomUUID` is available in the global `crypto` object, it uses that; otherwise it falls back to generating a UUID by using `Math.random()` and string manipulation to replace placeholder characters. Once generated, the new ID is written to localStorage. All operations are wrapped in a try/catch block; if any localStorage operation fails (private browsing or blocked access), the function catches the exception and returns a fallback ID in the format 'ephemeral-' concatenated with a random string derived from `Math.random()`. The function is synchronous and returns a string.

### getTrafficSource

When called, this function first calls migrateKeys() to ensure key migration has occurred. It then reads the 'mod_src' key from localStorage. If a cached value exists, it parses it as JSON and returns it as a TrafficSource object. If no cached value exists, the function constructs a new TrafficSource object by reading from the current page's location: `document.referrer` for the referrer field, and URLSearchParams from `location.search` for utm_source, utm_medium, and utm_campaign parameters. Any of these URL parameters that do not exist are set to null. The constructed object is then serialized to JSON and written to localStorage before being returned. If any operation throws an exception (including JSON parsing failures or localStorage access failures), the catch block returns a partial TrafficSource object containing only `document.referrer` (or null) and null values for all UTM fields. The function is synchronous and returns a TrafficSource object.

### getUserId

When called, this function attempts to derive a Supabase authentication token key from the module-level `SUPABASE_URL` constant. It parses SUPABASE_URL as a URL, extracts the hostname, splits it on dots, and takes the first segment as the project reference. It then constructs a key in the format 'sb-{ref}-auth-token'. It reads this key from localStorage. If no value exists, it returns null immediately. If a value exists, it parses it as JSON and attempts to extract a nested `user.id` property, returning that if present or null if absent. If any step throws an exception—including JSON parsing failures, missing URL components, or localStorage access failures—the catch block returns null. The function is synchronous and returns either a string or null.

## Agent 04

### migrateKeys

When called, this function checks the module-level `_migrated` flag (initialized to false at the top). If true, it returns immediately without doing anything. On first call, it sets `_migrated` to true, then iterates through the KEY_MIGRATIONS array in order: ['colo_vid', 'mod_vid'], ['colo_src', 'mod_src'], ['colo_uid_seen', 'mod_uid_seen']. For each [oldKey, newKey] pair, it calls localStorage.getItem(oldKey) to read the value. If a value exists and the new key does not already exist in localStorage, it writes the value to localStorage under the new key via localStorage.setItem(newKey, val). If a value was found under the old key (regardless of whether it was copied), it calls localStorage.removeItem(oldKey) to delete the old key. The entire operation is wrapped in a try-catch block that swallows any exceptions—if localStorage is not available (e.g., in private browsing mode), the catch silently returns without raising an error or reporting a status.

### isOptedOut

This function reads from localStorage by calling localStorage.getItem('mod_analytics_opt_out') and returns true if the value equals the string '1', otherwise false. The entire operation is wrapped in a try-catch block; if localStorage access throws (e.g., in private browsing mode), the catch block returns false.

### setAnalyticsOptOut

This function takes a boolean parameter `optOut`. It reads this parameter and branches: if optOut is true, it calls localStorage.setItem('mod_analytics_opt_out', '1') to write the opt-out flag; if false, it calls localStorage.removeItem('mod_analytics_opt_out') to delete the opt-out flag. The entire operation is wrapped in a try-catch block that silently swallows any exceptions if localStorage is unavailable.

### getVisitorId

When called, this function first calls migrateKeys() to run the key migration. It then calls localStorage.getItem('mod_vid') to read a cached visitor ID. If no ID is cached, it generates a new UUID by checking whether crypto.randomUUID is defined; if available, it calls crypto.randomUUID() directly. If not available, it generates a UUID by replacing each character in the template string 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' with a random hex digit (using Math.random() multiplied by 16 to generate the digit, with special handling for 'y' characters to ensure valid UUID format). It then writes this generated ID to localStorage via localStorage.setItem('mod_vid', id). Finally, it returns the ID (either cached or newly generated). If any step throws an exception (e.g., localStorage is blocked), the catch block returns an ephemeral ID by concatenating the string 'ephemeral-' with a substring of Math.random().toString(36).

### getTrafficSource

When called, this function first calls migrateKeys() to run the key migration. It then calls localStorage.getItem('mod_src') to check for cached traffic source data. If cached data exists, it calls JSON.parse(cached) to deserialize it and returns the parsed TrafficSource object. If no cached data exists, it constructs a TrafficSource object by reading from the browser: it calls new URLSearchParams(location.search) to parse query string parameters, reads document.referrer, and calls params.get('utm_source'), params.get('utm_medium'), and params.get('utm_campaign') to extract UTM parameters (each defaulting to null if not present). It then writes this newly constructed object to localStorage via localStorage.setItem('mod_src', JSON.stringify(src)) and returns the object. If any step throws an exception (e.g., localStorage is blocked or location.search is inaccessible), the catch block returns a fallback TrafficSource object with document.referrer (or null) and all UTM parameters set to null.

### getUserId

When called, this function attempts to derive a Supabase auth token key from the SUPABASE_URL module-level constant. It calls new URL(SUPABASE_URL) to parse the URL, accesses the hostname, calls split('.')[0] to extract the first segment (project reference), and constructs the auth token key as a string in the format `sb-{ref}-auth-token`. It then calls localStorage.getItem(key) to read the stored token value. If no token is stored, it returns null immediately. If a token is stored, it calls JSON.parse(stored) to deserialize the token (with type annotation expecting an object with an optional nested user.id), then accesses the user.id property using optional chaining (parsed?.user?.id) and returns it, defaulting to null if the path does not exist. If any step throws an exception (e.g., localStorage is blocked, JSON.parse fails, or the URL is malformed), the catch block returns null.

## Agent 05

### migrateKeys

This function checks a module-level `_migrated` boolean flag and returns early if true. If not yet migrated, it sets `_migrated` to true and enters a try block that iterates over each entry in the `KEY_MIGRATIONS` array. For each migration pair (oldKey, newKey), it reads the old key from localStorage; if a value exists and the new key does not already exist, it writes that value to the new key. If the old key had a value, it removes the old key from localStorage. All localStorage operations are wrapped in a single try/catch block that silently swallows any exceptions, typically from private browsing mode or blocked localStorage access.

### isOptedOut

This function reads the `mod_analytics_opt_out` key from localStorage inside a try block and returns true if its value equals the string '1', otherwise false. If localStorage access throws an exception, the catch block returns false.

### setAnalyticsOptOut

This function takes a boolean parameter `optOut`. Inside a try block, if `optOut` is true, it writes the string '1' to the `mod_analytics_opt_out` key in localStorage. If `optOut` is false, it removes that key from localStorage. The catch block silently swallows any exceptions from localStorage access.

### getVisitorId

This function first calls migrateKeys. It then reads the `mod_vid` key from localStorage. If no value exists, it generates a UUID by first checking if `crypto.randomUUID` is available; if so, it calls that function. Otherwise, it falls back to a manual UUID generator that iterates over a template string and replaces each character matching /[xy]/ with a random hex digit. After generating the ID, it writes it to the `mod_vid` key in localStorage. The entire operation is wrapped in a try/catch block; if any localStorage operation throws an exception, the catch block returns an ephemeral ID by prefixing 'ephemeral-' to a random string derived from `Math.random()`.

### getTrafficSource

This function calls migrateKeys. It then reads the `mod_src` key from localStorage. If a cached value exists, it parses it as JSON and returns it as a TrafficSource object. If no cached value exists, the function constructs a new TrafficSource object by reading `location.search` as a URLSearchParams object and extracting utm_source, utm_medium, and utm_campaign query parameters; it also reads `document.referrer` for the referrer field (or null if empty). It then serializes this object as JSON and writes it to the `mod_src` key in localStorage before returning it. The entire operation is wrapped in a try/catch block; if any exception occurs, the catch block returns a minimal TrafficSource object containing only the referrer (or null) with all other fields set to null.

### getUserId

This function reads the SUPABASE_URL import and extracts the project reference by parsing it as a URL, splitting the hostname on '.', and taking the first segment. It derives a localStorage key in the format `sb-{ref}-auth-token`. It reads this key from localStorage inside a try block. If no value exists, it returns null. If a value exists, it parses it as JSON, attempts to access the nested path `user.id`, and returns that value or null if the path does not exist. If parsing fails or any other exception occurs, the catch block returns null.
