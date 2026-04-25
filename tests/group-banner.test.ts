/**
 * Tests for src/pages/group-banner.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockInjectGroupBannerCSS = vi.hoisted(() => vi.fn());
const mockOpenBannerUploadSheet = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/pages/group-banner-css.ts', () => ({
  injectGroupBannerCSS: mockInjectGroupBannerCSS,
}));

vi.mock('../src/pages/group-banner-upload.ts', () => ({
  openBannerUploadSheet: mockOpenBannerUploadSheet,
}));

import { renderGroupBanner } from '../src/pages/group-banner.ts';
import type { GroupDetail } from '../src/pages/groups.types.ts';

function makeGroup(overrides: Partial<GroupDetail> = {}): GroupDetail {
  return {
    id: 'g1',
    name: 'Test Group',
    avatar_emoji: '⚔️',
    banner_tier: 1,
    banner_static_url: null,
    banner_animated_url: null,
    gvg_wins: 5,
    gvg_losses: 2,
    ...overrides,
  } as GroupDetail;
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '<div id="banner-container"></div>';
});

describe('renderGroupBanner — calls injectGroupBannerCSS', () => {
  it('TC1: calls injectGroupBannerCSS on every render', () => {
    const container = document.getElementById('banner-container')!;
    renderGroupBanner(container, makeGroup(), false);
    expect(mockInjectGroupBannerCSS).toHaveBeenCalled();
  });
});

describe('renderGroupBanner — tier 1 renders fallback div', () => {
  it('TC2: renders .group-banner-t1 when tier is 1', () => {
    const container = document.getElementById('banner-container')!;
    renderGroupBanner(container, makeGroup({ banner_tier: 1 }), false);
    expect(container.querySelector('.group-banner-t1')).not.toBeNull();
  });
});

describe('renderGroupBanner — tier 2 with static URL renders img', () => {
  it('TC3: renders img.group-banner-t2 when tier is 2 and static URL present', () => {
    const container = document.getElementById('banner-container')!;
    renderGroupBanner(container, makeGroup({ banner_tier: 2, banner_static_url: 'https://img.example.com/banner.jpg' }), false);
    expect(container.querySelector('img.group-banner-t2')).not.toBeNull();
  });
});

describe('renderGroupBanner — tier 3 with animated URL renders video', () => {
  it('TC4: renders video.group-banner-t3 when tier is 3 and animated URL present', () => {
    const container = document.getElementById('banner-container')!;
    renderGroupBanner(container, makeGroup({ banner_tier: 3, banner_animated_url: 'https://vid.example.com/banner.mp4' }), false);
    expect(container.querySelector('video.group-banner-t3')).not.toBeNull();
  });
});

describe('renderGroupBanner — leader sees edit button', () => {
  it('TC5: renders .group-banner-edit-btn when isLeader is true', () => {
    const container = document.getElementById('banner-container')!;
    renderGroupBanner(container, makeGroup(), true);
    expect(container.querySelector('.group-banner-edit-btn')).not.toBeNull();
  });

  it('TC6: no edit button when isLeader is false', () => {
    const container = document.getElementById('banner-container')!;
    renderGroupBanner(container, makeGroup(), false);
    expect(container.querySelector('.group-banner-edit-btn')).toBeNull();
  });
});

describe('renderGroupBanner — edit button click calls openBannerUploadSheet', () => {
  it('TC7: clicking edit button calls openBannerUploadSheet', () => {
    const container = document.getElementById('banner-container')!;
    renderGroupBanner(container, makeGroup(), true);
    const editBtn = container.querySelector<HTMLButtonElement>('.group-banner-edit-btn')!;
    editBtn.click();
    expect(mockOpenBannerUploadSheet).toHaveBeenCalledWith('g1', 1, 5, 2);
  });
});

describe('renderGroupBanner — renders tier badge', () => {
  it('TC8: renders .group-banner-tier-badge with TIER I for tier 1', () => {
    const container = document.getElementById('banner-container')!;
    renderGroupBanner(container, makeGroup({ banner_tier: 1 }), false);
    const badge = container.querySelector('.group-banner-tier-badge');
    expect(badge?.textContent).toContain('TIER I');
  });
});

describe('ARCH — src/pages/group-banner.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../config.ts', './groups.types.ts', './group-banner-css.ts', './group-banner-upload.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/group-banner.ts'),
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
