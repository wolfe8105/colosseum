import { describe, it, expect, vi, beforeEach } from 'vitest';
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

const mockActivate = vi.hoisted(() => vi.fn());

vi.mock('../src/powerups.rpc.ts', () => ({
  activate: mockActivate,
}));

import { renderActivationBar, wireActivationBar } from '../src/powerups.activation.ts';

// ── Fixtures ───────────────────────────────────────────────────

function buildEquipped(overrides: Record<string, unknown> = {}) {
  return {
    power_up_id: 'shield',
    slot_number: 1,
    icon: '🛡️',
    name: 'Shield',
    ...overrides,
  };
}

function buildCallbacks() {
  return {
    onSilence: vi.fn(),
    onShield: vi.fn(),
    onReveal: vi.fn(),
  };
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockEscapeHTML.mockReset();
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockActivate.mockReset();
  document.body.innerHTML = '';
});

// ── renderActivationBar ────────────────────────────────────────

describe('TC1 — renderActivationBar returns empty string for empty equipped', () => {
  it('returns "" when equipped is empty', () => {
    expect(renderActivationBar([])).toBe('');
  });

  it('returns "" when equipped is null-ish', () => {
    expect(renderActivationBar(null as never)).toBe('');
  });
});

describe('TC2 — renderActivationBar returns HTML containing POWER-UPS label', () => {
  it('returns HTML with POWER-UPS text when items exist', () => {
    const html = renderActivationBar([buildEquipped() as never]);
    expect(html).toContain('POWER-UPS');
  });
});

describe('TC3 — renderActivationBar uses escapeHTML on icon', () => {
  it('calls escapeHTML (import contract)', () => {
    renderActivationBar([buildEquipped() as never]);
    expect(mockEscapeHTML).toHaveBeenCalled();
  });
});

describe('TC4 — renderActivationBar passive button for multiplier_2x', () => {
  it('marks multiplier_2x slot as passive and disabled', () => {
    const html = renderActivationBar([buildEquipped({ power_up_id: 'multiplier_2x' }) as never]);
    expect(html).toContain('passive');
    expect(html).toContain('ACTIVE');
  });
});

describe('TC5 — renderActivationBar non-passive button shows USE label', () => {
  it('shows USE label for non-passive power-ups', () => {
    const html = renderActivationBar([buildEquipped({ power_up_id: 'shield' }) as never]);
    expect(html).toContain('USE');
  });
});

// ── wireActivationBar ──────────────────────────────────────────

function mountBar(powerUpId: string) {
  document.body.innerHTML = `
    <button class="powerup-activate-btn" data-id="${powerUpId}" data-slot="1">
      <span>🛡️</span><span>USE</span>
    </button>`;
}

describe('TC6 — wireActivationBar click calls activate with correct args', () => {
  it('calls activate(debateId, powerUpId) on click', async () => {
    mockActivate.mockResolvedValue({ success: true });
    mountBar('shield');
    wireActivationBar('debate-123', buildCallbacks());

    (document.querySelector('.powerup-activate-btn') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(mockActivate).toHaveBeenCalledWith('debate-123', 'shield'));
  });
});

describe('TC7 — wireActivationBar success adds used class', () => {
  it('button gets used class after successful activation', async () => {
    mockActivate.mockResolvedValue({ success: true });
    mountBar('shield');
    wireActivationBar('debate-abc', buildCallbacks());

    const btn = document.querySelector('.powerup-activate-btn') as HTMLButtonElement;
    btn.click();

    await vi.waitFor(() => expect(btn.classList.contains('used')).toBe(true));
  });
});

describe('TC8 — wireActivationBar calls onShield for shield power-up', () => {
  it('fires callbacks.onShield after successful shield activation', async () => {
    mockActivate.mockResolvedValue({ success: true });
    mountBar('shield');
    const cbs = buildCallbacks();
    wireActivationBar('debate-abc', cbs);

    (document.querySelector('.powerup-activate-btn') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(cbs.onShield).toHaveBeenCalled());
  });
});

describe('TC9 — wireActivationBar calls onSilence for silence power-up', () => {
  it('fires callbacks.onSilence after successful silence activation', async () => {
    mockActivate.mockResolvedValue({ success: true });
    mountBar('silence');
    const cbs = buildCallbacks();
    wireActivationBar('debate-abc', cbs);

    (document.querySelector('.powerup-activate-btn') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(cbs.onSilence).toHaveBeenCalled());
  });
});

describe('TC10 — wireActivationBar failure re-enables button', () => {
  it('button is re-enabled when activation returns success=false', async () => {
    mockActivate.mockResolvedValue({ success: false });
    mountBar('shield');
    wireActivationBar('debate-abc', buildCallbacks());

    const btn = document.querySelector('.powerup-activate-btn') as HTMLButtonElement;
    btn.click();

    await vi.waitFor(() => expect(btn.disabled).toBe(false));
    expect(btn.classList.contains('used')).toBe(false);
  });
});

describe('TC11 — activate import contract', () => {
  it('wireActivationBar click calls the activate mock from powerups.rpc', async () => {
    mockActivate.mockResolvedValue({ success: true });
    mountBar('reveal');
    wireActivationBar('debate-x', buildCallbacks());

    (document.querySelector('.powerup-activate-btn') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(mockActivate).toHaveBeenCalled());
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — powerups.activation.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts', './powerups.types.ts', './powerups.rpc.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/powerups.activation.ts'),
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
