// ============================================================
// GATEKEEPER — F-55 Reference System Overhaul
// Tests: src/reference-arsenal.ts (orchestrator + window bridge)
// Spec: docs/product/F-55-BUILD-COMPLETE.md — Phase E client rewrite
// "Re-exports all public API and sets up the window bridge."
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mock functions ────────────────────────────────────

const mockForgeReference = vi.hoisted(() => vi.fn());
const mockEditReference = vi.hoisted(() => vi.fn());
const mockDeleteReference = vi.hoisted(() => vi.fn());
const mockSecondReference = vi.hoisted(() => vi.fn());
const mockCiteReference = vi.hoisted(() => vi.fn());
const mockChallengeReference = vi.hoisted(() => vi.fn());
const mockGetTrendingReferences = vi.hoisted(() => vi.fn());
const mockGetLibrary = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.rpc.ts', () => ({
  forgeReference: mockForgeReference,
  editReference: mockEditReference,
  deleteReference: mockDeleteReference,
  secondReference: mockSecondReference,
  citeReference: mockCiteReference,
  challengeReference: mockChallengeReference,
  getTrendingReferences: mockGetTrendingReferences,
  getLibrary: mockGetLibrary,
}));

const mockSaveDebateLoadout = vi.hoisted(() => vi.fn());
const mockGetMyDebateLoadout = vi.hoisted(() => vi.fn());
const mockCiteDebateReference = vi.hoisted(() => vi.fn());
const mockFileReferenceChallenge = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.debate.ts', () => ({
  saveDebateLoadout: mockSaveDebateLoadout,
  getMyDebateLoadout: mockGetMyDebateLoadout,
  citeDebateReference: mockCiteDebateReference,
  fileReferenceChallenge: mockFileReferenceChallenge,
}));

const mockShowForgeForm = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.forge.ts', () => ({
  showForgeForm: mockShowForgeForm,
}));

const mockRenderArsenal = vi.hoisted(() => vi.fn());
const mockRenderReferenceCard = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.render.ts', () => ({
  renderArsenal: mockRenderArsenal,
  renderReferenceCard: mockRenderReferenceCard,
}));

const mockRenderArmory = vi.hoisted(() => vi.fn());
const mockRenderLibrary = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.armory.ts', () => ({
  renderArmory: mockRenderArmory,
  renderLibrary: mockRenderLibrary,
}));

const mockCompositeScore = vi.hoisted(() => vi.fn());
const mockPowerDisplay = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.utils.ts', () => ({
  compositeScore: mockCompositeScore,
  powerDisplay: mockPowerDisplay,
}));

const mockRenderLoadoutPicker = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.loadout.ts', () => ({
  renderLoadoutPicker: mockRenderLoadoutPicker,
}));

const mockSourceTypes = vi.hoisted(() => ({ primary: { label: 'Primary Source', ceiling: 5, tier: 'S' } }));
const mockCategories = vi.hoisted(() => ['politics', 'sports']);

vi.mock('../src/reference-arsenal.constants.ts', () => ({
  SOURCE_TYPES: mockSourceTypes,
  CATEGORIES: mockCategories,
  CATEGORY_LABELS: { politics: 'Politics', sports: 'Sports' },
  RARITY_COLORS: {},
  CHALLENGE_STATUS_LABELS: {},
}));

// ── Import file under test (after all mocks) ──────────────────

import '../src/reference-arsenal.ts';

// ── Setup ─────────────────────────────────────────────────────

beforeEach(() => {
  mockForgeReference.mockReset();
  mockEditReference.mockReset();
  mockDeleteReference.mockReset();
  mockSecondReference.mockReset();
  mockCiteReference.mockReset();
  mockChallengeReference.mockReset();
  mockGetTrendingReferences.mockReset();
  mockGetLibrary.mockReset();
  mockSaveDebateLoadout.mockReset();
  mockGetMyDebateLoadout.mockReset();
  mockCiteDebateReference.mockReset();
  mockFileReferenceChallenge.mockReset();
  mockShowForgeForm.mockReset();
  mockRenderArsenal.mockReset();
  mockRenderReferenceCard.mockReset();
  mockRenderLibrary.mockReset();
  mockCompositeScore.mockReset();
  mockPowerDisplay.mockReset();
  mockRenderLoadoutPicker.mockReset();
});

