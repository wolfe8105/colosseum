/**
 * Integration tests — spectate.render-messages.ts → spectate.utils
 * SEAM #351 | score: 6
 *
 * Boundary: renderMessages calls escHtml (from spectate.utils) on side, content,
 *           and debater names before emitting innerHTML-bound HTML strings.
 * No RPC calls in this module.
 * Mock boundary: @supabase/supabase-js only (required to resolve spectate.state chain).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn() },
  })),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
});

// ---------------------------------------------------------------------------
// ARCH filter — verify import wiring
// ---------------------------------------------------------------------------

describe('ARCH #351 — spectate.render-messages imports escHtml from spectate.utils', () => {
  it('has an import of escHtml from ./spectate.utils', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/spectate.render-messages.ts'),
      'utf8'
    );
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const utilsLine = imports.find(l => l.includes('spectate.utils'));
    expect(utilsLine).toBeDefined();
    expect(utilsLine).toContain('escHtml');
  });

  it('has no external (non-spectate.*) imports', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/spectate.render-messages.ts'),
      'utf8'
    );
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    for (const line of imports) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (!match) continue;
      const path = match[1];
      expect(path).toMatch(/^\.\/spectate\./);
    }
  });
});

// ---------------------------------------------------------------------------
// TC-351-01: escHtml called on side — XSS payload in side is escaped in class attr
// ---------------------------------------------------------------------------

describe('TC-351-01 — renderMessages escapes XSS in side via escHtml', () => {
  it('escapes angle brackets in side value when used in class attribute', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;

    const { renderMessages } = await import('../../src/pages/spectate.render-messages.ts');

    const messages = [
      {
        round: 1,
        side: '<script>',
        is_ai: false,
        content: 'Test content',
        created_at: '2026-01-01T10:00:00Z',
      },
    ] as any[];

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderMessages(messages, d);

    // escHtml('<script>') → '&lt;script&gt;'
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ---------------------------------------------------------------------------
// TC-351-02: escHtml called on content — XSS payload in content is escaped
// ---------------------------------------------------------------------------

describe('TC-351-02 — renderMessages escapes XSS in message content via escHtml', () => {
  it('escapes <img onerror> payload in message content', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;

    const { renderMessages } = await import('../../src/pages/spectate.render-messages.ts');

    const messages = [
      {
        round: 1,
        side: 'a',
        is_ai: false,
        content: '<img src=x onerror=alert(1)>',
        created_at: '2026-01-01T10:00:00Z',
      },
    ] as any[];

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderMessages(messages, d);

    // escHtml('<img src=x onerror=alert(1)>') → '&lt;img src=x onerror=alert(1)&gt;'
    // The raw tag is neutralised; no unescaped opening < remains for img
    expect(html).not.toContain('<img ');
    expect(html).toContain('&lt;img');
  });
});

// ---------------------------------------------------------------------------
// TC-351-03: escHtml called on debater name — XSS in debater_a_name is escaped
// ---------------------------------------------------------------------------

describe('TC-351-03 — renderMessages escapes XSS in debater_a_name via escHtml', () => {
  it('escapes <b> tag in debater_a_name rendered inside msg-name div', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;

    const { renderMessages } = await import('../../src/pages/spectate.render-messages.ts');

    const messages = [
      {
        round: 1,
        side: 'a',
        is_ai: false,
        content: 'Argument',
        created_at: '2026-01-01T10:00:00Z',
      },
    ] as any[];

    const d = { debater_a_name: '<b>Evil</b>', debater_b_name: 'Bob' } as any;
    const html = renderMessages(messages, d);

    expect(html).not.toContain('<b>Evil</b>');
    expect(html).toContain('&lt;b&gt;Evil&lt;/b&gt;');
  });
});

// ---------------------------------------------------------------------------
// TC-351-04: escHtml called on debater_b_name — XSS in debater_b_name is escaped
// ---------------------------------------------------------------------------

describe('TC-351-04 — renderMessages escapes XSS in debater_b_name via escHtml', () => {
  it('escapes double-quote in debater_b_name preventing attribute injection', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;

    const { renderMessages } = await import('../../src/pages/spectate.render-messages.ts');

    const messages = [
      {
        round: 1,
        side: 'b',
        is_ai: false,
        content: 'Counter',
        created_at: '2026-01-01T10:00:00Z',
      },
    ] as any[];

    const d = { debater_a_name: 'Alice', debater_b_name: '"BadGuy"' } as any;
    const html = renderMessages(messages, d);

    // escHtml maps " → &quot;
    expect(html).not.toContain('"BadGuy"');
    expect(html).toContain('&quot;BadGuy&quot;');
  });
});

// ---------------------------------------------------------------------------
// TC-351-05: safe content passes through unchanged — no over-escaping
// ---------------------------------------------------------------------------

describe('TC-351-05 — renderMessages does not mangle plain alphanumeric content', () => {
  it('plain text content is rendered verbatim (no escaping needed)', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;

    const { renderMessages } = await import('../../src/pages/spectate.render-messages.ts');

    const messages = [
      {
        round: 1,
        side: 'a',
        is_ai: false,
        content: 'Clean safe argument text',
        created_at: '2026-01-01T10:00:00Z',
      },
    ] as any[];

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderMessages(messages, d);

    expect(html).toContain('Clean safe argument text');
    expect(html).toContain('Alice');
  });
});
