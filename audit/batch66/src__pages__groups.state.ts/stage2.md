# Stage 2 Outputs — groups.state.ts

## Agent 01

### setSb
The function accepts a `SupabaseClient | null` parameter and assigns it directly to the module-level `sb` variable. It reads only the parameter. It writes the `sb` module-level variable to the provided value and returns `undefined` implicitly. It calls no other functions.

### setCurrentUser
The function accepts a `User | null` parameter and assigns it directly to the module-level `currentUser` variable. It reads only the parameter. It writes the `currentUser` module-level variable to the provided value and returns `undefined` implicitly. It calls no other functions.

### setActiveTab
The function accepts a `string` parameter and assigns it directly to the module-level `activeTab` variable. It reads only the parameter. It writes the `activeTab` module-level variable to the provided value and returns `undefined` implicitly. It calls no other functions.

### setActiveDetailTab
The function accepts a `string` parameter and assigns it directly to the module-level `activeDetailTab` variable. It reads only the parameter. It writes the `activeDetailTab` module-level variable to the provided value and returns `undefined` implicitly. It calls no other functions.

### setActiveCategory
The function accepts a `string | null` parameter and assigns it directly to the module-level `activeCategory` variable. It reads only the parameter. It writes the `activeCategory` module-level variable to the provided value and returns `undefined` implicitly. It calls no other functions.

### setSelectedEmoji
The function accepts a `string` parameter and assigns it directly to the module-level `selectedEmoji` variable. It reads only the parameter. It writes the `selectedEmoji` module-level variable to the provided value and returns `undefined` implicitly. It calls no other functions.

### setCurrentGroupId
The function accepts a `string | null` parameter and assigns it directly to the module-level `currentGroupId` variable. It reads only the parameter. It writes the `currentGroupId` module-level variable to the provided value and returns `undefined` implicitly. It calls no other functions.

### setIsMember
The function accepts a `boolean` parameter and assigns it directly to the module-level `isMember` variable. It reads only the parameter. It writes the `isMember` module-level variable to the provided value and returns `undefined` implicitly. It calls no other functions.

### setCallerRole
The function accepts a `string | null` parameter and assigns it directly to the module-level `callerRole` variable. It reads only the parameter. It writes the `callerRole` module-level variable to the provided value and returns `undefined` implicitly. It calls no other functions.

## Agent 02

### setSb
Accepts a SupabaseClient instance or null. Assigns the received parameter to the module-level `sb` variable. Returns undefined. This function has no parameters other than the value and reads nothing from external state.

### setCurrentUser
Accepts a User object or null. Assigns the received parameter to the module-level `currentUser` variable. Returns undefined. This function reads nothing from external state and performs only the direct assignment.

### setActiveTab
Accepts a string value. Assigns the received parameter to the module-level `activeTab` variable. Returns undefined. This function performs a simple state assignment with no side effects or external interactions.

### setActiveDetailTab
Accepts a string value. Assigns the received parameter to the module-level `activeDetailTab` variable. Returns undefined. This function reads nothing from external state beyond its parameter and performs only the direct assignment.

### setActiveCategory
Accepts a string or null. Assigns the received parameter to the module-level `activeCategory` variable. Returns undefined. This function performs a straightforward assignment with no branching or external interactions.

### setSelectedEmoji
Accepts a string value. Assigns the received parameter to the module-level `selectedEmoji` variable. Returns undefined. This function reads only its parameter and writes only to the `selectedEmoji` module-level state.

### setCurrentGroupId
Accepts a string or null. Assigns the received parameter to the module-level `currentGroupId` variable. Returns undefined. This function performs a direct state assignment with no side effects.

### setIsMember
Accepts a boolean value. Assigns the received parameter to the module-level `isMember` variable. Returns undefined. This function reads only its parameter and writes only to module-level state.

### setCallerRole
Accepts a string or null. Assigns the received parameter to the module-level `callerRole` variable. Returns undefined. This function performs a simple assignment with no additional operations or external state interactions.

## Agent 03

### setSb
When `setSb` is called with a `SupabaseClient | null` argument, it assigns that value directly to the module-level variable `sb`. The function reads the parameter value and writes the module-level `sb` state. It performs no other operations, makes no other function calls, and has no control flow branches. The function is synchronous and returns undefined.

### setCurrentUser
When `setCurrentUser` is called with a `User | null` argument, it assigns that value directly to the module-level variable `currentUser`. The function reads the parameter value and writes the module-level `currentUser` state. It performs no other operations, makes no other function calls, and has no control flow branches. The function is synchronous and returns undefined.

### setActiveTab
When `setActiveTab` is called with a string argument, it assigns that value directly to the module-level variable `activeTab`. The function reads the parameter value and writes the module-level `activeTab` state. It performs no other operations, makes no other function calls, and has no control flow branches. The function is synchronous and returns undefined.

### setActiveDetailTab
When `setActiveDetailTab` is called with a string argument, it assigns that value directly to the module-level variable `activeDetailTab`. The function reads the parameter value and writes the module-level `activeDetailTab` state. It performs no other operations, makes no other function calls, and has no control flow branches. The function is synchronous and returns undefined.

### setActiveCategory
When `setActiveCategory` is called with a `string | null` argument, it assigns that value directly to the module-level variable `activeCategory`. The function reads the parameter value and writes the module-level `activeCategory` state. It performs no other operations, makes no other function calls, and has no control flow branches. The function is synchronous and returns undefined.

