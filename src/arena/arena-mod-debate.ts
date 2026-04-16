import { safeRpc, getCurrentProfile } from '../auth.ts';
import { escapeHTML, showToast, friendlyError, DEBATE } from '../config.ts';
import {
  view, screenEl, selectedRounds, modDebatePollTimer, modDebateId,
  set_view, set_modDebatePollTimer, set_modDebateId,
} from './arena-state.ts';
import type { ArenaView, CurrentDebate, DebateMode, DebateRole } from './arena-types.ts';
import type { ModDebateCheckResult } from './arena-types-moderator.ts';
import { roundPickerCSS, roundPickerHTML, wireRoundPicker } from './arena-config-round-picker.ts';
import { showModQueue } from './arena-mod-queue.ts';
import { enterRoom } from './arena-room-enter.ts';
import { showMatchFound } from './arena-match.ts';

export function showModDebatePicker(): void {
  set_view('modDebatePicker');
  history.pushState({ arenaView: 'modDebatePicker' }, '');
  if (screenEl) screenEl.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'arena-lobby arena-fade-in';
  container.innerHTML = `
    <div class="arena-hero" style="padding-bottom:8px;">
      <div class="arena-hero-title">Create Debate</div>
      <div class="arena-hero-sub">Set the stage — debaters join with your code</div>
    </div>
    <div style="padding:0 16px 24px;">
      <button class="arena-secondary-btn" id="mod-debate-picker-back" style="width:100%;margin-bottom:20px;">← BACK</button>

      <div style="margin-bottom:14px;">
        <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:1.5px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:8px;">Mode</div>
        <select id="mod-debate-mode" style="width:100%;padding:12px;background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;">
          <option value="text">Text Battle</option>
          <option value="live">Live Audio</option>
          <option value="voicememo">Voice Memo</option>
        </select>
      </div>

      <div style="margin-bottom:14px;">
        <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:1.5px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:8px;">Category</div>
        <select id="mod-debate-category" style="width:100%;padding:12px;background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;">
          <option value="">— Any —</option>
          <option value="politics">Politics</option>
          <option value="sports">Sports</option>
          <option value="entertainment">Entertainment</option>
          <option value="music">Music</option>
          <option value="movies">Movies</option>
          <option value="general">General</option>
        </select>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:1.5px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:8px;">Topic <span style="font-weight:400;text-transform:none;">(optional)</span></div>
        <input id="mod-debate-topic" type="text" placeholder="Leave blank for open debate" maxlength="200"
          style="width:100%;padding:12px;background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md);color:var(--mod-text-primary);font-family:var(--mod-font-body);font-size:14px;box-sizing:border-box;" />
      </div>

      <label style="display:flex;align-items:center;gap:10px;margin-bottom:20px;cursor:pointer;">
        <input type="checkbox" id="mod-debate-ranked" style="width:18px;height:18px;" />
        <span style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-body);">Ranked debate</span>
      </label>

      <div style="margin-bottom:20px;">
        <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:1.5px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:8px;">Ruleset</div>
        <select id="mod-debate-ruleset" style="width:100%;padding:12px;background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;">
          <option value="amplified">⚡ Amplified</option>
          <option value="unplugged">🎸 Unplugged</option>
        </select>
      </div>

      <style>${roundPickerCSS()}</style>
      ${roundPickerHTML()}

      <button class="arena-primary-btn" id="mod-debate-create-btn" style="width:100%;">⚔️ CREATE &amp; GET CODE</button>
    </div>
  `;
  screenEl?.appendChild(container);
  wireRoundPicker(container);

  document.getElementById('mod-debate-picker-back')?.addEventListener('click', () => {
    showModQueue();
  });

  document.getElementById('mod-debate-create-btn')?.addEventListener('click', () => {
    void createModDebate();
  });
}

export async function createModDebate(): Promise<void> {
  const btn = document.getElementById('mod-debate-create-btn') as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

  const mode = (document.getElementById('mod-debate-mode') as HTMLSelectElement)?.value || 'text';
  const category = (document.getElementById('mod-debate-category') as HTMLSelectElement)?.value || null;
  const topic = (document.getElementById('mod-debate-topic') as HTMLInputElement)?.value.trim() || null;
  const ranked = (document.getElementById('mod-debate-ranked') as HTMLInputElement)?.checked || false;
  const ruleset = (document.getElementById('mod-debate-ruleset') as HTMLSelectElement)?.value || 'amplified';

  try {
    const { data, error } = await safeRpc<{ debate_id: string; join_code: string }>('create_mod_debate', {
      p_mode: mode,
      p_topic: topic,
      p_category: category || null,
      p_ranked: ranked,
      p_ruleset: ruleset,
      p_total_rounds: selectedRounds,
    });
    if (error) throw error;
    const result = data as { debate_id: string; join_code: string };
    set_modDebateId(result.debate_id);
    showModDebateWaitingMod(result.debate_id, result.join_code, topic || 'Open Debate', mode as DebateMode, ranked);
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '⚔️ CREATE & GET CODE'; }
    showToast(friendlyError(err) || 'Could not create debate');
  }
}

