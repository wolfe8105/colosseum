# Stage 1 Outputs — staking.wire.ts

## Agent 01
1. Comment (lines 1-6)
2. Blank
3. Import: `placeStake` from `'./staking.rpc.ts'`
4. Import (type-only): `StakeResult` from `'./staking.types.ts'`
5. Blank
6. Bind name to function definition: `_updateConfirmButton`
7. Blank/Comment (line 33: JSDoc)
8. Bind name to function definition (exported): `wireStakingPanel`

## Agent 02
1. Comment (lines 1-6: JSDoc block)
2. Import (line 8: `import { placeStake } from './staking.rpc.ts'`)
3. Type import (line 9: `import type { StakeResult } from './staking.types.ts'`)
4. Bind name to function definition (line 11: `_updateConfirmButton`)
5. Blank (line 32)
6. Comment (line 33: JSDoc comment)
7. Bind name to function definition, exported (line 34: `export function wireStakingPanel`)

## Agent 03
1. Comment (lines 1-6)
2. Import (line 8): `placeStake` from './staking.rpc.ts'
3. Import (line 9): type-only import of `StakeResult` from './staking.types.ts'
4. Bind name to function definition (line 11): `_updateConfirmButton`
5. Bind name to function definition (exported, line 34): `wireStakingPanel`
6. Blank (line 106)

## Agent 04
1. Comment (lines 1-6)
2. Import (line 8): `placeStake` from './staking.rpc.ts'
3. Import type-only (line 9): `StakeResult` from './staking.types.ts'
4. Bind name to function definition (line 11): `_updateConfirmButton` (not exported)
5. [Top-level statements inside _updateConfirmButton body — Agent 04 misclassified these]
6. Bind name to function definition (line 34): `wireStakingPanel` (exported)
7. [Top-level statements inside wireStakingPanel body — Agent 04 misclassified these]

## Agent 05
1. import (`placeStake` from './staking.rpc.ts')
2. import type (`StakeResult` from './staking.types.ts')
3. bind name to function definition (`_updateConfirmButton`)
4. bind name to function definition, exported (`wireStakingPanel`)
