/**
 * THE MODERATOR — Saved Loadout Presets (F-60)
 *
 * Horizontal chip bar at the top of the pre-debate screen.
 * Up to 6 named presets. Tap to apply (pre-selects refs + equips power-ups).
 * SAVE button snapshots current selection. Long-press chip to delete.
 */

import { safeRpc, getCurrentProfile } from '../auth.ts';
import { escapeHTML } from '../config.ts';
import { getMyPowerUps, equip } from '../powerups.ts';
import { renderLoadoutPicker } from '../reference-arsenal.loadout.ts';
import type { CurrentDebate } from './arena-types.ts';

// ── Types ────────────────────────────────────────────────────

interface LoadoutPreset {
  id: string;
  name: string;
  reference_ids: string[];
  powerup_effect_ids: string[];
}

// ── Public API ───────────────────────────────────────────────

/**
 * Renders the preset bar into `container` and wires all interactions.
 * `refsContainer` and `powerupContainer` are the existing loadout
 * elements on the pre-debate screen — they get re-rendered on apply.
 */
export async function renderPresetBar(
  container: HTMLElement,
  debate: CurrentDebate,
  refsContainer: HTMLElement | null,
  powerupContainer: HTMLElement | null,
): Promise<void> {
  container.innerHTML = '<p style="color:var(--mod-text-muted);text-align:center;font-size:12px;padding:8px 0;">Loading presets...</p>';

  let presets: LoadoutPreset[] = [];
  try {
    const { data, error } = await safeRpc<LoadoutPreset[]>('get_my_loadout_presets', {});
    if (!error && data) presets = data as LoadoutPreset[];
  } catch { /* silent — presets are optional */ }

  renderBar(container, presets, debate, refsContainer, powerupContainer);
}

// ── Internal ─────────────────────────────────────────────────

