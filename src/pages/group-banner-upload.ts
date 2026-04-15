/**
 * group-banner-upload.ts — F-19 Group Banner Upload Sheet
 * openBannerUploadSheet, _closeSheet, _uploadBanner.
 *
 * LANDMINE [LM-GB-001]: Upload/save button disabled on click but no try/finally.
 * If _uploadBanner throws outside the try, button stays disabled.
 *
 * LANDMINE [LM-GB-002]: Storage upload uses upsert:true — old banner URLs become
 * dead links if any are cached by callers after overwrite.
 */

import { safeRpc, getSupabaseClient } from '../auth.ts';
import { showToast } from '../config.ts';

export function openBannerUploadSheet(groupId: string, currentTier: number, wins: number, losses: number): void {
  document.getElementById('gb-backdrop')?.remove();

  const total   = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const t2Unlocked = currentTier >= 2;
  const t3Unlocked = currentTier >= 3;

  const backdrop = document.createElement('div');
  backdrop.className = 'gb-backdrop';
  backdrop.id = 'gb-backdrop';

  const sheet = document.createElement('div');
  sheet.className = 'gb-sheet';
  sheet.innerHTML = `
    <div class="gb-handle"></div>
    <div class="gb-title">GROUP BANNER</div>
    <div class="gb-subtitle">Manage your group's battle identity</div>
    <div class="gb-win-rate">GvG Record: <strong>${wins}W – ${losses}L</strong> &nbsp;·&nbsp; Win rate: <strong>${winRate}%</strong> &nbsp;·&nbsp; Current tier: <strong>Tier ${currentTier}</strong></div>

    <div class="gb-tier-row unlocked">
      <span class="gb-tier-icon">🏟️</span>
      <div class="gb-tier-info"><div class="gb-tier-label">Tier I — Standard</div><div class="gb-tier-desc">CSS gradient with your group emoji. Always active.</div><div class="gb-tier-status">✓ ACTIVE</div></div>
    </div>

    <div class="gb-tier-row ${t2Unlocked ? 'unlocked' : 'locked'}" id="gb-t2-row">
      <span class="gb-tier-icon">🖼️</span>
      <div class="gb-tier-info"><div class="gb-tier-label">Tier II — Custom Image</div><div class="gb-tier-desc">${t2Unlocked ? 'Upload a static banner image (JPEG, PNG, WebP, GIF — max 10MB)' : 'Unlocks at 26% GvG win rate'}</div>${t2Unlocked ? '<div class="gb-tier-status">✓ UNLOCKED</div>' : ''}</div>
      ${t2Unlocked ? '<button class="gb-upload-btn" id="gb-t2-btn">UPLOAD</button><input type="file" id="gb-t2-input" accept="image/*" style="display:none">' : ''}
    </div>

    <div class="gb-tier-row ${t3Unlocked ? 'unlocked' : 'locked'}" id="gb-t3-row">
      <span class="gb-tier-icon">🎬</span>
      <div class="gb-tier-info"><div class="gb-tier-label">Tier III — Animated</div><div class="gb-tier-desc">${t3Unlocked ? 'Upload an animated banner (MP4, WebM, GIF — max 10s, max 10MB)' : 'Unlocks at 51% GvG win rate'}</div>${t3Unlocked ? '<div class="gb-tier-status">✓ UNLOCKED</div>' : ''}</div>
      ${t3Unlocked ? '<button class="gb-upload-btn" id="gb-t3-btn">UPLOAD</button><input type="file" id="gb-t3-input" accept="video/*,image/gif" style="display:none">' : ''}
    </div>`;

  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);

  sheet.querySelector('#gb-t2-btn')?.addEventListener('click', () => sheet.querySelector<HTMLInputElement>('#gb-t2-input')?.click());
  sheet.querySelector<HTMLInputElement>('#gb-t2-input')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) await _uploadBanner(groupId, file, 'static', backdrop);
  });

  sheet.querySelector('#gb-t3-btn')?.addEventListener('click', () => sheet.querySelector<HTMLInputElement>('#gb-t3-input')?.click());
  sheet.querySelector<HTMLInputElement>('#gb-t3-input')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) await _uploadBanner(groupId, file, 'animated', backdrop);
  });

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) _closeSheet(backdrop); });
}

export function _closeSheet(backdrop: HTMLElement): void {
  backdrop.style.transition = 'opacity 0.2s';
  backdrop.style.opacity = '0';
  setTimeout(() => backdrop.remove(), 220);
}

async function _uploadBanner(groupId: string, file: File, type: 'static' | 'animated', backdrop: HTMLElement): Promise<void> {
  if (file.size > 10 * 1024 * 1024) { showToast('File too large — max 10MB', 'error'); return; }

  const btn = backdrop.querySelector<HTMLButtonElement>(type === 'static' ? '#gb-t2-btn' : '#gb-t3-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'UPLOADING…'; }

  try {
    const client = getSupabaseClient();
    if (!client) throw new Error('Not connected');

    const ext  = file.name.split('.').pop() ?? (type === 'static' ? 'jpg' : 'mp4');
    const path = `${groupId}/${type}.${ext}`;

    const { error: upErr } = await (client as any).storage
      .from('group-banners')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) throw new Error(upErr.message);

    const { data: signedData, error: signErr } = await (client as any).storage
      .from('group-banners')
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signedData?.signedUrl) throw new Error('Could not get URL');
    const url: string = signedData.signedUrl;

    const { data, error } = await safeRpc('save_group_banner', {
      p_group_id: groupId,
      p_static_url: type === 'static' ? url : null,
      p_animated_url: type === 'animated' ? url : null,
    });
    if (error) throw new Error((error as { message?: string }).message ?? 'Save failed');
    const result = data as { error?: string } | null;
    if (result?.error) throw new Error(result.error);

    showToast('Banner updated ✓', 'success');
    _closeSheet(backdrop);
    window.dispatchEvent(new CustomEvent('group-banner-updated', { detail: { groupId } }));
  } catch (err) {
    showToast((err as Error).message || 'Upload failed', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'UPLOAD'; }
  }
}
