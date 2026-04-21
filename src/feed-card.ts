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

  return `<div class="arena-card card-open" data-card-id="${esc(card.id)}" data-status="open">
    <div class="arena-card-top">
      <div style="display:flex;gap:6px;align-items:center;">
        <span class="arena-card-badge" style="background:rgba(59,199,148,0.15);color:var(--mod-status-open);border:1px solid rgba(59,199,148,0.3);">OPEN</span>
        <span class="arena-card-badge" style="background:var(--mod-bg-subtle);color:var(--mod-text-muted);border:1px solid var(--mod-border-secondary);">${catLabel}</span>
      </div>
      <span class="arena-card-meta">${esc(time)}</span>
    </div>
    <div class="arena-card-topic">${cardText}</div>
    ${linkBlock}
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <div ${profileAttr} style="width:28px;height:28px;border-radius:50%;background:var(--mod-bg-card);border:2px solid var(--mod-accent);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--mod-accent);${!isOwn ? 'cursor:pointer;' : ''}">${initial}</div>
      <span ${profileAttr} style="font-size:12px;font-weight:600;color:var(--mod-text-primary);${!isOwn ? 'cursor:pointer;' : ''}">${displayName}${vgBadge(card.verified_a ?? false)}${bountyDot(card.debater_a)}</span>
      <span style="font-size:11px;color:var(--mod-text-muted);">${Number(card.elo_a || 1200)} Elo</span>
    </div>
    <div style="display:flex;align-items:center;gap:12px;">
      <button data-action="react-card" data-id="${esc(card.id)}" style="display:flex;align-items:center;gap:4px;${reactedClass}border:1px solid;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;min-height:var(--mod-touch-min);">🔥 ${Number(card.reaction_count)}</button>
      ${!isOwn ? `<button data-action="challenge-card" data-id="${esc(card.id)}" style="display:flex;align-items:center;gap:4px;background:rgba(59,199,148,0.1);border:1px solid rgba(59,199,148,0.3);color:var(--mod-status-open);padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;margin-left:auto;min-height:var(--mod-touch-min);">⚔️ CHALLENGE</button>` : ''}
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
    <div class="arena-card-top">
      <div style="display:flex;gap:6px;align-items:center;">
        <span class="arena-card-badge live">● LIVE</span>
        <span class="arena-card-badge" style="background:var(--mod-bg-subtle);color:var(--mod-text-muted);border:1px solid var(--mod-border-secondary);">${catLabel}</span>
        ${rulesetBadge}${roundsBadge}
      </div>
      <span class="arena-card-meta">${roundMeta}</span>
    </div>
    <div class="arena-card-topic">${esc(card.content || card.topic || 'Live Debate')}</div>
    ${linkBlock}
    <div class="arena-card-vs">
      <span>${nameA}${bountyDot(card.debater_a)}</span>
      <span class="vs">VS</span>
      <span>${nameB}${bountyDot(card.debater_b)}</span>
      ${card.score_a != null ? `<span class="arena-card-score">${Number(card.score_a)}–${Number(card.score_b)}</span>` : ''}
    </div>
    <div class="arena-card-action"><button class="arena-card-btn">SPECTATE</button></div>
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
    <div class="arena-card-top">
      <div style="display:flex;gap:6px;align-items:center;">
        <span class="arena-card-badge" style="background:rgba(250,196,75,0.15);color:var(--mod-bar-secondary);border:1px solid rgba(250,196,75,0.3);">VOTING</span>
        <span class="arena-card-badge" style="background:var(--mod-bg-subtle);color:var(--mod-text-muted);border:1px solid var(--mod-border-secondary);">${catLabel}</span>
      </div>
      <span class="arena-card-meta">${votes} vote${votes !== 1 ? 's' : ''}</span>
    </div>
    <div class="arena-card-topic">${esc(card.content || card.topic || 'Untitled Debate')}</div>
    ${linkBlock}
    <div class="arena-card-vs">
      <span>${nameA}${bountyDot(card.debater_a)}</span>
      <span class="vs">VS</span>
      <span>${nameB}${bountyDot(card.debater_b)}</span>
      ${card.score_a != null ? `<span class="arena-card-score">${Number(card.score_a)}–${Number(card.score_b)}</span>` : ''}
    </div>
    <div class="arena-card-action"><button class="arena-card-btn">VOTE</button></div>
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
    <div class="arena-card-top">
      <div style="display:flex;gap:6px;align-items:center;">
        <span class="arena-card-badge verdict">VERDICT</span>
        <span class="arena-card-badge" style="background:var(--mod-bg-subtle);color:var(--mod-text-muted);border:1px solid var(--mod-border-secondary);">${catLabel}</span>
        ${rulesetBadge}
      </div>
      <span class="arena-card-meta">${votes} vote${votes !== 1 ? 's' : ''}</span>
    </div>
    <div class="arena-card-topic">${esc(card.content || card.topic || 'Untitled Debate')}</div>
    ${linkBlock}
    <div class="arena-card-vs">
      <span style="${winnerStyle || loserStyleA}">${nameA}${scoreA > scoreB ? ' ✓' : ''}${bountyDot(card.debater_a)}</span>
      <span class="vs">VS</span>
      <span style="${winnerStyleB || loserStyleB}">${nameB}${scoreB > scoreA ? ' ✓' : ''}${bountyDot(card.debater_b)}</span>
      <span class="arena-card-score">${scoreA}–${scoreB}</span>
    </div>
    <div class="arena-card-action"><button class="arena-card-btn">VIEW</button></div>
  </div>`;
}

// ============================================================
// SHARED: Link preview block (F-62)
// ============================================================

function _renderLinkPreview(card: UnifiedFeedCard): string {
  const esc = escapeHTML;
  const lp = card.link_preview as { image_url?: string; og_title?: string; domain?: string } | null;
  if (!card.link_url || !lp?.image_url) return '';
  return `<a href="${esc(card.link_url)}" target="_blank" rel="noopener" class="arena-card-link-preview" onclick="event.stopPropagation()">
    <img src="${esc(lp.image_url)}" alt="" class="arena-card-link-img" onerror="this.parentElement.style.display='none'">
    <div class="arena-card-link-meta">
      ${lp.domain ? `<span class="arena-card-link-domain">${esc(lp.domain)}</span>` : ''}
      ${lp.og_title ? `<span class="arena-card-link-title">${esc(lp.og_title)}</span>` : ''}
    </div>
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
