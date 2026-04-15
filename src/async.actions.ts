/**
 * THE MODERATOR — Async Module: Actions
 *
 * react, challenge, postTake, placePrediction, pickStandaloneQuestion,
 * openCreatePredictionForm, and related helpers.
 *
 * See LM-ASYNC-001 in async.state.ts for the removed _placingPrediction guard.
 */

import { state } from './async.state.ts';
import { loadHotTakes, renderPredictions, _hideWagerPicker } from './async.render.ts';
import { _enterArenaWithTopic } from './async.utils.ts';
import { fetchStandaloneQuestions } from './async.fetch.ts';
import type { HotTake, ReactResult, CreateHotTakeResult } from './async.types.ts';
import { escapeHTML, showToast, FEATURES } from './config.ts';
import {
  safeRpc,
  getCurrentUser,
  getCurrentProfile,
  getSupabaseClient,
  getIsPlaceholderMode,
  requireAuth,
} from './auth.ts';
import { claimHotTake, claimReaction, claimPrediction, updateBalance } from './tokens.ts';
import { nudge } from './nudge.ts';

const esc = escapeHTML;

// ============================================================
// REACT + CHALLENGE
// ============================================================

export async function react(takeId: string): Promise<void> {
  if (!requireAuth('react to hot takes')) return;
  if (state.reactingIds.has(takeId)) return;
  const take = state.hotTakes.find((t) => t.id === takeId);
  if (!take) return;

  state.reactingIds.add(takeId);
  take.userReacted = !take.userReacted;
  take.reactions += take.userReacted ? 1 : -1;
  loadHotTakes(state.currentFilter);

  if (getSupabaseClient() && !getIsPlaceholderMode()) {
    try {
      const { data, error } = await safeRpc<ReactResult>('react_hot_take', {
        p_hot_take_id: takeId,
        p_reaction_type: 'fire',
      });
      if (error) {
        console.error('react_hot_take error:', error);
        take.userReacted = !take.userReacted;
        take.reactions += take.userReacted ? 1 : -1;
        loadHotTakes(state.currentFilter);
      } else if (data) {
        take.reactions = (data as ReactResult).reaction_count;
        take.userReacted = (data as ReactResult).reacted;
        loadHotTakes(state.currentFilter);
        if ((data as ReactResult).reacted) {
          nudge('first_vote', '\uD83D\uDDF3\uFE0F Vote cast. Your voice shapes the verdict.');
          claimReaction(takeId);
        }
      }
    } catch {
      /* handled */
    }
  }

  state.reactingIds.delete(takeId);
}

export function challenge(takeId: string): void {
  if (!requireAuth('challenge someone to a debate')) return;
  // Session 230 (P1-3): requireTokens(50) removed — create_challenge never debited tokens.
  const take = state.hotTakes.find((t) => t.id === takeId);
  if (!take) return;
  _showChallengeModal(take);
}

