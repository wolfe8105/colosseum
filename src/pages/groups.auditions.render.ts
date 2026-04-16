/**
 * groups.auditions.render.ts — Auditions list renderer
 *
 * RULE_LABELS, renderAuditionsList
 * Extracted from groups.auditions.ts (Session 254 track).
 */

import { escapeHTML } from '../config.ts';

export interface PendingAudition {
  id: string;
  candidate_user_id: string;
  candidate_username?: string | null;
  candidate_display_name?: string | null;
  rule: string;
  status: string;
  topic?: string | null;
  category?: string | null;
  ruleset?: string | null;
  total_rounds?: number | null;
  debate_id?: string | null;
  created_at: string;
}

export const RULE_LABELS: Record<string, string> = {
  allowed_by_leader:  'Leader approval — no debate required',
  debate_leader_any:  'Complete a debate against the group leader',
  debate_member_any:  'Complete a debate against any group member',
  debate_leader_win:  'Win a debate against the group leader',
  debate_member_win:  'Win a debate against any group member',
};

export function renderAuditionsList(
  auditions: PendingAudition[],
  myRole: string | null
): string {
  if (!auditions || auditions.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">📋</div><div>No pending auditions</div></div>';
  }

  const isLeaderOrMember = myRole !== null;

  return auditions.map(a => {
    const name      = escapeHTML(a.candidate_display_name || a.candidate_username || 'Unknown');
    const rule      = escapeHTML(RULE_LABELS[a.rule] ?? a.rule);
    const topic     = a.topic ? `<div class="audition-topic">${escapeHTML(a.topic)}</div>` : '';
    const statusMap: Record<string, string> = {
      pending:     'PENDING',
      claimed:     'DEBATE SCHEDULED',
      in_progress: 'IN PROGRESS',
    };
    const statusLabel = statusMap[a.status] ?? a.status.toUpperCase();

    let actions = '';

    if (isLeaderOrMember) {
      // Leader can always deny
      const denyBtn = `<button class="audition-action-btn danger"
        data-action="audition-action"
        data-audition-id="${escapeHTML(a.id)}"
        data-audition-action="deny">DENY</button>`;

      if (a.rule === 'allowed_by_leader' && myRole === 'leader') {
        actions = `<button class="audition-action-btn"
          data-action="audition-action"
          data-audition-id="${escapeHTML(a.id)}"
          data-audition-action="approve">APPROVE</button>${denyBtn}`;
      } else if (a.status === 'pending' && a.rule !== 'allowed_by_leader') {
        // Members can accept debate-based auditions
        actions = `<button class="audition-action-btn"
          data-action="audition-action"
          data-audition-id="${escapeHTML(a.id)}"
          data-audition-action="accept">ACCEPT AUDITION</button>${myRole === 'leader' ? denyBtn : ''}`;
      } else {
        actions = myRole === 'leader' ? denyBtn : '';
      }
    } else {
      // This is the candidate viewing their own row
      actions = `<button class="audition-action-btn danger"
        data-action="audition-action"
        data-audition-id="${escapeHTML(a.id)}"
        data-audition-action="withdraw">WITHDRAW</button>`;
    }

    return `<div class="audition-row">
      <div class="audition-row-header">
        <div class="audition-candidate">${isLeaderOrMember ? name : 'Your audition'}</div>
        <div class="audition-status">${statusLabel}</div>
      </div>
      <div class="audition-rule">${rule}</div>
      ${topic}
      ${actions ? `<div class="audition-actions">${actions}</div>` : ''}
    </div>`;
  }).join('');
}
