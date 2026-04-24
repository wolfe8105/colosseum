/**
 * THE MODERATOR — Settings Page Controller (TypeScript)
 *
 * Extracted from moderator-settings.html inline script.
 * Refactored: split into helpers, load, save, moderator, wiring sub-modules.
 *
 * Migration: Session 128 (Phase 4)
 */

import {
  ready, getCurrentUser, getIsPlaceholderMode, getSupabaseClient,
} from '../auth.ts';
import { loadSettings } from './settings.load.ts';
import { loadModeratorSettings, wireModeratorToggles } from './settings.moderator.ts';
import { wireSettings, wireIntroMusicRow } from './settings.wiring.ts';
import { setChecked } from './settings.helpers.ts';
import { loadBlockedUsers } from './settings.blocks.ts';

// LANDMINE [LM-SET-001]: Uses Promise.race([ready, setTimeout(6000)]) — same auth race
// as home.ts before M-C4 was fixed. Slow auth silently redirects to plinko with no UI.
window.addEventListener('DOMContentLoaded', async () => {
  await Promise.race([ready, new Promise<void>(r => setTimeout(r, 6000))]);

  if (!getCurrentUser() && !getIsPlaceholderMode()) {
    window.location.href = 'moderator-plinko.html';
    return;
  }

  loadSettings();
  loadModeratorSettings();
  wireSettings();
  wireModeratorToggles();
  void loadBlockedUsers();

  // SESSION 52: Load toggles from user_settings table (overrides localStorage)
  const user = getCurrentUser() as { id?: string } | null;
  const uid = user?.id;
  const sb = getSupabaseClient() as { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: Record<string, boolean | null> | null; error: unknown }> } } } } | null;

  if (uid && sb) {
    const { data, error } = await sb
      .from('user_settings')
      .select('*')
      .eq('user_id', uid)
      .single();

    if (!error && data) {
      const toggleMap: Record<string, boolean | null> = {
        'set-notif-challenge': data.notif_challenge,
        'set-notif-debate': data.notif_debate,
        'set-notif-follow': data.notif_follow,
        'set-notif-reactions': data.notif_reactions,
        'set-notif-rivals': data.notif_rivals,
        'set-notif-economy': data.notif_economy,
        'set-audio-sfx': data.audio_sfx,
        'set-audio-mute': data.audio_mute,
        'set-privacy-public': data.privacy_public,
        'set-privacy-online': data.privacy_online,
        'set-privacy-challenges': data.privacy_challenges,
      };
      for (const [id, val] of Object.entries(toggleMap)) {
        if (val !== null && val !== undefined) setChecked(id, val);
      }
    }
  }

  await wireIntroMusicRow();
});
