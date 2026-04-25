import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockEscapeHTML = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/powerups.types.ts', () => ({
  CATALOG: {},
}));

import {
  renderSilenceOverlay,
  renderRevealPopup,
  renderShieldIndicator,
  removeShieldIndicator,
  hasMultiplier,
} from '../src/powerups.overlays.ts';

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockEscapeHTML.mockReset();
  mockEscapeHTML.mockImplementation((s: string) => s);
  document.body.innerHTML = '';
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── hasMultiplier — pure ───────────────────────────────────────

describe('TC1 — hasMultiplier returns true when multiplier_2x is equipped', () => {
  it('returns true for equipped containing multiplier_2x', () => {
    const equipped = [{ power_up_id: 'multiplier_2x', slot_number: 1 } as never];
    expect(hasMultiplier(equipped)).toBe(true);
  });
});

describe('TC2 — hasMultiplier returns false without multiplier_2x', () => {
  it('returns false when no equipped item has power_up_id multiplier_2x', () => {
    const equipped = [{ power_up_id: 'shield', slot_number: 1 } as never];
    expect(hasMultiplier(equipped)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(hasMultiplier([])).toBe(false);
  });
});

// ── renderSilenceOverlay ───────────────────────────────────────

describe('TC3 — renderSilenceOverlay appends overlay to body', () => {
  it('creates #powerup-silence-overlay in DOM', () => {
    renderSilenceOverlay('Rival');
    expect(document.getElementById('powerup-silence-overlay')).not.toBeNull();
  });
});

describe('TC4 — renderSilenceOverlay uses escapeHTML on opponent name', () => {
  it('calls escapeHTML with the opponent name', () => {
    renderSilenceOverlay('Rival<Name>');
    expect(mockEscapeHTML).toHaveBeenCalledWith(expect.stringContaining('Rival'));
  });
});

describe('TC5 — renderSilenceOverlay countdown ticks down', () => {
  it('silence-countdown decrements from 10 to 9 after 1 second', () => {
    renderSilenceOverlay();
    vi.advanceTimersByTime(1000);
    const countdown = document.getElementById('silence-countdown');
    expect(countdown?.textContent).toBe('9');
  });
});

describe('TC6 — renderSilenceOverlay removes overlay at 0', () => {
  it('overlay is removed from DOM after 10 ticks', () => {
    renderSilenceOverlay();
    vi.advanceTimersByTime(10_000);
    expect(document.getElementById('powerup-silence-overlay')).toBeNull();
  });
});

describe('TC7 — renderSilenceOverlay returns the interval handle', () => {
  it('return value is non-null (a timer handle)', () => {
    const handle = renderSilenceOverlay();
    expect(handle).not.toBeNull();
  });
});

// ── renderRevealPopup ──────────────────────────────────────────

describe('TC8 — renderRevealPopup appends popup to body', () => {
  it('creates #powerup-reveal-popup in DOM', () => {
    renderRevealPopup([]);
    expect(document.getElementById('powerup-reveal-popup')).not.toBeNull();
  });
});

describe('TC9 — renderRevealPopup removes existing popup before creating new', () => {
  it('only one popup exists after calling twice', () => {
    renderRevealPopup([]);
    renderRevealPopup([]);
    const popups = document.querySelectorAll('#powerup-reveal-popup');
    expect(popups.length).toBe(1);
  });
});

describe('TC10 — renderRevealPopup dismiss button removes popup', () => {
  it('clicking reveal-close-btn removes the popup', () => {
    renderRevealPopup([]);
    const btn = document.getElementById('reveal-close-btn') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    expect(document.getElementById('powerup-reveal-popup')).toBeNull();
  });
});

describe('TC11 — renderRevealPopup auto-removes after 8 seconds', () => {
  it('popup is gone from DOM after 8000ms', () => {
    renderRevealPopup([]);
    vi.advanceTimersByTime(8000);
    expect(document.getElementById('powerup-reveal-popup')).toBeNull();
  });
});

// ── renderShieldIndicator ──────────────────────────────────────

describe('TC12 — renderShieldIndicator appends indicator to body', () => {
  it('creates #powerup-shield-indicator in DOM', () => {
    renderShieldIndicator();
    expect(document.getElementById('powerup-shield-indicator')).not.toBeNull();
  });
});

describe('TC13 — renderShieldIndicator returns the element', () => {
  it('returns the HTMLDivElement that was appended', () => {
    const el = renderShieldIndicator();
    expect(el.id).toBe('powerup-shield-indicator');
  });
});

// ── removeShieldIndicator ──────────────────────────────────────

describe('TC14 — removeShieldIndicator removes the indicator', () => {
  it('removes #powerup-shield-indicator from DOM', () => {
    renderShieldIndicator();
    removeShieldIndicator();
    expect(document.getElementById('powerup-shield-indicator')).toBeNull();
  });
});

describe('TC15 — removeShieldIndicator is a no-op when indicator absent', () => {
  it('does not throw when no indicator is in DOM', () => {
    expect(() => removeShieldIndicator()).not.toThrow();
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — powerups.overlays.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts', './powerups.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/powerups.overlays.ts'),
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
