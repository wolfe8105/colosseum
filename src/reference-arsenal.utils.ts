/**
 * THE MODERATOR — Reference Arsenal Utils
 *
 * Pure helper functions. No side effects, no DOM, no RPC.
 */

import type { ArsenalReference } from './reference-arsenal.types.ts';
import { SOURCE_TYPES } from './reference-arsenal.constants.ts';

/** Composite score for display */
export function compositeScore(ref: ArsenalReference): number {
  return (ref.seconds * 2) + ref.strikes;
}

/** Power display string */
export function powerDisplay(ref: ArsenalReference): string {
  const srcInfo = SOURCE_TYPES[ref.source_type];
  const ceiling = srcInfo ? srcInfo.ceiling : 1;
  return `${Number(ref.current_power)}/${ceiling + (ref.graduated ? 1 : 0)}`;
}
