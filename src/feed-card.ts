/**
 * THE MODERATOR — Unified Feed Card
 *
 * One renderer for all card states: open, pending, live, voting, complete.
 * Replaces: async.render.takes.ts (hot take cards) + arena-lobby.cards.ts (debate cards)
 * Part of F-68 Unified Feed (Session 294).
 */

import { escapeHTML } from './config.ts';
import { vgBadge } from './badge.ts';
import { bountyDot } from './bounties.ts';
import { getCurrentUser } from './auth.ts';

// ============================================================
// TYPES
// ============================================================

export interface UnifiedFeedCard {
  id: string;
  topic: string | null;
  content: string | null;
  category: string | null;
  status: string;
  mode: string | null;
  ruleset: string | null;
  current_round: number | null;
  total_rounds: number | null;
  score_a: number | null;
  score_b: number | null;
  vote_count_a: number | null;
  vote_count_b: number | null;
  reaction_count: number;
  link_url: string | null;
  link_preview: { image_url?: string; og_title?: string; domain?: string } | null;
  ranked: boolean | null;
  created_at: string;
  debater_a: string | null;
  debater_b: string | null;
  debater_a_username: string | null;
  debater_a_name: string | null;
  elo_a: number | null;
  verified_a: boolean | null;
  debater_b_username: string | null;
  debater_b_name: string | null;
  elo_b: number | null;
  verified_b: boolean | null;
  // Client-side enrichment (set after fetch)
  userReacted?: boolean;
}

// ============================================================
// MAIN RENDERER
// ============================================================

export function renderFeedCard(card: UnifiedFeedCard): string {
  switch (card.status) {
    case 'open':
      return _renderOpenCard(card);
    case 'pending':
    case 'live':
    case 'round_break':
      return _renderLiveCard(card);
    case 'voting':
      return _renderVotingCard(card);
    case 'complete':
    case 'completed':
      return _renderVerdictCard(card);
    default:
      return '';
  }
}

// ============================================================
// OPEN CARD — posted opinion, no opponent yet
// ============================================================

function _renderOpenCard(card: UnifiedFeedCard): string {
  const esc = escapeHTML;
  const displayName = esc(card.debater_a_name || card.debater_a_username || 'Anonymous');
  const initial = esc((displayName)[0] ?? '?');
  const cardText = esc(card.content || card.topic || '');
  const time = _timeAgo(card.created_at);
  const catLabel = esc((card.category || 'trending').toUpperCase());
  const userId = getCurrentUser()?.id;
  const isOwn = card.debater_a === userId;
  const profileAttr = !isOwn && card.debater_a
    ? `data-action="profile" data-user-id="${esc(card.debater_a)}" data-username="${esc(card.debater_a_username ?? '')}" style="cursor:pointer;"`
    : '';

  const linkBlock = _renderLinkPreview(card);

  const reactedClass = card.userReacted ? 'background:var(--mod-accent-muted);border-color:rgba(204,41,54,0.3);color:var(--mod-magenta);' : 'background:var(--mod-bg-subtle);border-color:var(--mod-border-secondary);color:var(--mod-text-sub);';

  // F-61: Countdown timer for open cards (30 min expiry)
  const countdownBlock = _renderCountdown(card.created_at);

  // F-61: Cancel button for creator's own open cards
  const cancelBtn = isOwn
    ? `<button data-action="cancel-card" data-id="${esc(card.id)}" style="display:flex;align-items:center;gap:4px;background:var(--mod-bg-subtle);border:1px solid var(--mod-border-secondary);color:var(--mod-text-muted);padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;margin-left:auto;min-height:var(--mod-touch-min);">✕ CANCEL</button>`
    : '';

  const initB = esc((card.debater_b_name || card.debater_b_username || '?')[0] ?? '?');
  const nameB = esc(card.debater_b_name || card.debater_b_username || '');

  return `<div class="arena-card card-open" data-card-id="${esc(card.id)}" data-status="open" data-created="${esc(card.created_at)}">
    ${linkBlock}
    <div class="feed-card-badges">
      <span class="arena-card-badge" style="background:rgba(59,199,148,0.15);color:var(--mod-status-open);border:1px solid rgba(59,199,148,0.3);">OPEN</span>
      <span class="arena-card-badge" style="background:var(--mod-bg-subtle);color:var(--mod-text-muted);border:1px solid var(--mod-border-secondary);">${catLabel}</span>
      <span class="arena-card-meta feed-card-countdown" data-expires="${esc(card.created_at)}" style="margin-left:auto;">${countdownBlock}</span>
    </div>
    <div class="arena-card-topic">${cardText}</div>
    <div class="feed-card-footer">
      <div class="feed-card-avatars">
        <div ${profileAttr} class="feed-card-avatar" title="${displayName}">${initial}</div>
        <span class="feed-card-avatar-name" ${profileAttr}>${displayName}${vgBadge(card.verified_a ?? false)}</span>
        ${!isOwn ? '' : ''}
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button data-action="react-card" data-id="${esc(card.id)}" style="display:flex;align-items:center;gap:4px;${reactedClass}border:1px solid;padding:6px 10px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;min-height:var(--mod-touch-min);">🔥 ${Number(card.reaction_count)}</button>
        ${!isOwn ? `<button data-action="challenge-card" data-id="${esc(card.id)}" style="display:flex;align-items:center;gap:4px;background:rgba(59,199,148,0.1);border:1px solid rgba(59,199,148,0.3);color:var(--mod-status-open);padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;min-height:var(--mod-touch-min);">⚔️ CHALLENGE</button>` : cancelBtn}
      </div>
    </div>
  </div>`;
}

