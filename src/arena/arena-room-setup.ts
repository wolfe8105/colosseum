// arena-room-setup.ts — pre-debate + room entry
// Part of the arena.ts monolith split

import { getCurrentProfile } from '../auth.ts';
import { escapeHTML, DEBATE } from '../config.ts';
import { safeRpc } from '../auth.ts';
import { getPool, renderStakingPanel, wireStakingPanel } from '../staking.ts';
import {
  getMyPowerUps, renderLoadout, wireLoadout, renderActivationBar,
  wireActivationBar, renderSilenceOverlay, renderRevealPopup,
  renderShieldIndicator, removeShieldIndicator, getOpponentPowerUps,
  hasMultiplier,
} from '../powerups.ts';
import { nudge } from '../nudge.ts';
import {
  view, currentDebate, screenEl, selectedModerator, selectedRuleset,
  selectedRanked, activatedPowerUps, shieldActive, equippedForDebate,
  silenceTimer,
  set_view, set_currentDebate, set_equippedForDebate,
  set_shieldActive, set_silenceTimer,
} from './arena-state.ts';
import type { CurrentDebate, DebateRole } from './arena-types.ts';
import { ROUND_DURATION, TEXT_MAX_CHARS } from './arena-constants.ts';
import { isPlaceholder, formatTimer, pushArenaState } from './arena-core.ts';
import { renderInputControls, startLiveRoundTimer, initLiveAudio, addSystemMessage } from './arena-room-live.ts';
import { addReferenceButton, assignSelectedMod, startReferencePoll } from './arena-mod-refs.ts';
import { startModStatusPoll } from './arena-mod-queue.ts';
import { enterFeedRoom } from './arena-feed-room.ts';
import { renderLoadoutPicker } from '../reference-arsenal.ts';
import { renderPresetBar } from './arena-loadout-presets.ts';
import { renderBountyClaimDropdown, resetBountyClaim } from './arena-bounty-claim.ts';
import { bountyDot } from '../bounties.ts';