export function showModDebateWaitingMod(debateId: string, joinCode: string, topic: string, mode: DebateMode, ranked: boolean): void {
  set_view('modDebateWaiting');
  history.pushState({ arenaView: 'modDebateWaiting' }, '');
  if (screenEl) screenEl.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'arena-lobby arena-fade-in';
  container.innerHTML = `
    <div class="arena-hero" style="padding-bottom:8px;">
      <div class="arena-hero-title">Waiting for Debaters</div>
      <div class="arena-hero-sub">${escapeHTML(topic)}</div>
    </div>
    <div style="padding:0 16px 24px;text-align:center;">
      <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:2px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:10px;">Join Code</div>
      <div style="font-family:var(--mod-font-display);font-size:40px;font-weight:700;color:var(--mod-accent-primary);letter-spacing:6px;margin-bottom:6px;">${escapeHTML(joinCode)}</div>
      <div style="font-family:var(--mod-font-body);font-size:13px;color:var(--mod-text-secondary);margin-bottom:24px;">Share this code with your two debaters</div>
      <div id="mod-debate-slots" style="margin-bottom:24px;">
        <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-secondary);margin-bottom:6px;">Debater A: <span id="slot-a-name" style="color:var(--mod-text-muted);">waiting…</span></div>
        <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-secondary);">Debater B: <span id="slot-b-name" style="color:var(--mod-text-muted);">waiting…</span></div>
      </div>
      <button class="arena-secondary-btn" id="mod-debate-cancel-btn" style="width:100%;">CANCEL</button>
    </div>
  `;
  screenEl?.appendChild(container);

  document.getElementById('mod-debate-cancel-btn')?.addEventListener('click', () => {
    void cancelModDebate(debateId);
  });

  startModDebatePoll(debateId, mode, ranked);
}

export function showModDebateWaitingDebater(debateId: string, topic: string, mode: DebateMode, ranked: boolean): void {
  set_view('modDebateWaiting');
  history.pushState({ arenaView: 'modDebateWaiting' }, '');
  if (screenEl) screenEl.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'arena-lobby arena-fade-in';
  container.innerHTML = `
    <div class="arena-hero" style="padding-bottom:8px;">
      <div class="arena-hero-title">Waiting for Opponent</div>
      <div class="arena-hero-sub">${escapeHTML(topic || 'Open Debate')}</div>
    </div>
    <div style="padding:0 16px 24px;text-align:center;">
      <div style="font-family:var(--mod-font-body);font-size:14px;color:var(--mod-text-secondary);margin-bottom:24px;">You're in. Waiting for the second debater to join…</div>
      <button class="arena-secondary-btn" id="mod-debate-debater-cancel-btn" style="width:100%;">LEAVE</button>
    </div>
  `;
  screenEl?.appendChild(container);

  document.getElementById('mod-debate-debater-cancel-btn')?.addEventListener('click', async () => {
    stopModDebatePoll();
    const { renderLobby } = await import('./arena-lobby.ts');
    renderLobby();
  });

  startModDebatePoll(debateId, mode, ranked);
}

export function startModDebatePoll(debateId: string, mode: DebateMode, ranked: boolean): void {
  stopModDebatePoll();
  set_modDebatePollTimer(setInterval(async () => {
    if (view !== 'modDebateWaiting') {
      stopModDebatePoll();
      return;
    }
    try {
      const { data, error } = await safeRpc<ModDebateCheckResult>('check_mod_debate', { p_debate_id: debateId });
      if (error || !data) return;
      const result = data as ModDebateCheckResult;

      // Update slot display for mod's waiting screen
      const slotA = document.getElementById('slot-a-name');
      const slotB = document.getElementById('slot-b-name');
      if (slotA && result.debater_a_name) slotA.textContent = result.debater_a_name || 'waiting…';
      if (slotB && result.debater_b_name) slotB.textContent = result.debater_b_name || 'waiting…';

      if (result.status === 'matched') {
        stopModDebatePoll();
        onModDebateReady(debateId, result, mode, ranked);
      }
    } catch { /* retry next tick */ }
  }, 4000));
}

export function stopModDebatePoll(): void {
  if (modDebatePollTimer) {
    clearInterval(modDebatePollTimer);
    set_modDebatePollTimer(null);
  }
}

export function onModDebateReady(debateId: string, result: ModDebateCheckResult, mode: DebateMode, ranked: boolean): void {
  const profile = getCurrentProfile();
  const isActualMod = profile?.id !== result.debater_a_id && profile?.id !== result.debater_b_id;
  const debateRuleset = (result.ruleset as 'amplified' | 'unplugged') || 'amplified';
  const debateTopic = result.topic || 'Moderated Debate';

  if (isActualMod) {
    // Moderator enters room in observer mode
    const debateData: CurrentDebate = {
      id: debateId,
      topic: debateTopic,
      role: 'a',
      mode,
      round: 1,
      totalRounds: result.total_rounds ?? DEBATE.defaultRounds,
      opponentName: result.debater_b_name || 'Debater B',
      opponentId: result.debater_b_id,
      opponentElo: 1200,
      ranked,
      ruleset: debateRuleset,
      language: result.language ?? 'en',
      messages: [],
      modView: true,
      debaterAName: result.debater_a_name || 'Debater A',
      debaterBName: result.debater_b_name || 'Debater B',
    };
    enterRoom(debateData);
  } else {
    // Debater A — now matched, go to match found
    const role: DebateRole = profile?.id === result.debater_a_id ? 'a' : 'b';
    const opponentName = role === 'a' ? (result.debater_b_name || 'Debater B') : (result.debater_a_name || 'Debater A');
    const opponentId = role === 'a' ? result.debater_b_id : result.debater_a_id;
    const debateData: CurrentDebate = {
      id: debateId,
      topic: debateTopic,
      role,
      mode,
      round: 1,
      totalRounds: result.total_rounds ?? DEBATE.defaultRounds,
      opponentName,
      opponentId,
      opponentElo: 1200,
      ranked,
      ruleset: debateRuleset,
      language: result.language ?? 'en',
      messages: [],
    };
    showMatchFound(debateData);
  }
}

export async function cancelModDebate(debateId: string): Promise<void> {
  stopModDebatePoll();
  try {
    await safeRpc('cancel_mod_debate', { p_debate_id: debateId });
  } catch { /* silent */ }
  set_modDebateId(null);
  showModQueue();
}
