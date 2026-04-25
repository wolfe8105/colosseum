// ============================================================
// LEADERBOARD ELO — tests/leaderboard-elo.test.ts
// Source: src/leaderboard.elo.ts
//
// CLASSIFICATION:
//   showEloExplainer() — DOM event wiring + HTML string builder
//                       → Behavioral test (jsdom environment)
//
// IMPORTS: none — zero external dependencies.
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { showEloExplainer } from '../src/leaderboard.elo.ts';

beforeEach(() => {
  document.body.innerHTML = '';
});

// ── showEloExplainer ──────────────────────────────────────────

describe('TC1 — showEloExplainer: appends modal to body', () => {
  it('creates a modal element in document.body', () => {
    showEloExplainer();
    const modal = document.getElementById('elo-explainer-modal');
    expect(modal).not.toBeNull();
  });
});

describe('TC2 — showEloExplainer: modal has correct id', () => {
  it('modal element id is "elo-explainer-modal"', () => {
    showEloExplainer();
    const modal = document.getElementById('elo-explainer-modal');
    expect(modal?.id).toBe('elo-explainer-modal');
  });
});

describe('TC3 — showEloExplainer: removes previous modal before creating new one', () => {
  it('only one modal exists after calling twice', () => {
    showEloExplainer();
    showEloExplainer();
    const modals = document.querySelectorAll('#elo-explainer-modal');
    expect(modals).toHaveLength(1);
  });
});

describe('TC4 — showEloExplainer: modal contains ELO RATING heading', () => {
  it('modal HTML contains "ELO RATING" text', () => {
    showEloExplainer();
    const modal = document.getElementById('elo-explainer-modal');
    expect(modal?.innerHTML).toContain('ELO RATING');
  });
});

describe('TC5 — showEloExplainer: modal has close button with data-action', () => {
  it('close button has data-action="close-elo-explainer"', () => {
    showEloExplainer();
    const closeBtn = document.querySelector('[data-action="close-elo-explainer"]');
    expect(closeBtn).not.toBeNull();
  });
});

describe('TC6 — showEloExplainer: clicking backdrop removes modal', () => {
  it('modal is removed when backdrop is clicked', () => {
    showEloExplainer();
    const modal = document.getElementById('elo-explainer-modal');
    expect(modal).not.toBeNull();

    // Simulate click on the backdrop (the modal element itself)
    modal!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // The handler checks e.target === modal before removing
    expect(document.getElementById('elo-explainer-modal')).toBeNull();
  });
});

describe('TC7 — showEloExplainer: clicking inner content does not remove modal', () => {
  it('modal survives click on inner content (not backdrop)', () => {
    showEloExplainer();
    const modal = document.getElementById('elo-explainer-modal');
    const inner = modal?.firstElementChild as HTMLElement | null;
    expect(inner).not.toBeNull();

    // Click on inner element — event.target !== modal, so modal should NOT be removed
    inner!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Modal should still exist
    expect(document.getElementById('elo-explainer-modal')).not.toBeNull();
  });
});

describe('TC8 — showEloExplainer: modal contains starting Elo of 1200', () => {
  it('mentions the default starting Elo rating 1200', () => {
    showEloExplainer();
    const modal = document.getElementById('elo-explainer-modal');
    expect(modal?.innerHTML).toContain('1200');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/leaderboard.elo.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed: string[] = [];
    const source = readFileSync(
      resolve(__dirname, '../src/leaderboard.elo.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