export async function showPreDebate(debateData: CurrentDebate): Promise<void> {
  set_view('room');
  pushArenaState('preDebate');
  set_currentDebate(debateData);
  if (screenEl) screenEl.innerHTML = '';

  activatedPowerUps.clear();
  set_shieldActive(false);
  set_equippedForDebate([]);
  if (silenceTimer) { clearInterval(silenceTimer); set_silenceTimer(null); }

  const profile = getCurrentProfile();
  const myName = profile?.display_name || profile?.username || 'You';
  const tokenBalance = Number(profile?.token_balance) || 0;

  const pre = document.createElement('div');
  pre.className = 'arena-pre-debate arena-fade-in';
  pre.innerHTML = `
    <div class="arena-rank-badge ${debateData.ruleset === 'unplugged' ? 'unplugged' : debateData.ranked ? 'ranked' : 'casual'}">${debateData.ruleset === 'unplugged' ? '\uD83C\uDFB8 UNPLUGGED' : debateData.ranked ? '\u2694\uFE0F RANKED' : '\uD83C\uDF7A CASUAL'}</div>
    <div class="arena-pre-debate-title">\u2694\uFE0F PREPARE FOR BATTLE</div>
    <div class="arena-pre-debate-sub">${escapeHTML(debateData.topic)}</div>
    <div class="arena-vs-bar" style="width:100%;max-width:360px;border-radius:12px;margin-bottom:16px;">
      <div class="arena-debater">
        <div class="arena-debater-avatar">${(myName[0] || '?').toUpperCase()}</div>
        <div class="arena-debater-info">
          <div class="arena-debater-name">${escapeHTML(myName)}</div>
          <div class="arena-debater-elo">${Number(profile?.elo_rating) || 1200} ELO</div>
        </div>
      </div>
      <div class="arena-vs-text">VS</div>
      <div class="arena-debater right">
        <div class="arena-debater-avatar">${(debateData.opponentName[0] || '?').toUpperCase()}</div>
        <div class="arena-debater-info" style="text-align:right;">
          <div class="arena-debater-name">${escapeHTML(debateData.opponentName)}${bountyDot(debateData.opponentId)}</div>
          <div class="arena-debater-elo">${Number(debateData.opponentElo)} ELO</div>
        </div>
      </div>
    </div>
    <div id="pre-debate-presets" style="width:100%;max-width:360px;"></div>
    <div id="pre-debate-staking" style="width:100%;max-width:360px;"></div>
    <div id="pre-debate-loadout" style="width:100%;max-width:360px;"></div>
    <div id="pre-debate-refs" style="width:100%;max-width:360px;"></div>
    <div id="pre-debate-bounty" style="width:100%;max-width:360px;"></div>
    <div class="pre-debate-share-row">
      <button class="pre-debate-share-btn" id="pre-debate-share-btn" data-debate-id="${escapeHTML(debateData.id)}">
        📋 SHARE TO WATCH LIVE
      </button>
      <span class="pre-debate-share-confirm" id="pre-debate-share-confirm" style="display:none;">Copied!</span>
    </div>
    <button class="arena-pre-debate-enter" id="pre-debate-enter-btn">
      <span class="btn-pulse"></span> ENTER BATTLE
    </button>
  `;
  screenEl?.appendChild(pre);

  // F-43 Slot 4: Pre-debate lobby ad
  injectAdSlot(pre, { margin: '8px 0 4px' });

  // Render staking panel
  const stakingEl = document.getElementById('pre-debate-staking');
  if (stakingEl) {
    try {
      const pool = await getPool(debateData.id);
      const sideALabel = myName;
      const sideBLabel = debateData.opponentName;
      const qa = (profile as Record<string, unknown>)?.questions_answered as number || 0;
      stakingEl.innerHTML = renderStakingPanel(debateData.id, sideALabel, sideBLabel, pool, qa);
      wireStakingPanel(debateData.id);
    } catch (e) {
      console.warn('[Arena] Staking panel error:', e);
    }
  }

  // Render power-up loadout
  const loadoutEl = document.getElementById('pre-debate-loadout');
  if (loadoutEl) {
    try {
      const puData = await getMyPowerUps(debateData.id);
      loadoutEl.innerHTML = renderLoadout(
        puData.inventory || [], puData.equipped || [],
        puData.questions_answered || 0, debateData.id
      );
      wireLoadout(debateData.id, () => {
        void showPreDebateLoadout(debateData, loadoutEl);
      });
    } catch (e) {
      console.warn('[Arena] Power-up loadout error:', e);
    }
  }

  // Render reference loadout picker (F-51 Phase 3)
  const refsEl = document.getElementById('pre-debate-refs');
  if (refsEl && debateData.mode !== 'ai') {
    try {
      await renderLoadoutPicker(refsEl, debateData.id);
    } catch (e) {
      console.warn('[Arena] Reference loadout error:', e);
    }
  }

  // F-60: Render saved loadout preset bar (after refs so apply can refresh them)
  const presetsEl = document.getElementById('pre-debate-presets');
  if (presetsEl && debateData.mode !== 'ai') {
    void renderPresetBar(presetsEl, debateData, refsEl, loadoutEl);
  }

  // F-28: Bounty claim dropdown — ranked debates with a real opponent only
  const bountyEl = document.getElementById('pre-debate-bounty');
  if (bountyEl && debateData.ranked && debateData.opponentId && debateData.mode !== 'ai') {
    resetBountyClaim();
    void renderBountyClaimDropdown(bountyEl, debateData.id, debateData.opponentId, debateData.opponentName);
  }

  // Wire enter button
  document.getElementById('pre-debate-enter-btn')?.addEventListener('click', async () => {
    const enterBtn = document.getElementById('pre-debate-enter-btn') as HTMLButtonElement | null;
    if (enterBtn) { if (enterBtn.disabled) return; enterBtn.disabled = true; enterBtn.textContent = 'ENTERING...'; }
    try {
      const finalData = await getMyPowerUps(debateData.id);
      set_equippedForDebate(finalData.equipped || []);
    } catch {
      set_equippedForDebate([]);
    }
    enterRoom(debateData);
  });

  // F-07: Wire spectator share link copy button
  document.getElementById('pre-debate-share-btn')?.addEventListener('click', () => {
    const url = `${window.location.origin}/?spectate=${encodeURIComponent(debateData.id)}`;
    navigator.clipboard.writeText(url).then(() => {
      const confirm = document.getElementById('pre-debate-share-confirm');
      if (confirm) {
        confirm.style.display = 'inline';
        setTimeout(() => { confirm.style.display = 'none'; }, 2000);
      }
    }).catch(() => {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      const confirm = document.getElementById('pre-debate-share-confirm');
      if (confirm) {
        confirm.style.display = 'inline';
        setTimeout(() => { confirm.style.display = 'none'; }, 2000);
      }
    });
  });
}

// Helper: refresh loadout panel after equip
async function showPreDebateLoadout(debateData: CurrentDebate, container: HTMLElement): Promise<void> {
  if (!container) return;
  try {
    const puData = await getMyPowerUps(debateData.id);
    container.innerHTML = renderLoadout(
      puData.inventory || [], puData.equipped || [],
      puData.questions_answered || 0, debateData.id
    );
    wireLoadout(debateData.id, () => {
      void showPreDebateLoadout(debateData, container);
    });
  } catch { /* silent */ }
}

// ============================================================
// DEBATE ROOM
// ============================================================