export function _showChallengeModal(take: HotTake): void {
  document.getElementById('challenge-modal')?.remove();
  const safeUser = esc(take.user);
  const safeText = esc(take.text);
  state.pendingChallengeId = take.id;

  const modal = document.createElement('div');
  modal.id = 'challenge-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:var(--mod-bg-overlay);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';

  modal.innerHTML = `
    <div style="background:linear-gradient(180deg,#132240 /* TODO: needs CSS var token */ 0%,var(--mod-bg-base) 100%);border-top-left-radius:20px;border-top-right-radius:20px;width:100%;max-width:480px;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));">
      <div style="width:40px;height:4px;background:var(--mod-bg-elevated);border-radius:2px;margin:0 auto 20px;"></div>
      <div style="font-family:var(--mod-font-display);font-size:22px;letter-spacing:2px;color:var(--mod-magenta);text-align:center;margin-bottom:4px;">⚔️ CHALLENGE</div>
      <div style="color:var(--mod-text-sub);text-align:center;font-size:13px;margin-bottom:16px;">You disagree with ${safeUser}?</div>
      <div style="background:var(--mod-bg-subtle);border:1px solid var(--mod-border-secondary);border-radius:10px;padding:14px;margin-bottom:16px;">
        <div style="font-size:13px;color:var(--mod-text-heading);line-height:1.4;">"${safeText}"</div>
        <div style="font-size:11px;color:#6a7a90; /* TODO: needs CSS var token */ /* TODO: needs CSS var token */ margin-top:6px;">— ${safeUser} (ELO ${Number(take.elo)})</div>
      </div>
      <textarea id="challenge-response" placeholder="Your counter-argument..." style="
        width:100%;background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:10px;
        color:var(--mod-text-heading);padding:12px;font-size:14px;resize:none;height:80px;
        font-family:var(--mod-font-ui);margin-bottom:12px;box-sizing:border-box;
      "></textarea>
      <div style="display:flex;gap:8px;">
        <button data-action="cancel-challenge" style="
          flex:1;padding:12px;background:var(--mod-bg-card);color:var(--mod-text-sub);border:1px solid var(--mod-border-primary);
          border-radius:10px;font-weight:700;cursor:pointer;font-size:14px;
        ">CANCEL</button>
        <button data-action="submit-challenge" style="
          flex:1;padding:12px;background:var(--mod-magenta);color:var(--mod-text-on-accent);border:none;
          border-radius:10px;font-family:var(--mod-font-display);font-size:16px;
          letter-spacing:2px;cursor:pointer;
        ">⚔️ BET.</button>
      </div>
    </div>`;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      return;
    }
    const btn = (e.target as HTMLElement).closest(
      '[data-action]'
    ) as HTMLElement | null;
    if (!btn) return;
    if (btn.dataset['action'] === 'cancel-challenge') modal.remove();
    else if (btn.dataset['action'] === 'submit-challenge')
      void _submitChallenge(state.pendingChallengeId);
  });

  document.body.appendChild(modal);
}

export async function _submitChallenge(takeId: string | null): Promise<void> {
  if (!takeId) return;
  if (state.challengeInFlight) return;
  state.challengeInFlight = true;
  const take = state.hotTakes.find((t) => t.id === takeId);
  if (!take) { state.challengeInFlight = false; return; }
  const textarea = document.getElementById(
    'challenge-response'
  ) as HTMLTextAreaElement | null;
  const text = textarea?.value?.trim();
  if (!text) {
    if (textarea) textarea.style.borderColor = 'var(--mod-magenta)';
    state.challengeInFlight = false;
    return;
  }

  take.challenges++;
  document.getElementById('challenge-modal')?.remove();
  loadHotTakes(state.currentFilter);

  if (getSupabaseClient() && !getIsPlaceholderMode()) {
    try {
      const { error } = await safeRpc('create_challenge', {
        p_hot_take_id: takeId,
        p_counter_argument: text,
        p_topic: take.text,
      });
      if (error) {
        console.error('create_challenge error:', error);
        take.challenges--;
        loadHotTakes(state.currentFilter);
        showToast('Challenge failed — try again', 'error');
        state.challengeInFlight = false;
        return;
      }
      showToast('⚔️ Challenge sent! Entering the arena...', 'success');
      _enterArenaWithTopic(take.text);
    } catch (e) {
      console.error('create_challenge exception:', e);
      take.challenges--;
      loadHotTakes(state.currentFilter);
      showToast('Challenge failed — try again', 'error');
    }
  } else {
    showToast('⚔️ Challenge sent! Entering the arena...', 'success');
    _enterArenaWithTopic(take.text);
  }
  state.challengeInFlight = false;
}

// ============================================================
// POST TAKE
// ============================================================

