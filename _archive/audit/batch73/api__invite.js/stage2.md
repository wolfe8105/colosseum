# Stage 2 Outputs — invite.js

## Agent 01

### handler
The handler is an async function that receives an HTTP request and response object. It reads the `code` query parameter from the request, validates it against the regex `/^[a-z0-9]{5}$/`, and if validation fails, returns a 302 redirect to the base plinko HTML page. If validation passes, the function extracts the client's IP address from the `x-forwarded-for` header (splitting on comma and trimming), falling back to `req.socket.remoteAddress`, or `null` if neither is available. It then awaits a call to `supabase.rpc('record_invite_click', ...)` with the validated code, `null` for device ID, and the extracted IP address; any error thrown by this RPC call is silently caught and ignored. Finally, the function performs a 302 redirect to the plinko HTML page with the code preserved in the `ref` query parameter (URL-encoded).

## Agent 02

### handler
The function is async and receives `req` (HTTP request) and `res` (HTTP response) parameters.

It extracts the `code` query parameter from the request. If `code` is missing or does not match the pattern of exactly 5 lowercase alphanumeric characters, it immediately returns a 302 redirect to `https://themoderator.app/moderator-plinko.html` without further processing.

If the code is valid, it enters a try-catch block that extracts the client IP address from the `x-forwarded-for` header (taking the first value if multiple are present), falling back to `req.socket.remoteAddress` if the header is absent, or `null` if neither is available. It then awaits a call to `supabase.rpc('record_invite_click', {...})` passing the code, a `null` device ID, and the extracted IP. The RPC call uses the Supabase service-role credentials initialized at module load time.

If the RPC call throws an error, the catch block silently swallows it with an empty handler — the error does not propagate or interrupt execution.

After the try-catch completes, the function returns a 302 redirect to `https://themoderator.app/moderator-plinko.html?ref=[code]`, encoding the code as a URL parameter.

## Agent 03

### handler
The function is an async HTTP handler that processes invite clicks via GET requests with a `code` query parameter.

Parameters and external state read: the handler reads `req.query.code`, `req.headers['x-forwarded-for']`, and `req.socket.remoteAddress`.

Validation and early return: if the `code` parameter is missing or does not match the pattern `^[a-z0-9]{5}$`, the function immediately returns a 302 redirect to the app base URL without further processing.

External API call and state written: if validation passes, the function calls `supabase.rpc('record_invite_click', {...})` with an awaited async call, sending the invite code, a null device ID placeholder, and the extracted IP address to the backend. The Supabase client is initialized once at module load with credentials from environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

Error handling: any error thrown by the RPC call is caught in a try-catch block and silently ignored (empty catch).

Return value and redirect: regardless of RPC outcome, the function returns a 302 redirect to plinko, appending the code as a `ref` query parameter (URL-encoded).

## Agent 04

### handler
At runtime, this async function receives an HTTP request and response object. It reads the `code` query parameter from `req.query.code`.

If `code` is missing or does not match the regex pattern `^[a-z0-9]{5}$`, a 302 redirect is sent immediately to `https://themoderator.app/moderator-plinko.html` and the function returns.

If the code is valid, the function extracts the client's IP address from the `x-forwarded-for` header (splitting on commas and trimming the first value), falling back to `req.socket.remoteAddress`, or `null` if neither is available. Then it awaits a call to `supabase.rpc('record_invite_click', {...})`, passing the code as `p_ref_code`, `null` as `p_device_id`, and the extracted IP as `p_ip`. This RPC call is wrapped in a try-catch that silently catches any errors — no error handling occurs; execution continues even if the RPC fails.

Whether the RPC succeeded or failed, the function sends a 302 redirect to `https://themoderator.app/moderator-plinko.html?ref=<encoded code>` and returns.

## Agent 05

### handler
The async function receives an HTTP request and response object. It reads the `code` query parameter from `req.query`. If the code is missing or does not match the pattern `^[a-z0-9]{5}$`, it immediately returns a 302 redirect to the base app's plinko page without further processing.

When the code is valid, the function enters a try-catch block. Inside the try block, it extracts the client's IP address by first attempting to read `x-forwarded-for` header (splitting on commas and trimming the first value), falling back to `req.socket.remoteAddress`, and defaulting to null if neither is available. It then calls the Supabase RPC function `record_invite_click` with three parameters: the invite code, a null device ID, and the IP address. This RPC call is awaited. If the RPC call throws any error, the catch block silently swallows it without rethrowing or logging.

After the try-catch block, the function executes a 302 redirect to the base app's plinko page, appending the code as a `ref` query parameter (URL-encoded). This redirect is the final return value.
