/**
 * Tests for src/pages/group-banner-upload.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetSupabaseClient = vi.hoisted(() => vi.fn());
const mockShowToast = vi.hoisted(() => vi.fn());
const mockStorageUpload = vi.hoisted(() => vi.fn());
const mockStorageSignedUrl = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getSupabaseClient: mockGetSupabaseClient,
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

import { openBannerUploadSheet, _closeSheet } from '../src/pages/group-banner-upload.ts';

function makeStorageClient() {
  return {
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        createSignedUrl: mockStorageSignedUrl,
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  document.getElementById('gb-backdrop')?.remove();
  mockGetSupabaseClient.mockReturnValue(makeStorageClient());
  mockStorageUpload.mockResolvedValue({ error: null });
  mockStorageSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://cdn.example.com/banner.jpg' }, error: null });
  mockSafeRpc.mockResolvedValue({ data: null, error: null });
});

describe('openBannerUploadSheet — creates sheet in DOM', () => {
  it('TC1: appends gb-backdrop to document.body', () => {
    openBannerUploadSheet('g1', 1, 5, 2);
    expect(document.getElementById('gb-backdrop')).not.toBeNull();
  });

  it('TC2: displays win/loss record in sheet', () => {
    openBannerUploadSheet('g1', 1, 5, 2);
    const html = document.getElementById('gb-backdrop')!.innerHTML;
    expect(html).toContain('5W');
    expect(html).toContain('2L');
  });
});

describe('openBannerUploadSheet — tier 2 locked when tier < 2', () => {
  it('TC3: tier 2 row has "locked" class when currentTier is 1', () => {
    openBannerUploadSheet('g1', 1, 5, 2);
    const t2Row = document.getElementById('gb-t2-row')!;
    expect(t2Row.classList.contains('locked')).toBe(true);
  });
});

describe('openBannerUploadSheet — tier 2 unlocked when tier >= 2', () => {
  it('TC4: tier 2 row has "unlocked" class when currentTier is 2', () => {
    openBannerUploadSheet('g1', 2, 10, 3);
    const t2Row = document.getElementById('gb-t2-row')!;
    expect(t2Row.classList.contains('unlocked')).toBe(true);
  });

  it('TC5: upload button visible when tier 2 unlocked', () => {
    openBannerUploadSheet('g1', 2, 10, 3);
    expect(document.getElementById('gb-t2-btn')).not.toBeNull();
  });
});

describe('openBannerUploadSheet — tier 3 locked when tier < 3', () => {
  it('TC6: tier 3 row has "locked" class when currentTier is 2', () => {
    openBannerUploadSheet('g1', 2, 10, 3);
    const t3Row = document.getElementById('gb-t3-row')!;
    expect(t3Row.classList.contains('locked')).toBe(true);
  });
});

describe('openBannerUploadSheet — removes existing sheet before creating new', () => {
  it('TC7: calling twice replaces the previous sheet', () => {
    openBannerUploadSheet('g1', 1, 5, 2);
    openBannerUploadSheet('g1', 1, 5, 2);
    expect(document.querySelectorAll('#gb-backdrop').length).toBe(1);
  });
});

describe('openBannerUploadSheet — backdrop click closes sheet', () => {
  it('TC8: clicking the backdrop sets opacity to 0', () => {
    openBannerUploadSheet('g1', 1, 5, 2);
    const backdrop = document.getElementById('gb-backdrop')!;
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(backdrop.style.opacity).toBe('0');
  });
});

describe('_closeSheet — starts fade animation', () => {
  it('TC9: sets opacity to 0 and transition on the element', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    _closeSheet(el);
    expect(el.style.opacity).toBe('0');
    expect(el.style.transition).toContain('opacity');
  });
});

describe('ARCH — src/pages/group-banner-upload.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/group-banner-upload.ts'),
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
