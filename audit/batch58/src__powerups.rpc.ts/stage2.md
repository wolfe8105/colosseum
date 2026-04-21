# Stage 2 Outputs — powerups.rpc.ts

## Agent 01

### buy

The function receives a power-up ID, an optional quantity (default 1), and an optional cost. It first reads the current token balance from the `getBalance()` function if a cost value is provided. If the balance exists and is less than the provided cost, it returns immediately with a failure object containing an insufficient balance error message. Otherwise, it calls `safeRpc()` to invoke the RPC `'buy_power_up'` with parameters for the power-up ID and quantity. The RPC call is awaited. If the RPC response has an error field, the function extracts the message property from the error object and returns a failure object with that message, or a generic 'Purchase failed' fallback. If the RPC succeeds, it returns the data property from the response, or a 'No response' error if data is undefined. The function is async and awaits the RPC call.

### equip

The function receives a debate ID, a power-up ID, and a slot number. It calls `safeRpc()` to invoke the RPC `'equip_power_up'` with parameters for the debate ID, power-up ID, and slot number. The RPC call is awaited. If the RPC response has an error field, the function extracts the message property from the error object and returns a failure object with that message, or a generic 'Equip failed' fallback. If the RPC succeeds, it returns the data property from the response, or a 'No response' error if data is undefined. The function is async and awaits the RPC call.

### activate

The function receives a debate ID and a power-up ID. It calls `safeRpc()` to invoke the RPC `'activate_power_up'` with parameters for the debate ID and power-up ID. The RPC call is awaited. If the RPC response has an error field, the function extracts the message property from the error object and returns a failure object with that message, or a generic 'Activation failed' fallback. If the RPC succeeds, it returns the data property from the response, or a 'No response' error if data is undefined. The function is async and awaits the RPC call.

### getMyPowerUps

The function optionally receives a debate ID, which defaults to null. It initializes a local variable `empty` to a failure object with empty inventory and equipped arrays and zero questions answered. It creates a local parameters object and conditionally adds a `p_debate_id` field to it if a debate ID was provided. It calls `safeRpc()` to invoke the RPC `'get_my_power_ups'` with the parameters object. The RPC call is awaited. If the RPC response has an error field, the function returns the `empty` object immediately. Otherwise, it returns the data property from the response, or the `empty` object if data is undefined. The function is async and awaits the RPC call.

### getOpponentPowerUps

The function receives a debate ID. It calls `safeRpc()` to invoke the RPC `'get_opponent_power_ups'` with a parameter for the debate ID. The RPC call is awaited. If the RPC response has an error field, the function returns an object with success false and an empty equipped array. Otherwise, it returns the data property from the response, or an object with success false and an empty equipped array if data is undefined. The function is async and awaits the RPC call.

## Agent 02

### buy

The `buy` function reads the `powerUpId`, `quantity` (defaulting to 1), and optional `cost` parameters. If `cost` is provided, it reads the current token balance via `getBalance()` from the tokens module. If a balance exists and the cost exceeds it, the function immediately returns an object with `success: false` and an error message showing the insufficient balance. Otherwise, it makes an awaited call to `safeRpc<PowerUpResult>('buy_power_up', ...)` passing the power-up ID and quantity as parameters to the server. If the RPC result contains an error, it extracts the error message from the response and returns failure. If there is no error, it returns the data payload from the RPC result, or returns a failure object if the data is null.

### equip

The `equip` function reads the `debateId`, `powerUpId`, and `slotNumber` parameters. It makes an awaited call to `safeRpc<PowerUpResult>('equip_power_up', ...)` passing these parameters to the server with the keys `p_debate_id`, `p_power_up_id`, and `p_slot_number`. If the RPC result contains an error, it extracts the error message from the response object (or falls back to the string 'Equip failed') and returns an object with `success: false`. If there is no error, it returns the data payload from the RPC result, or returns a failure object if the data is null.

### activate

The `activate` function reads the `debateId` and `powerUpId` parameters. It makes an awaited call to `safeRpc<PowerUpResult>('activate_power_up', ...)` passing these parameters to the server with the keys `p_debate_id` and `p_power_up_id`. If the RPC result contains an error, it extracts the error message from the response object (or falls back to the string 'Activation failed') and returns an object with `success: false`. If there is no error, it returns the data payload from the RPC result, or returns a failure object if the data is null.

