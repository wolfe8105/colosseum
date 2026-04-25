/**
 * Tests for src/pages/groups.create.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockShowToast = vi.hoisted(() => vi.fn());
const mockSetSelectedEmoji = vi.hoisted(() => vi.fn());
const mockCurrentUser = vi.hoisted(() => ({ value: { id: 'user-1' } as { id: string } | null }));
const mockSelectedEmoji = vi.hoisted(() => ({ value: '⚔️' }));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  create_group: {},
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

vi.mock('../src/pages/groups.state.ts', () => ({
  get currentUser() { return mockCurrentUser.value; },
  get selectedEmoji() { return mockSelectedEmoji.value; },
  setSelectedEmoji: mockSetSelectedEmoji,
}));

function buildDOM() {
  document.body.innerHTML = `
    <div id="create-modal"></div>
    <input id="group-name" value="" />
    <input id="group-desc-input" value="" />
    <select id="group-category"><option value="general">General</option></select>
    <button id="create-submit-btn">CREATE GROUP</button>
    <div class="emoji-opt selected" data-emoji="⚔️">⚔️</div>
    <div class="emoji-opt" data-emoji="🔥">🔥</div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  mockCurrentUser.value = { id: 'user-1' };
});

import { openCreateModal, closeCreateModal, selectEmoji, submitCreateGroup } from '../src/pages/groups.create.ts';

describe('openCreateModal — redirects when no user', () => {
  it('TC1: redirects to plinko when currentUser is null', () => {
    mockCurrentUser.value = null;
    const origHref = window.location.href;
    openCreateModal();
    // jsdom doesn't follow redirects — check that modal is NOT opened
    expect(document.getElementById('create-modal')!.classList.contains('open')).toBe(false);
  });
});

describe('openCreateModal — opens modal when user present', () => {
  it('TC2: adds "open" class to create-modal', () => {
    openCreateModal();
    expect(document.getElementById('create-modal')!.classList.contains('open')).toBe(true);
  });
});

describe('closeCreateModal — removes open class', () => {
  it('TC3: removes "open" class from create-modal', () => {
    document.getElementById('create-modal')!.classList.add('open');
    closeCreateModal();
    expect(document.getElementById('create-modal')!.classList.contains('open')).toBe(false);
  });
});

describe('selectEmoji — marks element as selected', () => {
  it('TC4: adds selected class to clicked emoji option', () => {
    const opts = document.querySelectorAll<HTMLElement>('.emoji-opt');
    const second = opts[1]!; // fire emoji option
    selectEmoji(second);
    expect(second.classList.contains('selected')).toBe(true);
  });

  it('TC5: removes selected from other options', () => {
    const opts = document.querySelectorAll<HTMLElement>('.emoji-opt');
    selectEmoji(opts[1]!); // select second
    expect(opts[0]!.classList.contains('selected')).toBe(false);
  });

  it('TC6: calls setSelectedEmoji with the emoji data attribute value', () => {
    const opts = document.querySelectorAll<HTMLElement>('.emoji-opt');
    const second = opts[1]!;
    selectEmoji(second);
    expect(mockSetSelectedEmoji).toHaveBeenCalledWith(second.dataset.emoji ?? '');
  });
});

describe('submitCreateGroup — validates name length', () => {
  it('TC7: shows error toast when name is empty', async () => {
    await submitCreateGroup();
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('2 characters'), 'error');
  });

  it('TC8: shows error toast when name is 1 character', async () => {
    (document.getElementById('group-name') as HTMLInputElement).value = 'a';
    await submitCreateGroup();
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('2 characters'), 'error');
  });
});

describe('submitCreateGroup — calls safeRpc on valid name', () => {
  it('TC9: calls safeRpc("create_group") with name and category', async () => {
    mockSafeRpc.mockResolvedValue({ data: { group_id: 'g1' }, error: null });
    (document.getElementById('group-name') as HTMLInputElement).value = 'My Group';
    await submitCreateGroup();
    expect(mockSafeRpc).toHaveBeenCalledWith(
      'create_group',
      expect.objectContaining({ p_name: 'My Group' }),
      expect.anything()
    );
  });
});

describe('submitCreateGroup — closes modal on success', () => {
  it('TC10: closes create-modal after successful creation', async () => {
    mockSafeRpc.mockResolvedValue({ data: { group_id: 'g1' }, error: null });
    document.getElementById('create-modal')!.classList.add('open');
    (document.getElementById('group-name') as HTMLInputElement).value = 'My Group';
    await submitCreateGroup();
    expect(document.getElementById('create-modal')!.classList.contains('open')).toBe(false);
  });
});

describe('submitCreateGroup — shows error toast on failure', () => {
  it('TC11: shows error toast when safeRpc returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    (document.getElementById('group-name') as HTMLInputElement).value = 'My Group';
    await submitCreateGroup();
    expect(mockShowToast).toHaveBeenCalledWith(expect.anything(), 'error');
  });
});

describe('ARCH — src/pages/groups.create.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../contracts/rpc-schemas.ts', '../config.ts', './groups.state.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/groups.create.ts'),
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
