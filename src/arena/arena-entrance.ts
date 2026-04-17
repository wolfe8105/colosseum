/**
 * arena-entrance.ts — F-03 Entrance Sequences / Battle Animations
 *
 * Refactored: CSS → arena-entrance-css.ts, renderers → arena-entrance-render.ts.
 *
 * Three tiers based on debater win-rate:
 *   Tier 1 (0–25% OR <5 debates) — Standard fade
 *   Tier 2 (26–50%)              — Enhanced slide-in clash
 *   Tier 3 (51%+)                — Dramatic arena reveal
 */

import { getCurrentProfile } from '../auth.ts';
import { playSound } from './arena-sounds.ts';
import type { CurrentDebate } from './arena-types.ts';
import { injectEntranceCSS } from './arena-entrance-css.ts';
import { renderTier1, renderTier2, renderTier3 } from './arena-entrance-render.ts';

function _getTier(wins: number, losses: number, debatesCompleted: number): 1 | 2 | 3 {
  if (debatesCompleted < 5) return 1;
  const total = wins + losses;
  if (total === 0) return 1;
  const winRate = wins / total;
  if (winRate > 0.50) return 3;
  if (winRate > 0.25) return 2;
  return 1;
}

export function playEntranceSequence(debate: CurrentDebate): Promise<void> {
  return new Promise(resolve => {
    injectEntranceCSS();

    const profile   = getCurrentProfile();
    const wins      = profile?.wins ?? 0;
    const losses    = profile?.losses ?? 0;
    const completed = profile?.debates_completed ?? 0;
    const tier      = _getTier(wins, losses, completed);

    const myName    = profile?.display_name || profile?.username || 'You';
    const myInitial = (myName[0] || '?').toUpperCase();
    const myElo     = profile?.elo_rating ?? 1200;
    const oppName   = debate.opponentName || 'Opponent';
    const oppInitial= (oppName[0] || '?').toUpperCase();
    const oppElo    = debate.opponentElo ?? 1200;
    const isAI      = debate.mode === 'ai';
    const isRanked  = debate.ranked;
    const topic     = debate.topic;

    const stage = document.createElement('div');
    stage.className = 'ent-stage';
    stage.id = 'ent-stage';

    if (tier === 1) {
      renderTier1(stage, myInitial, myName, myElo, oppInitial, oppName, Number(oppElo), isAI, isRanked);
    } else if (tier === 2) {
      renderTier2(stage, myInitial, myName, myElo, oppInitial, oppName, Number(oppElo), isAI, topic, isRanked);
    } else {
      renderTier3(stage, myInitial, myName, myElo, wins, losses, oppInitial, oppName, Number(oppElo), isAI, topic, isRanked);
    }

    document.body.appendChild(stage);

    try {
      if (tier === 3) {
        playSound('roundStart');
        // LM-ENT-002 (fixed in Prompt 5): second playSound now wrapped in try/catch
        setTimeout(() => { try { playSound('roundStart'); } catch { /* sound optional */ } }, 600);
      } else {
        playSound('roundStart');
      }
    } catch { /* sound optional */ }

    const DURATION = 2450;
    setTimeout(() => {
      stage.style.transition = 'opacity 0.15s';
      stage.style.opacity = '0';
      setTimeout(() => { stage.remove(); resolve(); }, 160);
    }, DURATION);
  });
}