// ============================================================
// LIVE CARD — active debate in progress
// ============================================================

function _renderLiveCard(card: UnifiedFeedCard): string {
  const esc = escapeHTML;
  const nameA = esc(card.debater_a_name || card.debater_a_username || 'Side A');
  const nameB = esc(card.debater_b_name || card.debater_b_username || 'Side B');
  const catLabel = esc((card.category || 'general').toUpperCase());
  const rulesetBadge = card.ruleset === 'unplugged' ? '<span class="arena-card-badge unplugged" style="background:var(--mod-bg-subtle);color:var(--mod-text-muted);border:1px solid var(--mod-border-secondary);">🎸 UNPLUGGED</span>' : '';
  const roundsBadge = card.total_rounds && card.total_rounds !== 4 ? `<span class="arena-card-badge" style="background:var(--mod-bg-subtle);color:var(--mod-text-muted);border:1px solid var(--mod-border-secondary);">${Number(card.total_rounds)}R</span>` : '';
  const roundMeta = `R${Number(card.current_round || 1)} of ${Number(card.total_rounds || 4)}`;

  const linkBlock = _renderLinkPreview(card);

  return `<div class="arena-card card-live" data-card-id="${esc(card.id)}" data-status="live" data-debate-id="${esc(card.id)}">
    ${linkBlock}
    <div class="feed-card-badges">
      <span class="arena-card-badge live">● LIVE</span>
      <span class="arena-card-badge" style="background:var(--mod-bg-subtle);color:var(--mod-text-muted);border:1px solid var(--mod-border-secondary);">${catLabel}</span>
      ${rulesetBadge}${roundsBadge}
      <span class="arena-card-meta" style="margin-left:auto;">${roundMeta}</span>
    </div>
    <div class="arena-card-topic">${esc(card.content || card.topic || 'Live Debate')}</div>
    <div class="feed-card-footer">
      <div class="feed-card-avatars">
        <div class="feed-card-avatar">${nameA[0] ?? '?'}</div>
        <span class="feed-card-avatar-name">${nameA}${bountyDot(card.debater_a)}</span>
        <span class="feed-card-vs-pill">VS</span>
        <div class="feed-card-avatar">${nameB[0] ?? '?'}</div>
        <span class="feed-card-avatar-name">${nameB}${bountyDot(card.debater_b)}</span>
        ${card.score_a != null ? `<span class="arena-card-score" style="margin-left:auto;">${Number(card.score_a)}–${Number(card.score_b)}</span>` : ''}
      </div>
      <button class="arena-card-btn">SPECTATE</button>
    </div>
  </div>`;
}

