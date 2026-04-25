import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockEscapeHTML = vi.hoisted(() => vi.fn());
const mockSanitizeUrl = vi.hoisted(() => vi.fn());
const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  sanitizeUrl: mockSanitizeUrl,
  showToast: mockShowToast,
}));

const mockPowerDisplay = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.utils.ts', () => ({
  powerDisplay: mockPowerDisplay,
}));

vi.mock('../src/reference-arsenal.constants.ts', () => ({
  SOURCE_TYPES: {
    primary: { label: 'Primary', tier: 'A', ceiling: 100 },
  },
  RARITY_COLORS: {
    common: '#aaa',
    uncommon: '#0f0',
    rare: '#00f',
    legendary: '#f90',
    mythic: '#f00',
  },
  CHALLENGE_STATUS_LABELS: {
    pending: 'Under Review',
    upheld: 'Upheld',
    dismissed: 'Dismissed',
  },
}));

const mockSecondReference = vi.hoisted(() => vi.fn());
const mockChallengeReference = vi.hoisted(() => vi.fn());

vi.mock('../src/reference-arsenal.rpc.ts', () => ({
  secondReference: mockSecondReference,
  challengeReference: mockChallengeReference,
}));

import { openSheet, closeSheet } from '../src/reference-arsenal.armory.sheet.ts';

// ── Fixtures ───────────────────────────────────────────────────

function buildRef(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ref-1',
    user_id: 'owner-user',
    claim_text: 'Climate is warming',
    source_title: 'IPCC',
    source_author: 'Scientists',
    source_date: '2023',
    locator: 'p.1',
    source_type: 'primary',
    rarity: 'common',
    graduated: false,
    challenge_status: null,
    source_url: null,
    owner_username: 'PatW',
    seconds: 3,
    strikes: 0,
    current_power: 10,
    ...overrides,
  } as never;
}

function mountSheet() {
  document.body.innerHTML = `
    <div class="armory-sheet-backdrop" id="armory-sheet-backdrop"></div>
    <div class="armory-sheet" id="armory-sheet">
      <div class="armory-sheet-body" id="armory-sheet-body"></div>
      <div class="armory-sheet-actions" id="armory-sheet-actions"></div>
    </div>`;
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockSanitizeUrl.mockImplementation((s: string) => s);
  mockShowToast.mockReset();
  mockPowerDisplay.mockReturnValue('⚡10');
  mockSecondReference.mockReset();
  mockChallengeReference.mockReset();
  document.body.innerHTML = '';
});

// ── closeSheet ─────────────────────────────────────────────────

describe('TC1 — closeSheet removes open class from backdrop', () => {
  it('armory-sheet-backdrop loses open class', () => {
    document.body.innerHTML = `
      <div id="armory-sheet-backdrop" class="open"></div>
      <div id="armory-sheet" class="open"></div>`;

    closeSheet();

    expect(document.getElementById('armory-sheet-backdrop')!.classList.contains('open')).toBe(false);
  });
});

describe('TC2 — closeSheet removes open class from sheet', () => {
  it('armory-sheet loses open class', () => {
    document.body.innerHTML = `
      <div id="armory-sheet-backdrop" class="open"></div>
      <div id="armory-sheet" class="open"></div>`;

    closeSheet();

    expect(document.getElementById('armory-sheet')!.classList.contains('open')).toBe(false);
  });
});

describe('TC3 — closeSheet is a no-op when sheet not in DOM', () => {
  it('does not throw when sheet elements are absent', () => {
    expect(() => closeSheet()).not.toThrow();
  });
});

// ── openSheet — rendering ──────────────────────────────────────

describe('TC4 — openSheet populates armory-sheet-body', () => {
  it('body gets populated with claim text', () => {
    mountSheet();
    openSheet(buildRef({ claim_text: 'Test claim' }), 'other-user', vi.fn());
    expect(document.getElementById('armory-sheet-body')!.innerHTML).toContain('Test claim');
  });
});

describe('TC5 — openSheet shows rarity', () => {
  it('body contains rarity label', () => {
    mountSheet();
    openSheet(buildRef({ rarity: 'rare' }), 'other-user', vi.fn());
    expect(document.getElementById('armory-sheet-body')!.innerHTML).toContain('RARE');
  });
});

describe('TC6 — openSheet calls escapeHTML', () => {
  it('escapeHTML is called during body render', () => {
    mountSheet();
    openSheet(buildRef(), 'other-user', vi.fn());
    expect(mockEscapeHTML).toHaveBeenCalled();
  });
});

