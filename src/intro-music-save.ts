/**
 * intro-music-save.ts — F-21 Intro Music Save
 * _saveIntroMusic — upload to storage + RPC.
 */

import { safeRpc, getCurrentProfile, getSupabaseClient } from './auth.ts';

export async function saveIntroMusic(trackId: string, file: File | null, existingUrl: string | null | undefined): Promise<void> {
  let uploadedUrl: string | undefined;

  if (trackId === 'custom') {
    if (file) {
      const client = getSupabaseClient();
      if (!client) throw new Error('Not connected');
      const profile = getCurrentProfile();
      if (!profile) throw new Error('Not signed in');

      const ext  = file.name.split('.').pop() ?? 'mp3';
      const path = `${profile.id}/intro.${ext}`;

      const { error: upErr } = await client.storage
        .from('intro-music')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);

      const { data: signedData, error: signErr } = await client.storage
        .from('intro-music')
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !signedData?.signedUrl) throw new Error('Could not get URL');
      uploadedUrl = signedData.signedUrl;
    } else if (existingUrl) {
      uploadedUrl = existingUrl;
    } else {
      throw new Error('No file selected');
    }
  }

  const { data, error } = await safeRpc('save_intro_music', {
    p_track_id:   trackId,
    p_custom_url: uploadedUrl ?? null,
  });
  if (error) throw new Error((error as { message?: string }).message ?? 'Save failed');
  const result = data as { error?: string } | null;
  if (result?.error) throw new Error(result.error);

  const profile = getCurrentProfile();
  if (profile) {
    (profile as Record<string, unknown>).intro_music_id   = trackId;
    (profile as Record<string, unknown>).custom_intro_url = uploadedUrl ?? null;
  }
}
