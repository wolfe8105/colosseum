/**
 * group-banner.ts — F-19 Three-Tier Group Banner
 *
 * Refactored: CSS → group-banner-css.ts, upload → group-banner-upload.ts.
 */

import { escapeHTML } from '../config.ts';
import type { GroupDetail } from './groups.types.ts';
import { injectGroupBannerCSS } from './group-banner-css.ts';
import { openBannerUploadSheet } from './group-banner-upload.ts';

function _renderTier1Fallback(container: HTMLElement, emoji: string, name: string): void {
  const wrap = document.createElement('div');
  wrap.className = 'group-banner-t1';
  wrap.innerHTML = `
    <span class="group-banner-t1-emoji">${escapeHTML(emoji)}</span>
    <span class="group-banner-t1-name">${escapeHTML(name)}</span>
    <div class="group-banner-t1-stripe"></div>`;
  container.appendChild(wrap);
}

export function renderGroupBanner(container: HTMLElement, group: GroupDetail, isLeader: boolean): void {
  injectGroupBannerCSS();

  const tier        = group.banner_tier ?? 1;
  const staticUrl   = group.banner_static_url ?? null;
  const animatedUrl = group.banner_animated_url ?? null;
  const emoji       = group.avatar_emoji || '⚔️';
  const name        = group.name || '';
  const wins        = group.gvg_wins ?? 0;
  const losses      = group.gvg_losses ?? 0;

  container.innerHTML = '';
  container.className = 'group-banner-zone';

  if (tier === 3 && animatedUrl) {
    const vid = document.createElement('video');
    vid.className = 'group-banner-t3';
    vid.src = animatedUrl; vid.autoplay = true; vid.loop = true; vid.muted = true; vid.playsInline = true;
    container.appendChild(vid);
  } else if (tier >= 2 && staticUrl) {
    const img = document.createElement('img');
    img.className = 'group-banner-t2';
    img.src = staticUrl; img.alt = name;
    img.onerror = () => _renderTier1Fallback(container, emoji, name);
    container.appendChild(img);
  } else {
    _renderTier1Fallback(container, emoji, name);
  }

  const badge = document.createElement('div');
  badge.className = 'group-banner-tier-badge';
  badge.textContent = ['', 'TIER I', 'TIER II', 'TIER III'][tier] ?? 'TIER I';
  container.appendChild(badge);

  if (isLeader) {
    const editBtn = document.createElement('button');
    editBtn.className = 'group-banner-edit-btn';
    editBtn.textContent = '✏ BANNER';
    editBtn.addEventListener('click', () => openBannerUploadSheet(group.id!, tier, wins, losses));
    container.appendChild(editBtn);
  }
}
