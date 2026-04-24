// arena-lobby.ts — Lobby rendering, feed, power-up shop
// Part of the arena.ts monolith split
// Card renders extracted to arena-lobby.cards.ts (Session 254 track).

import { safeRpc, getCurrentUser, getCurrentProfile, toggleModerator } from '../auth.ts';
import { showToast } from '../config.ts';
import { buy as buyPowerUp, renderShop } from '../powerups.ts';
import { removeShieldIndicator } from '../powerups.ts';
import { navigateTo } from '../navigation.ts';
import {
  screenEl, selectedRuleset, selectedRanked,
  privateLobbyPollTimer, privateLobbyDebateId, activatedPowerUps,
  shieldActive, silenceTimer,
  set_view, set_selectedMode, set_selectedModerator, set_selectedRanked,
  set_selectedRuleset, set_selectedCategory, set_selectedWantMod,
  set_privateLobbyPollTimer, set_privateLobbyDebateId,
  set_shieldActive, set_equippedForDebate, set_silenceTimer,
} from './arena-state.ts';
import type { ArenaView } from './arena-types.ts';
import type { ArenaFeedItem } from './arena-types-feed-list.ts';
import { isPlaceholder, pushArenaState } from './arena-core.utils.ts';
import { showRankedPicker } from './arena-config-settings.ts';
import { showPrivateLobbyPicker } from './arena-private-picker.ts';
import { showModQueue } from './arena-mod-queue-browse.ts';
import { joinWithCode } from './arena-private-lobby.join.ts';
import { loadPendingChallenges } from './arena-pending-challenges.ts';
import { loadMyOpenDebates } from './arena-lobby.open-debates.ts';
import { stopReferencePoll } from './arena-mod-refs.ts';
import { enterFeedRoomAsSpectator } from './arena-feed-room.ts';
import {
  renderArenaFeedCard,
  renderAutoDebateCard,
  renderPlaceholderCards,
} from './arena-lobby.cards.ts';

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
          <div class="arena-stat-value"><span data-token-balance>${Number(profile?.token_balance) || 0}</span></div>
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
      ${profile?.is_moderator ? `<div class="arena-btn-row" style="margin-top:0;"><button class="arena-secondary-btn" id="arena-mod-queue-btn" style="width:100%;font-size:16px;letter-spacing:1.5px;">🧑‍⚖️ MODERATOR QUEUE</button></div>` : ''}
      ${getCurrentUser() && !profile?.is_moderator ? `
      <div id="arena-mod-banner" style="background:var(--mod-bg-card);border:1px solid var(--mod-cyan);border-radius:10px;padding:14px 16px;margin-top:8px;text-align:center;">
        <div style="font-family:var(--mod-font-display);font-size:15px;color:var(--mod-cyan);letter-spacing:1px;margin-bottom:4px;">THE MODERATOR NEEDS MODERATORS</div>
        <div style="font-size:12px;color:var(--mod-text-sub);margin-bottom:10px;">Judge debates. Score arguments. Build your rep.</div>
        <button class="arena-secondary-btn" id="arena-become-mod-btn" style="width:100%;border-color:var(--mod-cyan);color:var(--mod-cyan);">🧑‍⚖️ BECOME A MODERATOR</button>
      </div>` : ''}
      <div class="arena-btn-row" style="margin-top:0;">
        <input id="arena-join-code-input" type="text" maxlength="5" placeholder="JOIN CODE" style="flex:1;padding:10px 14px;border-radius:var(--mod-radius-pill);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:13px;letter-spacing:2px;text-transform:uppercase;outline:none;min-height:44px;">
        <button class="arena-secondary-btn" id="arena-join-code-btn" style="flex:0 0 auto;padding:10px 18px;">GO</button>
      </div>
    </div>
    <div class="arena-section" id="arena-my-open-section" style="display:none;">
      <div class="arena-section-title"><span class="section-dot" style="background:var(--mod-accent);"></span> YOUR OPEN DEBATES</div>
      <div id="arena-my-open-feed"></div>
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
        <div class="arena-challenge-sub">Find an opinion you disagree with \u2192 challenge them to debate it</div>
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
    if (code.length === 5) void joinWithCode(code);
    else showToast('Enter a 5-character code');
  });
  joinCodeInput?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const code = joinCodeInput.value.trim().toUpperCase();
      if (code.length === 5) void joinWithCode(code);
    }
  });

  // Wire challenge CTA — navigate to home carousel
  document.getElementById('arena-challenge-cta')?.addEventListener('click', () => {
    navigateTo('home');
  });

  // Load lobby content
  void loadLobbyFeed();
  if (!isPlaceholder()) {
    void loadPendingChallenges();
    void loadMyOpenDebates();
  }

  // Event delegation for arena card links
  lobby.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    // Live debate cards → enter feed room as spectator (no page navigation)
    const liveCard = target.closest('.arena-card.card-live[data-debate-id]') as HTMLElement | null;
    if (liveCard) {
      void enterFeedRoomAsSpectator(liveCard.dataset.debateId!);
      return;
    }
    const card = target.closest('.arena-card[data-link]') as HTMLElement | null;
    if (card) window.location.href = card.dataset.link!;
  });
}

export async function loadLobbyFeed(): Promise<void> {
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
    const { data, error } = await safeRpc<ArenaFeedItem[]>('get_arena_feed', { p_limit: 20 });

    if (error || !data || (data as ArenaFeedItem[]).length === 0) {
      liveFeed.innerHTML = renderPlaceholderCards('live');
      verdictsFeed.innerHTML = renderPlaceholderCards('verdict');
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
      if (buttonEl.disabled) return;
      buttonEl.disabled = true;
      buttonEl.textContent = '...';
      try {
        const result = await buyPowerUp(id!, 1, cost);
        if (result.success) {
          showToast('Power-up purchased! \uD83C\uDF89');
          showPowerUpShop(); // re-render with updated balance
        } else {
          showToast(result.error || 'Purchase failed');
        }
      } catch {
        showToast('Purchase failed. Please try again.');
      } finally {
        buttonEl.disabled = false;
        buttonEl.textContent = `${cost} \uD83E\uDE99`;
      }
    });
  });
}

// Re-export card renderers for backward compat (importers that use dynamic import('./arena-lobby.ts'))
export { renderArenaFeedCard, renderAutoDebateCard, renderPlaceholderCards } from './arena-lobby.cards.ts';
