// ============================================================
// INTEGRATOR — reference-arsenal.armory.sheet
// Seam #302 | score: 7
// Boundary: openSheet / closeSheet call secondReference and
//           challengeReference (reference-arsenal.rpc.ts) which
//           call safeRpc → supabase.rpc.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Flush all pending microtasks
async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// ARCH FILTER — verify only @supabase/supabase-js is mocked
// ============================================================

describe('ARCH — reference-arsenal.armory.sheet import boundary', () => {
  it('only imports from local ./ modules (no external third-party deps)', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.armory.sheet.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const externalImports = importLines.filter(
      l => !l.includes('./') && !l.includes("from '.")
    );
    expect(externalImports).toHaveLength(0);
  });
});

// ============================================================
// MODULE HANDLES
// ============================================================

let openSheet: (ref: Record<string, unknown>, myId: string | null, onReload: () => void) => void;
let closeSheet: () => void;

// Helper: minimal ArsenalReference
function makeRef(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'ref-uuid-001',
    user_id: 'user-uuid-owner',
    owner_username: 'refowner',
    claim_text: 'The earth is round',
    source_title: 'Science Weekly',
    source_author: 'Jane Doe',
    source_date: '2024-01-01',
    locator: 'p.10',
    source_type: 'book',
    source_url: 'https://example.com/article',
    category: 'science',
    rarity: 'common',
    graduated: false,
    challenge_status: 'none',
    strikes: 0,
    seconds: 3,
    cites: 0,
    power_score: 1.5,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// Helper: set up DOM elements needed by openSheet/closeSheet
function setupDOM(): void {
  document.body.innerHTML = `
    <div id="armory-sheet-backdrop"></div>
    <div id="armory-sheet">
      <div id="armory-sheet-body"></div>
      <div id="armory-sheet-actions"></div>
    </div>
  `;
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      cb('INITIAL_SESSION', null);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  // Default: RPCs succeed
  mockRpc.mockResolvedValue({ data: { action: 'seconded' }, error: null });

  const mod = await import('../../src/reference-arsenal.armory.sheet.ts');
  openSheet = mod.openSheet as unknown as (ref: Record<string, unknown>, myId: string | null, onReload: () => void) => void;
  closeSheet = mod.closeSheet;

  setupDOM();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

// ============================================================
// TC1 — openSheet populates body with reference data
// ============================================================

describe('TC1 — openSheet renders reference data into sheet body', () => {
  it('populates #armory-sheet-body with claim_text and source_title', () => {
    const ref = makeRef();

    openSheet(ref as never, 'viewer-uuid', vi.fn());

    const body = document.getElementById('armory-sheet-body')!;
    expect(body.innerHTML).toContain('The earth is round');
    expect(body.innerHTML).toContain('Science Weekly');
  });
});

// ============================================================
// TC2 — openSheet adds "open" class to sheet and backdrop
// ============================================================

describe('TC2 — openSheet opens the sheet overlay', () => {
  it('adds class "open" to #armory-sheet and #armory-sheet-backdrop', () => {
    const ref = makeRef();

    openSheet(ref as never, 'viewer-uuid', vi.fn());

    expect(document.getElementById('armory-sheet')!.classList.contains('open')).toBe(true);
    expect(document.getElementById('armory-sheet-backdrop')!.classList.contains('open')).toBe(true);
  });
});

// ============================================================
// TC3 — closeSheet removes "open" class
// ============================================================

describe('TC3 — closeSheet closes the sheet overlay', () => {
  it('removes class "open" from #armory-sheet and #armory-sheet-backdrop', () => {
    const ref = makeRef();

    // Open first
    openSheet(ref as never, 'viewer-uuid', vi.fn());
    expect(document.getElementById('armory-sheet')!.classList.contains('open')).toBe(true);

    // Now close
    closeSheet();
    expect(document.getElementById('armory-sheet')!.classList.contains('open')).toBe(false);
    expect(document.getElementById('armory-sheet-backdrop')!.classList.contains('open')).toBe(false);
  });
});

// ============================================================
// TC4 — Second button calls second_reference RPC
// ============================================================

describe('TC4 — Second button calls second_reference RPC with correct p_ref_id', () => {
  it('fires supabase.rpc("second_reference", { p_ref_id }) on click', async () => {
    mockRpc.mockResolvedValue({ data: { action: 'seconded' }, error: null });

    const ref = makeRef({ id: 'ref-target-001', user_id: 'other-user' });
    const onReload = vi.fn();

    openSheet(ref as never, 'viewer-uuid', onReload);

    const secondBtn = document.querySelector('.sheet-second-btn') as HTMLButtonElement;
    expect(secondBtn).not.toBeNull();

    secondBtn.click();
    await flush();

    const calls = mockRpc.mock.calls.filter(c => c[0] === 'second_reference');
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatchObject({ p_ref_id: 'ref-target-001' });
  });
});

// ============================================================
// TC5 — Second button success closes sheet and calls onReload
// ============================================================

describe('TC5 — Second button success path closes sheet and triggers onReload', () => {
  it('calls closeSheet and onReload after successful second_reference', async () => {
    mockRpc.mockResolvedValue({ data: { action: 'seconded' }, error: null });

    const ref = makeRef({ user_id: 'other-user' });
    const onReload = vi.fn();

    openSheet(ref as never, 'viewer-uuid', onReload);

    const secondBtn = document.querySelector('.sheet-second-btn') as HTMLButtonElement;
    secondBtn.click();
    await flush();

    // Sheet should be closed
    expect(document.getElementById('armory-sheet')!.classList.contains('open')).toBe(false);
    // onReload should have been called
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// TC6 — Challenge submit calls challenge_reference RPC
// ============================================================

describe('TC6 — Challenge submit calls challenge_reference RPC with correct params', () => {
  it('fires supabase.rpc("challenge_reference", { p_ref_id, p_grounds, p_context_debate_id: null })', async () => {
    mockRpc.mockResolvedValue({ data: { action: 'filed' }, error: null });

    const ref = makeRef({ id: 'ref-challenge-001', user_id: 'other-user', challenge_status: 'none' });
    const onReload = vi.fn();

    openSheet(ref as never, 'viewer-uuid', onReload);

    // Click Challenge button to reveal the form
    const challengeBtn = document.querySelector('.sheet-challenge-btn') as HTMLButtonElement;
    expect(challengeBtn).not.toBeNull();
    challengeBtn.click();

    // Fill in the grounds textarea
    const textarea = document.getElementById('armory-challenge-grounds') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    textarea.value = 'This source is retracted and invalid.';

    // Click Submit Challenge
    const submitBtn = document.querySelector('.sheet-challenge-submit') as HTMLButtonElement;
    expect(submitBtn).not.toBeNull();
    submitBtn.click();
    await flush();

    const calls = mockRpc.mock.calls.filter(c => c[0] === 'challenge_reference');
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatchObject({
      p_ref_id: 'ref-challenge-001',
      p_grounds: 'This source is retracted and invalid.',
      p_context_debate_id: null,
    });
  });
});

// ============================================================
// TC7 — shield_blocked response shows error, does not close sheet
// ============================================================

describe('TC7 — challenge_reference shield_blocked keeps sheet open', () => {
  it('does not close the sheet when challenge_reference returns shield_blocked', async () => {
    mockRpc.mockResolvedValue({ data: { action: 'shield_blocked' }, error: null });

    const ref = makeRef({ id: 'ref-shielded', user_id: 'other-user', challenge_status: 'none' });

    openSheet(ref as never, 'viewer-uuid', vi.fn());

    const challengeBtn = document.querySelector('.sheet-challenge-btn') as HTMLButtonElement;
    challengeBtn.click();

    const textarea = document.getElementById('armory-challenge-grounds') as HTMLTextAreaElement;
    textarea.value = 'Attempting a challenge on a shielded reference here.';

    const submitBtn = document.querySelector('.sheet-challenge-submit') as HTMLButtonElement;
    submitBtn.click();
    await flush();

    // Sheet must remain open (shield blocked — no closeSheet called)
    expect(document.getElementById('armory-sheet')!.classList.contains('open')).toBe(true);
  });
});

// ============================================================
// SEAM #362 — armory.sheet → reference-arsenal.utils (powerDisplay)
// ============================================================

// ============================================================
// TC8 — powerDisplay non-graduated book reference renders correct string
// ============================================================

describe('TC8 — powerDisplay non-graduated (book, ceiling=3) renders "N/3" in sheet body', () => {
  it('renders powerDisplay output as "current_power/3" for book source_type', () => {
    const ref = makeRef({
      source_type: 'book',
      current_power: 2,
      graduated: false,
    });

    openSheet(ref as never, 'viewer-uuid', vi.fn());

    const body = document.getElementById('armory-sheet-body')!;
    // powerDisplay returns `${current_power}/${ceiling}` = "2/3"
    expect(body.innerHTML).toContain('2/3');
  });
});

// ============================================================
// TC9 — powerDisplay graduated book reference adds 1 to ceiling
// ============================================================

describe('TC9 — powerDisplay graduated book reference renders "N/4" (ceiling+1)', () => {
  it('renders powerDisplay output as "current_power/4" for graduated book reference', () => {
    const ref = makeRef({
      source_type: 'book',
      current_power: 3,
      graduated: true,
    });

    openSheet(ref as never, 'viewer-uuid', vi.fn());

    const body = document.getElementById('armory-sheet-body')!;
    // powerDisplay: ceiling=3, graduated=true → ceiling+1=4 → "3/4"
    expect(body.innerHTML).toContain('3/4');
  });
});

// ============================================================
// TC10 — powerDisplay primary source uses ceiling=5
// ============================================================

describe('TC10 — powerDisplay primary source (ceiling=5) renders correct string', () => {
  it('renders powerDisplay output as "current_power/5" for primary source_type', () => {
    const ref = makeRef({
      source_type: 'primary',
      current_power: 4,
      graduated: false,
    });

    openSheet(ref as never, 'viewer-uuid', vi.fn());

    const body = document.getElementById('armory-sheet-body')!;
    // SOURCE_TYPES['primary'].ceiling = 5 → "4/5"
    expect(body.innerHTML).toContain('4/5');
  });
});

// ============================================================
// TC11 — own reference: no Second or Challenge buttons rendered
// ============================================================

describe('TC11 — own reference hides Second and Challenge buttons', () => {
  it('does not render .sheet-second-btn or .sheet-challenge-btn when user_id === myId', () => {
    const ref = makeRef({ user_id: 'current-user-uuid' });

    openSheet(ref as never, 'current-user-uuid', vi.fn());

    expect(document.querySelector('.sheet-second-btn')).toBeNull();
    expect(document.querySelector('.sheet-challenge-btn')).toBeNull();
    expect(document.querySelector('.sheet-close-btn')).not.toBeNull();
  });
});

// ============================================================
// TC12 — frozen reference: Second shown but Challenge hidden
// ============================================================

describe('TC12 — frozen reference: Second button shown, Challenge button hidden', () => {
  it('renders .sheet-second-btn but not .sheet-challenge-btn when challenge_status is frozen', () => {
    const ref = makeRef({
      user_id: 'other-user',
      challenge_status: 'frozen',
    });

    openSheet(ref as never, 'current-user-uuid', vi.fn());

    expect(document.querySelector('.sheet-second-btn')).not.toBeNull();
    expect(document.querySelector('.sheet-challenge-btn')).toBeNull();
  });
});
