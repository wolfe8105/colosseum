// arena-config-settings.ts — Ranked picker, ruleset picker
// Part of the arena.ts monolith split

import { safeRpc, getCurrentUser, getCurrentProfile } from '../auth.ts';
import { selectedRanked, set_selectedRanked, set_selectedRuleset } from './arena-state.ts';
import type { RankedCheckResult } from './arena-types-results.ts';
import { isPlaceholder, pushArenaState } from './arena-core.utils.ts';
import { showModeSelect } from './arena-config-mode-select.ts';

// ============================================================
// RANKED PICKER
// ============================================================

export function showRankedPicker(): void {
  if (!getCurrentUser() && !isPlaceholder()) {
    window.location.href = 'moderator-plinko.html';
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'arena-rank-overlay';
  overlay.id = 'arena-rank-overlay';
  overlay.innerHTML = `
    <div class="arena-rank-backdrop" id="arena-rank-backdrop"></div>
    <div class="arena-rank-sheet">
      <div class="arena-mode-handle"></div>
      <div class="arena-rank-title">Choose Your Arena</div>
      <div class="arena-rank-subtitle">Casual for fun. Ranked when it counts.</div>

      <div class="arena-rank-card casual" data-ranked="false">
        <div class="arena-rank-card-header">
          <div class="arena-rank-card-icon">\uD83C\uDF7A</div>
          <div class="arena-rank-card-name">CASUAL</div>
        </div>
        <div class="arena-rank-card-desc">
          No pressure. ELO doesn't move. No profile needed. Just argue.
        </div>
        <div class="arena-rank-card-badge">OPEN TO EVERYONE</div>
      </div>

      <div class="arena-rank-card ranked" data-ranked="true">
        <div class="arena-rank-card-header">
          <div class="arena-rank-card-icon">\u2694\uFE0F</div>
          <div class="arena-rank-card-name">RANKED</div>
        </div>
        <div class="arena-rank-card-desc">
          ELO on the line. Wins count. Leaderboard moves. Requires profile.
        </div>
        <div class="arena-rank-card-badge">PROFILE REQUIRED \u00B7 25%+</div>
      </div>

      <button class="arena-rank-cancel" id="arena-rank-cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  pushArenaState('rankedPicker');

  // Wire card clicks
  overlay.querySelectorAll('.arena-rank-card').forEach((card) => {
    const cardEl = card as HTMLElement;
    cardEl.addEventListener('click', async () => {
      const isRanked = cardEl.dataset.ranked === 'true';

      // Ranked eligibility check
      if (isRanked && !isPlaceholder()) {
        try {
          const { data, error } = await safeRpc<RankedCheckResult>('check_ranked_eligible');
          if (error) throw error;
          const result = data as RankedCheckResult;
          if (!result.eligible) {
            closeRankedPicker();
            if (confirm('Ranked mode requires at least 25% profile completion. Your profile is at ' + result.profile_pct + '%. Go fill it out?')) {
              window.location.href = 'moderator-profile-depth.html';
            }
            return;
          }
        } catch (e) {
          console.warn('[Arena] Ranked check error:', e);
        }
      }

      set_selectedRanked(isRanked);
      closeRankedPicker(true);
      showRulesetPicker();
    });
  });

  // Wire close
  document.getElementById('arena-rank-backdrop')?.addEventListener('click', () => closeRankedPicker());
  document.getElementById('arena-rank-cancel')?.addEventListener('click', () => closeRankedPicker());
}

export function closeRankedPicker(forward?: boolean): void {
  const overlay = document.getElementById('arena-rank-overlay');
  if (overlay) {
    overlay.remove();
    if (forward) {
      history.replaceState({ arenaView: 'lobby' }, '');
    } else {
      history.back();
    }
  }
}

// ============================================================
// RULESET PICKER
// ============================================================

export function showRulesetPicker(): void {
  const overlay = document.createElement('div');
  overlay.className = 'arena-rank-overlay';
  overlay.id = 'arena-ruleset-overlay';
  overlay.innerHTML = `
    <div class="arena-rank-backdrop" id="arena-ruleset-backdrop"></div>
    <div class="arena-rank-sheet">
      <div class="arena-mode-handle"></div>
      <div class="arena-rank-title">Choose Your Ruleset</div>
      <div class="arena-rank-subtitle">Full experience or pure debate.</div>

      <div class="arena-rank-card amplified" data-ruleset="amplified">
        <div class="arena-rank-card-header">
          <div class="arena-rank-card-icon">\u26A1</div>
          <div class="arena-rank-card-name">AMPLIFIED</div>
        </div>
        <div class="arena-rank-card-desc">
          Boosts, ELO, tokens \u2014 the full experience.
        </div>
        <div class="arena-rank-card-badge">DEFAULT MODE</div>
      </div>

      <div class="arena-rank-card unplugged" data-ruleset="unplugged">
        <div class="arena-rank-card-header">
          <div class="arena-rank-card-icon">\uD83C\uDFB8</div>
          <div class="arena-rank-card-name">UNPLUGGED</div>
        </div>
        <div class="arena-rank-card-desc">
          Just debate. No boosts, no ELO, no tokens.
        </div>
        <div class="arena-rank-card-badge">PURE DEBATE</div>
      </div>

      <button class="arena-rank-cancel" id="arena-ruleset-cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  pushArenaState('rulesetPicker');

  // Wire card clicks
  overlay.querySelectorAll('.arena-rank-card').forEach((card) => {
    const cardEl = card as HTMLElement;
    cardEl.addEventListener('click', () => {
      set_selectedRuleset(cardEl.dataset.ruleset as 'amplified' | 'unplugged');
      closeRulesetPicker(true);
      showModeSelect();
    });
  });

  // Wire close
  document.getElementById('arena-ruleset-backdrop')?.addEventListener('click', () => closeRulesetPicker());
  document.getElementById('arena-ruleset-cancel')?.addEventListener('click', () => closeRulesetPicker());
}

export function closeRulesetPicker(forward?: boolean): void {
  const overlay = document.getElementById('arena-ruleset-overlay');
  if (overlay) {
    overlay.remove();
    if (forward) {
      history.replaceState({ arenaView: 'lobby' }, '');
    } else {
      history.back();
    }
  }
}