export async function postTake(): Promise<void> {
  if (!FEATURES.hotTakes) return;
  if (!requireAuth('post hot takes')) return;
  // Session 230 (P1-2): requireTokens(25) removed — posting never debited tokens,
  // it only blocked low-balance users. create_hot_take awards tokens via claimHotTake.
  if (state.postingInFlight) return;
  state.postingInFlight = true;
  try {

  const input = document.getElementById(
    'hot-take-input'
  ) as HTMLTextAreaElement | null;
  if (!input) { state.postingInFlight = false; return; }
  const text = input.value.trim();
  if (!text) { state.postingInFlight = false; return; }

  const profile = getCurrentProfile();
  const section = state.currentFilter === 'all' ? 'trending' : state.currentFilter;
  const newTake: HotTake = {
    id: 't_' + Date.now(),
    user_id: getCurrentUser()?.id ?? '',
    user: (profile?.username ?? 'YOU').toUpperCase(),
    elo: profile?.elo_rating ?? 1200,
    text,
    section,
    reactions: 0,
    challenges: 0,
    time: 'now',
    userReacted: false,
  };

  const snapshot = [...state.hotTakes];
  state.hotTakes.unshift(newTake);
  input.value = '';
  loadHotTakes(state.currentFilter);

  if (getSupabaseClient() && !getIsPlaceholderMode()) {
    try {
      const { data, error } = await safeRpc<CreateHotTakeResult>(
        'create_hot_take',
        {
          p_content: text,
          p_section: section,
        }
      );
      if (error) {
        console.error('create_hot_take error:', error);
        state.hotTakes = snapshot;
        loadHotTakes(state.currentFilter);
        showToast('Post failed — try again', 'error');
      } else if (data && (data as CreateHotTakeResult).id) {
        newTake.id = (data as CreateHotTakeResult).id;
        claimHotTake((data as CreateHotTakeResult).id);
      }
    } catch {
      state.hotTakes = snapshot;
      loadHotTakes(state.currentFilter);
      showToast('Post failed — try again', 'error');
    }
  }
  } finally { state.postingInFlight = false; }
}

// ============================================================
// PREDICTIONS — ACTIONS
// ============================================================

export async function placePrediction(
  debateId: string,
  side: string,
  amount: number
): Promise<void> {
  // LM-ASYNC-001: dead `if (_placingPrediction) return;` removed — see async.state.ts
  if (!requireAuth('place predictions')) return;
  if (state.predictingInFlight.has(debateId)) return;
  state.predictingInFlight.add(debateId);
  try {

  const pred = state.predictions.find((p) => p.debate_id === debateId);
  if (!pred) return;
  if (pred.user_pick === side) return;

  const oldPick = pred.user_pick;
  pred.user_pick = side as 'a' | 'b';

  if (!oldPick) {
    const countA = Math.round((pred.total * pred.pct_a) / 100);
    pred.total++;
    const newCountA = countA + (side === 'a' ? 1 : 0);
    pred.pct_a = Math.min(
      99,
      Math.max(1, Math.round((newCountA / pred.total) * 100))
    );
    pred.pct_b = 100 - pred.pct_a;
  }

  _hideWagerPicker();

  const predContainer = document.getElementById('predictions-feed');
  if (predContainer) renderPredictions(predContainer);

  if (getSupabaseClient() && !getIsPlaceholderMode()) {
    try {
      const { data, error } = await safeRpc('place_prediction', {
        p_debate_id: debateId,
        p_predicted_winner: side,
        p_amount: amount,
      });
      if (error) {
        console.error('place_prediction error:', error);
        showToast(String((error as Record<string, unknown>)?.message ?? 'Prediction failed'), 'error');
        pred.user_pick = oldPick;
        if (predContainer) renderPredictions(predContainer);
        return;
      }
      // P1-9: Update balance display with debit from wager
      const rpcResult = data as Record<string, unknown> | null;
      if (rpcResult?.new_balance != null) {
        updateBalance(Number(rpcResult.new_balance));
      }
      claimPrediction(debateId);
    } catch (e) {
      console.error('place_prediction exception:', e);
    }
  }

  showToast(`🔮 Wagered ${amount} tokens on ${side === 'a' ? pred.p1 : pred.p2}!`, 'success');
  } finally { state.predictingInFlight.delete(debateId); }
}