function renderBar(
  container: HTMLElement,
  presets: LoadoutPreset[],
  debate: CurrentDebate,
  refsContainer: HTMLElement | null,
  powerupContainer: HTMLElement | null,
): void {
  if (presets.length === 0) {
    container.innerHTML = `
      <div class="preset-bar preset-bar-empty">
        <span class="preset-empty-label">No saved loadouts</span>
        <button class="preset-save-btn" id="preset-save-btn">＋ SAVE CURRENT</button>
      </div>
    `;
  } else {
    const chips = presets.map(p => `
      <div class="preset-chip" data-preset-id="${escapeHTML(p.id)}" title="Hold to delete">
        <span class="preset-chip-name">${escapeHTML(p.name)}</span>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="preset-bar">
        <span class="preset-bar-label">LOADOUTS</span>
        <div class="preset-chip-row" id="preset-chip-row">
          ${chips}
        </div>
        ${presets.length < 6
          ? '<button class="preset-save-btn" id="preset-save-btn">＋ SAVE</button>'
          : ''}
      </div>
    `;
  }

  // Wire save button
  container.querySelector('#preset-save-btn')?.addEventListener('click', () => {
    void handleSave(container, presets, debate, refsContainer, powerupContainer);
  });

  // Wire chip taps (apply) and long-press (delete)
  container.querySelectorAll<HTMLElement>('.preset-chip').forEach(chip => {
    const presetId = chip.dataset.presetId;
    if (!presetId) return;
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    // Tap — apply
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let didLongPress = false;

    chip.addEventListener('pointerdown', () => {
      didLongPress = false;
      pressTimer = setTimeout(() => {
        didLongPress = true;
        void handleDelete(container, presets, preset, debate, refsContainer, powerupContainer);
      }, 600);
    });

    chip.addEventListener('pointerup', () => {
      if (pressTimer) clearTimeout(pressTimer);
    });

    chip.addEventListener('pointercancel', () => {
      if (pressTimer) clearTimeout(pressTimer);
    });

    chip.addEventListener('click', () => {
      if (didLongPress) return;
      void applyPreset(preset, debate, refsContainer, powerupContainer, chip);
    });
  });
}

async function applyPreset(
  preset: LoadoutPreset,
  debate: CurrentDebate,
  refsContainer: HTMLElement | null,
  powerupContainer: HTMLElement | null,
  chip: HTMLElement,
): Promise<void> {
  // Visual feedback
  chip.classList.add('preset-chip-active');
  setTimeout(() => chip.classList.remove('preset-chip-active'), 800);

  // Re-render ref picker with preset's refs pre-selected
  if (refsContainer && debate.mode !== 'ai') {
    try {
      await renderLoadoutPicker(refsContainer, debate.id, preset.reference_ids);
    } catch (e) {
      console.warn('[Presets] Ref apply failed:', e);
    }
  }

  // Equip preset's power-ups by effect_id
  if (powerupContainer && preset.powerup_effect_ids.length > 0) {
    try {
      const puData = await getMyPowerUps(debate.id);
      const inventory = puData.inventory || [];

      // Match effect_ids → inventory item UUIDs, assign slots
      let slot = 1;
      for (const effectId of preset.powerup_effect_ids) {
        const item = inventory.find(i =>
          (i as Record<string, unknown>).effect_id === effectId &&
          !(i as Record<string, unknown>).equipped
        );
        if (item && slot <= 3) {
          await equip(debate.id, (item as Record<string, unknown>).id as string, slot);
          slot++;
        }
      }

      // Refresh power-up loadout panel
      const { renderLoadout, wireLoadout } = await import('../powerups.ts');
      const refreshed = await getMyPowerUps(debate.id);
      if (powerupContainer && refreshed) {
        const profile = getCurrentProfile();
        powerupContainer.innerHTML = renderLoadout(
          refreshed.inventory, refreshed.equipped,
          (profile as Record<string, unknown>)?.questions_answered as number || 0,
          debate.id
        );
        wireLoadout(debate.id);
      }
    } catch (e) {
      console.warn('[Presets] Power-up apply failed:', e);
    }
  }
}

async function handleSave(
  container: HTMLElement,
  presets: LoadoutPreset[],
  debate: CurrentDebate,
  refsContainer: HTMLElement | null,
  powerupContainer: HTMLElement | null,
): Promise<void> {
  const name = prompt('Name this loadout (max 32 chars):', 'My Loadout');
  if (!name || !name.trim()) return;

  // Gather current ref selection from DOM
  const selectedRefIds: string[] = [];
  refsContainer?.querySelectorAll<HTMLElement>('.ref-loadout-card.selected').forEach(card => {
    if (card.dataset.refId) selectedRefIds.push(card.dataset.refId);
  });

  // Gather current equipped power-up effect IDs
  const equippedEffectIds: string[] = [];
  try {
    const puData = await getMyPowerUps(debate.id);
    (puData.equipped || []).forEach(item => {
      const effectId = (item as Record<string, unknown>).effect_id as string | undefined;
      if (effectId) equippedEffectIds.push(effectId);
    });
  } catch { /* silent */ }

  const saveBtn = container.querySelector<HTMLButtonElement>('#preset-save-btn');
  const saveBtnOrigText = saveBtn?.textContent ?? '＋ SAVE';
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'SAVING...'; }

  try {
    const result = await safeRpc<{ success: boolean; id?: string; error?: string }>(
      'save_loadout_preset',
      {
        p_name: name.trim().slice(0, 32),
        p_reference_ids: selectedRefIds,
        p_powerup_effect_ids: equippedEffectIds,
      }
    );

    if (result.error || !result.data?.success) {
      const msg = result.data?.error || 'Save failed';
      alert(msg);
      return;
    }

    // Refresh preset list
    const { data } = await safeRpc<LoadoutPreset[]>('get_my_loadout_presets', {});
    const updated = (data as LoadoutPreset[]) || presets;
    renderBar(container, updated, debate, refsContainer, powerupContainer);
  } catch (e) {
    console.warn('[Presets] Save failed:', e);
    alert('Could not save preset.');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = saveBtnOrigText; }
  }
}

async function handleDelete(
  container: HTMLElement,
  presets: LoadoutPreset[],
  preset: LoadoutPreset,
  debate: CurrentDebate,
  refsContainer: HTMLElement | null,
  powerupContainer: HTMLElement | null,
): Promise<void> {
  if (!confirm(`Delete "${preset.name}"?`)) return;

  try {
    await safeRpc('delete_loadout_preset', { p_preset_id: preset.id });
    const updated = presets.filter(p => p.id !== preset.id);
    renderBar(container, updated, debate, refsContainer, powerupContainer);
  } catch (e) {
    console.warn('[Presets] Delete failed:', e);
  }
}