describe('TC7 — openSheet calls powerDisplay', () => {
  it('powerDisplay is called during body render', () => {
    mountSheet();
    openSheet(buildRef(), 'other-user', vi.fn());
    expect(mockPowerDisplay).toHaveBeenCalled();
  });
});

describe('TC8 — openSheet shows source URL link when present', () => {
  it('body contains View Source link when source_url is set', () => {
    mountSheet();
    openSheet(buildRef({ source_url: 'https://example.com' }), 'other-user', vi.fn());
    expect(document.getElementById('armory-sheet-body')!.innerHTML).toContain('View Source');
    expect(mockSanitizeUrl).toHaveBeenCalled();
  });
});

describe('TC9 — openSheet adds open class to backdrop and sheet', () => {
  it('both backdrop and sheet have open class after openSheet', () => {
    mountSheet();
    openSheet(buildRef(), 'other-user', vi.fn());
    expect(document.getElementById('armory-sheet-backdrop')!.classList.contains('open')).toBe(true);
    expect(document.getElementById('armory-sheet')!.classList.contains('open')).toBe(true);
  });
});

// ── openSheet — actions ────────────────────────────────────────

describe('TC10 — openSheet shows Second button for non-owner', () => {
  it('sheet-second-btn present when myId differs from ref.user_id', () => {
    mountSheet();
    openSheet(buildRef({ user_id: 'owner' }), 'other-user', vi.fn());
    expect(document.querySelector('.sheet-second-btn')).not.toBeNull();
  });
});

describe('TC11 — openSheet hides Second button for owner', () => {
  it('sheet-second-btn absent when myId matches ref.user_id', () => {
    mountSheet();
    openSheet(buildRef({ user_id: 'me' }), 'me', vi.fn());
    expect(document.querySelector('.sheet-second-btn')).toBeNull();
  });
});

describe('TC12 — openSheet shows Challenge button for non-owner non-frozen', () => {
  it('sheet-challenge-btn present when not owner and not frozen', () => {
    mountSheet();
    openSheet(buildRef({ user_id: 'owner', challenge_status: null }), 'other-user', vi.fn());
    expect(document.querySelector('.sheet-challenge-btn')).not.toBeNull();
  });
});

describe('TC13 — openSheet hides Challenge button for frozen refs', () => {
  it('sheet-challenge-btn absent when challenge_status is frozen', () => {
    mountSheet();
    openSheet(buildRef({ user_id: 'owner', challenge_status: 'frozen' }), 'other-user', vi.fn());
    expect(document.querySelector('.sheet-challenge-btn')).toBeNull();
  });
});

describe('TC14 — openSheet close button calls closeSheet', () => {
  it('clicking sheet-close-btn removes open class', () => {
    mountSheet();
    openSheet(buildRef(), 'other-user', vi.fn());

    (document.querySelector('.sheet-close-btn') as HTMLButtonElement).click();

    expect(document.getElementById('armory-sheet')!.classList.contains('open')).toBe(false);
  });
});

// ── Second button behavior ─────────────────────────────────────

describe('TC15 — Second button click calls secondReference', () => {
  it('secondReference called with ref.id on click', async () => {
    mockSecondReference.mockResolvedValue(undefined);
    mountSheet();
    openSheet(buildRef({ id: 'ref-abc', user_id: 'owner' }), 'other-user', vi.fn());

    (document.querySelector('.sheet-second-btn') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(mockSecondReference).toHaveBeenCalledWith('ref-abc'));
  });
});

describe('TC16 — Second button success shows toast', () => {
  it('showToast called with success after secondReference resolves', async () => {
    mockSecondReference.mockResolvedValue(undefined);
    mountSheet();
    openSheet(buildRef({ user_id: 'owner' }), 'other-user', vi.fn());

    (document.querySelector('.sheet-second-btn') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Seconded! 👍', 'success'));
  });
});

describe('TC17 — Second button failure shows error toast', () => {
  it('showToast called with error when secondReference throws', async () => {
    mockSecondReference.mockRejectedValue(new Error('Already seconded'));
    mountSheet();
    openSheet(buildRef({ user_id: 'owner' }), 'other-user', vi.fn());

    (document.querySelector('.sheet-second-btn') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Already seconded', 'error'));
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — reference-arsenal.armory.sheet.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './config.ts',
      './reference-arsenal.utils.ts',
      './reference-arsenal.constants.ts',
      './reference-arsenal.rpc.ts',
      './reference-arsenal.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/reference-arsenal.armory.sheet.ts'),
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
