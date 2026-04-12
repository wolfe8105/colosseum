/**
 * group-banner.ts — F-19 Three-Tier Group Banner Progression
 *
 * Renders the group banner zone in the detail header and provides
 * an upload sheet (leader/co-leader only) for Tier 2/3 uploads.
 *
 * Tier 1 (all groups)     — CSS gradient + emoji, no upload
 * Tier 2 (26–50% GvG W%) — Custom static image
 * Tier 3 (51%+ GvG W%)   — Custom animated video/GIF
 */

import { safeRpc, getSupabaseClient } from '../auth.ts';
import { escapeHTML, showToast } from '../config.ts';
import type { GroupDetail } from './groups.types.ts';

// ============================================================
// CSS (injected once)
// ============================================================

let _cssInjected = false;

function _injectCSS(): void {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    /* ── Banner zone ────────────────────────────────────────── */
    .group-banner-zone {
      position: relative;
      width: 100%;
      height: 80px;
      overflow: hidden;
      border-bottom: 1px solid var(--mod-border-primary);
      flex-shrink: 0;
    }

    /* Tier 1 — CSS gradient */
    .group-banner-t1 {
      width: 100%; height: 100%;
      background: linear-gradient(135deg,
        rgba(10,10,30,1) 0%,
        rgba(30,20,60,1) 40%,
        rgba(10,10,30,1) 100%);
      display: flex; align-items: center; justify-content: center;
      gap: 12px;
    }
    .group-banner-t1-emoji {
      font-size: 36px;
      filter: drop-shadow(0 0 8px rgba(212,168,67,0.4));
    }
    .group-banner-t1-name {
      font-family: var(--mod-font-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--mod-text-heading);
      letter-spacing: 2px;
      text-transform: uppercase;
      text-shadow: 0 0 12px rgba(212,168,67,0.25);
    }
    .group-banner-t1-stripe {
      position: absolute; inset: 0;
      background: repeating-linear-gradient(
        -45deg,
        transparent 0px,
        transparent 18px,
        rgba(212,168,67,0.04) 18px,
        rgba(212,168,67,0.04) 20px
      );
      pointer-events: none;
    }

    /* Tier 2 — static image */
    .group-banner-t2 {
      width: 100%; height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
    }

    /* Tier 3 — animated video */
    .group-banner-t3 {
      width: 100%; height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
    }

    /* Edit button (leaders only) */
    .group-banner-edit-btn {
      position: absolute;
      top: 8px; right: 8px;
      padding: 5px 10px;
      background: rgba(0,0,0,0.65);
      border: 1px solid var(--mod-accent-border);
      border-radius: 6px;
      color: var(--mod-accent);
      font-family: var(--mod-font-ui);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      cursor: pointer;
      backdrop-filter: blur(4px);
      transition: background 0.15s;
    }
    .group-banner-edit-btn:hover { background: rgba(0,0,0,0.85); }

    /* Tier badge */
    .group-banner-tier-badge {
      position: absolute;
      bottom: 6px; left: 8px;
      padding: 2px 7px;
      background: rgba(0,0,0,0.6);
      border: 1px solid var(--mod-accent-border);
      border-radius: 4px;
      font-family: var(--mod-font-ui);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: var(--mod-accent);
    }

    /* ── Upload sheet ────────────────────────────────────────── */
    .gb-backdrop {
      position: fixed; inset: 0; z-index: 9000;
      background: rgba(0,0,0,0.6);
    }
    .gb-sheet {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 9001;
      background: var(--mod-bg-card);
      border-top: 1px solid var(--mod-accent-border);
      border-radius: 16px 16px 0 0;
      padding: 20px 16px calc(24px + env(safe-area-inset-bottom, 0px));
      max-height: 70dvh; overflow-y: auto;
      animation: gbSlideUp 0.28s cubic-bezier(0.32,0.72,0,1);
    }
    @keyframes gbSlideUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    .gb-handle {
      width: 36px; height: 4px;
      background: var(--mod-border-primary);
      border-radius: 2px;
      margin: 0 auto 16px;
    }
    .gb-title {
      font-family: var(--mod-font-display);
      font-size: 17px; font-weight: 700;
      color: var(--mod-text-heading);
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .gb-subtitle {
      font-size: 12px; color: var(--mod-text-muted);
      font-family: var(--mod-font-ui);
      margin-bottom: 20px;
    }

    .gb-tier-row {
      display: flex; align-items: center; gap: 12px;
      padding: 14px;
      border-radius: 10px;
      border: 1px solid var(--mod-border-primary);
      margin-bottom: 10px;
      background: var(--mod-bg-inset);
    }
    .gb-tier-row.unlocked { border-color: var(--mod-accent-border); }
    .gb-tier-row.locked   { opacity: 0.5; }

    .gb-tier-icon { font-size: 24px; flex-shrink: 0; }
    .gb-tier-info { flex: 1; }
    .gb-tier-label {
      font-family: var(--mod-font-ui);
      font-size: 13px; font-weight: 700;
      color: var(--mod-text-heading);
    }
    .gb-tier-desc {
      font-size: 11px; color: var(--mod-text-muted);
      margin-top: 2px;
    }
    .gb-tier-status {
      font-size: 10px; letter-spacing: 1px;
      color: var(--mod-accent); font-weight: 700;
    }

    .gb-upload-btn {
      padding: 8px 14px;
      background: var(--mod-accent-muted);
      border: 1px solid var(--mod-accent-border);
      border-radius: 8px;
      color: var(--mod-accent);
      font-family: var(--mod-font-ui);
      font-size: 12px; font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .gb-upload-btn:hover { background: rgba(212,168,67,0.22); }
    .gb-upload-btn:disabled { opacity: 0.4; cursor: default; }

    .gb-win-rate {
      padding: 12px 14px;
      background: var(--mod-bg-inset);
      border-radius: 8px;
      margin-bottom: 16px;
      font-family: var(--mod-font-ui);
      font-size: 12px; color: var(--mod-text-muted);
    }
    .gb-win-rate strong { color: var(--mod-accent); }
  `;
  document.head.appendChild(s);
}

// ============================================================
// RENDER BANNER ZONE
// ============================================================

/**
 * Renders the banner zone into the given container element.
 * Call after get_group_details resolves with banner fields.
 */
export function renderGroupBanner(
  container: HTMLElement,
  group: GroupDetail,
  isLeader: boolean
): void {
  _injectCSS();

  const tier        = group.banner_tier ?? 1;
  const staticUrl   = group.banner_static_url   ?? null;
  const animatedUrl = group.banner_animated_url ?? null;
  const emoji       = group.avatar_emoji || '⚔️';
  const name        = group.name        || '';
  const wins        = group.gvg_wins    ?? 0;
  const losses      = group.gvg_losses  ?? 0;

  container.innerHTML = '';
  container.className = 'group-banner-zone';

  if (tier === 3 && animatedUrl) {
    const vid = document.createElement('video');
    vid.className = 'group-banner-t3';
    vid.src = animatedUrl;
    vid.autoplay = true;
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    container.appendChild(vid);
  } else if (tier >= 2 && staticUrl) {
    const img = document.createElement('img');
    img.className = 'group-banner-t2';
    img.src = staticUrl;
    img.alt = name;
    img.onerror = () => _renderTier1Fallback(container, emoji, name);
    container.appendChild(img);
  } else {
    _renderTier1Fallback(container, emoji, name);
  }

  // Tier badge
  const badge = document.createElement('div');
  badge.className = 'group-banner-tier-badge';
  const tierLabels = ['', 'TIER I', 'TIER II', 'TIER III'];
  badge.textContent = tierLabels[tier] ?? 'TIER I';
  container.appendChild(badge);

  // Edit button (leader only)
  if (isLeader) {
    const editBtn = document.createElement('button');
    editBtn.className = 'group-banner-edit-btn';
    editBtn.textContent = '✏ BANNER';
    editBtn.addEventListener('click', () => {
      openBannerUploadSheet(group.id!, tier, wins, losses);
    });
    container.appendChild(editBtn);
  }
}

function _renderTier1Fallback(container: HTMLElement, emoji: string, name: string): void {
  const wrap = document.createElement('div');
  wrap.className = 'group-banner-t1';
  wrap.innerHTML = `
    <span class="group-banner-t1-emoji">${escapeHTML(emoji)}</span>
    <span class="group-banner-t1-name">${escapeHTML(name)}</span>
    <div class="group-banner-t1-stripe"></div>
  `;
  container.appendChild(wrap);
}

// ============================================================
// UPLOAD SHEET
// ============================================================

function openBannerUploadSheet(
  groupId: string,
  currentTier: number,
  wins: number,
  losses: number
): void {
  document.getElementById('gb-backdrop')?.remove();

  const total   = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const backdrop = document.createElement('div');
  backdrop.className = 'gb-backdrop';
  backdrop.id = 'gb-backdrop';

  const sheet = document.createElement('div');
  sheet.className = 'gb-sheet';

  const t2Unlocked = currentTier >= 2;
  const t3Unlocked = currentTier >= 3;

  sheet.innerHTML = `
    <div class="gb-handle"></div>
    <div class="gb-title">GROUP BANNER</div>
    <div class="gb-subtitle">Manage your group's battle identity</div>

    <div class="gb-win-rate">
      GvG Record: <strong>${wins}W – ${losses}L</strong>
      &nbsp;·&nbsp;
      Win rate: <strong>${winRate}%</strong>
      &nbsp;·&nbsp;
      Current tier: <strong>Tier ${currentTier}</strong>
    </div>

    <div class="gb-tier-row unlocked">
      <span class="gb-tier-icon">🏟️</span>
      <div class="gb-tier-info">
        <div class="gb-tier-label">Tier I — Standard</div>
        <div class="gb-tier-desc">CSS gradient with your group emoji. Always active.</div>
        <div class="gb-tier-status">✓ ACTIVE</div>
      </div>
    </div>

    <div class="gb-tier-row ${t2Unlocked ? 'unlocked' : 'locked'}" id="gb-t2-row">
      <span class="gb-tier-icon">🖼️</span>
      <div class="gb-tier-info">
        <div class="gb-tier-label">Tier II — Custom Image</div>
        <div class="gb-tier-desc">${t2Unlocked
          ? 'Upload a static banner image (JPEG, PNG, WebP, GIF — max 10MB)'
          : 'Unlocks at 26% GvG win rate'}</div>
        ${t2Unlocked ? '<div class="gb-tier-status">✓ UNLOCKED</div>' : ''}
      </div>
      ${t2Unlocked
        ? '<button class="gb-upload-btn" id="gb-t2-btn">UPLOAD</button><input type="file" id="gb-t2-input" accept="image/*" style="display:none">'
        : ''}
    </div>

    <div class="gb-tier-row ${t3Unlocked ? 'unlocked' : 'locked'}" id="gb-t3-row">
      <span class="gb-tier-icon">🎬</span>
      <div class="gb-tier-info">
        <div class="gb-tier-label">Tier III — Animated</div>
        <div class="gb-tier-desc">${t3Unlocked
          ? 'Upload an animated banner (MP4, WebM, GIF — max 10s, max 10MB)'
          : 'Unlocks at 51% GvG win rate'}</div>
        ${t3Unlocked ? '<div class="gb-tier-status">✓ UNLOCKED</div>' : ''}
      </div>
      ${t3Unlocked
        ? '<button class="gb-upload-btn" id="gb-t3-btn">UPLOAD</button><input type="file" id="gb-t3-input" accept="video/*,image/gif" style="display:none">'
        : ''}
    </div>
  `;

  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);

  // Tier 2 upload
  sheet.querySelector('#gb-t2-btn')?.addEventListener('click', () => {
    sheet.querySelector<HTMLInputElement>('#gb-t2-input')?.click();
  });
  sheet.querySelector<HTMLInputElement>('#gb-t2-input')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    await _uploadBanner(groupId, file, 'static', backdrop);
  });

  // Tier 3 upload
  sheet.querySelector('#gb-t3-btn')?.addEventListener('click', () => {
    sheet.querySelector<HTMLInputElement>('#gb-t3-input')?.click();
  });
  sheet.querySelector<HTMLInputElement>('#gb-t3-input')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    await _uploadBanner(groupId, file, 'animated', backdrop);
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) _closeSheet(backdrop);
  });
}

function _closeSheet(backdrop: HTMLElement): void {
  backdrop.style.opacity = '0';
  backdrop.style.transition = 'opacity 0.2s';
  setTimeout(() => backdrop.remove(), 220);
}

// ============================================================
// UPLOAD + SAVE
// ============================================================

async function _uploadBanner(
  groupId: string,
  file: File,
  type: 'static' | 'animated',
  backdrop: HTMLElement
): Promise<void> {
  if (file.size > 10 * 1024 * 1024) {
    showToast('File too large — max 10MB', 'error');
    return;
  }

  const btn = backdrop.querySelector<HTMLButtonElement>(
    type === 'static' ? '#gb-t2-btn' : '#gb-t3-btn'
  );
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
      p_group_id:       groupId,
      p_static_url:     type === 'static'   ? url : null,
      p_animated_url:   type === 'animated' ? url : null,
    });

    if (error) throw new Error(error.message ?? 'Save failed');
    const result = data as { error?: string } | null;
    if (result?.error) throw new Error(result.error);

    showToast('Banner updated ✓', 'success');
    _closeSheet(backdrop);
    // Caller (groups.ts) should reload group details to re-render banner
    window.dispatchEvent(new CustomEvent('group-banner-updated', { detail: { groupId } }));
  } catch (err) {
    showToast((err as Error).message || 'Upload failed', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'UPLOAD'; }
  }
}