export async function pickStandaloneQuestion(
  questionId: string,
  side: string
): Promise<void> {
  if (!requireAuth('make predictions')) return;

  const q = state.standaloneQuestions.find((x) => x.id === questionId);
  if (!q) return;
  if (q._userPick === side) return;

  const oldPick = q._userPick;
  q._userPick = side as 'a' | 'b';

  if (!oldPick) {
    if (side === 'a') q.picks_a = (Number(q.picks_a) || 0) + 1;
    else q.picks_b = (Number(q.picks_b) || 0) + 1;
  } else {
    if (side === 'a') {
      q.picks_a = (Number(q.picks_a) || 0) + 1;
      q.picks_b = Math.max(0, (Number(q.picks_b) || 0) - 1);
    } else {
      q.picks_b = (Number(q.picks_b) || 0) + 1;
      q.picks_a = Math.max(0, (Number(q.picks_a) || 0) - 1);
    }
  }

  const predContainer = document.getElementById('predictions-feed');
  if (predContainer) renderPredictions(predContainer);

  if (getSupabaseClient() && !getIsPlaceholderMode()) {
    try {
      const { error } = await safeRpc('pick_prediction', {
        p_question_id: questionId,
        p_pick: side,
      });
      if (error) {
        console.error('pick_prediction error:', error);
        q._userPick = oldPick ?? undefined;
        if (predContainer) renderPredictions(predContainer);
        return;
      }
    } catch (e) {
      console.error('pick_prediction exception:', e);
      q._userPick = oldPick ?? undefined;
      if (predContainer) renderPredictions(predContainer);
      return;
    }
  }

  showToast(
    `🔮 Picked ${side === 'a' ? q.side_a_label : q.side_b_label}!`,
    'success'
  );
}

