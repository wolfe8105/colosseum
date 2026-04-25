import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockStartRecording = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockStopRecording = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockVmRetake = vi.hoisted(() => vi.fn());
const mockVmSend = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockVmRecording = vi.hoisted(() => ({ value: false }));
const mockVmTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockVmSeconds = vi.hoisted(() => ({ value: 0 }));
const mockSet_vmRecording = vi.hoisted(() => vi.fn((v: boolean) => { mockVmRecording.value = v; }));
const mockSet_vmTimer = vi.hoisted(() => vi.fn((v: ReturnType<typeof setInterval> | null) => { mockVmTimer.value = v; }));
const mockSet_vmSeconds = vi.hoisted(() => vi.fn((v: number) => { mockVmSeconds.value = v; }));

const mockIsPlaceholder = vi.hoisted(() => ({ value: false }));
const mockFormatTimer = vi.hoisted(() => vi.fn((t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`));
const mockAddMessage = vi.hoisted(() => vi.fn());
const mockAddSystemMessage = vi.hoisted(() => vi.fn());
const mockStartOpponentPoll = vi.hoisted(() => vi.fn());
const mockAdvanceRound = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/voicememo.ts', () => ({
  startRecording: mockStartRecording,
  stopRecording: mockStopRecording,
  retake: mockVmRetake,
  send: mockVmSend,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
  get vmRecording() { return mockVmRecording.value; },
  get vmTimer() { return mockVmTimer.value; },
  get vmSeconds() { return mockVmSeconds.value; },
  set_vmRecording: mockSet_vmRecording,
  set_vmTimer: mockSet_vmTimer,
  set_vmSeconds: mockSet_vmSeconds,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  get isPlaceholder() { return () => mockIsPlaceholder.value; },
  formatTimer: mockFormatTimer,
}));

vi.mock('../src/arena/arena-room-live-messages.ts', () => ({
  addMessage: mockAddMessage,
  addSystemMessage: mockAddSystemMessage,
}));

vi.mock('../src/arena/arena-room-live-poll.ts', () => ({
  startOpponentPoll: mockStartOpponentPoll,
  advanceRound: mockAdvanceRound,
  submitTextArgument: vi.fn(),
}));

import {
  wireVoiceMemoControls,
  startVoiceMemoRecording,
  stopVoiceMemoRecording,
  resetVoiceMemoUI,
  sendVoiceMemo,
} from '../src/arena/arena-room-voicememo.ts';

describe('TC1 — wireVoiceMemoControls wires record, cancel and send buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <button id="arena-record-btn"></button>
      <button id="arena-vm-cancel" class="arena-hidden"></button>
      <button id="arena-vm-send" class="arena-hidden"></button>
    `;
    mockVmRecording.value = false;
  });

  it('record button click calls startVoiceMemoRecording when not recording', async () => {
    wireVoiceMemoControls();
    mockStartRecording.mockResolvedValueOnce(undefined);
    document.getElementById('arena-record-btn')?.click();
    expect(mockSet_vmRecording).toHaveBeenCalledWith(true);
  });

  it('cancel button click calls vmRetake', () => {
    wireVoiceMemoControls();
    document.getElementById('arena-vm-cancel')?.click();
    expect(mockVmRetake).toHaveBeenCalled();
  });
});

