import { safeRpc } from '../auth.ts';
import { showToast, friendlyError } from '../config.ts';
import {
  screenEl, selectedRounds, set_view, set_modDebateId,
} from './arena-state.ts';
import type { DebateMode } from './arena-types.ts';
import { roundPickerCSS, roundPickerHTML, wireRoundPicker } from './arena-config-round-picker.ts';
import { showModDebateWaitingMod } from './arena-mod-debate-waiting.ts';
// LANDMINE [LM-MODDEBATE-001]: showModQueue is imported dynamically to break the
// arena-mod-queue ↔ arena-mod-debate-picker mutual static import cycle. Keep it dynamic.

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
    void (async () => {
      const { showModQueue } = await import('./arena-mod-queue.ts');
      showModQueue();
    })();
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
