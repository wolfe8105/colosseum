// ============================================================
// SPECTATE UTILS — tests/spectate-utils.test.ts
// Source: src/pages/spectate.utils.ts
//
// CLASSIFICATION:
//   escHtml()       — Pure calculation → Unit test
//   parseAvatar()   — Pure calculation → Unit test
//   renderAvatar()  — HTML string builder → Snapshot test
//   modeLabel()     — Pure calculation → Unit test
//   statusBadge()   — HTML string builder → Snapshot test
//   timeAgo()       — Pure calculation → Unit test
//
// IMPORTS: none — zero external dependencies, no mocking needed.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  escHtml,
  parseAvatar,
  renderAvatar,
  modeLabel,
  statusBadge,
  timeAgo,
} from '../src/pages/spectate.utils.ts';

// ── escHtml ──────────────────────────────────────────────────

describe('TC1 — escHtml: escapes & < > " \'', () => {
  it('encodes all 5 OWASP characters', () => {
    expect(escHtml('a&b')).toBe('a&amp;b');
    expect(escHtml('<script>')).toBe('&lt;script&gt;');
    expect(escHtml('"hello"')).toBe('&quot;hello&quot;');
    expect(escHtml("it's")).toBe('it&#39;s');
  });
});

describe('TC2 — escHtml: falsy input returns empty string', () => {
  it('returns "" for null, undefined, empty string', () => {
    expect(escHtml(null)).toBe('');
    expect(escHtml(undefined)).toBe('');
    expect(escHtml('')).toBe('');
  });
});

describe('TC3 — escHtml: safe string passes through unchanged', () => {
  it('returns plain text unchanged', () => {
    expect(escHtml('hello world')).toBe('hello world');
  });
});

// ── parseAvatar ───────────────────────────────────────────────

describe('TC4 — parseAvatar: emoji: prefix returns emoji type', () => {
  it('strips emoji: prefix and returns type emoji', () => {
    const result = parseAvatar('emoji:🔥', 'Bob');
    expect(result.type).toBe('emoji');
    expect(result.value).toBe('🔥');
  });
});

describe('TC5 — parseAvatar: non-emoji URL returns initial', () => {
  it('returns first letter of fallback name uppercased', () => {
    const result = parseAvatar('https://example.com/photo.jpg', 'alice');
    expect(result.type).toBe('initial');
    expect(result.value).toBe('A');
  });
});

describe('TC6 — parseAvatar: null URL falls back to initial', () => {
  it('returns initial when avatarUrl is null', () => {
    const result = parseAvatar(null, 'charlie');
    expect(result.type).toBe('initial');
    expect(result.value).toBe('C');
  });
});

describe('TC7 — parseAvatar: empty fallbackName returns ?', () => {
  it('returns ? when fallbackName is empty', () => {
    const result = parseAvatar(null, '');
    expect(result.type).toBe('initial');
    expect(result.value).toBe('?');
  });
});

// ── renderAvatar ──────────────────────────────────────────────

describe('TC8 — renderAvatar snapshot: emoji avatar', () => {
  it('renders emoji avatar with .vs-avatar.emoji class', () => {
    const html = renderAvatar('emoji:🔥', 'Bob', 'side-a');
    expect(html).toMatchInlineSnapshot(`"<div class="vs-avatar emoji">🔥</div>"`);
  });
});

describe('TC9 — renderAvatar snapshot: initial avatar uses sideClass', () => {
  it('renders initial with the provided sideClass', () => {
    const html = renderAvatar(null, 'Dave', 'side-b');
    expect(html).toMatchInlineSnapshot(`"<div class="vs-avatar side-b">D</div>"`);
  });
});

// ── modeLabel ─────────────────────────────────────────────────

describe('TC10 — modeLabel: known modes', () => {
  it('returns correct label for live', () => {
    expect(modeLabel('live')).toBe('🎙️ LIVE AUDIO');
  });
  it('returns correct label for voicememo', () => {
    expect(modeLabel('voicememo')).toBe('🎤 VOICE MEMO');
  });
  it('returns correct label for text', () => {
    expect(modeLabel('text')).toBe('⌨️ TEXT');
  });
  it('returns correct label for ai', () => {
    expect(modeLabel('ai')).toBe('🤖 AI SPARRING');
  });
});

describe('TC11 — modeLabel: unknown mode uppercases it', () => {
  it('returns uppercased mode string for unknown mode', () => {
    expect(modeLabel('custom')).toBe('CUSTOM');
  });
});

describe('TC12 — modeLabel: null returns DEBATE fallback', () => {
  it('returns DEBATE for null mode', () => {
    expect(modeLabel(null)).toBe('DEBATE');
  });
});

// ── statusBadge ───────────────────────────────────────────────

describe('TC13 — statusBadge snapshot: live', () => {
  it('renders live badge with dot', () => {
    const html = statusBadge('live');
    expect(html).toMatchInlineSnapshot(
      `"<span class="status-badge live"><span class="dot"></span> LIVE</span>"`
    );
  });
});

describe('TC14 — statusBadge snapshot: complete', () => {
  it('renders complete badge', () => {
    const html = statusBadge('complete');
    expect(html).toMatchInlineSnapshot(
      `"<span class="status-badge complete">COMPLETE</span>"`
    );
  });
});

describe('TC15 — statusBadge snapshot: completed (alias)', () => {
  it('renders complete badge for completed status too', () => {
    const html = statusBadge('completed');
    expect(html).toMatchInlineSnapshot(
      `"<span class="status-badge complete">COMPLETE</span>"`
    );
  });
});

describe('TC16 — statusBadge snapshot: voting', () => {
  it('renders voting badge', () => {
    const html = statusBadge('voting');
    expect(html).toMatchInlineSnapshot(
      `"<span class="status-badge voting">VOTING</span>"`
    );
  });
});

describe('TC17 — statusBadge: unknown status uppercases it', () => {
  it('renders uppercase status for unknown value', () => {
    const html = statusBadge('pending');
    expect(html).toContain('PENDING');
  });
});

describe('TC18 — statusBadge: null status shows UNKNOWN', () => {
  it('renders UNKNOWN for null status', () => {
    const html = statusBadge(null);
    expect(html).toContain('UNKNOWN');
  });
});

// ── timeAgo ───────────────────────────────────────────────────

describe('TC19 — timeAgo: null returns empty string', () => {
  it('returns empty string for null', () => {
    expect(timeAgo(null)).toBe('');
  });
});

describe('TC20 — timeAgo: recent timestamp returns now', () => {
  it('returns now for timestamps within 60s', () => {
    const ts = new Date(Date.now() - 10_000).toISOString();
    expect(timeAgo(ts)).toBe('now');
  });
});

describe('TC21 — timeAgo: minutes-ago timestamp', () => {
  it('returns Nm format for 2 minutes ago', () => {
    const ts = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    expect(timeAgo(ts)).toBe('2m');
  });
});

describe('TC22 — timeAgo: hours-ago timestamp', () => {
  it('returns Nh format for 3 hours ago', () => {
    const ts = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(ts)).toBe('3h');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/pages/spectate.utils.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed: string[] = [];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/spectate.utils.ts'),
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
