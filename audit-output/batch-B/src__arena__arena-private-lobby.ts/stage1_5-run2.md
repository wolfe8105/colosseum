1. `createAndWaitPrivateLobby` — line 27, exported async function declaration
2. `startPrivateLobbyPoll` — line 130, exported function declaration
3. `onPrivateLobbyMatched` — line 178, exported function declaration
4. `cancelPrivateLobby` — line 201, exported async function declaration

---

Resolution notes:

- Anonymous arrow function passed to `addEventListener` at line 54: inner callback passed inline to `addEventListener` — excluded per rules.
- Anonymous async arrow function passed to `setInterval` at line 135: inner callback passed inline to `setInterval` — excluded per rules.
- Anonymous arrow function passed to `addEventListener` at line 107: inner callback passed inline to `addEventListener` — excluded per rules.
- `.then()` and `.catch()` callbacks at lines 110–111: inline callbacks — excluded per rules.