describe('TC2 — startVoiceMemoRecording sets recording state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    document.body.innerHTML = `
      <button id="arena-record-btn"></button>
      <div id="arena-vm-status">Tap to record</div>
      <div id="arena-vm-timer" class="arena-hidden"></div>
    `;
    mockVmSeconds.value = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls set_vmRecording(true)', async () => {
    await startVoiceMemoRecording();
    expect(mockSet_vmRecording).toHaveBeenCalledWith(true);
  });

  it('calls startRecording', async () => {
    await startVoiceMemoRecording();
    expect(mockStartRecording).toHaveBeenCalled();
  });

  it('sets status to Recording...', async () => {
    await startVoiceMemoRecording();
    expect(document.getElementById('arena-vm-status')?.textContent).toBe('Recording...');
  });

  it('calls set_vmTimer with interval', async () => {
    await startVoiceMemoRecording();
    expect(mockSet_vmTimer).toHaveBeenCalled();
  });

  it('calls set_vmRecording(false) on startRecording failure', async () => {
    mockStartRecording.mockRejectedValueOnce(new Error('denied'));
    await startVoiceMemoRecording();
    // catch block calls resetVoiceMemoUI() after setting status — final state is reset
    expect(mockSet_vmRecording).toHaveBeenCalledWith(false);
  });
});

describe('TC3 — stopVoiceMemoRecording resets recording state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <button id="arena-record-btn" class="recording">⏹</button>
      <div id="arena-vm-status"></div>
      <button id="arena-vm-cancel" class="arena-hidden"></button>
      <button id="arena-vm-send" class="arena-hidden"></button>
    `;
    mockVmTimer.value = setInterval(() => {}, 99999);
    mockVmSeconds.value = 30;
  });

  it('calls set_vmRecording(false)', () => {
    stopVoiceMemoRecording();
    expect(mockSet_vmRecording).toHaveBeenCalledWith(false);
  });

  it('removes recording class from button', () => {
    stopVoiceMemoRecording();
    expect(document.getElementById('arena-record-btn')?.classList.contains('recording')).toBe(false);
  });

  it('shows send and cancel buttons', () => {
    stopVoiceMemoRecording();
    expect(document.getElementById('arena-vm-cancel')?.classList.contains('arena-hidden')).toBe(false);
    expect(document.getElementById('arena-vm-send')?.classList.contains('arena-hidden')).toBe(false);
  });

  it('calls stopRecording', () => {
    stopVoiceMemoRecording();
    expect(mockStopRecording).toHaveBeenCalled();
  });
});

describe('TC4 — resetVoiceMemoUI resets all UI elements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <button id="arena-record-btn" class="recording">⏹</button>
      <div id="arena-vm-status">Recording...</div>
      <div id="arena-vm-timer">0:30</div>
      <button id="arena-vm-cancel"></button>
      <button id="arena-vm-send"></button>
    `;
    mockVmTimer.value = null;
    mockVmSeconds.value = 10;
  });

  it('calls set_vmRecording(false)', () => {
    resetVoiceMemoUI();
    expect(mockSet_vmRecording).toHaveBeenCalledWith(false);
  });

  it('calls set_vmSeconds(0)', () => {
    resetVoiceMemoUI();
    expect(mockSet_vmSeconds).toHaveBeenCalledWith(0);
  });

  it('restores status text', () => {
    resetVoiceMemoUI();
    expect(document.getElementById('arena-vm-status')?.textContent).toBe('Tap to record your argument');
  });
});

describe('TC5 — sendVoiceMemo calls addMessage and vmSend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <button id="arena-vm-send"></button>
      <button id="arena-record-btn"></button>
      <div id="arena-vm-status"></div>
      <div id="arena-vm-timer" class="arena-hidden"></div>
      <button id="arena-vm-cancel" class="arena-hidden"></button>
    `;
    mockCurrentDebate.value = { id: 'debate-1', role: 'a', round: 1, totalRounds: 3 };
    mockVmSeconds.value = 30;
    mockIsPlaceholder.value = false;
    mockVmTimer.value = null;
  });

  it('calls addMessage with memo label', async () => {
    await sendVoiceMemo();
    expect(mockAddMessage).toHaveBeenCalledWith('a', expect.stringContaining('Voice memo'), 1, false);
  });

  it('calls vmSend', async () => {
    await sendVoiceMemo();
    expect(mockVmSend).toHaveBeenCalled();
  });

  it('calls safeRpc submit_debate_message for real debate', async () => {
    await sendVoiceMemo();
    expect(mockSafeRpc).toHaveBeenCalledWith('submit_debate_message', expect.objectContaining({ p_debate_id: 'debate-1' }));
  });

  it('calls startOpponentPoll for real debate', async () => {
    await sendVoiceMemo();
    expect(mockStartOpponentPoll).toHaveBeenCalledWith('debate-1', 'a', 1);
  });

  it('calls addSystemMessage after send', async () => {
    await sendVoiceMemo();
    expect(mockAddSystemMessage).toHaveBeenCalledWith(expect.stringContaining('waiting'));
  });
});

describe('ARCH — arena-room-voicememo.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../voicememo.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-core.utils.ts',
      './arena-room-live-messages.ts',
      './arena-room-live-poll.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-voicememo.ts'),
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
