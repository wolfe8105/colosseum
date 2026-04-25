/**
 * Tests for src/pages/plinko-auth-return.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGetSupabaseClient = vi.hoisted(() => vi.fn());
const mockIsAnyPlaceholder = vi.hoisted(() => false);
const mockGoToStep = vi.hoisted(() => vi.fn());
const mockSet_signupMethod = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  getSupabaseClient: mockGetSupabaseClient,
}));

vi.mock('../src/config.ts', () => ({
  get isAnyPlaceholder() { return mockIsAnyPlaceholder; },
}));

vi.mock('../src/pages/plinko-helpers.ts', () => ({
  goToStep: mockGoToStep,
}));

vi.mock('../src/pages/plinko-state.ts', () => ({
  set_signupMethod: mockSet_signupMethod,
}));

import { attachAuthReturnHandler } from '../src/pages/plinko-auth-return.ts';

function buildDOM() {
  document.body.innerHTML = `
    <div id="step-5">
      <div class="step-title">LOADING</div>
    </div>
    <div id="welcome-text"></div>
    <button id="btn-enter"></button>
    <button id="btn-resend-email" style="display:block"></button>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  // Reset hash
  Object.defineProperty(window, 'location', {
    value: { hash: '', pathname: '/', search: '', href: '/' },
    configurable: true,
    writable: true,
  });
  mockGetCurrentUser.mockReturnValue(null);
  mockGetSupabaseClient.mockReturnValue(null);
});

describe('attachAuthReturnHandler — registers onAuthStateChange listener', () => {
  it('TC1: registers onAuthStateChange when supabase client is present', () => {
    const mockOnAuthStateChange = vi.fn();
    mockGetSupabaseClient.mockReturnValue({ auth: { onAuthStateChange: mockOnAuthStateChange } });
    attachAuthReturnHandler();
    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });
});

describe('attachAuthReturnHandler — SIGNED_IN with email hash goes to step 5', () => {
  it('TC2: calls goToStep(5) when SIGNED_IN with type=signup hash', () => {
    let capturedCb: ((event: string, session: { user?: unknown } | null) => void) | null = null;
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        onAuthStateChange: (cb: (event: string, session: { user?: unknown } | null) => void) => {
          capturedCb = cb;
        },
      },
    });
    (window as any).location = { hash: '#type=signup&access_token=abc', pathname: '/', search: '' };

    attachAuthReturnHandler();
    capturedCb!('SIGNED_IN', { user: { id: 'u1' } });

    expect(mockGoToStep).toHaveBeenCalledWith(5);
  });
});

describe('attachAuthReturnHandler — SIGNED_IN without email hash goes to step 2', () => {
  it('TC3: calls set_signupMethod("oauth") and goToStep(2) for regular OAuth', () => {
    let capturedCb: ((event: string, session: { user?: unknown } | null) => void) | null = null;
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        onAuthStateChange: (cb: (event: string, session: { user?: unknown } | null) => void) => {
          capturedCb = cb;
        },
      },
    });
    (window as any).location = { hash: '', pathname: '/', search: '' };

    attachAuthReturnHandler();
    capturedCb!('SIGNED_IN', { user: { id: 'u1' } });

    expect(mockSet_signupMethod).toHaveBeenCalledWith('oauth');
    expect(mockGoToStep).toHaveBeenCalledWith(2);
  });
});

describe('attachAuthReturnHandler — hash-based callback goes to step 5 if session exists', () => {
  it('TC4: handles access_token hash and calls goToStep(5) when session present', () => {
    mockGetCurrentUser.mockReturnValue({ id: 'u1' });
    (window as any).location = { hash: '#access_token=tok&type=signup', pathname: '/', search: '' };
    mockGetSupabaseClient.mockReturnValue(null);

    attachAuthReturnHandler();

    expect(mockGoToStep).toHaveBeenCalledWith(5);
  });
});

describe('attachAuthReturnHandler — hash-based callback ignores if no session', () => {
  it('TC5: does not call goToStep when access_token present but no current user', () => {
    mockGetCurrentUser.mockReturnValue(null);
    (window as any).location = { hash: '#access_token=tok&type=signup', pathname: '/', search: '' };
    mockGetSupabaseClient.mockReturnValue(null);

    attachAuthReturnHandler();

    expect(mockGoToStep).not.toHaveBeenCalled();
  });
});

describe('ARCH — src/pages/plinko-auth-return.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../config.ts', './plinko-helpers.ts', './plinko-state.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/plinko-auth-return.ts'),
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
