// Thin orchestrator — preserves existing import paths for all callers.
// Logic lives in the three sub-files below.

// LANDMINE [LM-MODREFS-001]: safeRpc was imported in the original but never
// used by any function in this file. Dropped in split.
// LANDMINE [LM-MODREFS-002]: getCurrentProfile was imported in the original
// but never used. Dropped in split.
// LANDMINE [LM-MODREFS-003]: getDebateReferences was imported in the original
// but never used. Dropped in split.
// LANDMINE [LM-MODREFS-004]: shieldActive (arena-state) was imported in the
// original but never used. Dropped in split.
// LANDMINE [LM-MODREFS-005]: set_shieldActive (arena-state) was imported in
// the original but never used. Dropped in split.
// LANDMINE [LM-MODREFS-006]: removeShieldIndicator (powerups) was imported in
// the original but never used. Dropped in split.

export { assignSelectedMod, addReferenceButton, showReferenceForm, hideReferenceForm } from './arena-mod-refs-form.ts';
export { showRulingPanel, startReferencePoll, stopReferencePoll } from './arena-mod-refs-ruling.ts';
export { requestAIModRuling } from './arena-mod-refs-ai.ts';
