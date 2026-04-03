// arena-lobby.ts — Lobby rendering, feed, power-up shop
// Part of the arena.ts monolith split

import { safeRpc, getSupabaseClient, getCurrentUser, getCurrentProfile, toggleModerator } from '../auth.ts';
import { escapeHTML, showToast } from '../config.ts';
import { buy as buyPowerUp, renderShop } from '../powerups.ts';
import { removeShieldIndicator } from '../powerups.ts';
import { navigateTo } from '../navigation.ts';
import {
  view, screenEl, selectedRuleset, selectedRanked,
  privateLobbyPollTimer, privateLobbyDebateId, activatedPowerUps,
  shieldActive, equippedForDebate, silenceTimer,
  set_view, set_selectedMode, set_selectedModerator, set_selectedRanked,
  set_selectedRuleset, set_selectedCategory, set_selectedWantMod,
  set_privateLobbyPollTimer, set_privateLobbyDebateId,
  set_shieldActive, set_equippedForDebate, set_silenceTimer,
} from './arena-state.ts';
import type { ArenaView, ArenaFeedItem, AutoDebateItem } from './arena-types.ts';
import { isPlaceholder, pushArenaState } from './arena-core.ts';
import { showRankedPicker } from './arena-config-settings.ts';
import { showPrivateLobbyPicker } from './arena-private-picker.ts';
import { showModQueue } from './arena-mod-queue.ts';
import { joinWithCode, loadPendingChallenges } from './arena-private-lobby.ts';
import { stopReferencePoll } from './arena-mod-refs.ts';

// ============================================================
// LOBBY
// ============================================================