// ============================================================
// VOTING CARD — voting phase
// ============================================================

function _renderVotingCard(card: UnifiedFeedCard): string {
  const esc = escapeHTML;
  const nameA = esc(card.debater_a_name || card.debater_a_username || 'Side A');
  const nameB = esc(card.debater_b_name || card.debater_b_username || 'Side B');
  const catLabel = esc((card.category || 'general').toUpperCase());
  const votes = (Number(card.vote_count_a) || 0) + (Number(card.vote_count_b) || 0);

  const linkBlock = _renderLinkPreview(card);

  return `<div class="arena-card" data-card-id="${esc(card.id)}" data-status="voting" data-link="/debate/${encodeURIComponent(card.id)}">
    ${linkBlock}
    <div class="feed-card-badges">
      <span class="arena-card-badge" style="background:rgba(250,196,75,0.15);color:var(--mod-bar-secondary);border:1px solid rgba(250,196,75,0.3);">VOTING</span>
      <span class="arena-card-badge" style="background:var(--mod-bg-subtle);color:var(--mod-text-muted);border:1px solid var(--mod-border-secondary);">${catLabel}</span>
      <span class="arena-card-meta" style="margin-left:auto;">${votes} vote${votes !== 1 ? 's' : ''}</span>
    </div>
    <div class="arena-card-topic">${esc(card.content || card.topic || 'Untitled Debate')}</div>
    <div class="feed-card-footer">
      <div class="feed-card-avatars">
        <div class="feed-card-avatar">${nameA[0] ?? '?'}</div>
        <span class="feed-card-avatar-name">${nameA}${bountyDot(card.debater_a)}</span>
        <span class="feed-card-vs-pill">VS</span>
        <div class="feed-card-avatar">${nameB[0] ?? '?'}</div>
        <span class="feed-card-avatar-name">${nameB}${bountyDot(card.debater_b)}</span>
        ${card.score_a != null ? `<span class="arena-card-score" style="margin-left:auto;">${Number(card.score_a)}–${Number(card.score_b)}</span>` : ''}
      </div>
      <button class="arena-card-btn">VOTE</button>
    </div>
  </div>`;
}

// ============================================================
// VERDICT CARD — completed debate
// ============================================================

function _renderVerdictCard(card: UnifiedFeedCard): string {
  const esc = escapeHTML;
  const nameA = esc(card.debater_a_name || card.debater_a_username || 'Side A');
  const nameB = esc(card.debater_b_name || card.debater_b_username || 'Side B');
  const catLabel = esc((card.category || 'general').toUpperCase());
  const votes = (Number(card.vote_count_a) || 0) + (Number(card.vote_count_b) || 0);
  const rulesetBadge = card.ruleset === 'unplugged' ? '<span class="arena-card-badge" style="background:var(--mod-bg-subtle);color:var(--mod-text-muted);border:1px solid var(--mod-border-secondary);">🎸 UNPLUGGED</span>' : '';

  // Highlight winner
  const scoreA = Number(card.score_a) || 0;
  const scoreB = Number(card.score_b) || 0;
  const winnerStyle = scoreA > scoreB ? 'color:var(--mod-status-open);font-weight:700;' : '';
  const loserStyleA = scoreA < scoreB ? 'color:var(--mod-text-muted);' : '';
  const winnerStyleB = scoreB > scoreA ? 'color:var(--mod-status-open);font-weight:700;' : '';
  const loserStyleB = scoreB < scoreA ? 'color:var(--mod-text-muted);' : '';

  const linkBlock = _renderLinkPreview(card);

  return `<div class="arena-card" data-card-id="${esc(card.id)}" data-status="complete" data-link="/debate/${encodeURIComponent(card.id)}">
    ${linkBlock}
    <div class="feed-card-badges">
      <span class="arena-card-badge verdict">VERDICT</span>
      <span class="arena-card-badge" style="background:var(--mod-bg-subtle);color:var(--mod-text-muted);border:1px solid var(--mod-border-secondary);">${catLabel}</span>
      ${rulesetBadge}
      <span class="arena-card-meta" style="margin-left:auto;">${votes} vote${votes !== 1 ? 's' : ''}</span>
    </div>
    <div class="arena-card-topic">${esc(card.content || card.topic || 'Untitled Debate')}</div>
    <div class="feed-card-footer">
      <div class="feed-card-avatars">
        <div class="feed-card-avatar" style="${winnerStyle ? 'border-color:var(--mod-status-open);' : ''}">${nameA[0] ?? '?'}</div>
        <span class="feed-card-avatar-name" style="${winnerStyle || loserStyleA}">${nameA}${scoreA > scoreB ? ' ✓' : ''}${bountyDot(card.debater_a)}</span>
        <span class="feed-card-vs-pill">VS</span>
        <div class="feed-card-avatar" style="${winnerStyleB ? 'border-color:var(--mod-status-open);' : ''}">${nameB[0] ?? '?'}</div>
        <span class="feed-card-avatar-name" style="${winnerStyleB || loserStyleB}">${nameB}${scoreB > scoreA ? ' ✓' : ''}${bountyDot(card.debater_b)}</span>
        <span class="arena-card-score" style="margin-left:auto;">${scoreA}–${scoreB}</span>
      </div>
      <button class="arena-card-btn">VIEW</button>
    </div>
  </div>`;
}

