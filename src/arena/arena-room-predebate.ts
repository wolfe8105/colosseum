// arena-room-predebate.ts — pre-debate loadout/staking/bounty screen
// Split from arena-room-setup.ts

import { getCurrentProfile } from '../auth.ts';
import { escapeHTML } from '../config.ts';
import { getPool, renderStakingPanel, wireStakingPanel } from '../staking.ts';
import { getMyPowerUps, renderLoadout, wireLoadout } from '../powerups.ts';
import {
  screenEl, activatedPowerUps, silenceTimer,
  set_view, set_currentDebate, set_equippedForDebate,
  set_shieldActive, set_silenceTimer,
} from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import { pushArenaState } from './arena-core.ts';
import { injectAdSlot } from './arena-ads.ts';
// LANDMINE [LM-SETUP-001]: injectAdSlot was missing from arena-room-setup.ts imports —
// the original file called it without importing it. Import added here as housekeeping.
// If the baseline build was succeeding, it was resolving transitively through some other chain.
import { enterRoom } from './arena-room-enter.ts';
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
      // LANDMINE [LM-SETUP-004]: wireLoadout captures showPreDebateLoadout, which
      // re-calls wireLoadout, which captures showPreDebateLoadout again. Intentional
      // refresh-after-equip loop, but each render leaks one more closure reference.
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
    // LANDMINE [LM-SETUP-004]: see wireLoadout call in showPreDebate above — same closure loop.
    wireLoadout(debateData.id, () => {
      void showPreDebateLoadout(debateData, container);
    });
  } catch { /* silent */ }
}