export function openCreatePredictionForm(): void {
  if (!requireAuth('create predictions')) return;

  document.getElementById('create-prediction-sheet')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'create-prediction-sheet';
  overlay.style.cssText = 'position:fixed;inset:0;background:var(--mod-bg-overlay);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';

  overlay.innerHTML = `
    <div style="background:linear-gradient(180deg,#132240 /* TODO: needs CSS var token */ 0%,var(--mod-bg-base) 100%);border-top-left-radius:20px;border-top-right-radius:20px;width:100%;max-width:480px;padding:20px;padding-bottom:max(20px,env(safe-area-inset-bottom));">
      <div style="width:40px;height:4px;background:var(--mod-bg-elevated);border-radius:2px;margin:0 auto 16px;"></div>
      <div style="font-family:var(--mod-font-display);font-size:16px;letter-spacing:2px;color:var(--mod-accent);text-align:center;margin-bottom:16px;">CREATE PREDICTION</div>
      <div style="margin-bottom:12px;">
        <label style="font-size:11px;color:var(--mod-text-sub);letter-spacing:1px;display:block;margin-bottom:4px;">QUESTION</label>
        <textarea id="cpq-topic" maxlength="200" placeholder="Will AI replace most jobs by 2030?" style="width:100%;min-height:60px;padding:10px 12px;background:var(--mod-bg-base);border:1px solid var(--mod-border-primary);border-radius:8px;color:var(--mod-text-heading);font-family:var(--mod-font-ui);font-size:14px;resize:none;outline:none;"></textarea>
        <div id="cpq-topic-count" style="font-size:10px;color:#6a7a90; /* TODO: needs CSS var token */text-align:right;margin-top:2px;">0/200</div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:12px;">
        <div style="flex:1;">
          <label style="font-size:11px;color:var(--mod-text-sub);letter-spacing:1px;display:block;margin-bottom:4px;">SIDE A</label>
          <input id="cpq-side-a" type="text" maxlength="50" placeholder="Yes" style="width:100%;padding:10px 12px;background:var(--mod-bg-base);border:1px solid var(--mod-border-primary);border-radius:8px;color:var(--mod-text-heading);font-family:var(--mod-font-ui);font-size:14px;outline:none;">
        </div>
        <div style="flex:1;">
          <label style="font-size:11px;color:var(--mod-text-sub);letter-spacing:1px;display:block;margin-bottom:4px;">SIDE B</label>
          <input id="cpq-side-b" type="text" maxlength="50" placeholder="No" style="width:100%;padding:10px 12px;background:var(--mod-bg-base);border:1px solid var(--mod-border-primary);border-radius:8px;color:var(--mod-text-heading);font-family:var(--mod-font-ui);font-size:14px;outline:none;">
        </div>
      </div>
      <div style="margin-bottom:16px;">
        <label style="font-size:11px;color:var(--mod-text-sub);letter-spacing:1px;display:block;margin-bottom:4px;">CATEGORY (optional)</label>
        <select id="cpq-category" style="width:100%;padding:10px 12px;background:var(--mod-bg-base);border:1px solid var(--mod-border-primary);border-radius:8px;color:var(--mod-text-heading);font-family:var(--mod-font-ui);font-size:14px;outline:none;-webkit-appearance:none;">
          <option value="">None</option>
          <option value="politics">Politics</option>
          <option value="sports">Sports</option>
          <option value="entertainment">Entertainment</option>
          <option value="trending">Trending</option>
          <option value="technology">Technology</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="cpq-cancel" style="flex:1;padding:12px;border-radius:10px;border:1px solid var(--mod-border-primary);background:none;color:var(--mod-text-sub);font-family:var(--mod-font-display);font-size:13px;letter-spacing:2px;cursor:pointer;">CANCEL</button>
        <button id="cpq-submit" style="flex:1;padding:12px;border-radius:10px;border:none;background:var(--mod-accent);color:var(--mod-bg-base);font-family:var(--mod-font-display);font-size:13px;font-weight:700;letter-spacing:2px;cursor:pointer;">POST</button>
      </div>
    </div>`;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);

  const topicEl = document.getElementById('cpq-topic') as HTMLTextAreaElement;
  topicEl.addEventListener('input', () => {
    document.getElementById('cpq-topic-count')!.textContent =
      topicEl.value.length + '/200';
  });

  document.getElementById('cpq-cancel')!.addEventListener('click', () =>
    overlay.remove()
  );

  document
    .getElementById('cpq-submit')!
    .addEventListener('click', async () => {
      const topic = topicEl.value.trim();
      const sideA =
        (document.getElementById('cpq-side-a') as HTMLInputElement).value.trim() ||
        'Yes';
      const sideB =
        (document.getElementById('cpq-side-b') as HTMLInputElement).value.trim() ||
        'No';
      const category =
        (document.getElementById('cpq-category') as HTMLSelectElement).value ||
        null;

      if (topic.length < 10) {
        showToast('Question must be at least 10 characters', 'error');
        return;
      }

      const btn = document.getElementById('cpq-submit')!;
      btn.textContent = 'POSTING...';
      btn.style.opacity = '0.5';

      if (getSupabaseClient() && !getIsPlaceholderMode()) {
        try {
          const { error } = await safeRpc('create_prediction_question', {
            p_topic: topic,
            p_side_a_label: sideA,
            p_side_b_label: sideB,
            p_category: category,
          });
          if (error) throw error;
        } catch (e) {
          console.error('create_prediction_question error:', e);
          showToast('Failed to create prediction', 'error');
          btn.textContent = 'POST';
          btn.style.opacity = '1';
          return;
        }
      }

      state.standaloneQuestions.unshift({
        id: 'local-' + Date.now(),
        topic,
        side_a_label: sideA,
        side_b_label: sideB,
        category,
        picks_a: 0,
        picks_b: 0,
        total_picks: 0,
        creator_display_name:
          getCurrentProfile()?.display_name ?? 'You',
        _userPick: null,
      });

      overlay.remove();
      showToast('🔮 Prediction posted!', 'success');
      const predContainer = document.getElementById('predictions-feed');
      if (predContainer) renderPredictions(predContainer);
      void fetchStandaloneQuestions();
    });
}
