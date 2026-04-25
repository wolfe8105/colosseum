import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockInjectRivalsPresenceCSS = vi.hoisted(() => vi.fn());

vi.mock('../src/rivals-presence-css.ts', () => ({
  injectRivalsPresenceCSS: mockInjectRivalsPresenceCSS,
}));

const mockEscapeHTML = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

const mockShowUserProfile = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  showUserProfile: mockShowUserProfile,
}));

import { destroy, dismissPopup, showNext, queueAlert } from '../src/rivals-presence-popup.ts';
import type { PopupState } from '../src/rivals-presence-popup.ts';

// ── Helpers ────────────────────────────────────────────────────

function buildState(overrides: Partial<PopupState> = {}): PopupState {
  return {
    queue: [],
    active: false,
    ...overrides,
  };
}

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'user-abc',
    username: 'gladiator',
    display_name: 'Gladiator',
    ...overrides,
  };
}

function buildPopup(): HTMLElement {
  const popup = document.createElement('div');
  popup.id = 'rival-alert-popup';
  document.body.appendChild(popup);
  return popup;
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockInjectRivalsPresenceCSS.mockReset();
  mockEscapeHTML.mockReset();
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockShowUserProfile.mockReset();
  document.body.innerHTML = '';
  destroy(); // clear any module-level timers from prior tests
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── destroy ────────────────────────────────────────────────────

describe('TC1 — destroy cancels pending dismiss timer', () => {
  it('popup is not removed after 300ms once destroy() is called', () => {
    const state = buildState({ active: true });
    buildPopup();
    dismissPopup(state); // starts _dismissTimer
    destroy();           // cancels it
    vi.advanceTimersByTime(300);

    expect(document.getElementById('rival-alert-popup')).not.toBeNull();
  });
});

describe('TC2 — destroy cancels auto-dismiss timer', () => {
  it('popup not auto-dismissed after 8s once destroy() is called', () => {
    const state = buildState({ active: false });
    state.queue.push(buildPayload());
    showNext(state); // starts _autoTimer
    destroy();       // cancels it
    vi.advanceTimersByTime(8100);

    expect(document.getElementById('rival-alert-popup')).not.toBeNull();
  });
});

// ── dismissPopup ───────────────────────────────────────────────

describe('TC3 — dismissPopup adds dismissing class immediately', () => {
  it('popup element gets the dismissing CSS class', () => {
    const state = buildState({ active: true });
    const popup = buildPopup();
    dismissPopup(state);
    expect(popup.classList.contains('dismissing')).toBe(true);
  });
});

describe('TC4 — dismissPopup removes popup after 300ms', () => {
  it('popup element is removed from DOM after 300ms', () => {
    const state = buildState({ active: true });
    buildPopup();
    dismissPopup(state);
    vi.advanceTimersByTime(300);
    expect(document.getElementById('rival-alert-popup')).toBeNull();
  });
});

describe('TC5 — dismissPopup sets active=false after removal', () => {
  it('state.active is false after the 300ms timer fires', () => {
    const state = buildState({ active: true });
    buildPopup();
    dismissPopup(state);
    vi.advanceTimersByTime(300);
    expect(state.active).toBe(false);
  });
});

describe('TC6 — dismissPopup handles missing popup gracefully', () => {
  it('sets active=false even if popup is not in DOM', () => {
    const state = buildState({ active: true });
    // no popup in DOM
    dismissPopup(state);
    expect(state.active).toBe(false);
  });
});

describe('TC7 — dismissPopup queues showNext when queue has items', () => {
  it('calls showNext after 600ms if queue is non-empty after dismiss', () => {
    const nextPayload = buildPayload({ user_id: 'user-next', display_name: 'Next' });
    const state = buildState({ active: true, queue: [nextPayload] });
    buildPopup();
    dismissPopup(state);
    vi.advanceTimersByTime(300); // dismiss fires: removes popup, sees queue
    vi.advanceTimersByTime(600); // showNext fires

    // showNext would have created a new popup
    expect(document.getElementById('rival-alert-popup')).not.toBeNull();
  });
});

// ── showNext ───────────────────────────────────────────────────

describe('TC8 — showNext creates popup in DOM', () => {
  it('appends rival-alert-popup to body', () => {
    const state = buildState({ queue: [buildPayload()] });
    showNext(state);
    expect(document.getElementById('rival-alert-popup')).not.toBeNull();
  });
});

describe('TC9 — showNext calls injectRivalsPresenceCSS', () => {
  it('import contract: injectRivalsPresenceCSS is called', () => {
    const state = buildState({ queue: [buildPayload()] });
    showNext(state);
    expect(mockInjectRivalsPresenceCSS).toHaveBeenCalledTimes(1);
  });
});

describe('TC10 — showNext uses escapeHTML on display_name', () => {
  it('calls escapeHTML import contract', () => {
    const state = buildState({ queue: [buildPayload({ display_name: 'Rival<Name>' })] });
    showNext(state);
    expect(mockEscapeHTML).toHaveBeenCalled();
    const args = mockEscapeHTML.mock.calls.map(c => c[0]);
    expect(args.some((a: string) => a.includes('RIVAL<NAME>'))).toBe(true);
  });
});

describe('TC11 — showNext sets state.active=true', () => {
  it('marks the state as active after showing the popup', () => {
    const state = buildState({ queue: [buildPayload()] });
    showNext(state);
    expect(state.active).toBe(true);
  });
});

describe('TC12 — showNext auto-dismisses after 8 seconds', () => {
  it('popup is removed from DOM after 8000ms', () => {
    const state = buildState({ queue: [buildPayload()] });
    showNext(state);
    vi.advanceTimersByTime(8000 + 300); // auto-timer + dismiss-timer
    expect(document.getElementById('rival-alert-popup')).toBeNull();
  });
});

describe('TC13 — showNext dismiss button closes popup', () => {
  it('clicking rap-dismiss-btn triggers popup removal', () => {
    const state = buildState({ queue: [buildPayload()] });
    showNext(state);
    const dismissBtn = document.getElementById('rap-dismiss-btn') as HTMLButtonElement;
    expect(dismissBtn).not.toBeNull();
    dismissBtn.click();
    vi.advanceTimersByTime(300);
    expect(document.getElementById('rival-alert-popup')).toBeNull();
  });
});

describe('TC14 — showNext sets active=false when queue is empty', () => {
  it('sets state.active=false and returns when queue is empty', () => {
    const state = buildState({ queue: [], active: true });
    showNext(state);
    expect(state.active).toBe(false);
    expect(document.getElementById('rival-alert-popup')).toBeNull();
  });
});

// ── queueAlert ─────────────────────────────────────────────────

describe('TC15 — queueAlert calls showNext immediately when not active', () => {
  it('creates popup when state.active is false', () => {
    const state = buildState({ active: false });
    queueAlert(buildPayload(), state);
    expect(document.getElementById('rival-alert-popup')).not.toBeNull();
  });
});

describe('TC16 — queueAlert queues without calling showNext when already active', () => {
  it('does not create a second popup when state.active is true', () => {
    const state = buildState({ active: true });
    queueAlert(buildPayload(), state);
    expect(document.getElementById('rival-alert-popup')).toBeNull();
    expect(state.queue.length).toBe(1);
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — rivals-presence-popup.ts only imports from allowed modules', () => {
  it('has no static imports outside the allowed list', () => {
    const allowed = ['./rivals-presence-css.ts', './config.ts', './auth.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/rivals-presence-popup.ts'),
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
