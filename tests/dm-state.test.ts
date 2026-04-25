// ============================================================
// DM STATE — tests/dm-state.test.ts
// Source: src/dm/dm.state.ts
//
// CLASSIFICATION:
//   setThreads()          — Pure state mutation → Unit test
//   setActiveThreadId()   — Pure state mutation → Unit test
//   setActiveMessages()   — Pure state mutation → Unit test
//   setIsLoadingThreads() — Pure state mutation → Unit test
//   setIsLoadingMessages()— Pure state mutation → Unit test
//   setUnreadTotal()      — Pure state mutation → Unit test
//
// IMPORTS:
//   type { DMThread, DMMessage } from './dm.types.ts' — types only, no runtime contract
// ============================================================

import { describe, it, expect } from 'vitest';
import * as dmState from '../src/dm/dm.state.ts';

// ── TC1: setThreads ───────────────────────────────────────────

describe('TC1 — setThreads: updates threads state', () => {
  it('sets threads to the provided array', () => {
    const t = [{ id: 'thread-1' }] as never[];
    dmState.setThreads(t);
    expect(dmState.threads).toBe(t);
  });

  it('accepts an empty array', () => {
    dmState.setThreads([]);
    expect(dmState.threads).toEqual([]);
  });
});

// ── TC2: setActiveThreadId ────────────────────────────────────

describe('TC2 — setActiveThreadId: updates activeThreadId', () => {
  it('sets activeThreadId to a string value', () => {
    dmState.setActiveThreadId('thread-abc');
    expect(dmState.activeThreadId).toBe('thread-abc');
  });

  it('accepts null to clear the active thread', () => {
    dmState.setActiveThreadId(null);
    expect(dmState.activeThreadId).toBeNull();
  });
});

// ── TC3: setActiveMessages ────────────────────────────────────

describe('TC3 — setActiveMessages: updates activeMessages', () => {
  it('sets activeMessages to the provided array', () => {
    const msgs = [{ id: 'msg-1' }] as never[];
    dmState.setActiveMessages(msgs);
    expect(dmState.activeMessages).toBe(msgs);
  });
});

// ── TC4: setIsLoadingThreads ──────────────────────────────────

describe('TC4 — setIsLoadingThreads: updates isLoadingThreads', () => {
  it('sets isLoadingThreads to true', () => {
    dmState.setIsLoadingThreads(true);
    expect(dmState.isLoadingThreads).toBe(true);
  });

  it('sets isLoadingThreads to false', () => {
    dmState.setIsLoadingThreads(false);
    expect(dmState.isLoadingThreads).toBe(false);
  });
});

// ── TC5: setIsLoadingMessages ─────────────────────────────────

describe('TC5 — setIsLoadingMessages: updates isLoadingMessages', () => {
  it('sets isLoadingMessages to true', () => {
    dmState.setIsLoadingMessages(true);
    expect(dmState.isLoadingMessages).toBe(true);
  });

  it('sets isLoadingMessages to false', () => {
    dmState.setIsLoadingMessages(false);
    expect(dmState.isLoadingMessages).toBe(false);
  });
});

// ── TC6: setUnreadTotal ───────────────────────────────────────

describe('TC6 — setUnreadTotal: updates unreadTotal', () => {
  it('sets unreadTotal to a positive number', () => {
    dmState.setUnreadTotal(7);
    expect(dmState.unreadTotal).toBe(7);
  });

  it('sets unreadTotal to zero', () => {
    dmState.setUnreadTotal(0);
    expect(dmState.unreadTotal).toBe(0);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/dm/dm.state.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./dm.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/dm/dm.state.ts'),
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
