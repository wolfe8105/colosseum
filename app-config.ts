/**
 * THE MODERATOR — App Config Loader (TypeScript)
 *
 * Fetches economy constants from Supabase app_config table via get_app_config() RPC.
 * Single fetch per page load, cached in module scope.
 * Falls back to hardcoded values if fetch fails.
 *
 * Session 195 (L1).
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.ts';

// ============================================================
// TYPES
// ============================================================

interface AppConfigRow {
  tokens?: number;
  freezes?: number;
  cost?: number;
}

type AppConfigMap = Record<string, AppConfigRow>;

// ============================================================
// FALLBACKS (match current hardcoded values exactly)
// ============================================================

const FALLBACK: AppConfigMap = {
  milestone_first_hot_take:    { tokens: 25,  freezes: 0 },
  milestone_first_debate:      { tokens: 50,  freezes: 0 },
  milestone_first_vote:        { tokens: 10,  freezes: 0 },
  milestone_first_reaction:    { tokens: 5,   freezes: 0 },
  milestone_first_ai_sparring: { tokens: 15,  freezes: 0 },
  milestone_first_prediction:  { tokens: 10,  freezes: 0 },
  milestone_profile_3_sections:  { tokens: 30,  freezes: 0 },
  milestone_profile_6_sections:  { tokens: 75,  freezes: 0 },
  milestone_profile_12_sections: { tokens: 150, freezes: 0 },
  milestone_verified_gladiator:  { tokens: 100, freezes: 0 },
  milestone_streak_7:   { tokens: 0, freezes: 1 },
  milestone_streak_30:  { tokens: 0, freezes: 3 },
  milestone_streak_100: { tokens: 0, freezes: 5 },
  powerup_multiplier_2x: { cost: 15 },
  powerup_silence:       { cost: 20 },
  powerup_shield:        { cost: 25 },
  powerup_reveal:        { cost: 10 },
};

// ============================================================
// MODULE CACHE
// ============================================================

let _cache: AppConfigMap | null = null;
let _fetchPromise: Promise<AppConfigMap> | null = null;

async function _load(): Promise<AppConfigMap> {
  if (_cache) return _cache;

  // Deduplicate concurrent calls — only one fetch in flight
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async (): Promise<AppConfigMap> => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_app_config`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as AppConfigMap;
      if (!data || typeof data !== 'object') throw new Error('Invalid response');

      _cache = data;
      return _cache;
    } catch (err) {
      console.warn('[app-config] Failed to load from DB, using fallback:', (err as Error).message);
      return FALLBACK;
    } finally {
      _fetchPromise = null;
    }
  })();

  return _fetchPromise;
}

// ============================================================
// PUBLIC API
// ============================================================

/** Call once during module init to warm the cache. */
export async function initAppConfig(): Promise<void> {
  await _load();
}

/** Token amount for a milestone key. Falls back to hardcoded if not in DB. */
export async function getMilestoneTokens(key: string): Promise<number> {
  const cfg = await _load();
  const row = cfg[`milestone_${key}`] ?? FALLBACK[`milestone_${key}`];
  return row?.tokens ?? 0;
}

/** Freeze count for a milestone key. Falls back to hardcoded if not in DB. */
export async function getMilestoneFreezes(key: string): Promise<number> {
  const cfg = await _load();
  const row = cfg[`milestone_${key}`] ?? FALLBACK[`milestone_${key}`];
  return row?.freezes ?? 0;
}

/** Token cost for a power-up id. Falls back to hardcoded if not in DB. */
export async function getPowerUpCost(id: string): Promise<number> {
  const cfg = await _load();
  const row = cfg[`powerup_${id}`] ?? FALLBACK[`powerup_${id}`];
  return row?.cost ?? 0;
}
