/**
 * arena-lobby.cards.ts — Arena lobby card renderers
 *
 * renderArenaFeedCard, renderAutoDebateCard, renderPlaceholderCards
 * Extracted from arena-lobby.ts (Session 254 track).
 */

import { escapeHTML } from '../config.ts';
import type { ArenaFeedItem, AutoDebateItem } from './arena-types-feed-list.ts';

export function renderArenaFeedCard(d: ArenaFeedItem, _type: string): string {
  const isAuto = d.source === 'auto_debate';
  const isLive = d.status === 'live';
  const rulesetBadge = d.ruleset === 'unplugged' ? '<span class="arena-card-badge unplugged">\uD83C\uDFB8 UNPLUGGED</span>' : '';
  const roundsBadge = d.total_rounds && d.total_rounds !== 4 ? `<span class="arena-card-badge">${d.total_rounds}R</span>` : '';
  const badge = isLive ? '<span class="arena-card-badge live">\u25CF LIVE</span>'
    : isAuto ? '<span class="arena-card-badge ai">AI DEBATE</span>'
    : '<span class="arena-card-badge verdict">VERDICT</span>';
  const votes = (d.vote_count_a || 0) + (d.vote_count_b || 0);
  const action = isLive ? 'SPECTATE' : 'VIEW';
  const cardClass = isLive ? 'card-live' : isAuto ? 'card-ai' : '';

  const cardAttr = isLive
    ? `data-debate-id="${encodeURIComponent(d.id)}"`
    : `data-link="${isAuto ? '/verdict?id=' + encodeURIComponent(d.id) : '/debate/' + encodeURIComponent(d.id)}"`;

  return `<div class="arena-card ${cardClass}" ${cardAttr}>
    <div class="arena-card-top">${badge}${rulesetBadge}${roundsBadge}<span class="arena-card-meta">${votes} vote${votes !== 1 ? 's' : ''}</span></div>
    <div class="arena-card-topic">${escapeHTML(d.topic || 'Untitled Debate')}</div>
    <div class="arena-card-vs">
      <span>${escapeHTML(d.debater_a_name || 'Side A')}</span>
      <span class="vs">VS</span>
      <span>${escapeHTML(d.debater_b_name || 'Side B')}</span>
      ${d.score_a != null ? `<span class="arena-card-score">${Number(d.score_a)}\u2013${Number(d.score_b)}</span>` : ''}
    </div>
    <div class="arena-card-action"><button class="arena-card-btn">${action}</button></div>
  </div>`;
}

export function renderAutoDebateCard(d: AutoDebateItem): string {
  return `<div class="arena-card card-ai" data-link="moderator-auto-debate.html?id=${encodeURIComponent(d.id)}">
    <div class="arena-card-top"><span class="arena-card-badge ai">AI DEBATE</span></div>
    <div class="arena-card-topic">${escapeHTML(d.topic)}</div>
    <div class="arena-card-vs">
      <span>${escapeHTML(d.side_a_label)}</span>
      <span class="vs">VS</span>
      <span>${escapeHTML(d.side_b_label)}</span>
      <span class="arena-card-score">${Number(d.score_a)}\u2013${Number(d.score_b)}</span>
    </div>
    <div class="arena-card-action"><button class="arena-card-btn">VIEW</button></div>
  </div>`;
}

export function renderPlaceholderCards(type: string): string {
  if (type === 'live') {
    return `<div class="arena-empty"><span class="empty-icon">\uD83C\uDFDB\uFE0F</span>No live debates yet \u2014 be the first to enter the arena</div>`;
  }
  const placeholders = [
    { topic: 'Is LeBron the GOAT?', a: 'Yes Camp', b: 'Jordan Forever', sa: 72, sb: 85 },
    { topic: 'Pineapple belongs on pizza', a: 'Pro Pineapple', b: 'Pizza Purists', sa: 61, sb: 39 },
    { topic: 'Remote work is here to stay', a: 'Remote Warriors', b: 'Office Advocates', sa: 78, sb: 55 },
  ];
  return placeholders.map(p => `
    <div class="arena-card">
      <div class="arena-card-top"><span class="arena-card-badge verdict">VERDICT</span></div>
      <div class="arena-card-topic">${p.topic}</div>
      <div class="arena-card-vs">
        <span>${p.a}</span><span class="vs">VS</span><span>${p.b}</span>
        <span class="arena-card-score">${Number(p.sa)}\u2013${Number(p.sb)}</span>
      </div>
    </div>
  `).join('');
}