// ============================================================
// SHARED: Link preview block — HERO IMAGE (full bleed, top of card)
// ============================================================

function _renderLinkPreview(card: UnifiedFeedCard): string {
  const esc = escapeHTML;
  const lp = card.link_preview as { image_url?: string; og_title?: string; domain?: string } | null;
  if (!card.link_url || !lp?.image_url) return '';
  // Full-bleed hero — negative margin pulls it to card edges, sits at top before title
  return `<a href="${esc(card.link_url)}" target="_blank" rel="noopener" class="feed-card-hero-link" onclick="event.stopPropagation()">
    <img src="${esc(lp.image_url)}" alt="" class="feed-card-hero-img" onerror="this.parentElement.style.display='none'">
    ${lp.domain ? `<span class="feed-card-hero-domain">${esc(lp.domain)}</span>` : ''}
  </a>`;
}

// ============================================================
// SHARED: Time ago helper
// ============================================================

function _timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ============================================================
// F-61: Countdown timer for open cards (30 min expiry)
// ============================================================

const CARD_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

function _renderCountdown(createdAt: string): string {
  const created = new Date(createdAt).getTime();
  const expires = created + CARD_EXPIRY_MS;
  const remaining = Math.max(0, expires - Date.now());
  if (remaining === 0) return 'expired';
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')} left`;
}

let _countdownTimer: ReturnType<typeof setInterval> | null = null;

/** Start a 1-second interval that updates all visible countdown elements. */
export function startFeedCountdowns(): void {
  stopFeedCountdowns();
  _countdownTimer = setInterval(() => {
    const els = document.querySelectorAll('.feed-card-countdown[data-expires]');
    els.forEach(el => {
      const created = (el as HTMLElement).dataset.expires;
      if (created) {
        (el as HTMLElement).textContent = _renderCountdown(created);
      }
    });
  }, 1000);
}

/** Stop the countdown interval. */
export function stopFeedCountdowns(): void {
  if (_countdownTimer) {
    clearInterval(_countdownTimer);
    _countdownTimer = null;
  }
}

// ============================================================
// OPEN CARD CSS (new — injected once)
// ============================================================

export function injectOpenCardCSS(): void {
  if (document.getElementById('feed-card-css')) return;
  const style = document.createElement('style');
  style.id = 'feed-card-css';
  style.textContent = `
    .arena-card.card-open { border-left-color: var(--mod-status-open); }
  `;
  document.head.appendChild(style);
}

