/**
 * THE MODERATOR — Reference Arsenal (orchestrator)
 *
 * Re-exports all public API and sets up the window bridge.
 * 945 → 9 files decomposition (Session 252+).
 */

// Types
export type {
  ArsenalReference,
  ForgeParams,
  ForgeResult,
  EditResult,
  SecondResult,
  ChallengeResult,
  LoadoutRef,
  CiteResult2,
  ChallengeResult2,
  SourceType,
  ReferenceCategory,
  Rarity,
  ChallengeStatus,
} from './reference-arsenal.types.ts';

// Constants
export { SOURCE_TYPES, CATEGORIES, CATEGORY_LABELS, RARITY_COLORS, CHALLENGE_STATUS_LABELS } from './reference-arsenal.constants.ts';

// Utils
export { compositeScore, powerDisplay } from './reference-arsenal.utils.ts';

// RPCs (arsenal management)
export { forgeReference, editReference, deleteReference, secondReference, citeReference, challengeReference } from './reference-arsenal.rpc.ts';

// RPCs (debate context)
export { saveDebateLoadout, getMyDebateLoadout, citeDebateReference, fileReferenceChallenge } from './reference-arsenal.debate.ts';

// Forge form
export { showForgeForm } from './reference-arsenal.forge.ts';

// Renderers
export { renderReferenceCard, renderArsenal, renderLibrary } from './reference-arsenal.render.ts';

// Loadout picker
export { renderLoadoutPicker } from './reference-arsenal.loadout.ts';

// ============================================================
// WINDOW BRIDGE
// ============================================================

import { forgeReference, editReference, deleteReference, secondReference, citeReference, challengeReference } from './reference-arsenal.rpc.ts';
import { showForgeForm } from './reference-arsenal.forge.ts';
import { renderArsenal, renderLibrary, renderReferenceCard } from './reference-arsenal.render.ts';
import { compositeScore, powerDisplay } from './reference-arsenal.utils.ts';
import { saveDebateLoadout, getMyDebateLoadout, citeDebateReference, fileReferenceChallenge } from './reference-arsenal.debate.ts';
import { renderLoadoutPicker } from './reference-arsenal.loadout.ts';
import { SOURCE_TYPES, CATEGORIES } from './reference-arsenal.constants.ts';

(window as unknown as Record<string, unknown>).ModeratorArsenal = {
  forgeReference,
  editReference,
  deleteReference,
  secondReference,
  citeReference,
  challengeReference,
  showForgeForm,
  renderArsenal,
  renderLibrary,
  renderReferenceCard,
  compositeScore,
  powerDisplay,
  saveDebateLoadout,
  getMyDebateLoadout,
  citeDebateReference,
  fileReferenceChallenge,
  renderLoadoutPicker,
  SOURCE_TYPES,
  CATEGORIES,
};
