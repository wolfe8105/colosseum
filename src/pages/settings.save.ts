/**
 * THE MODERATOR — Settings Save
 * saveSettings — validates, writes localStorage, calls RPCs.
 */

import { updateProfile, safeRpc } from '../auth.ts';
import { isAnyPlaceholder } from '../config.ts';
import { toast, getEl, getChecked } from './settings.helpers.ts';
import type { SettingsData } from './settings.helpers.ts';

const isPlaceholder: boolean = isAnyPlaceholder;

// FIXED [LM-SET-002]: Now async, awaits RPCs, uses try/finally for button state.
export async function saveSettings(): Promise<void> {
  const saveBtn = getEl<HTMLButtonElement>('save-btn');
  if (saveBtn?.disabled) return;
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Saving...'; }

  const displayName = getEl<HTMLInputElement>('set-display-name')?.value.trim() ?? '';
  const username = getEl<HTMLInputElement>('set-username')?.value.trim() ?? '';
  const bio = getEl<HTMLTextAreaElement>('set-bio')?.value.trim() ?? '';

  if (username && (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username))) {
    toast('❌ Username: 3-20 chars, letters/numbers/underscores only');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 SAVE CHANGES'; }
    return;
  }
  if (displayName && displayName.length > 30) {
    toast('❌ Display name: max 30 characters');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 SAVE CHANGES'; }
    return;
  }
  if (bio.length > 160) {
    toast('❌ Bio: max 160 characters');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 SAVE CHANGES'; }
    return;
  }

  const settings: SettingsData = {
    display_name: displayName,
    username,
    bio,
    email: getEl('set-email-display')?.textContent ?? '',
    preferred_language: getEl<HTMLSelectElement>('set-language')?.value ?? 'en',
    notif_challenge: getChecked('set-notif-challenge'),
    notif_debate: getChecked('set-notif-debate'),
    notif_follow: getChecked('set-notif-follow'),
    notif_reactions: getChecked('set-notif-reactions'),
    notif_rivals: getChecked('set-notif-rivals'),
    notif_economy: getChecked('set-notif-economy'),
    audio_sfx: getChecked('set-audio-sfx'),
    audio_mute: getChecked('set-audio-mute'),
    privacy_public: getChecked('set-privacy-public'),
    privacy_online: getChecked('set-privacy-online'),
    privacy_challenges: getChecked('set-privacy-challenges'),
  };

  localStorage.setItem('colosseum_settings', JSON.stringify(settings));

  try {
    if (!isPlaceholder) {
      await updateProfile({
        display_name: settings.display_name,
        username: settings.username,
        bio: settings.bio,
        preferred_language: settings.preferred_language,
        is_private: !settings.privacy_public,
      });

      const result = await safeRpc('save_user_settings', {
        p_notif_challenge: settings.notif_challenge,
        p_notif_debate: settings.notif_debate,
        p_notif_follow: settings.notif_follow,
        p_notif_reactions: settings.notif_reactions,
        p_notif_rivals: settings.notif_rivals,
        p_notif_economy: settings.notif_economy,
        p_audio_sfx: settings.audio_sfx,
        p_audio_mute: settings.audio_mute,
        p_privacy_public: settings.privacy_public,
        p_privacy_online: settings.privacy_online,
        p_privacy_challenges: settings.privacy_challenges,
      });
      const r = result as { error?: { message: string } } | null;
      if (r?.error) {
        console.warn('[Settings] save_user_settings RPC failed:', r.error.message);
        toast('⚠️ Some settings may not have saved — try again');
        return;
      }
    }
    toast('✅ Settings saved');
  } catch (err: unknown) {
    console.error('[Settings] save failed:', err);
    toast('❌ Save failed — please try again');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 SAVE CHANGES'; }
  }
}
