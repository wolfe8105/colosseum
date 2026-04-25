import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRuleOnReference = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockFriendlyError = vi.hoisted(() => vi.fn((e: unknown) => String(e)));

const mockRulingCountdownTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockSet__rulingCountdownTimer = vi.hoisted(() => vi.fn((v: ReturnType<typeof setInterval> | null) => { mockRulingCountdownTimer.value = v; }));
const mockReferencePollTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockSet_referencePollTimer = vi.hoisted(() => vi.fn((v: ReturnType<typeof setInterval> | null) => { mockReferencePollTimer.value = v; }));
const mockSet_pendingReferences = vi.hoisted(() => vi.fn());

const mockAddSystemMessage = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  ruleOnReference: mockRuleOnReference,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  friendlyError: mockFriendlyError,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get _rulingCountdownTimer() { return mockRulingCountdownTimer.value; },
  set__rulingCountdownTimer: mockSet__rulingCountdownTimer,
  get referencePollTimer() { return mockReferencePollTimer.value; },
  set_referencePollTimer: mockSet_referencePollTimer,
  set_pendingReferences: mockSet_pendingReferences,
}));

vi.mock('../src/arena/arena-room-live-messages.ts', () => ({
  addSystemMessage: mockAddSystemMessage,
  addMessage: vi.fn(),
}));

import { showRulingPanel, startReferencePoll, stopReferencePoll } from '../src/arena/arena-mod-refs-ruling.ts';

const baseRef = {
  id: 'ref-1',
  round: 2,
  submitter_name: 'Alice',
  url: 'https://example.com',
  description: 'A credible source.',
  supports_side: 'a',
};

describe('TC1 — showRulingPanel renders overlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    document.body.innerHTML = '';
    mockRulingCountdownTimer.value = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('appends mod-ruling-overlay to body', () => {
    showRulingPanel(baseRef as never);
    expect(document.getElementById('mod-ruling-overlay')).not.toBeNull();
  });

  it('renders allow and deny buttons', () => {
    showRulingPanel(baseRef as never);
    const overlay = document.getElementById('mod-ruling-overlay');
    expect(overlay?.querySelector('#mod-ruling-allow')).not.toBeNull();
    expect(overlay?.querySelector('#mod-ruling-deny')).not.toBeNull();
  });

  it('calls set__rulingCountdownTimer with interval', () => {
    showRulingPanel(baseRef as never);
    expect(mockSet__rulingCountdownTimer).toHaveBeenCalled();
  });
});

describe('TC2 — showRulingPanel allow button calls ruleOnReference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    mockRulingCountdownTimer.value = null;
  });

  it('calls ruleOnReference with allowed on allow button click', async () => {
    showRulingPanel(baseRef as never);
    const overlay = document.getElementById('mod-ruling-overlay');
    const allowBtn = overlay?.querySelector('#mod-ruling-allow') as HTMLButtonElement;
    allowBtn.click();
    await Promise.resolve();
    expect(mockRuleOnReference).toHaveBeenCalledWith('ref-1', 'allowed', '');
  });

  it('calls addSystemMessage with ALLOWED verdict', async () => {
    showRulingPanel(baseRef as never);
    const overlay = document.getElementById('mod-ruling-overlay');
    const allowBtn = overlay?.querySelector('#mod-ruling-allow') as HTMLButtonElement;
    allowBtn.click();
    await Promise.resolve();
    expect(mockAddSystemMessage).toHaveBeenCalledWith(expect.stringContaining('ALLOWED'));
  });
});

describe('TC3 — showRulingPanel deny button calls ruleOnReference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    mockRulingCountdownTimer.value = null;
  });

  it('calls ruleOnReference with denied on deny button click', async () => {
    showRulingPanel(baseRef as never);
    const overlay = document.getElementById('mod-ruling-overlay');
    const denyBtn = overlay?.querySelector('#mod-ruling-deny') as HTMLButtonElement;
    denyBtn.click();
    await Promise.resolve();
    expect(mockRuleOnReference).toHaveBeenCalledWith('ref-1', 'denied', '');
  });

  it('calls addSystemMessage with DENIED verdict', async () => {
    showRulingPanel(baseRef as never);
    const overlay = document.getElementById('mod-ruling-overlay');
    const denyBtn = overlay?.querySelector('#mod-ruling-deny') as HTMLButtonElement;
    denyBtn.click();
    await Promise.resolve();
    expect(mockAddSystemMessage).toHaveBeenCalledWith(expect.stringContaining('DENIED'));
  });
});

describe('TC4 — startReferencePoll is a no-op', () => {
  it('returns undefined', () => {
    expect(startReferencePoll('debate-1')).toBeUndefined();
  });
});

describe('TC5 — stopReferencePoll clears timer and resets pending refs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReferencePollTimer.value = setInterval(() => {}, 99999);
  });

  it('calls set_referencePollTimer(null)', () => {
    stopReferencePoll();
    expect(mockSet_referencePollTimer).toHaveBeenCalledWith(null);
  });

  it('calls set_pendingReferences([])', () => {
    stopReferencePoll();
    expect(mockSet_pendingReferences).toHaveBeenCalledWith([]);
  });
});

describe('ARCH — arena-mod-refs-ruling.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types-results.ts',
      './arena-room-live-messages.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-mod-refs-ruling.ts'),
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
