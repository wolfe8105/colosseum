/**
 * Home — Arsenal screen tab management and forge/edit wiring
 */
// LM-HOME-003: #arsenal-back-btn is wired in home.ts (orchestrator), not here.

import { showForgeForm, renderArsenal, renderArmory } from '../reference-arsenal.ts';
import type { ArsenalReference } from '../reference-arsenal.ts';
import { state } from './home.state.ts';
import { loadShopScreen, cleanupShopScreen } from './home.arsenal-shop.ts';

export function loadArsenalScreen(): void {
  if (state.arsenalForgeCleanup) { state.arsenalForgeCleanup(); state.arsenalForgeCleanup = null; }
  cleanupShopScreen();
  const container = document.getElementById('arsenal-content');
  if (!container) return;
  state.arsenalActiveTab = 'my-arsenal';
  document.querySelectorAll('[data-arsenal-tab]').forEach(t => {
    t.classList.toggle('active', (t as HTMLElement).dataset.arsenalTab === 'my-arsenal');
  });
  void loadMyArsenal(container);
}

async function loadMyArsenal(container: HTMLElement): Promise<void> {
  state.arsenalRefs = await renderArsenal(container);
  wireArsenalButtons(container);
}

async function loadArmory(container: HTMLElement): Promise<void> {
  await renderArmory(container);
}

function loadForge(container: HTMLElement): void {
  state.arsenalForgeCleanup = showForgeForm(
    container,
    (_refId: string) => {
      state.arsenalForgeCleanup = null;
      // After forging, switch to My Arsenal
      state.arsenalActiveTab = 'my-arsenal';
      document.querySelectorAll('[data-arsenal-tab]').forEach(t => {
        t.classList.toggle('active', (t as HTMLElement).dataset.arsenalTab === 'my-arsenal');
      });
      void loadMyArsenal(container);
    },
    () => {
      state.arsenalForgeCleanup = null;
      // Cancel → back to My Arsenal
      state.arsenalActiveTab = 'my-arsenal';
      document.querySelectorAll('[data-arsenal-tab]').forEach(t => {
        t.classList.toggle('active', (t as HTMLElement).dataset.arsenalTab === 'my-arsenal');
      });
      void loadMyArsenal(container);
    },
  );
}

function wireArsenalButtons(container: HTMLElement): void {
  const forgeBtn = container.querySelector('#arsenal-forge-btn') as HTMLElement | null;
  if (forgeBtn) {
    forgeBtn.addEventListener('click', () => {
      // Switch to Forge tab
      const forgeTab = document.querySelector<HTMLElement>('[data-arsenal-tab="forge"]');
      if (forgeTab) forgeTab.click();
    });
  }
  container.querySelectorAll('.ref-card-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const refId = (btn as HTMLElement).dataset.refId;
      if (!refId) return;
      const ref = state.arsenalRefs.find((r: ArsenalReference) => r.id === refId);
      if (!ref) return;
      state.arsenalForgeCleanup = showForgeForm(
        container,
        (_editedId: string) => { state.arsenalForgeCleanup = null; void loadMyArsenal(container); },
        () => { state.arsenalForgeCleanup = null; void loadMyArsenal(container); },
        ref,
      );
    });
  });
}

// Tab switching
document.querySelectorAll('[data-arsenal-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabId = (tab as HTMLElement).dataset.arsenalTab;
    if (!tabId || tabId === state.arsenalActiveTab) return;
    if (state.arsenalForgeCleanup) { state.arsenalForgeCleanup(); state.arsenalForgeCleanup = null; }
    cleanupShopScreen();
    state.arsenalActiveTab = tabId;
    document.querySelectorAll('[data-arsenal-tab]').forEach(t => {
      t.classList.toggle('active', (t as HTMLElement).dataset.arsenalTab === tabId);
    });
    const container = document.getElementById('arsenal-content');
    if (!container) return;
    if (tabId === 'my-arsenal') void loadMyArsenal(container);
    else if (tabId === 'armory')    void loadArmory(container);
    else if (tabId === 'forge')     loadForge(container);
    else if (tabId === 'shop')      loadShopScreen(container);
  });
});