### setSelectedEmoji
When `setSelectedEmoji` is called with a string argument, it assigns that value directly to the module-level variable `selectedEmoji`. The function reads the parameter value and writes the module-level `selectedEmoji` state. It performs no other operations, makes no other function calls, and has no control flow branches. The function is synchronous and returns undefined.

### setCurrentGroupId
When `setCurrentGroupId` is called with a `string | null` argument, it assigns that value directly to the module-level variable `currentGroupId`. The function reads the parameter value and writes the module-level `currentGroupId` state. It performs no other operations, makes no other function calls, and has no control flow branches. The function is synchronous and returns undefined.

### setIsMember
When `setIsMember` is called with a boolean argument, it assigns that value directly to the module-level variable `isMember`. The function reads the parameter value and writes the module-level `isMember` state. It performs no other operations, makes no other function calls, and has no control flow branches. The function is synchronous and returns undefined.

### setCallerRole
When `setCallerRole` is called with a `string | null` argument, it assigns that value directly to the module-level variable `callerRole`. The function reads the parameter value and writes the module-level `callerRole` state, which holds the caller's role in the currently open group according to the comment on line 19. It performs no other operations, makes no other function calls, and has no control flow branches. The function is synchronous and returns undefined.

## Agent 04

### setSb
This function accepts a parameter `val` of type `SupabaseClient | null` and writes that value directly to the module-level `sb` variable, replacing its previous value. It performs no other operations—no API calls, no control flow, no state reads other than the parameter. It has no return value.

### setCurrentUser
This function accepts a parameter `val` of type `User | null` and writes that value directly to the module-level `currentUser` variable, replacing its previous value. It performs no other operations—no API calls, no control flow, no state reads other than the parameter. It has no return value.

### setActiveTab
This function accepts a parameter `val` of type `string` and writes that value directly to the module-level `activeTab` variable, replacing its previous value. It performs no other operations—no API calls, no control flow, no state reads other than the parameter. It has no return value.

### setActiveDetailTab
This function accepts a parameter `val` of type `string` and writes that value directly to the module-level `activeDetailTab` variable, replacing its previous value. It performs no other operations—no API calls, no control flow, no state reads other than the parameter. It has no return value.

### setActiveCategory
This function accepts a parameter `val` of type `string | null` and writes that value directly to the module-level `activeCategory` variable, replacing its previous value. It performs no other operations—no API calls, no control flow, no state reads other than the parameter. It has no return value.

### setSelectedEmoji
This function accepts a parameter `val` of type `string` and writes that value directly to the module-level `selectedEmoji` variable, replacing its previous value. It performs no other operations—no API calls, no control flow, no state reads other than the parameter. It has no return value.

### setCurrentGroupId
This function accepts a parameter `val` of type `string | null` and writes that value directly to the module-level `currentGroupId` variable, replacing its previous value. It performs no other operations—no API calls, no control flow, no state reads other than the parameter. It has no return value.

### setIsMember
This function accepts a parameter `val` of type `boolean` and writes that value directly to the module-level `isMember` variable, replacing its previous value. It performs no other operations—no API calls, no control flow, no state reads other than the parameter. It has no return value.

### setCallerRole
This function accepts a parameter `val` of type `string | null` and writes that value directly to the module-level `callerRole` variable, replacing its previous value. The comment on line 19 indicates that `callerRole` stores the caller's role in the currently open group. The function performs no other operations—no API calls, no control flow, no state reads other than the parameter. It has no return value.

## Agent 05

### setSb
This function accepts a SupabaseClient instance or null. It reads the parameter `val`. It writes to the module-level `sb` variable, assigning `val` directly to it. It has no control flow beyond the simple assignment and does not call any other functions.

### setCurrentUser
This function accepts a User object or null. It reads the parameter `val`. It writes to the module-level `currentUser` variable, assigning `val` directly to it. It has no control flow beyond the simple assignment and does not call any other functions.

### setActiveTab
This function accepts a string parameter. It reads the parameter `val`. It writes to the module-level `activeTab` variable, assigning `val` directly to it. It has no control flow beyond the simple assignment and does not call any other functions.

### setActiveDetailTab
This function accepts a string parameter. It reads the parameter `val`. It writes to the module-level `activeDetailTab` variable, assigning `val` directly to it. It has no control flow beyond the simple assignment and does not call any other functions.

### setActiveCategory
This function accepts a string or null parameter. It reads the parameter `val`. It writes to the module-level `activeCategory` variable, assigning `val` directly to it. It has no control flow beyond the simple assignment and does not call any other functions.

### setSelectedEmoji
This function accepts a string parameter. It reads the parameter `val`. It writes to the module-level `selectedEmoji` variable, assigning `val` directly to it. It has no control flow beyond the simple assignment and does not call any other functions.

### setCurrentGroupId
This function accepts a string or null parameter. It reads the parameter `val`. It writes to the module-level `currentGroupId` variable, assigning `val` directly to it. It has no control flow beyond the simple assignment and does not call any other functions.

### setIsMember
This function accepts a boolean parameter. It reads the parameter `val`. It writes to the module-level `isMember` variable, assigning `val` directly to it. It has no control flow beyond the simple assignment and does not call any other functions.

### setCallerRole
This function accepts a string or null parameter. It reads the parameter `val`. It writes to the module-level `callerRole` variable, assigning `val` directly to it. It has no control flow beyond the simple assignment and does not call any other functions.
