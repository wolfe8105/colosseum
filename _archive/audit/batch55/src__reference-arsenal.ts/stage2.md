# Stage 2 Outputs — reference-arsenal.ts

## Agent 01
No functions to describe. Anchor list is empty.

This file serves as a barrel/re-export module and window bridge orchestrator for the Reference Arsenal system. It re-exports type definitions from reference-arsenal.types.ts, constants from reference-arsenal.constants.ts, utilities (compositeScore, powerDisplay) from reference-arsenal.utils.ts, and RPC functions from reference-arsenal.rpc.ts, along with debate-related RPCs and rendering functions. The window bridge assigns these public API functions and constants to a global `window.ModeratorArsenal` object.

## Agent 02
No functions to describe. Anchor list is empty.

This file is a pure barrel/re-export module that orchestrates the public API for the Reference Arsenal system. It re-exports types, constants, utility functions, and a comprehensive set of RPC handlers for arsenal management, debate context operations, rendering, and loadout picking across nine decomposed files. The file also establishes a window bridge by importing these functions and attaching them to a global `ModeratorArsenal` object.

## Agent 03
No functions to describe. Anchor list is empty.

This file serves as an orchestration module that re-exports the public API surface of the reference arsenal system. The top-level statements consist of named type exports from the types sub-module, followed by constant exports and utility function exports from their respective sub-modules. The file then imports a curated set of RPCs, renderers, utility functions, and constants and assigns them to a `ModeratorArsenal` object on the window global.

## Agent 04
No functions to describe. Anchor list is empty.

The file serves as an orchestrator for the Reference Arsenal module. It re-exports types, constants, and utilities from nine sub-modules (types, constants, utils, rpc, debate, forge, render, armory, and loadout), then sets up a window bridge by importing key functions and constants and assigning them to `window.ModeratorArsenal`, making the arsenal API accessible globally in the browser.

## Agent 05
No functions to describe. Anchor list is empty.

The file is an orchestrator that re-exports the complete public API from nine sub-modules (types, constants, utilities, RPCs, renderers, and UI components). It imports specific named exports from these modules and exposes them via a window bridge object assigned to `window.ModeratorArsenal`. The file contains no top-level function definitions—only type exports (lines 9–25), constant exports (line 28), utility and RPC exports (lines 31–48), and then a second section (lines 54–83) that imports those same items to assemble them into a single window-accessible object.