### getMyPowerUps

The `getMyPowerUps` function reads an optional `debateId` parameter (defaulting to null). It initializes a local `empty` variable containing a `MyPowerUpsResult` object with `success: false`, an empty inventory array, an empty equipped array, and `questions_answered: 0`. It builds a params object, conditionally adding the `p_debate_id` key if `debateId` is provided. It makes an awaited call to `safeRpc<MyPowerUpsResult>('get_my_power_ups', params)` with those parameters. If the RPC result contains an error, the function returns the `empty` object without examining the error details. If there is no error, it returns the data payload from the RPC result, or returns the `empty` object if the data is null.

### getOpponentPowerUps

The `getOpponentPowerUps` function reads the `debateId` parameter. It makes an awaited call to `safeRpc<{ success: boolean; equipped: EquippedItem[] }>('get_opponent_power_ups', ...)` passing the debate ID as the parameter with the key `p_debate_id`. If the RPC result contains an error, it returns an object with `success: false` and an empty `equipped` array. If there is no error, it returns the data payload from the RPC result, or returns an object with `success: false` and an empty `equipped` array if the data is null.

## Agent 03

### buy

The `buy` function reads the `powerUpId`, `quantity`, and optional `cost` parameters. If `cost` is provided, it reads the current balance by calling `getBalance()` from the tokens module. When the balance is available and the cost exceeds it, the function returns early with a failure object containing the insufficient balance message. When cost validation passes or is skipped, the function calls `safeRpc()` with the string `'buy_power_up'` and an object containing `p_power_up_id`, `p_quantity` fields. If the RPC response contains an error, the function extracts the message property (with a fallback to `'Purchase failed'`) and returns a failure object. If no error is present, the function returns either the `result.data` object or a default failure object with `'No response'`. The function is async and awaits the `safeRpc()` call.

### equip

The `equip` function reads the `debateId`, `powerUpId`, and `slotNumber` parameters. It calls `safeRpc()` with the string `'equip_power_up'` and an object containing `p_debate_id`, `p_power_up_id`, and `p_slot_number` fields. If the RPC response contains an error, the function extracts the message property (with a fallback to `'Equip failed'`) and returns a failure object. If no error is present, the function returns either the `result.data` object or a default failure object with `'No response'`. The function is async and awaits the `safeRpc()` call.

### activate

The `activate` function reads the `debateId` and `powerUpId` parameters. It calls `safeRpc()` with the string `'activate_power_up'` and an object containing `p_debate_id` and `p_power_up_id` fields. If the RPC response contains an error, the function extracts the message property (with a fallback to `'Activation failed'`) and returns a failure object. If no error is present, the function returns either the `result.data` object or a default failure object with `'No response'`. The function is async and awaits the `safeRpc()` call.

### getMyPowerUps

The `getMyPowerUps` function reads the optional `debateId` parameter. It initializes a local variable `empty` with a default `MyPowerUpsResult` object containing empty inventory and equipped arrays, zero questions answered, and false success. It creates an empty `params` object and, if `debateId` is truthy, assigns it to the `p_debate_id` property. The function calls `safeRpc()` with the string `'get_my_power_ups'` and the `params` object. If the RPC response contains an error, the function returns the `empty` object without examining the error details. If no error is present, the function returns either the `result.data` object or the `empty` object as a fallback. The function is async and awaits the `safeRpc()` call.

### getOpponentPowerUps

The `getOpponentPowerUps` function reads the required `debateId` parameter. It calls `safeRpc()` with the string `'get_opponent_power_ups'` and an object containing `p_debate_id`. If the RPC response contains an error, the function returns an object with `success: false` and an empty `equipped` array. If no error is present, the function returns either the `result.data` object or a default object with `success: false` and an empty `equipped` array. The function is async and awaits the `safeRpc()` call.

## Agent 04

### buy

