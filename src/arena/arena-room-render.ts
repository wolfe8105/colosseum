// arena-room-render.ts — room layout builder
// Split from arena-room-setup.ts

import { getCurrentProfile } from '../auth.ts';
import { escapeHTML } from '../config.ts';
import { safeRpc } from '../auth.ts';
import {
  getMyPowerUps, renderLoadout, wireLoadout,
  renderActivationBar, wireActivationBar,
  renderSilenceOverlay, renderRevealPopup,
  renderShieldIndicator, getOpponentPowerUps, hasMultiplier,
} from '../powerups.ts';
import { nudge } from '../nudge.ts';
import {
  screenEl, selectedModerator, activatedPowerUps, equippedForDebate,
  set_currentDebate, set_shieldActive, set_silenceTimer,
} from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import { ROUND_DURATION } from './arena-constants.ts';
import { isPlaceholder, formatTimer, pushArenaState } from './arena-core.utils.ts';
import { renderInputControls } from './arena-room-live-input.ts';
import { startLiveRoundTimer } from './arena-room-live-poll.ts';
import { initLiveAudio } from './arena-room-live-audio.ts';
import { addSystemMessage } from './arena-room-live-messages.ts';
import { addReferenceButton, assignSelectedMod, startReferencePoll } from './arena-mod-refs.ts';
import { startModStatusPoll } from './arena-mod-queue-status.ts';
import { bountyDot } from '../bounties.ts';

export function renderRoom(debate: CurrentDebate): void {
  pushArenaState('room');
  set_currentDebate(debate);
  if (screenEl) screenEl.innerHTML = '';

  nudge('enter_debate', '\u2694\uFE0F You\'re in. Make every word count.');

  // Session 121: Set debate status to 'live'
  // LANDMINE [LM-SETUP-002]: This guard (`mode === 'ai' && !isPlaceholder() && !id.startsWith(...)`)
  // is the same "real debate" predicate family as LM-END-002 in arena-room-end. Worth extracting
  // a shared isRealDebate(debate) helper after both refactors land.
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
  // LANDMINE [LM-SETUP-003]: The IIFE fetches power-ups and wires a callback that fetches again
  // and re-renders + re-wires. On successful equip: one full round-trip to render initial state,
  // then a second full fetch + re-render + re-wire. If intent was optimistic local update this is
  // wrong; if intent was "always re-sync after mutation" it is correct but expensive.
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
