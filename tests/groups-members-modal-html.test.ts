/**
 * Tests for src/pages/groups.members.modal.html.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { _injectMemberActionsModal } from '../src/pages/groups.members.modal.html.ts';

beforeEach(() => {
  document.getElementById('member-actions-modal')?.remove();
});

describe('_injectMemberActionsModal — creates modal in DOM', () => {
  it('TC1: appends member-actions-modal to document.body', () => {
    _injectMemberActionsModal();
    expect(document.getElementById('member-actions-modal')).not.toBeNull();
  });

  it('TC2: modal contains mam-avatar element', () => {
    _injectMemberActionsModal();
    expect(document.getElementById('mam-avatar')).not.toBeNull();
  });

  it('TC3: modal contains mam-name element', () => {
    _injectMemberActionsModal();
    expect(document.getElementById('mam-name')).not.toBeNull();
  });

  it('TC4: modal contains mam-kick-btn', () => {
    _injectMemberActionsModal();
    expect(document.getElementById('mam-kick-btn')).not.toBeNull();
  });

  it('TC5: modal contains mam-ban-btn', () => {
    _injectMemberActionsModal();
    expect(document.getElementById('mam-ban-btn')).not.toBeNull();
  });

  it('TC6: modal contains mam-cancel-btn', () => {
    _injectMemberActionsModal();
    expect(document.getElementById('mam-cancel-btn')).not.toBeNull();
  });
});

describe('_injectMemberActionsModal — idempotent', () => {
  it('TC7: calling twice does not create duplicate modals', () => {
    _injectMemberActionsModal();
    _injectMemberActionsModal();
    expect(document.querySelectorAll('#member-actions-modal').length).toBe(1);
  });
});

describe('ARCH — src/pages/groups.members.modal.html.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed: string[] = [];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/groups.members.modal.html.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    expect(paths).toHaveLength(0);
  });
});
