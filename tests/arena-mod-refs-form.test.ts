import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockAssignModerator = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
const mockSubmitReference = vi.hoisted(() => vi.fn().mockResolvedValue({ reference_id: 'ref-1', error: null }));
const mockFriendlyError = vi.hoisted(() => vi.fn((e: unknown) => String(e)));

const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockSelectedModerator = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockScreenEl = vi.hoisted(() => ({ value: null as HTMLElement | null }));

const mockIsPlaceholder = vi.hoisted(() => ({ value: false }));
const mockAddSystemMessage = vi.hoisted(() => vi.fn());
const mockRequestAIModRuling = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../src/auth.ts', () => ({
  assignModerator: mockAssignModerator,
  submitReference: mockSubmitReference,
}));

vi.mock('../src/config.ts', () => ({
  friendlyError: mockFriendlyError,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
  get selectedModerator() { return mockSelectedModerator.value; },
  get screenEl() { return mockScreenEl.value; },
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  get isPlaceholder() { return () => mockIsPlaceholder.value; },
}));

vi.mock('../src/arena/arena-room-live-messages.ts', () => ({
  addSystemMessage: mockAddSystemMessage,
  addMessage: vi.fn(),
}));

vi.mock('../src/arena/arena-mod-refs-ai.ts', () => ({
  requestAIModRuling: mockRequestAIModRuling,
}));

import { assignSelectedMod, addReferenceButton, showReferenceForm, hideReferenceForm } from '../src/arena/arena-mod-refs-form.ts';

describe('TC1 — assignSelectedMod calls assignModerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPlaceholder.value = false;
    mockSelectedModerator.value = { id: 'mod-1', type: 'human' };
  });

  it('calls assignModerator with debateId and moderator info', async () => {
    await assignSelectedMod('debate-1');
    expect(mockAssignModerator).toHaveBeenCalledWith('debate-1', 'mod-1', 'human');
  });

  it('returns early when no selectedModerator', async () => {
    mockSelectedModerator.value = null;
    await assignSelectedMod('debate-1');
    expect(mockAssignModerator).not.toHaveBeenCalled();
  });

  it('returns early in placeholder mode', async () => {
    mockIsPlaceholder.value = true;
    await assignSelectedMod('debate-1');
    expect(mockAssignModerator).not.toHaveBeenCalled();
  });

  it('returns early for ai-local debates', async () => {
    await assignSelectedMod('ai-local-123');
    expect(mockAssignModerator).not.toHaveBeenCalled();
  });
});

describe('TC2 — addReferenceButton is a no-op', () => {
  it('returns undefined without side effects', () => {
    expect(addReferenceButton()).toBeUndefined();
  });
});

describe('TC3 — showReferenceForm renders form and wires submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="app"></div>
      <div id="arena-messages"></div>
    `;
    mockScreenEl.value = document.getElementById('app');
    mockCurrentDebate.value = { id: 'debate-1', moderatorType: 'human' };
  });

  it('renders arena-ref-form', () => {
    showReferenceForm();
    expect(document.getElementById('arena-ref-form')).not.toBeNull();
  });

  it('renders submit and cancel buttons', () => {
    showReferenceForm();
    expect(document.getElementById('arena-ref-submit-btn')).not.toBeNull();
    expect(document.getElementById('arena-ref-cancel-btn')).not.toBeNull();
  });

  it('cancel button removes form', () => {
    showReferenceForm();
    document.getElementById('arena-ref-cancel-btn')?.click();
    expect(document.getElementById('arena-ref-form')).toBeNull();
  });

  it('submit button calls submitReference', async () => {
    showReferenceForm();
    const urlInput = document.getElementById('arena-ref-url') as HTMLInputElement;
    Object.defineProperty(urlInput, 'value', { value: 'https://example.com', writable: true, configurable: true });
    await document.getElementById('arena-ref-submit-btn')?.click();
    await Promise.resolve();
    expect(mockSubmitReference).toHaveBeenCalledWith('debate-1', 'https://example.com', null, undefined);
  });

  it('does not submit when url and desc are both empty', async () => {
    showReferenceForm();
    await document.getElementById('arena-ref-submit-btn')?.click();
    await Promise.resolve();
    expect(mockSubmitReference).not.toHaveBeenCalled();
  });

  it('does nothing when currentDebate is null', () => {
    mockCurrentDebate.value = null;
    showReferenceForm();
    expect(document.getElementById('arena-ref-form')).toBeNull();
  });
});

describe('TC4 — hideReferenceForm removes form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="arena-ref-form"></div>';
  });

  it('removes the form element', () => {
    hideReferenceForm();
    expect(document.getElementById('arena-ref-form')).toBeNull();
  });

  it('does not throw when form is absent', () => {
    document.body.innerHTML = '';
    expect(() => hideReferenceForm()).not.toThrow();
  });
});

describe('ARCH — arena-mod-refs-form.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-core.utils.ts',
      './arena-room-live-messages.ts',
      './arena-mod-refs-ai.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-mod-refs-form.ts'),
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
