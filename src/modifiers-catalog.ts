/**
 * THE MODERATOR — F-57 Modifier Catalog Cache
 * 60-minute TTL cache for the modifier effect catalog.
 */

import { safeRpc } from './auth.ts';
import type { ModifierEffect } from './modifiers.ts';

// LANDMINE [LM-MODS-001]: The 60-minute catalog cache never invalidates on auth
// state change. If a user logs out and a different user logs in, the cached catalog
// persists across the session boundary. Catalog is probably not user-specific so
// this is likely benign, but worth flagging for a follow-up auth-hook wiring.
let _catalogCache: ModifierEffect[] | null = null;
let _catalogFetchedAt = 0;
const CATALOG_TTL_MS = 60 * 60 * 1000;

export async function getModifierCatalog(): Promise<ModifierEffect[]> {
  const now = Date.now();
  if (_catalogCache && now - _catalogFetchedAt < CATALOG_TTL_MS) {
    return _catalogCache;
  }

  const result = await safeRpc('get_modifier_catalog');
  if (result.error || !Array.isArray(result.data)) {
    console.error('[Modifiers] catalog fetch failed:', result.error);
    return _catalogCache ?? [];
  }

  _catalogCache = result.data as ModifierEffect[];
  _catalogFetchedAt = now;
  return _catalogCache;
}

/** Get a single effect by id. Hits catalog cache. */
export async function getEffect(effectId: string): Promise<ModifierEffect | null> {
  const catalog = await getModifierCatalog();
  return catalog.find(e => e.id === effectId) ?? null;
}

/** Filter catalog by timing bucket. */
export async function getEndOfDebateEffects(): Promise<ModifierEffect[]> {
  const catalog = await getModifierCatalog();
  return catalog.filter(e => e.timing === 'end_of_debate');
}

export async function getInDebateEffects(): Promise<ModifierEffect[]> {
  const catalog = await getModifierCatalog();
  return catalog.filter(e => e.timing === 'in_debate');
}