export function injectFeedCardHeroCSS(): void {
  if (document.getElementById('feed-card-hero-css')) return;
  const style = document.createElement('style');
  style.id = 'feed-card-hero-css';
  style.textContent = `
    .feed-card-hero-link { display: block; text-decoration: none; margin: calc(-1 * var(--mod-space-md)) calc(-1 * var(--mod-space-lg)) var(--mod-space-sm); overflow: hidden; border-radius: var(--mod-radius-md) var(--mod-radius-md) 0 0; position: relative; height: 180px; }
    .feed-card-hero-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .feed-card-hero-domain { position: absolute; bottom: 6px; left: 10px; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); color: rgba(255,255,255,0.85); font-family: var(--mod-font-ui); font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; }
    .feed-card-badges { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
    .feed-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: var(--mod-space-sm); }
    .feed-card-avatars { display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1; overflow: hidden; }
    .feed-card-avatar { width: 26px; height: 26px; border-radius: 50%; background: var(--mod-bg-inset); border: 2px solid var(--mod-border-primary); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--mod-text-muted); flex-shrink: 0; text-transform: uppercase; }
    .feed-card-avatar-name { font-size: 12px; font-weight: 600; color: var(--mod-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px; }
    .feed-card-vs-pill { font-family: var(--mod-font-ui); font-size: 9px; font-weight: 700; letter-spacing: 1px; color: var(--mod-accent); flex-shrink: 0; }
    .arena-card { background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); border-left: var(--mod-card-bar-width) solid var(--mod-bar-secondary); border-radius: var(--mod-radius-md); padding: var(--mod-space-md) var(--mod-space-lg); margin-bottom: var(--mod-space-sm); cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .arena-card-topic { font-family: var(--mod-font-ui); font-size: var(--mod-font-card-title-size, 15px); font-weight: var(--mod-font-card-title-weight, 700); color: var(--mod-text-primary); letter-spacing: var(--mod-font-card-title-spacing, 0.5px); line-height: 1.35; margin-bottom: 6px; }
    .arena-card-badge { font-family: var(--mod-font-ui); font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; padding: 2px 8px; border-radius: var(--mod-radius-pill); }
    .arena-card-badge.live { background: var(--mod-status-live-bg); color: var(--mod-status-live); border: 1px solid var(--mod-accent-border); }
    .arena-card-badge.verdict { background: var(--mod-status-waiting-bg); color: var(--mod-text-sub); border: 1px solid var(--mod-border-secondary); }
    .arena-card-meta { font-size: 10px; color: var(--mod-text-muted); }
    .arena-card-btn { padding: 6px 14px; border-radius: var(--mod-radius-pill); border: 1px solid var(--mod-border-accent); background: var(--mod-accent-muted); color: var(--mod-accent-text); font-family: var(--mod-font-ui); font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; }
    .arena-card-score { font-family: var(--mod-font-ui); font-weight: 700; color: var(--mod-text-sub); }
    .arena-empty { text-align: center; padding: 40px 16px; color: var(--mod-text-muted); font-size: 13px; }
    .arena-empty .empty-icon { font-size: 32px; margin-bottom: 8px; display: block; opacity: 0.5; }
  `;
  document.head.appendChild(style);
}

// ============================================================
// PLACEHOLDER / EMPTY STATE
// ============================================================

export function renderFeedEmpty(): string {
  return `<div class="arena-empty">
    <span class="empty-icon">🤫</span>
    No posts yet. Let your opinion be heard.
  </div>`;
}

// ============================================================
// MODERATOR RECRUITMENT CARD (carried from async.render.takes.ts)
// ============================================================

export function renderModeratorCard(isGuest = false): string {
  const btnLabel = isGuest ? 'SIGN UP TO MODERATE' : 'BECOME A MODERATOR';
  const btnAction = isGuest ? 'mod-signup' : 'become-mod';
  return `<div class="arena-card" style="border-left-color:var(--mod-cyan);">
    <div style="font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:2px;color:var(--mod-cyan);text-transform:uppercase;margin-bottom:6px;">MODERATORS WANTED</div>
    <div style="font-size:13px;color:var(--mod-text-primary);margin-bottom:12px;line-height:1.5;">Judge debates, earn tokens, build your reputation.</div>
    <button data-action="${btnAction}" style="display:flex;align-items:center;gap:4px;background:rgba(0,224,255,0.08);border:1px solid var(--mod-cyan);color:var(--mod-cyan);padding:8px 16px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;min-height:var(--mod-touch-min);">🧑‍⚖️ ${btnLabel}</button>
  </div>`;
}
