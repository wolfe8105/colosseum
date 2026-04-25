import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockWireVoiceMemoControls = vi.hoisted(() => vi.fn());
const mockSubmitTextArgument = vi.hoisted(() => vi.fn());
const mockToggleLiveMute = vi.hoisted(() => vi.fn());
const mockTEXT_MAX_CHARS = vi.hoisted(() => ({ value: 500 }));

vi.mock('../src/arena/arena-room-voicememo.ts', () => ({
  wireVoiceMemoControls: mockWireVoiceMemoControls,
}));

vi.mock('../src/arena/arena-room-live-poll.ts', () => ({
  submitTextArgument: mockSubmitTextArgument,
}));

vi.mock('../src/arena/arena-room-live-audio.ts', () => ({
  toggleLiveMute: mockToggleLiveMute,
}));

vi.mock('../src/arena/arena-constants.ts', () => ({
  get TEXT_MAX_CHARS() { return mockTEXT_MAX_CHARS.value; },
}));

import { renderInputControls } from '../src/arena/arena-room-live-input.ts';

describe('TC1 — renderInputControls returns early when no arena-input-area', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('does nothing when input area missing', () => {
    renderInputControls('text');
    expect(document.getElementById('arena-text-input')).toBeNull();
  });
});

describe('TC2 — renderInputControls text mode renders textarea and wires events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="arena-input-area"></div>';
  });

  it('renders textarea and send button', () => {
    renderInputControls('text');
    expect(document.getElementById('arena-text-input')).not.toBeNull();
    expect(document.getElementById('arena-send-btn')).not.toBeNull();
  });

  it('send button is initially disabled', () => {
    renderInputControls('text');
    const btn = document.getElementById('arena-send-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('input event updates char count and enables send button', () => {
    renderInputControls('text');
    const input = document.getElementById('arena-text-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('arena-send-btn') as HTMLButtonElement;
    const charCount = document.getElementById('arena-char-count');

    Object.defineProperty(input, 'value', { value: 'hello', writable: true, configurable: true });
    input.dispatchEvent(new Event('input'));

    expect(charCount?.textContent).toBe('5');
    expect(sendBtn.disabled).toBe(false);
  });

  it('click on send button calls submitTextArgument', () => {
    renderInputControls('text');
    const sendBtn = document.getElementById('arena-send-btn') as HTMLButtonElement;
    sendBtn.disabled = false;
    sendBtn.click();
    expect(mockSubmitTextArgument).toHaveBeenCalled();
  });

  it('Enter key on input calls submitTextArgument', () => {
    renderInputControls('text');
    const input = document.getElementById('arena-text-input') as HTMLTextAreaElement;
    const e = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, bubbles: true });
    input.dispatchEvent(e);
    expect(mockSubmitTextArgument).toHaveBeenCalled();
  });

  it('Shift+Enter does not call submitTextArgument', () => {
    renderInputControls('text');
    const input = document.getElementById('arena-text-input') as HTMLTextAreaElement;
    const e = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true });
    input.dispatchEvent(e);
    expect(mockSubmitTextArgument).not.toHaveBeenCalled();
  });
});

describe('TC3 — renderInputControls ai mode same as text', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="arena-input-area"></div>';
  });

  it('renders textarea for ai mode', () => {
    renderInputControls('ai');
    expect(document.getElementById('arena-text-input')).not.toBeNull();
  });
});

describe('TC4 — renderInputControls live mode renders mic button and wires toggleLiveMute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="arena-input-area"></div>';
  });

  it('renders mic button', () => {
    renderInputControls('live');
    expect(document.getElementById('arena-mic-btn')).not.toBeNull();
  });

  it('mic button click calls toggleLiveMute', () => {
    renderInputControls('live');
    document.getElementById('arena-mic-btn')?.click();
    expect(mockToggleLiveMute).toHaveBeenCalled();
  });
});

describe('TC5 — renderInputControls voicememo mode renders controls and calls wireVoiceMemoControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="arena-input-area"></div>';
  });

  it('renders record button', () => {
    renderInputControls('voicememo');
    expect(document.getElementById('arena-record-btn')).not.toBeNull();
  });

  it('calls wireVoiceMemoControls', () => {
    renderInputControls('voicememo');
    expect(mockWireVoiceMemoControls).toHaveBeenCalled();
  });
});

describe('ARCH — arena-room-live-input.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './arena-types.ts',
      './arena-constants.ts',
      './arena-room-voicememo.ts',
      './arena-room-live-poll.ts',
      './arena-room-live-audio.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-live-input.ts'),
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
