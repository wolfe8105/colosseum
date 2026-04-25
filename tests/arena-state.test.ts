// ============================================================
// ARENA STATE — tests/arena-state.test.ts
// Source: src/arena/arena-state.ts
//
// CLASSIFICATION:
//   All exports — Pure state setters → Pure calculation tests
//
// IMPORTS:
//   type imports only + { DEBATE } from '../config.ts'
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';

vi.mock('../src/config.ts', () => ({
  DEBATE: { defaultRounds: 4 },
}));

import * as arenaState from '../src/arena/arena-state.ts';

beforeEach(() => {
  // Reset representative state values
  arenaState.set_view('lobby');
  arenaState.set_selectedMode(null);
  arenaState.set_currentDebate(null);
  arenaState.set_selectedRanked(false);
  arenaState.set_selectedRuleset('amplified');
  arenaState.set_selectedRounds(4);
  arenaState.set_selectedCategory(null);
  arenaState.set_queueSeconds(0);
  arenaState.set_queueErrorState(false);
  arenaState.set_aiFallbackShown(false);
  arenaState.set_matchAcceptTimer(null);
  arenaState.set_matchAcceptPollTimer(null);
  arenaState.set_shieldActive(false);
  arenaState.set_vmRecording(false);
  arenaState.set_vmSeconds(0);
});

// ── TC1: set_view — updates view ─────────────────────────────

describe('TC1 — set_view: updates the view export', () => {
  it('sets view to "room"', () => {
    arenaState.set_view('room');
    expect(arenaState.view).toBe('room');
  });
  it('sets view to "queue"', () => {
    arenaState.set_view('queue');
    expect(arenaState.view).toBe('queue');
  });
});

// ── TC2: set_selectedMode — updates selectedMode ─────────────

describe('TC2 — set_selectedMode: updates selectedMode', () => {
  it('sets selectedMode to "text"', () => {
    arenaState.set_selectedMode('text');
    expect(arenaState.selectedMode).toBe('text');
  });
  it('sets selectedMode to null', () => {
    arenaState.set_selectedMode(null);
    expect(arenaState.selectedMode).toBeNull();
  });
});

// ── TC3: set_currentDebate — updates currentDebate ───────────

describe('TC3 — set_currentDebate: updates currentDebate', () => {
  it('sets currentDebate to a debate object', () => {
    const debate = { id: 'd-1', topic: 'Test' } as never;
    arenaState.set_currentDebate(debate);
    expect(arenaState.currentDebate?.id).toBe('d-1');
  });
  it('clears currentDebate to null', () => {
    arenaState.set_currentDebate(null);
    expect(arenaState.currentDebate).toBeNull();
  });
});

// ── TC4: set_selectedRanked/Ruleset/Rounds ───────────────────

describe('TC4 — set_selectedRanked/Ruleset/Rounds: update selection state', () => {
  it('sets selectedRanked to true', () => {
    arenaState.set_selectedRanked(true);
    expect(arenaState.selectedRanked).toBe(true);
  });
  it('sets selectedRuleset to "unplugged"', () => {
    arenaState.set_selectedRuleset('unplugged');
    expect(arenaState.selectedRuleset).toBe('unplugged');
  });
  it('sets selectedRounds to 6', () => {
    arenaState.set_selectedRounds(6);
    expect(arenaState.selectedRounds).toBe(6);
  });
});

// ── TC5: set_selectedCategory — updates category ─────────────

describe('TC5 — set_selectedCategory: updates selectedCategory', () => {
  it('sets selectedCategory to "tech"', () => {
    arenaState.set_selectedCategory('tech');
    expect(arenaState.selectedCategory).toBe('tech');
  });
});

// ── TC6: set_queueSeconds/ErrorState/AiFallbackShown ─────────

describe('TC6 — set_queueSeconds, set_queueErrorState, set_aiFallbackShown', () => {
  it('sets queueSeconds to 30', () => {
    arenaState.set_queueSeconds(30);
    expect(arenaState.queueSeconds).toBe(30);
  });
  it('sets queueErrorState to true', () => {
    arenaState.set_queueErrorState(true);
    expect(arenaState.queueErrorState).toBe(true);
  });
  it('sets aiFallbackShown to true', () => {
    arenaState.set_aiFallbackShown(true);
    expect(arenaState.aiFallbackShown).toBe(true);
  });
});

// ── TC7: set_shieldActive / set_vmRecording / set_vmSeconds ──

describe('TC7 — set_shieldActive, set_vmRecording, set_vmSeconds', () => {
  it('sets shieldActive to true', () => {
    arenaState.set_shieldActive(true);
    expect(arenaState.shieldActive).toBe(true);
  });
  it('sets vmRecording to true', () => {
    arenaState.set_vmRecording(true);
    expect(arenaState.vmRecording).toBe(true);
  });
  it('sets vmSeconds to 45', () => {
    arenaState.set_vmSeconds(45);
    expect(arenaState.vmSeconds).toBe(45);
  });
});

// ── TC8: matchAcceptTimer setters ────────────────────────────

describe('TC8 — set_matchAcceptTimer / set_matchAcceptPollTimer', () => {
  it('sets matchAcceptTimer to an interval id', () => {
    const id = setInterval(() => {}, 1000);
    arenaState.set_matchAcceptTimer(id);
    expect(arenaState.matchAcceptTimer).toBe(id);
    clearInterval(id);
    arenaState.set_matchAcceptTimer(null);
  });
});

// ── TC9: activatedPowerUps is a mutable Set ───────────────────

describe('TC9 — activatedPowerUps: mutable Set can be added to and cleared', () => {
  it('allows adding and clearing items', () => {
    arenaState.activatedPowerUps.add('shield');
    expect(arenaState.activatedPowerUps.has('shield')).toBe(true);
    arenaState.activatedPowerUps.clear();
    expect(arenaState.activatedPowerUps.size).toBe(0);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-state.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './arena-types.ts',
      './arena-types-feed-room.ts',
      '../powerups.ts',
      '../webrtc.types.ts',
      '../config.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-state.ts'),
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