// ── Helper ────────────────────────────────────────────────────

const bridge = () =>
  (window as unknown as Record<string, unknown>).ModeratorArsenal as Record<string, unknown>;

// ── TC1: window.ModeratorArsenal exists ──────────────────────

describe('TC1 — window.ModeratorArsenal is registered on module load', () => {
  it('sets ModeratorArsenal on the window object', () => {
    expect(bridge()).toBeDefined();
    expect(typeof bridge()).toBe('object');
  });
});

// ── TC2: forgeReference ──────────────────────────────────────

describe('TC2 — forgeReference is exposed on the window bridge', () => {
  it('ModeratorArsenal.forgeReference is the forgeReference imported from rpc module', () => {
    expect(bridge().forgeReference).toBe(mockForgeReference);
  });
});

// ── TC3: editReference ───────────────────────────────────────

describe('TC3 — editReference is exposed on the window bridge', () => {
  it('ModeratorArsenal.editReference is the editReference imported from rpc module', () => {
    expect(bridge().editReference).toBe(mockEditReference);
  });
});

// ── TC4: deleteReference ─────────────────────────────────────

describe('TC4 — deleteReference is exposed on the window bridge', () => {
  it('ModeratorArsenal.deleteReference is the deleteReference imported from rpc module', () => {
    expect(bridge().deleteReference).toBe(mockDeleteReference);
  });
});

// ── TC5: secondReference ─────────────────────────────────────

describe('TC5 — secondReference is exposed on the window bridge', () => {
  it('ModeratorArsenal.secondReference is the secondReference imported from rpc module', () => {
    expect(bridge().secondReference).toBe(mockSecondReference);
  });
});

// ── TC6: citeReference ───────────────────────────────────────

describe('TC6 — citeReference is exposed on the window bridge', () => {
  it('ModeratorArsenal.citeReference is the citeReference imported from rpc module', () => {
    expect(bridge().citeReference).toBe(mockCiteReference);
  });
});

// ── TC7: challengeReference ──────────────────────────────────

describe('TC7 — challengeReference is exposed on the window bridge', () => {
  it('ModeratorArsenal.challengeReference is the challengeReference imported from rpc module', () => {
    expect(bridge().challengeReference).toBe(mockChallengeReference);
  });
});

// ── TC8: showForgeForm ───────────────────────────────────────

describe('TC8 — showForgeForm is exposed on the window bridge', () => {
  it('ModeratorArsenal.showForgeForm is the showForgeForm imported from forge module', () => {
    expect(bridge().showForgeForm).toBe(mockShowForgeForm);
  });
});

// ── TC9: renderArsenal ───────────────────────────────────────

describe('TC9 — renderArsenal is exposed on the window bridge', () => {
  it('ModeratorArsenal.renderArsenal is the renderArsenal imported from render module', () => {
    expect(bridge().renderArsenal).toBe(mockRenderArsenal);
  });
});

// ── TC10: renderLibrary ──────────────────────────────────────

describe('TC10 — renderLibrary is exposed on the window bridge', () => {
  it('ModeratorArsenal.renderLibrary is the renderLibrary imported from armory module', () => {
    expect(bridge().renderLibrary).toBe(mockRenderLibrary);
  });
});

// ── TC11: renderReferenceCard ────────────────────────────────

describe('TC11 — renderReferenceCard is exposed on the window bridge', () => {
  it('ModeratorArsenal.renderReferenceCard is the renderReferenceCard imported from render module', () => {
    expect(bridge().renderReferenceCard).toBe(mockRenderReferenceCard);
  });
});

// ── TC12: compositeScore ─────────────────────────────────────

describe('TC12 — compositeScore is exposed on the window bridge', () => {
  it('ModeratorArsenal.compositeScore is the compositeScore imported from utils module', () => {
    expect(bridge().compositeScore).toBe(mockCompositeScore);
  });
});

// ── TC13: powerDisplay ───────────────────────────────────────

