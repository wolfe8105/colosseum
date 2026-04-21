/**
 * arena-feed-wiring-spectator.ts — Spectator role DOM wiring for the feed room.
 *
 * wireSpectatorTipButtons: F-58 sentiment tip strip; fetches watch tier,
 * enables tip buttons for non-Unranked watchers, wires click handlers.
 * File-local: handleTip (cast_sentiment_tip RPC + pending sentiment update).
 */

import { safeRpc } from '../auth.ts';
import { get_user_watch_tier, cast_sentiment_tip } from '../contracts/rpc-schemas.ts';
import { showToast } from '../config.ts';
import { isDepthBlocked } from '../depth-gate.ts';
import type { CurrentDebate } from './arena-types.ts';
import {
  pendingSentimentA, pendingSentimentB,
  set_pendingSentimentA, set_pendingSentimentB,
} from './arena-feed-state.ts';
import { applySentimentUpdate } from './arena-feed-ui.ts';


/** F-58: Sentiment tip strip wiring. Checks watch tier on mount, enables/disables accordingly. */
export async function wireSpectatorTipButtons(debate: CurrentDebate): Promise<void> {
  const statusEl = document.getElementById('feed-tip-status');
  const tipBtns = Array.from(document.querySelectorAll('.feed-tip-btn')) as HTMLButtonElement[];

  // Fetch watch tier
  let tier = 'Unranked';
  try {
    const { data, error } = await safeRpc('get_user_watch_tier', {}, get_user_watch_tier);
    if (!error && data && Array.isArray(data) && data[0]) {
      tier = (data[0] as { tier: string }).tier;
    } else if (!error && data && typeof data === 'object' && 'tier' in data) {
      tier = (data as { tier: string }).tier;
    }
  } catch (e) {
    console.warn('[FeedRoom] get_user_watch_tier failed:', e);
  }

  if (tier === 'Unranked') {
    if (statusEl) statusEl.textContent = 'Watch a full debate to unlock tipping.';
    // Buttons stay disabled
    return;
  }

  // F-63: Depth gate — block sub-25% users from tipping
  if (isDepthBlocked()) return;

  // Enable tip buttons for non-Unranked watchers
  tipBtns.forEach(btn => { btn.disabled = false; });
  if (statusEl) statusEl.textContent = tier + ' · Tap to tip';

  // Wire each button
  tipBtns.forEach(btn => {
    btn.addEventListener('click', () => void handleTip(btn, debate, statusEl));
  });
}

async function handleTip(
  btn: HTMLButtonElement,
  debate: CurrentDebate,
  statusEl: HTMLElement | null,
): Promise<void> {
  const side = btn.dataset.side as 'a' | 'b';
  const amount = Number(btn.dataset.amount);
  if (!side || !amount) return;

  // Disable all buttons while in-flight to prevent double-tap
  const allBtns = Array.from(document.querySelectorAll('.feed-tip-btn')) as HTMLButtonElement[];
  allBtns.forEach(b => { b.disabled = true; });

  try {
    const { data, error } = await safeRpc('cast_sentiment_tip', {
      p_debate_id: debate.id,
      p_side: side,
      p_amount: amount,
    }, cast_sentiment_tip);

    if (error || !data) {
      console.warn('[FeedRoom] cast_sentiment_tip failed:', error);
      showToast('Tip failed', 'error');
      allBtns.forEach(b => { b.disabled = false; });
      return;
    }

    const result = data as { success?: boolean; error?: string; new_total_a?: number; new_total_b?: number; new_balance?: number };

    if (result.error) {
      if (result.error === 'insufficient_tokens') {
        showToast('Not enough tokens', 'error');
      } else if (result.error === 'unranked_blocked') {
        showToast('Watch a full debate to unlock tipping', 'error');
      } else if (result.error === 'debate_not_live') {
        showToast('Debate is no longer live', 'error');
      } else if (result.error === 'profile_incomplete') {
        showToast('Complete 25% of your profile to tip', 'error');
      } else {
        showToast('Tip failed', 'error');
      }
      allBtns.forEach(b => { b.disabled = false; });
      return;
    }

    // Success — update gauge immediately via pending state
    if (side === 'a') set_pendingSentimentA(pendingSentimentA + amount);
    else              set_pendingSentimentB(pendingSentimentB + amount);
    applySentimentUpdate();

    if (statusEl) statusEl.textContent = `+${amount} → ${side.toUpperCase()} ✓`;
    showToast(`+${amount} tokens tipped`, 'success');

    // Re-enable after brief visual feedback
    setTimeout(() => {
      allBtns.forEach(b => { b.disabled = false; });
      if (statusEl) statusEl.textContent = 'Tap to tip';
    }, 800);

  } catch (e) {
    console.warn('[FeedRoom] cast_sentiment_tip error:', e);
    showToast('Tip failed', 'error');
    allBtns.forEach(b => { b.disabled = false; });
  }
}
