/**
 * THE MODERATOR — Voice Memo Upload
 * uploadVoiceMemo, revokeAllFallbackURLs.
 */

import { showToast } from './config.ts';
import { getSupabaseClient, getCurrentUser, getIsPlaceholderMode } from './auth.ts';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const _fallbackObjectURLs: string[] = [];

export function revokeAllFallbackURLs(): void {
  while (_fallbackObjectURLs.length) {
    const u = _fallbackObjectURLs.pop();
    if (u) URL.revokeObjectURL(u);
  }
}

export interface UploadResult {
  url: string;
  path: string;
}

export async function uploadVoiceMemo(blob: Blob, debateId: string | null): Promise<UploadResult> {
  if (blob.size > MAX_FILE_BYTES) {
    const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
    showToast(`⚠️ Recording too large (${sizeMB} MB). Max is 5 MB.`);
    const url = URL.createObjectURL(blob);
    _fallbackObjectURLs.push(url);
    return { url, path: 'local-fallback' };
  }

  const supabase = getSupabaseClient();
  if (!supabase || getIsPlaceholderMode()) {
    const url = URL.createObjectURL(blob);
    _fallbackObjectURLs.push(url);
    console.debug('[PLACEHOLDER] Voice memo stored locally:', url);
    return { url, path: 'placeholder/' + Date.now() + '.webm' };
  }

  const user = getCurrentUser();
  const userId = user ? user.id : 'placeholder-user';
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const path = `voice-memos/${userId}/${debateId ?? 'take'}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('debate-audio').upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  });

  if (error) {
    console.error('Upload failed:', error);
    showToast('⚠️ Upload failed. Saved locally.');
    const url = URL.createObjectURL(blob);
    _fallbackObjectURLs.push(url);
    return { url, path: 'local-fallback' };
  }

  const { data: urlData } = supabase.storage.from('debate-audio').getPublicUrl(path);
  return { url: urlData.publicUrl, path };
}