The function accepts a power-up ID, quantity (default 1), and optional cost. If a cost is provided, it reads the current balance via `getBalance()` from the tokens module. If balance exists and is less than the provided cost, the function returns early with a failure result indicating insufficient balance. Otherwise, it calls `safeRpc()` awaiting the result of an RPC named 'buy_power_up' with three parameters: the power-up ID, quantity, and cost. If the RPC returns an error property, the function extracts the error message (or uses a fallback 'Purchase failed' string) and returns a failure result. If no error occurs, it returns the data portion of the RPC result, or a failure result with 'No response' if data is undefined.

### equip

The function accepts a debate ID, power-up ID, and slot number. It calls `safeRpc()` awaiting the result of an RPC named 'equip_power_up' with three parameters: debate ID, power-up ID, and slot number. If the RPC returns an error property, the function extracts the error message (or uses a fallback 'Equip failed' string) and returns a failure result. Otherwise, it returns the data portion of the RPC result, or a failure result with 'No response' if data is undefined.

### activate

The function accepts a debate ID and power-up ID. It calls `safeRpc()` awaiting the result of an RPC named 'activate_power_up' with two parameters: debate ID and power-up ID. If the RPC returns an error property, the function extracts the error message (or uses a fallback 'Activation failed' string) and returns a failure result. Otherwise, it returns the data portion of the RPC result, or a failure result with 'No response' if data is undefined.

### getMyPowerUps

The function accepts an optional debate ID (null by default). It initializes a local variable `empty` to a failure result containing an empty inventory array, empty equipped array, and zero questions_answered count. It then builds a parameters object, adding the debate ID to it only if one was provided. It calls `safeRpc()` awaiting the result of an RPC named 'get_my_power_ups' with the constructed parameters. If the RPC returns an error property, the function returns the `empty` object. Otherwise, it returns the data portion of the RPC result, or the `empty` object if data is undefined.

### getOpponentPowerUps

The function accepts a debate ID. It calls `safeRpc()` awaiting the result of an RPC named 'get_opponent_power_ups' with one parameter: debate ID. If the RPC returns an error property, the function returns a failure result with an empty equipped array. Otherwise, it returns the data portion of the RPC result, or a failure result with an empty equipped array if data is undefined.

## Agent 05

### buy

The function reads the `cost` parameter and the module-level balance (via `getBalance()`). When `cost` is provided and is not null, it retrieves the current balance and returns early with a failure result if the balance is insufficient. The function then calls `safeRpc()` with the method `'buy_power_up'` and parameters `p_power_up_id`, `p_quantity`, and awaits the result. If the RPC returns an error, it extracts the error message and returns a failure result. If the RPC succeeds but has no data, it returns a generic failure. Otherwise, it returns the data from the RPC response.

### equip

The function is async and reads the `debateId`, `powerUpId`, and `slotNumber` parameters. It calls `safeRpc()` with the method `'equip_power_up'` and the three parameters (mapped to `p_debate_id`, `p_power_up_id`, and `p_slot_number`) and awaits the result. If the RPC returns an error, it extracts the message and returns a failure result with the text "Equip failed". If the RPC succeeds but returns no data, it returns a generic failure. Otherwise, it returns the data from the RPC response.

### activate

The function is async and reads the `debateId` and `powerUpId` parameters. It calls `safeRpc()` with the method `'activate_power_up'` and the two parameters (mapped to `p_debate_id` and `p_power_up_id`) and awaits the result. If the RPC returns an error, it extracts the message and returns a failure result with the text "Activation failed". If the RPC succeeds but returns no data, it returns a generic failure. Otherwise, it returns the data from the RPC response.

### getMyPowerUps

The function is async and reads the optional `debateId` parameter. It initializes a local empty result object with empty inventory and equipped arrays plus a zero questions_answered count. It creates a parameters object; if `debateId` is provided, it sets `p_debate_id` in the parameters. It calls `safeRpc()` with the method `'get_my_power_ups'` and the parameters object and awaits the result. If the RPC returns an error, it returns the empty result object. If the RPC succeeds, it returns the data if present, otherwise the empty result.

### getOpponentPowerUps

The function is async and reads the `debateId` parameter. It calls `safeRpc()` with the method `'get_opponent_power_ups'` and the parameter `p_debate_id` and awaits the result. If the RPC returns an error, it returns an object with `success: false` and an empty equipped array. If the RPC succeeds, it returns the data if present, otherwise an object with `success: false` and an empty equipped array.
