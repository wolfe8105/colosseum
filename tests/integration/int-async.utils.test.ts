/**
 * Integration tests — Seam #382
 *
 * src/async.utils.ts → navigation
 *
 * async.utils exports two pure helpers:
 *   - _timeAgo(dateStr): formats a date string as relative time
 *   - _enterArenaWithTopic(topic): calls navigateTo('arena') after 800ms
 *     and optionally calls ModeratorArena.enterQueue('ai', topic)
 *
 * navigation.ts is RPC-free — register/call pattern only.
 * Mock boundary: @supabase/supabase-js only.
 * All source modules run real.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── hoisted mocks ────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: vi.fn(),
    auth: mockAuth,
  })),
}));

// ── ARCH filter ───────────────────────────────────────────────
describe('ARCH: src/async.utils.ts imports', () => {
  it('imports only from navigation (no supabase or arena sub-modules)', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/async.utils.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.length).toBeGreaterThan(0);
    // Only allowed import is ./navigation
    for (const line of importLines) {
      expect(line).toMatch(/from\s+['"]\.\/navigation/);
    }
  });

  it('navigation.ts exports registerNavigate and navigateTo', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/navigation.ts'),
      'utf8'
    );
    expect(src).toContain('export function registerNavigate');
    expect(src).toContain('export function navigateTo');
  });
});

// ── _timeAgo ─────────────────────────────────────────────────
describe('_timeAgo', () => {
  let _timeAgo: (dateStr: string | undefined | null) => string;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const mod = await import('../../src/async.utils.ts');
    _timeAgo = mod._timeAgo;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC1: returns empty string for null input', () => {
    expect(_timeAgo(null)).toBe('');
  });

  it('TC1b: returns empty string for undefined input', () => {
    expect(_timeAgo(undefined)).toBe('');
  });

  it('TC2: returns "now" for a date less than 1 minute ago', () => {
    const recent = new Date(Date.now() - 30_000).toISOString();
    expect(_timeAgo(recent)).toBe('now');
  });

  it('TC3: returns minutes format for dates 1–59 minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(_timeAgo(fiveMinAgo)).toBe('5m');
  });

  it('TC3b: returns "1m" for exactly 1 minute ago', () => {
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
    expect(_timeAgo(oneMinAgo)).toBe('1m');
  });

  it('TC4: returns hours format for dates 1–23 hours ago', () => {
    const threeHrsAgo = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
    expect(_timeAgo(threeHrsAgo)).toBe('3h');
  });

  it('TC5: returns days format for dates 2+ days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString();
    expect(_timeAgo(twoDaysAgo)).toBe('2d');
  });
});

// ── _enterArenaWithTopic → navigation ─────────────────────────
describe('_enterArenaWithTopic → navigation', () => {
  let _enterArenaWithTopic: (topic: string) => void;
  let mockNavigate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Import navigation first and register a mock
    const navMod = await import('../../src/navigation.ts');
    mockNavigate = vi.fn();
    navMod.registerNavigate(mockNavigate);

    const mod = await import('../../src/async.utils.ts');
    _enterArenaWithTopic = mod._enterArenaWithTopic;
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up ModeratorArena global if set
    delete (globalThis as Record<string, unknown>).ModeratorArena;
  });

  it('TC6: calls navigateTo("arena") after 800ms', async () => {
    _enterArenaWithTopic('climate change');
    expect(mockNavigate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(800);
    expect(mockNavigate).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith('arena');
  });

  it('TC6b: does not call navigate before 800ms', async () => {
    _enterArenaWithTopic('climate change');
    await vi.advanceTimersByTimeAsync(799);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('TC7: calls ModeratorArena.enterQueue("ai", topic) when global is defined', async () => {
    const mockEnterQueue = vi.fn();
    (globalThis as Record<string, unknown>).ModeratorArena = { enterQueue: mockEnterQueue };

    _enterArenaWithTopic('AI debate topic');
    await vi.advanceTimersByTimeAsync(800);

    expect(mockNavigate).toHaveBeenCalledWith('arena');
    expect(mockEnterQueue).toHaveBeenCalledOnce();
    expect(mockEnterQueue).toHaveBeenCalledWith('ai', 'AI debate topic');
  });

  it('TC7b: does not throw when ModeratorArena is undefined', async () => {
    // ModeratorArena not set on globalThis
    delete (globalThis as Record<string, unknown>).ModeratorArena;

    // Should not throw — enterQueue branch is safely guarded
    await expect(async () => {
      _enterArenaWithTopic('safe topic');
      await vi.advanceTimersByTimeAsync(800);
    }).not.toThrow();
  });
});