export function renderLobby(): void {
  set_view('lobby' as ArenaView);
  set_selectedMode(null);
  set_selectedModerator(null);
  set_selectedRanked(false);
  set_selectedRuleset('amplified');
  set_selectedCategory(null);
  set_selectedWantMod(false);
  if (privateLobbyPollTimer) { clearInterval(privateLobbyPollTimer); set_privateLobbyPollTimer(null); }
  set_privateLobbyDebateId(null);
  stopReferencePoll();
  activatedPowerUps.clear();
  set_shieldActive(false);
  set_equippedForDebate([]);
  if (silenceTimer) { clearInterval(silenceTimer); set_silenceTimer(null); }
  removeShieldIndicator();
  document.getElementById('powerup-silence-overlay')?.remove();
  document.getElementById('powerup-reveal-popup')?.remove();
  history.replaceState({ arenaView: 'lobby' }, '');
  if (screenEl) {
    screenEl.innerHTML = '';
    screenEl.style.position = 'relative';
  }

  const profile = getCurrentProfile();
  const loginStreak = Number(profile?.login_streak) || 0;

  const lobby = document.createElement('div');
  lobby.className = 'arena-lobby arena-fade-in';

  lobby.innerHTML = `
    <div class="arena-hero">
      <div class="arena-hero-title">Arena</div>
      <div class="arena-hero-sub">Pick a mode. Find an opponent. Settle it.</div>
      <div class="arena-stat-row">
        <div class="arena-stat accent">
          <div class="arena-stat-value"><span data-token-balance>0</span></div>
          <div class="arena-stat-label">Tokens</div>
        </div>
        <div class="arena-stat">
          <div class="arena-stat-value">${loginStreak}</div>
          <div class="arena-stat-label">Day Streak</div>
        </div>
      </div>
      <button class="arena-enter-btn" id="arena-enter-btn">
        <span class="btn-pulse"></span> ENTER THE ARENA
      </button>
      <div class="arena-btn-row">
        <button class="arena-secondary-btn" id="arena-private-btn">\u2694\uFE0F PRIVATE DEBATE</button>
        <button class="arena-secondary-btn" id="arena-powerup-shop-btn">\u26A1 POWER-UPS</button>
      </div>
      ${profile?.is_moderator ? `<div class="arena-btn-row" style="margin-top:0;"><button class="arena-secondary-btn" id="arena-mod-queue-btn" style="width:100%;">🧑‍⚖️ MOD QUEUE</button></div>` : ''}
      ${getCurrentUser() && !profile?.is_moderator ? `
      <div id="arena-mod-banner" style="background:var(--mod-bg-card);border:1px solid var(--mod-cyan);border-radius:10px;padding:14px 16px;margin-top:8px;text-align:center;">
        <div style="font-family:var(--mod-font-display);font-size:15px;color:var(--mod-cyan);letter-spacing:1px;margin-bottom:4px;">THE MODERATOR NEEDS MODERATORS</div>
        <div style="font-size:12px;color:var(--mod-text-sub);margin-bottom:10px;">Judge debates. Score arguments. Build your rep.</div>
        <button class="arena-secondary-btn" id="arena-become-mod-btn" style="width:100%;border-color:var(--mod-cyan);color:var(--mod-cyan);">🧑‍⚖️ BECOME A MODERATOR</button>
      </div>` : ''}
      <div class="arena-btn-row" style="margin-top:0;">
        <input id="arena-join-code-input" type="text" maxlength="6" placeholder="JOIN CODE" style="flex:1;padding:10px 14px;border-radius:var(--mod-radius-pill);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:13px;letter-spacing:3px;text-transform:uppercase;outline:none;min-height:44px;">
        <button class="arena-secondary-btn" id="arena-join-code-btn" style="flex:0 0 auto;padding:10px 18px;">GO</button>
      </div>
    </div>
    <div class="arena-section" id="arena-pending-challenges-section" style="display:none;">
      <div class="arena-section-title"><span class="section-dot live-dot"></span> CHALLENGES FOR YOU</div>
      <div id="arena-pending-challenges-feed"></div>
    </div>
    <div class="arena-section" id="arena-live-section">
      <div class="arena-section-title"><span class="section-dot live-dot"></span> LIVE NOW</div>
      <div id="arena-live-feed"></div>
    </div>
    <div class="arena-section" id="arena-challenge-section">
      <div class="arena-section-title"><span class="section-dot gold-dot"></span> OPEN CHALLENGES</div>
      <div class="arena-challenge-cta" id="arena-challenge-cta">
        <div class="arena-challenge-text">DISAGREE WITH SOMEONE?</div>
        <div class="arena-challenge-sub">Find a hot take you hate \u2192 challenge them to debate it</div>
      </div>
    </div>
    <div class="arena-section" id="arena-unplugged-section">
      <div class="arena-section-title"><span class="section-dot"></span> \uD83C\uDFB8 UNPLUGGED</div>
      <div id="arena-unplugged-feed"></div>
    </div>
    <div class="arena-section" id="arena-verdicts-section">
      <div class="arena-section-title"><span class="section-dot gold-dot"></span> RECENT VERDICTS</div>
      <div id="arena-verdicts-feed"></div>
    </div>
  `;
  screenEl?.appendChild(lobby);

  // Wire enter button
  document.getElementById('arena-enter-btn')?.addEventListener('click', showRankedPicker);
  document.getElementById('arena-powerup-shop-btn')?.addEventListener('click', showPowerUpShop);
  document.getElementById('arena-private-btn')?.addEventListener('click', showPrivateLobbyPicker);
  document.getElementById('arena-mod-queue-btn')?.addEventListener('click', showModQueue);

  // Wire moderator recruitment banner
  document.getElementById('arena-become-mod-btn')?.addEventListener('click', async () => {
    const result = await toggleModerator(true);
    if (!result.error) {
      showToast('🧑‍⚖️ You are now a Moderator!', 'success');
      renderLobby();
    } else {
      showToast('⚠️ Could not enable moderator mode. Try again.', 'error');
    }
  });

  // Wire join code input
  const joinCodeInput = document.getElementById('arena-join-code-input') as HTMLInputElement | null;
  document.getElementById('arena-join-code-btn')?.addEventListener('click', () => {
    const code = joinCodeInput?.value?.trim().toUpperCase() || '';
    if (code.length === 6) void joinWithCode(code);
    else showToast('Enter a 6-character code');
  });
  joinCodeInput?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const code = joinCodeInput.value.trim().toUpperCase();
      if (code.length === 6) void joinWithCode(code);
    }
  });

  // Wire challenge CTA — navigate to home carousel
  document.getElementById('arena-challenge-cta')?.addEventListener('click', () => {
    navigateTo('home');
  });

  // Load lobby content
  void loadLobbyFeed();
  if (!isPlaceholder()) void loadPendingChallenges();

  // Event delegation for arena card links
  lobby.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    const card = target.closest('.arena-card[data-link]') as HTMLElement | null;
    if (card) window.location.href = card.dataset.link!;
  });
}

