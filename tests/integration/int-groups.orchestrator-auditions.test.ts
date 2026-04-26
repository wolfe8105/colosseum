/**
 * Integration tests — Seam #534
 * src/pages/groups.ts → groups.auditions
 *
 * Verifies the event delegation wire-up in groups.ts for all three
 * groups.auditions exports: closeAuditionModal, submitAuditionRequest,
 * handleAuditionAction. Tests are written against groups.ts (orchestrator)
 * with groups.auditions mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Stable mock holders ────────────────────────────────────────────────────────
let mockCloseAuditionModal: ReturnType<typeof vi.fn>;
let mockSubmitAuditionRequest: ReturnType<typeof vi.fn>;
let mockHandleAuditionAction: ReturnType<typeof vi.fn>;

// ── Module-scope mocks (hoisted by vitest) ─────────────────────────────────────
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

vi.mock('../../src/pages/groups.auditions.ts', () => ({
  closeAuditionModal:    (...a: unknown[]) => mockCloseAuditionModal(...a),
  submitAuditionRequest: (...a: unknown[]) => mockSubmitAuditionRequest(...a),
  handleAuditionAction:  (...a: unknown[]) => mockHandleAuditionAction(...a),
}));

vi.mock('../../src/auth.ts', () => ({
  ready: Promise.resolve(),
  getCurrentUser:    vi.fn(() => null),
  getSupabaseClient: vi.fn(() => ({})),
}));

vi.mock('../../src/pages/groups.state.ts', () => ({
  setSb:               vi.fn(),
  setCurrentUser:      vi.fn(),
  currentGroupId:      null,
  sb:                  null,
  currentUser:         null,
  isMember:            false,
  callerRole:          null,
  activeTab:           'discover',
  activeDetailTab:     'feed',
  activeCategory:      null,
  selectedEmoji:       '⚔️',
  CATEGORY_LABELS:     {},
  setCurrentGroupId:   vi.fn(),
  setIsMember:         vi.fn(),
  setCallerRole:       vi.fn(),
  setActiveTab:        vi.fn(),
  setActiveDetailTab:  vi.fn(),
  setActiveCategory:   vi.fn(),
  setSelectedEmoji:    vi.fn(),
}));

vi.mock('../../src/pages/groups.members.ts', () => ({
  _injectMemberActionsModal:  vi.fn(),
  setGroupOpenCallback:       vi.fn(),
  setRefreshMembersCallback:  vi.fn(),
  loadGroupMembers:           vi.fn(),
}));

vi.mock('../../src/pages/groups.nav.ts', () => ({
  switchTab:               vi.fn(),
  switchDetailTab:         vi.fn(),
  filterCategory:          vi.fn(),
  showLobby:               vi.fn(),
  setNavOpenGroupCallback: vi.fn(),
}));

vi.mock('../../src/pages/groups.load.ts', () => ({
  loadDiscover:              vi.fn(),
  setLoadOpenGroupCallback:  vi.fn(),
}));

vi.mock('../../src/pages/groups.detail.ts', () => ({
  openGroup:        vi.fn(),
  toggleMembership: vi.fn(),
  currentGroupData: null,
}));

vi.mock('../../src/pages/groups.create.ts', () => ({
  openCreateModal:            vi.fn(),
  closeCreateModal:           vi.fn(),
  selectEmoji:                vi.fn(),
  submitCreateGroup:          vi.fn(),
  setCreateOpenGroupCallback: vi.fn(),
}));

vi.mock('../../src/pages/groups.challenges.ts', () => ({
  openGvGModal:         vi.fn(),
  closeGvGModal:        vi.fn(),
  submitGroupChallenge: vi.fn(),
  clearGvGOpponent:     vi.fn(),
}));

vi.mock('../../src/pages/groups.settings.ts', () => ({
  openGroupSettings:    vi.fn(),
  closeGroupSettings:   vi.fn(),
  onJoinModeChange:     vi.fn(),
  submitGroupSettings:  vi.fn(),
  showDeleteConfirm:    vi.fn(),
  submitDeleteGroup:    vi.fn(),
  selectSettingsEmoji:  vi.fn(),
}));

// ── ARCH: static import verification ─────────────────────────────────────────
describe('ARCH: groups.ts → groups.auditions import lines (seam #534)', () => {
  it('imports closeAuditionModal, submitAuditionRequest, handleAuditionAction from groups.auditions', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.ts', 'utf-8');
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const audImport = importLines.find((l: string) => l.includes('groups.auditions'));
    expect(audImport, 'should have an import from groups.auditions').toBeDefined();
    expect(audImport).toContain('closeAuditionModal');
    expect(audImport).toContain('submitAuditionRequest');
    expect(audImport).toContain('handleAuditionAction');
  });

  it('groups.auditions.ts has no wall-condition imports', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.auditions.ts', 'utf-8');
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const joined = importLines.join('\n');
    const wallPatterns = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const w of wallPatterns) {
      expect(joined).not.toContain(w);
    }
  });
});

// ── Event delegation — close-audition-modal ──────────────────────────────────
describe('groups.ts event delegation → closeAuditionModal (seam #534)', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    mockCloseAuditionModal    = vi.fn();
    mockSubmitAuditionRequest = vi.fn().mockResolvedValue(undefined);
    mockHandleAuditionAction  = vi.fn().mockResolvedValue(undefined);
    // Fresh import registers exactly one document click listener
    await import('../../src/pages/groups.ts');
  });

  // TC-A1: close-audition-modal data-action calls closeAuditionModal()
  it('TC-A1: close-audition-modal data-action calls closeAuditionModal', () => {
    const el = document.createElement('button');
    el.dataset.action = 'close-audition-modal';
    document.body.appendChild(el);
    el.click();
    el.remove();
    expect(mockCloseAuditionModal).toHaveBeenCalledTimes(1);
  });

  // TC-A2: audition-modal-backdrop self-click calls closeAuditionModal
  it('TC-A2: audition-modal-backdrop click where target === actionEl calls closeAuditionModal', () => {
    const backdrop = document.createElement('div');
    backdrop.dataset.action = 'audition-modal-backdrop';
    document.body.appendChild(backdrop);
    const evt = new MouseEvent('click', { bubbles: true });
    // target must be the backdrop itself (self-click guard)
    Object.defineProperty(evt, 'target', { value: backdrop, writable: false });
    backdrop.dispatchEvent(evt);
    backdrop.remove();
    // Multiple listeners may accumulate (one per beforeEach module re-import);
    // assert it was called at least once — the important check is the guard
    expect(mockCloseAuditionModal).toHaveBeenCalled();
  });

  // TC-A3: audition-modal-backdrop child-click does NOT call closeAuditionModal
  it('TC-A3: audition-modal-backdrop click on child does NOT call closeAuditionModal', () => {
    const backdrop = document.createElement('div');
    backdrop.dataset.action = 'audition-modal-backdrop';
    const child = document.createElement('span');
    backdrop.appendChild(child);
    document.body.appendChild(backdrop);
    const evt = new MouseEvent('click', { bubbles: true });
    // target is child — guard prevents close
    Object.defineProperty(evt, 'target', { value: child, writable: false });
    backdrop.dispatchEvent(evt);
    backdrop.remove();
    expect(mockCloseAuditionModal).not.toHaveBeenCalled();
  });
});

// ── Event delegation — submit-audition-request ───────────────────────────────
describe('groups.ts event delegation → submitAuditionRequest (seam #534)', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    mockCloseAuditionModal    = vi.fn();
    mockSubmitAuditionRequest = vi.fn().mockResolvedValue(undefined);
    mockHandleAuditionAction  = vi.fn().mockResolvedValue(undefined);
    await import('../../src/pages/groups.ts');
  });

  // TC-B1: submit-audition-request calls submitAuditionRequest()
  it('TC-B1: submit-audition-request data-action calls submitAuditionRequest()', () => {
    const el = document.createElement('button');
    el.dataset.action = 'submit-audition-request';
    document.body.appendChild(el);
    el.click();
    el.remove();
    // Multiple listeners may accumulate (one per beforeEach module re-import);
    // assert it was called at least once
    expect(mockSubmitAuditionRequest).toHaveBeenCalled();
  });
});

// ── Event delegation — audition-action ───────────────────────────────────────
describe('groups.ts event delegation → handleAuditionAction (seam #534)', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    mockCloseAuditionModal    = vi.fn();
    mockSubmitAuditionRequest = vi.fn().mockResolvedValue(undefined);
    mockHandleAuditionAction  = vi.fn().mockResolvedValue(undefined);
    await import('../../src/pages/groups.ts');
  });

  // TC-C1: accept action
  it('TC-C1: audition-action accept calls handleAuditionAction(id, "accept")', () => {
    const el = document.createElement('button');
    el.dataset.action         = 'audition-action';
    el.dataset.auditionId     = 'aud-test-001';
    el.dataset.auditionAction = 'accept';
    document.body.appendChild(el);
    el.click();
    el.remove();
    expect(mockHandleAuditionAction).toHaveBeenCalledWith('aud-test-001', 'accept');
  });

  // TC-C2: approve action
  it('TC-C2: audition-action approve calls handleAuditionAction(id, "approve")', () => {
    const el = document.createElement('button');
    el.dataset.action         = 'audition-action';
    el.dataset.auditionId     = 'aud-test-002';
    el.dataset.auditionAction = 'approve';
    document.body.appendChild(el);
    el.click();
    el.remove();
    expect(mockHandleAuditionAction).toHaveBeenCalledWith('aud-test-002', 'approve');
  });

  // TC-C3: deny action
  it('TC-C3: audition-action deny calls handleAuditionAction(id, "deny")', () => {
    const el = document.createElement('button');
    el.dataset.action         = 'audition-action';
    el.dataset.auditionId     = 'aud-test-003';
    el.dataset.auditionAction = 'deny';
    document.body.appendChild(el);
    el.click();
    el.remove();
    expect(mockHandleAuditionAction).toHaveBeenCalledWith('aud-test-003', 'deny');
  });

  // TC-C4: withdraw action
  it('TC-C4: audition-action withdraw calls handleAuditionAction(id, "withdraw")', () => {
    const el = document.createElement('button');
    el.dataset.action         = 'audition-action';
    el.dataset.auditionId     = 'aud-test-004';
    el.dataset.auditionAction = 'withdraw';
    document.body.appendChild(el);
    el.click();
    el.remove();
    expect(mockHandleAuditionAction).toHaveBeenCalledWith('aud-test-004', 'withdraw');
  });

  // TC-C5: first argument is the exact data-audition-id value
  it('TC-C5: audition-action passes the exact data-audition-id as the first argument', () => {
    const el = document.createElement('button');
    el.dataset.action         = 'audition-action';
    el.dataset.auditionId     = 'specific-uuid-999';
    el.dataset.auditionAction = 'deny';
    document.body.appendChild(el);
    el.click();
    el.remove();
    expect(mockHandleAuditionAction.mock.calls[0][0]).toBe('specific-uuid-999');
  });
});
