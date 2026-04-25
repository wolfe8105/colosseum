// ============================================================
// TERMS — tests/terms.test.ts
// Source: src/pages/terms.ts
//
// CLASSIFICATION:
//   showTab():  DOM behavioral (internal) — wires class toggling
//   Module-level: hash check + delegated click handler + back link
//
// IMPORTS: none — pure DOM module
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── DOM setup ─────────────────────────────────────────────────

function buildDOM() {
  document.body.innerHTML = `
    <div class="legal-page active" id="page-tos"></div>
    <div class="legal-page" id="page-privacy"></div>
    <div class="legal-page" id="page-community"></div>
    <button class="legal-tab active" data-tab="tos">ToS</button>
    <button class="legal-tab" data-tab="privacy">Privacy</button>
    <button class="legal-tab" data-tab="community">Community</button>
    <a id="terms-back-link" href="#">Back</a>
  `;
}

beforeEach(() => {
  buildDOM();
  vi.clearAllMocks();
});

// Import the module AFTER DOM is set up.
// terms.ts runs hash checks and wires events at module load time.
// We import it once here; the click handler is registered on document.
import '../src/pages/terms.ts';

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — clicking [data-tab="privacy"] activates privacy page', () => {
  it('adds active class to #page-privacy and removes from #page-tos', () => {
    const btn = document.querySelector<HTMLElement>('[data-tab="privacy"]')!;
    btn.click();
    expect(document.getElementById('page-privacy')?.classList.contains('active')).toBe(true);
    expect(document.getElementById('page-tos')?.classList.contains('active')).toBe(false);
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — clicking [data-tab="community"] activates community page', () => {
  it('adds active class to #page-community', () => {
    const btn = document.querySelector<HTMLElement>('[data-tab="community"]')!;
    btn.click();
    expect(document.getElementById('page-community')?.classList.contains('active')).toBe(true);
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — clicking [data-tab="tos"] activates tos page', () => {
  it('adds active class to #page-tos after switching away and back', () => {
    // Switch to privacy first
    (document.querySelector<HTMLElement>('[data-tab="privacy"]')!).click();
    // Switch back to tos
    (document.querySelector<HTMLElement>('[data-tab="tos"]')!).click();
    expect(document.getElementById('page-tos')?.classList.contains('active')).toBe(true);
    expect(document.getElementById('page-privacy')?.classList.contains('active')).toBe(false);
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — tab click activates corresponding legal-tab button', () => {
  it('adds active class to the privacy tab button', () => {
    const btn = document.querySelector<HTMLElement>('[data-tab="privacy"]')!;
    btn.click();
    expect(btn.classList.contains('active')).toBe(true);
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — only one page has active class at a time', () => {
  it('exactly one .legal-page is active after tab click', () => {
    (document.querySelector<HTMLElement>('[data-tab="community"]')!).click();
    const activePages = document.querySelectorAll('.legal-page.active');
    expect(activePages.length).toBe(1);
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — delegated click handler ignores non-tab elements', () => {
  it('does not change active page when clicking an element without data-tab', () => {
    // Set up a known initial state
    (document.querySelector<HTMLElement>('[data-tab="tos"]')!).click();
    const activeBefore = document.querySelector('.legal-page.active')?.id;

    // Click a non-tab element
    const div = document.createElement('div');
    document.body.appendChild(div);
    div.click();

    const activeAfter = document.querySelector('.legal-page.active')?.id;
    expect(activeBefore).toBe(activeAfter);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/terms.ts has no imports', () => {
  it('has zero import statements', () => {
    const source = readFileSync(
      resolve(__dirname, '../src/pages/terms.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    expect(importLines.length).toBe(0);
  });
});