async function loadLobbyFeed(): Promise<void> {
  const liveFeed = document.getElementById('arena-live-feed');
  const verdictsFeed = document.getElementById('arena-verdicts-feed');
  const unpluggedFeed = document.getElementById('arena-unplugged-feed');
  if (!liveFeed || !verdictsFeed) return;

  if (isPlaceholder()) {
    liveFeed.innerHTML = renderPlaceholderCards('live');
    verdictsFeed.innerHTML = renderPlaceholderCards('verdict');
    return;
  }

  try {
    const sb = getSupabaseClient();
    const { data, error } = await safeRpc<ArenaFeedItem[]>('get_arena_feed', { p_limit: 20 });

    if (error || !data || (data as ArenaFeedItem[]).length === 0) {
      // Fall back to auto-debates only
      const { data: autoData } = await sb!.from('auto_debates')
        .select('id, topic, side_a_label, side_b_label, score_a, score_b, status, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (autoData && autoData.length > 0) {
        liveFeed.innerHTML = '<div class="arena-empty"><span class="empty-icon">\uD83C\uDFDB\uFE0F</span>No live debates yet \u2014 be the first to enter the arena</div>';
        verdictsFeed.innerHTML = (autoData as AutoDebateItem[]).map((d: AutoDebateItem) => renderAutoDebateCard(d)).join('');
      } else {
        liveFeed.innerHTML = renderPlaceholderCards('live');
        verdictsFeed.innerHTML = renderPlaceholderCards('verdict');
      }
      return;
    }

    const feedData = data as ArenaFeedItem[];
    const unplugged = feedData.filter((d: ArenaFeedItem) => d.ruleset === 'unplugged');
    const amplified = feedData.filter((d: ArenaFeedItem) => d.ruleset !== 'unplugged');
    const live = amplified.filter((d: ArenaFeedItem) => d.status === 'live' || d.status === 'pending');
    const complete = amplified.filter((d: ArenaFeedItem) => d.status === 'complete' || d.status === 'voting' || d.source === 'auto_debate');

    liveFeed.innerHTML = live.length > 0
      ? live.map((d: ArenaFeedItem) => renderArenaFeedCard(d, 'live')).join('')
      : '<div class="arena-empty"><span class="empty-icon">\uD83C\uDFDB\uFE0F</span>No live debates right now \u2014 be the first</div>';

    verdictsFeed.innerHTML = complete.length > 0
      ? complete.map((d: ArenaFeedItem) => renderArenaFeedCard(d, 'verdict')).join('')
      : '<div class="arena-empty"><span class="empty-icon">\uD83D\uDCDC</span>No verdicts yet</div>';

    if (unpluggedFeed) {
      unpluggedFeed.innerHTML = unplugged.length > 0
        ? unplugged.map((d: ArenaFeedItem) => renderArenaFeedCard(d, d.status === 'live' ? 'live' : 'verdict')).join('')
        : '<div class="arena-empty"><span class="empty-icon">\uD83C\uDFB8</span>No unplugged debates yet</div>';
    }

  } catch (err) {
    console.error('[Arena] Feed load error:', err);
    liveFeed.innerHTML = renderPlaceholderCards('live');
    verdictsFeed.innerHTML = renderPlaceholderCards('verdict');
  }
}

function renderArenaFeedCard(d: ArenaFeedItem, _type: string): string {
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

  return `<div class="arena-card ${cardClass}" data-link="${isAuto ? '/verdict?id=' + encodeURIComponent(d.id) : '/debate/' + encodeURIComponent(d.id)}">
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

function renderAutoDebateCard(d: AutoDebateItem): string {
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

function renderPlaceholderCards(type: string): string {
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

// ============================================================
// POWER-UP SHOP
// ============================================================

export async function showPowerUpShop(): Promise<void> {
  if (!getCurrentUser() && !isPlaceholder()) {
    window.location.href = 'moderator-plinko.html';
    return;
  }
  set_view('powerUpShop' as ArenaView);
  pushArenaState('powerUpShop');
  const tokenBalance = Number(getCurrentProfile()?.token_balance) || 0;
  const shopHtml = await renderShop(tokenBalance);

  if (screenEl) {
    screenEl.innerHTML = `
      <div style="padding:16px;padding-bottom:80px;max-width:480px;margin:0 auto;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <button id="powerup-shop-back" style="
            background:none;border:none;color:var(--mod-text-body);
            font-family:var(--mod-font-ui);font-size:14px;
            font-weight:600;cursor:pointer;letter-spacing:1px;padding:0;
          ">\u2190 BACK</button>
        </div>
        ${shopHtml}
      </div>
    `;
  }

  document.getElementById('powerup-shop-back')?.addEventListener('click', () => {
    renderLobby();
  });

  // Wire buy buttons
  document.querySelectorAll('.powerup-buy-btn').forEach((btn) => {
    const buttonEl = btn as HTMLButtonElement;
    buttonEl.addEventListener('click', async () => {
      const id = buttonEl.dataset.id;
      const cost = Number(buttonEl.dataset.cost);
      buttonEl.disabled = true;
      buttonEl.textContent = '...';
      const result = await buyPowerUp(id!, 1);
      if (result.success) {
        showToast('Power-up purchased! \uD83C\uDF89');
        showPowerUpShop(); // re-render with updated balance
      } else {
        showToast(result.error || 'Purchase failed');
        buttonEl.disabled = false;
        buttonEl.textContent = `${cost} \uD83E\uDE99`;
      }
    });
  });
}

export { loadLobbyFeed, renderArenaFeedCard, renderAutoDebateCard, renderPlaceholderCards };
