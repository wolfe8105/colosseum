import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockEscapeHTML = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

import { renderPlayer, playInline, togglePlayback, resetPlayingState } from '../src/voicememo.player.ts';

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: string) => s);
  document.body.innerHTML = '';
  resetPlayingState();
});

// ── renderPlayer ───────────────────────────────────────────────

describe('TC1 — renderPlayer returns HTML with vm-inline-player class', () => {
  it('rendered HTML contains vm-inline-player', () => {
    const html = renderPlayer('https://example.com/audio.webm', 90);
    expect(html).toContain('vm-inline-player');
  });
});

describe('TC2 — renderPlayer formats duration correctly', () => {
  it('90 seconds renders as 1:30', () => {
    const html = renderPlayer('https://example.com/audio.webm', 90);
    expect(html).toContain('1:30');
  });

  it('65 seconds renders as 1:05', () => {
    const html = renderPlayer('https://example.com/audio.webm', 65);
    expect(html).toContain('1:05');
  });
});

describe('TC3 — renderPlayer calls escapeHTML on URL', () => {
  it('escapeHTML is called with the voice URL', () => {
    renderPlayer('https://cdn.example.com/audio.webm', 30);
    expect(mockEscapeHTML).toHaveBeenCalledWith('https://cdn.example.com/audio.webm');
  });
});

describe('TC4 — renderPlayer contains audio element with src', () => {
  it('rendered HTML has an audio element', () => {
    const html = renderPlayer('https://cdn.example.com/audio.webm', 30);
    expect(html).toContain('<audio');
    expect(html).toContain('cdn.example.com');
  });
});

describe('TC5 — renderPlayer contains a play button', () => {
  it('rendered HTML has a play button with data-action=play-inline', () => {
    const html = renderPlayer('https://example.com/audio.webm', 30);
    expect(html).toContain('data-action="play-inline"');
  });
});

// ── playInline ─────────────────────────────────────────────────

function mountPlayer(id: string, paused = true) {
  document.body.innerHTML = `
    <div class="vm-inline-player">
      <button id="${id}-btn">▶</button>
      <audio id="${id}" src="fake.webm" style="display:none;"></audio>
    </div>`;
  const audioEl = document.getElementById(id) as HTMLAudioElement;
  Object.defineProperty(audioEl, 'paused', { get: () => paused, configurable: true });
  audioEl.play = vi.fn().mockResolvedValue(undefined);
  audioEl.pause = vi.fn();
  return audioEl;
}

describe('TC6 — playInline is a no-op when audio element not found', () => {
  it('does not throw when no element with given id', () => {
    expect(() => playInline('nonexistent-id')).not.toThrow();
  });
});

describe('TC7 — playInline sets button text to ⏸ when audio is paused', () => {
  it('button changes to pause icon when playing starts', async () => {
    mountPlayer('player-1', true);
    playInline('player-1');
    const btn = document.getElementById('player-1-btn');
    expect(btn!.textContent).toBe('⏸');
  });
});

describe('TC8 — playInline pauses and resets when audio is already playing', () => {
  it('button resets to play icon when audio is paused', () => {
    mountPlayer('player-1', false);
    playInline('player-1');
    const btn = document.getElementById('player-1-btn');
    expect(btn!.textContent).toBe('▶');
  });
});

// ── togglePlayback ─────────────────────────────────────────────

function mountPreviewPlayer(paused = true) {
  document.body.innerHTML = `
    <button id="vm-play-btn">▶</button>
    <audio id="vm-audio-preview"></audio>`;
  const audio = document.getElementById('vm-audio-preview') as HTMLAudioElement;
  Object.defineProperty(audio, 'paused', { get: () => paused, configurable: true });
  audio.play = vi.fn().mockResolvedValue(undefined);
  audio.pause = vi.fn();
  return audio;
}

describe('TC9 — togglePlayback sets play button to ⏸ when starting', () => {
  it('button text becomes ⏸ after togglePlayback when not playing', () => {
    mountPreviewPlayer(true);
    togglePlayback();
    const btn = document.getElementById('vm-play-btn');
    expect(btn!.textContent).toBe('⏸');
  });
});

describe('TC10 — togglePlayback resets button to ▶ when stopping', () => {
  it('button text becomes ▶ after second togglePlayback call', () => {
    mountPreviewPlayer(true);
    togglePlayback(); // start
    togglePlayback(); // stop
    const btn = document.getElementById('vm-play-btn');
    expect(btn!.textContent).toBe('▶');
  });
});

describe('TC11 — togglePlayback is a no-op when audio element not found', () => {
  it('does not throw when vm-audio-preview is absent', () => {
    expect(() => togglePlayback()).not.toThrow();
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — voicememo.player.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/voicememo.player.ts'),
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