describe('TC13 — powerDisplay is exposed on the window bridge', () => {
  it('ModeratorArsenal.powerDisplay is the powerDisplay imported from utils module', () => {
    expect(bridge().powerDisplay).toBe(mockPowerDisplay);
  });
});

// ── TC14: saveDebateLoadout ──────────────────────────────────

describe('TC14 — saveDebateLoadout is exposed on the window bridge', () => {
  it('ModeratorArsenal.saveDebateLoadout is the saveDebateLoadout imported from debate module', () => {
    expect(bridge().saveDebateLoadout).toBe(mockSaveDebateLoadout);
  });
});

// ── TC15: getMyDebateLoadout ─────────────────────────────────

describe('TC15 — getMyDebateLoadout is exposed on the window bridge', () => {
  it('ModeratorArsenal.getMyDebateLoadout is the getMyDebateLoadout imported from debate module', () => {
    expect(bridge().getMyDebateLoadout).toBe(mockGetMyDebateLoadout);
  });
});

// ── TC16: citeDebateReference ────────────────────────────────

describe('TC16 — citeDebateReference is exposed on the window bridge', () => {
  it('ModeratorArsenal.citeDebateReference is the citeDebateReference imported from debate module', () => {
    expect(bridge().citeDebateReference).toBe(mockCiteDebateReference);
  });
});

// ── TC17: fileReferenceChallenge ─────────────────────────────

describe('TC17 — fileReferenceChallenge is exposed on the window bridge', () => {
  it('ModeratorArsenal.fileReferenceChallenge is the fileReferenceChallenge imported from debate module', () => {
    expect(bridge().fileReferenceChallenge).toBe(mockFileReferenceChallenge);
  });
});

// ── TC18: renderLoadoutPicker ────────────────────────────────

describe('TC18 — renderLoadoutPicker is exposed on the window bridge', () => {
  it('ModeratorArsenal.renderLoadoutPicker is the renderLoadoutPicker imported from loadout module', () => {
    expect(bridge().renderLoadoutPicker).toBe(mockRenderLoadoutPicker);
  });
});

// ── TC19: SOURCE_TYPES ───────────────────────────────────────

describe('TC19 — SOURCE_TYPES constant is exposed on the window bridge', () => {
  it('ModeratorArsenal.SOURCE_TYPES is the SOURCE_TYPES object from constants module', () => {
    expect(bridge().SOURCE_TYPES).toBe(mockSourceTypes);
  });
});

// ── TC20: CATEGORIES ─────────────────────────────────────────

describe('TC20 — CATEGORIES constant is exposed on the window bridge', () => {
  it('ModeratorArsenal.CATEGORIES is the CATEGORIES array from constants module', () => {
    expect(bridge().CATEGORIES).toBe(mockCategories);
  });
});

// ── TC21: bridge key set is exactly the 19 declared keys ─────

describe('TC21 — bridge has exactly the 19 spec-declared keys (no undeclared additions)', () => {
  it('Object.keys(ModeratorArsenal) matches the declared set', () => {
    const expected = new Set([
      'forgeReference',
      'editReference',
      'deleteReference',
      'secondReference',
      'citeReference',
      'challengeReference',
      'showForgeForm',
      'renderArsenal',
      'renderLibrary',
      'renderReferenceCard',
      'compositeScore',
      'powerDisplay',
      'saveDebateLoadout',
      'getMyDebateLoadout',
      'citeDebateReference',
      'fileReferenceChallenge',
      'renderLoadoutPicker',
      'SOURCE_TYPES',
      'CATEGORIES',
    ]);
    const actual = new Set(Object.keys(bridge()));
    expect(actual).toEqual(expected);
  });
});

// ── ARCH: imports only from allowed sub-modules ───────────────

describe('ARCH — src/reference-arsenal.ts only imports from allowed sub-modules', () => {
  it('has no import statements outside the declared sub-module list', () => {
    const allowed = [
      './reference-arsenal.rpc.ts',
      './reference-arsenal.debate.ts',
      './reference-arsenal.forge.ts',
      './reference-arsenal.render.ts',
      './reference-arsenal.armory.ts',
      './reference-arsenal.utils.ts',
      './reference-arsenal.loadout.ts',
      './reference-arsenal.constants.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/reference-arsenal.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