export function enterRoom(debate: CurrentDebate): void {
  set_view('room');
  // F-21: Stop any playing intro music when entering the room
  import('./arena-sounds.ts').then(({ stopIntroMusic }) => stopIntroMusic()).catch(() => {});

  // F-51: Route live mode to the new feed room
  if (debate.mode === 'live') {
    nudge('enter_debate', '\u2696\uFE0F You\'re in. The feed is live.');
    if (!isPlaceholder() && !debate.id.startsWith('placeholder-')) {
      safeRpc('update_arena_debate', { p_debate_id: debate.id, p_status: 'live' }).catch((e: unknown) => {
        console.warn('[Arena] Status update to live failed:', e);
      });
    }
    enterFeedRoom(debate);
    return;
  }

  // F-03: Play entrance sequence, then render the room
  import('./arena-entrance.ts')
    .then(({ playEntranceSequence }) => playEntranceSequence(debate))
    .catch(() => {})
    .finally(() => _renderRoom(debate));
}

function _renderRoom(debate: CurrentDebate): void {
  pushArenaState('room');
  set_currentDebate(debate);
  if (screenEl) screenEl.innerHTML = '';

  nudge('enter_debate', '\u2694\uFE0F You\'re in. Make every word count.');

  // Session 121: Set debate status to 'live'
  if (debate.mode === 'ai' && !isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
    safeRpc('update_arena_debate', { p_debate_id: debate.id, p_status: 'live' }).catch((e: unknown) => {
      console.warn('[Arena] Status update to live failed:', e);
    });
  }

  const profile = getCurrentProfile();
  const isModView = debate.modView === true;
  const myName = isModView ? (debate.debaterAName || 'Debater A') : (profile?.display_name || profile?.username || 'You');
  const myElo = profile?.elo_rating || 1200;
  const myInitial = isModView ? (debate.debaterAName?.[0] || 'A').toUpperCase() : (myName[0] || '?').toUpperCase();
  const oppName = isModView ? (debate.debaterBName || 'Debater B') : debate.opponentName;
  const oppInitial = (oppName[0] || '?').toUpperCase();
  const isAI = debate.mode === 'ai';
  const isUnplugged = debate.ruleset === 'unplugged';

  const roomBadgeClass = isUnplugged ? 'unplugged' : debate.ranked ? 'ranked' : 'casual';
  const roomBadgeText = isUnplugged ? '\uD83C\uDFB8 UNPLUGGED' : debate.ranked ? '\u2694\uFE0F RANKED' : '\uD83C\uDF7A CASUAL';

  const room = document.createElement('div');
  room.className = 'arena-room arena-fade-in';
  room.innerHTML = `
    <div class="arena-room-header">
      <div class="arena-rank-badge ${roomBadgeClass}" style="margin-bottom:6px">${roomBadgeText}</div>
      <div class="arena-room-topic">${escapeHTML(debate.topic)}</div>
      <div class="arena-room-round" id="arena-round-label">ROUND ${debate.round}/${debate.totalRounds}</div>
      ${debate.mode === 'live' ? `<div class="arena-room-timer" id="arena-room-timer">${formatTimer(ROUND_DURATION)}</div>` : ''}
    </div>
    ${isAI ? `<div class="ai-generated-badge" style="align-self:center;margin:0 0 4px;">
      <span class="ai-icon">AI</span>
      AI Sparring Partner \u2014 Not a Real Person
    </div>` : ''}
    <div class="arena-vs-bar">
      <div class="arena-debater">
        <div class="arena-debater-avatar">${myInitial}</div>
        <div class="arena-debater-info">
          <div class="arena-debater-name">${escapeHTML(myName)}</div>
          ${isUnplugged ? '' : `<div class="arena-debater-elo">${Number(myElo)} ELO <span style="color:var(--mod-bar-secondary);margin-left:6px;font-size:11px;">\uD83E\uDE99 ${Number(profile?.token_balance) || 0}</span></div>`}
        </div>
      </div>
      <div class="arena-vs-text">VS</div>
      <div class="arena-debater right">
        <div class="arena-debater-avatar ${isAI ? 'ai-avatar' : ''}">${isAI ? '\uD83E\uDD16' : oppInitial}</div>
        <div class="arena-debater-info" style="text-align:right;">
          <div class="arena-debater-name">${escapeHTML(oppName)}${bountyDot(debate.opponentId)}</div>
          ${isUnplugged ? '' : `<div class="arena-debater-elo">${isModView ? '' : `${Number(debate.opponentElo)} ELO`}</div>`}
        </div>
      </div>
    </div>
    <div id="powerup-loadout-container"${isUnplugged ? ' style="display:none;"' : ''}></div>
    ${isUnplugged ? '' : '<div class="arena-spectator-bar"><span class="eye">\uD83D\uDC41\uFE0F</span> <span id="arena-spectator-count">0</span> watching</div>'}
    <div class="arena-messages" id="arena-messages"></div>
    <div class="arena-input-area" id="arena-input-area" ${isModView ? 'style="display:none;"' : ''}></div>
  `;
  screenEl?.appendChild(room);

  // Add system message
  addSystemMessage(`Round ${debate.round} \u2014 Make your argument.`);

  // Session 39: Assign selected moderator
  if (selectedModerator && debate.id) {
    void assignSelectedMod(debate.id);
    debate.moderatorType = selectedModerator.type;
    debate.moderatorId = selectedModerator.id || null;
    debate.moderatorName = selectedModerator.name || (selectedModerator.type === 'ai' ? 'AI Moderator' : 'Moderator');
    // Add mod bar
    const vsBar = room.querySelector('.arena-vs-bar');
    if (vsBar) {
      const modBar = document.createElement('div');
      modBar.className = 'arena-mod-bar';
      modBar.innerHTML = `<span class="mod-icon">\u2696\uFE0F</span> Moderator: ${escapeHTML(debate.moderatorName)}`;
      vsBar.parentNode?.insertBefore(modBar, vsBar.nextSibling);
    }
  }

  // Session 109: Load power-up loadout (skip in Unplugged)
  if (!isUnplugged && debate.id && !debate.id.startsWith('placeholder-')) {
    (async () => {
      try {
        const data = await getMyPowerUps(debate.id);
        const loadoutContainer = document.getElementById('powerup-loadout-container');
        if (loadoutContainer && data) {
          loadoutContainer.innerHTML = renderLoadout(
            data.inventory, data.equipped,
            (profile as Record<string, unknown>)?.questions_answered as number || 0, debate.id
          );
          wireLoadout(debate.id, async () => {
            const refreshed = await getMyPowerUps(debate.id);
            if (loadoutContainer && refreshed) {
              loadoutContainer.innerHTML = renderLoadout(
                refreshed.inventory, refreshed.equipped,
                (profile as Record<string, unknown>)?.questions_answered as number || 0, debate.id
              );
              wireLoadout(debate.id);
            }
          });
        }
      } catch (e) {
        console.warn('[Arena] Power-up loadout load error:', e);
      }
    })();
  }

  // Render mode-specific controls
  renderInputControls(debate.mode);

  // Session 39: Add reference button for non-AI modes
  addReferenceButton();

  // Session 110: Add power-up activation bar if equipped (skip in Unplugged)
  if (!isUnplugged && equippedForDebate.length > 0) {
    const barHtml = renderActivationBar(equippedForDebate);
    if (barHtml) {
      const messagesEl = room.querySelector('.arena-messages');
      if (messagesEl) {
        const barContainer = document.createElement('div');
        barContainer.innerHTML = barHtml;
        if (barContainer.firstElementChild) {
          messagesEl.parentNode?.insertBefore(barContainer.firstElementChild, messagesEl.nextSibling);
        }
      }
      // Wire activation handlers
      wireActivationBar(debate.id, {
        onSilence: () => {
          addSystemMessage('\uD83E\uDD2B You silenced ' + escapeHTML(debate.opponentName) + ' for 10 seconds!');
          set_silenceTimer(renderSilenceOverlay(debate.opponentName));
          activatedPowerUps.add('silence');
        },
        onShield: () => {
          set_shieldActive(true);
          renderShieldIndicator();
          addSystemMessage('\uD83D\uDEE1\uFE0F Shield activated! Your next reference challenge will be blocked.');
          activatedPowerUps.add('shield');
        },
        onReveal: async () => {
          addSystemMessage('\uD83D\uDC41\uFE0F Revealing opponent\'s power-ups...');
          const oppData = await getOpponentPowerUps(debate.id);
          if (oppData.success) {
            renderRevealPopup(oppData.equipped || []);
          } else {
            addSystemMessage('Could not reveal opponent\'s loadout.');
          }
          activatedPowerUps.add('reveal');
        },
      });
      // Show passive multiplier badge in system message
      if (hasMultiplier(equippedForDebate)) {
        addSystemMessage('\u26A1 2x Multiplier active \u2014 staking payouts doubled if you win!');
      }
    }
  }

  // Session 39: Start reference polling if moderator assigned (or mod is observing)
  if ((selectedModerator || debate.modView) && debate.id && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
    startReferencePoll(debate.id);
  }

  // F-47: Start mod status poll for human debates — skip if this user IS the mod
  if (!debate.modView && debate.mode !== 'ai' && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-') && !isPlaceholder()) {
    startModStatusPoll(debate.id);
  }

  // Start round timer for live mode
  if (debate.mode === 'live') {
    startLiveRoundTimer();
    void initLiveAudio();
  }
}
