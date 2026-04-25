// ============================================================
// AUTH GATE — tests/auth-gate.test.ts
// Source: src/auth.gate.ts
//
// CLASSIFICATION:
//   requireAuth() — Guard + modal creation → Behavioral test
//
// IMPORTS:
//   { getCurrentUser, getIsPlaceholderMode } from './auth.core.ts'
//   { escapeHTML }                            from './config.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetCurrentUser = vi.hoisted(() => vi.fn(() => null));
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));

vi.mock('../src/auth.core.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  isUUID: vi.fn((s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)),
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

import { requireAuth } from '../src/auth.gate.ts';

beforeEach(() => {
  mockGetCurrentUser.mockReturnValue(null);
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
  document.body.innerHTML = '';
});

// ── requireAuth ───────────────────────────────────────────────

describe('TC1 — requireAuth: returns true when user is logged in', () => {
  it('returns true without modal when getCurrentUser returns a user', () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });

    const result = requireAuth('post');

    expect(result).toBe(true);
    expect(document.getElementById('auth-gate-modal')).toBeNull();
  });
});

describe('TC2 — requireAuth: returns false in placeholder mode', () => {
  it('returns false even when user exists in placeholder mode', () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = requireAuth();

    expect(result).toBe(false);
  });
});

describe('TC3 — requireAuth: shows modal when not logged in', () => {
  it('appends #auth-gate-modal to body for unauthenticated user', () => {
    const result = requireAuth('vote');

    expect(result).toBe(false);
    expect(document.getElementById('auth-gate-modal')).not.toBeNull();
  });
});

describe('TC4 — requireAuth: modal contains action label', () => {
  it('passes actionLabel through escapeHTML and renders in modal', () => {
    requireAuth('challenge someone');

    expect(mockEscapeHTML).toHaveBeenCalledWith('challenge someone');
    const modal = document.getElementById('auth-gate-modal');
    expect(modal?.innerHTML).toContain('challenge someone');
  });
});

describe('TC5 — requireAuth: close button removes modal', () => {
  it('clicking #auth-gate-close-btn removes the modal', () => {
    requireAuth('vote');
    const closeBtn = document.getElementById('auth-gate-close-btn') as HTMLButtonElement;
    closeBtn.click();
    expect(document.getElementById('auth-gate-modal')).toBeNull();
  });
});

describe('TC6 — requireAuth: backdrop click removes modal', () => {
  it('clicking modal overlay removes it', () => {
    requireAuth();
    const modal = document.getElementById('auth-gate-modal')!;
    modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('auth-gate-modal')).toBeNull();
  });
});

describe('TC7 — requireAuth: second call replaces existing modal', () => {
  it('only one #auth-gate-modal exists after two calls', () => {
    requireAuth('vote');
    requireAuth('post');
    expect(document.querySelectorAll('#auth-gate-modal')).toHaveLength(1);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/auth.gate.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.core.ts', './config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/auth.gate.ts'),
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
