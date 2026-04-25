// ============================================================
// SHARE UI — tests/share-ui.test.ts
// Source: src/share.ui.ts
//
// CLASSIFICATION:
//   showPostDebatePrompt() — DOM event wiring + HTML string builder
//                           → Behavioral test (jsdom)
//
// IMPORTS:
//   { FEATURES }       from './config.ts'
//   { shareResult, inviteFriend } from './share.ts'
//   import type { ShareResultParams } from './share.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockShareResult = vi.hoisted(() => vi.fn());
const mockInviteFriend = vi.hoisted(() => vi.fn());
const mockFeatures = vi.hoisted(() => ({ shareLinks: true }));

vi.mock('../src/config.ts', () => ({
  get FEATURES() { return mockFeatures; },
  SUPABASE_URL: 'https://faomczmipsccwbhpivmp.supabase.co',
  SUPABASE_ANON_KEY: 'mock-key',
  showToast: vi.fn(),
  ModeratorConfig: { escapeHTML: (s: string) => s },
}));

vi.mock('../src/share.ts', () => ({
  shareResult: mockShareResult,
  inviteFriend: mockInviteFriend,
}));

import { showPostDebatePrompt } from '../src/share.ui.ts';

beforeEach(() => {
  document.body.innerHTML = '';
  mockShareResult.mockReset();
  mockInviteFriend.mockReset();
  mockFeatures.shareLinks = true;
});

// ── showPostDebatePrompt ──────────────────────────────────────

describe('TC1 — showPostDebatePrompt: appends modal to body', () => {
  it('creates #post-debate-share element', () => {
    showPostDebatePrompt({ topic: 'Test topic' });
    expect(document.getElementById('post-debate-share')).not.toBeNull();
  });
});

describe('TC2 — showPostDebatePrompt: removes existing modal before adding new', () => {
  it('only one modal exists after calling twice', () => {
    showPostDebatePrompt({ topic: 'First' });
    showPostDebatePrompt({ topic: 'Second' });
    expect(document.querySelectorAll('#post-debate-share')).toHaveLength(1);
  });
});

describe('TC3 — showPostDebatePrompt: no-op when FEATURES.shareLinks is false', () => {
  it('does not add modal when share links feature is disabled', () => {
    mockFeatures.shareLinks = false;
    showPostDebatePrompt({ topic: 'Disabled' });
    expect(document.getElementById('post-debate-share')).toBeNull();
  });
});

describe('TC4 — showPostDebatePrompt: won=true shows YOU WON heading', () => {
  it('shows YOU WON text for winning result', () => {
    showPostDebatePrompt({ won: true });
    const modal = document.getElementById('post-debate-share');
    expect(modal?.innerHTML).toContain('YOU WON');
  });
});

describe('TC5 — showPostDebatePrompt: won=false shows GOOD DEBATE heading', () => {
  it('shows GOOD DEBATE for non-winning result', () => {
    showPostDebatePrompt({ won: false });
    const modal = document.getElementById('post-debate-share');
    expect(modal?.innerHTML).toContain('GOOD DEBATE');
  });
});

describe('TC6 — showPostDebatePrompt: skip button closes modal', () => {
  it('removes modal when skip is clicked', () => {
    showPostDebatePrompt({ topic: 'Some topic' });
    const skipBtn = document.getElementById('post-debate-skip-btn') as HTMLButtonElement;
    expect(skipBtn).not.toBeNull();
    skipBtn.click();
    expect(document.getElementById('post-debate-share')).toBeNull();
  });
});

describe('TC7 — showPostDebatePrompt: share button calls shareResult (import contract)', () => {
  it('calls shareResult mock when share button is clicked', () => {
    showPostDebatePrompt({ topic: 'Share me' });
    const shareBtn = document.getElementById('post-debate-share-btn') as HTMLButtonElement;
    expect(shareBtn).not.toBeNull();
    shareBtn.click();
    expect(mockShareResult).toHaveBeenCalledTimes(1);
  });
});

describe('TC8 — showPostDebatePrompt: invite button calls inviteFriend (import contract)', () => {
  it('calls inviteFriend mock when invite button is clicked', () => {
    showPostDebatePrompt({ topic: 'Invite' });
    const inviteBtn = document.getElementById('post-debate-invite-btn') as HTMLButtonElement;
    expect(inviteBtn).not.toBeNull();
    inviteBtn.click();
    expect(mockInviteFriend).toHaveBeenCalledTimes(1);
  });
});

describe('TC9 — showPostDebatePrompt: clicking backdrop removes modal', () => {
  it('removes modal when backdrop (outer div) is clicked', () => {
    showPostDebatePrompt({ topic: 'Backdrop test' });
    const modal = document.getElementById('post-debate-share');
    expect(modal).not.toBeNull();
    modal!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('post-debate-share')).toBeNull();
  });
});

describe('TC10 — showPostDebatePrompt: share button closes modal after calling shareResult', () => {
  it('modal is removed after clicking share', () => {
    showPostDebatePrompt({ topic: 'Close test' });
    (document.getElementById('post-debate-share-btn') as HTMLButtonElement).click();
    expect(document.getElementById('post-debate-share')).toBeNull();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/share.ui.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts', './share.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/share.ui.ts'),
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
