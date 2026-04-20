/**
 * THE MODERATOR — DM Fetch
 * Session 281: RPC wrappers for DM operations.
 */

import { safeRpc } from '../auth.ts';
import type { DMThread, DMMessage, DMSendResult } from './dm.types.ts';
import {
  setThreads, setActiveMessages, setIsLoadingThreads,
  setIsLoadingMessages, setUnreadTotal,
} from './dm.state.ts';

export async function fetchThreads(): Promise<void> {
  setIsLoadingThreads(true);
  try {
    const { data, error } = await safeRpc<{ threads: DMThread[] }>('get_dm_threads');
    if (error || !data) {
      setThreads([]);
    } else {
      const result = data as unknown as { threads: DMThread[] };
      setThreads(result.threads ?? []);
      setUnreadTotal(result.threads?.reduce((sum, t) => sum + (t.unread_count || 0), 0) ?? 0);
    }
  } catch {
    setThreads([]);
  }
  setIsLoadingThreads(false);
}

export async function fetchMessages(threadId: string, before?: string): Promise<DMMessage[]> {
  setIsLoadingMessages(true);
  try {
    const params: Record<string, unknown> = { p_thread_id: threadId };
    if (before) params.p_before = before;
    const { data, error } = await safeRpc<{ messages: DMMessage[] }>('get_dm_messages', params);
    if (error || !data) {
      setActiveMessages([]);
      setIsLoadingMessages(false);
      return [];
    }
    const result = data as unknown as { messages: DMMessage[] };
    const msgs = result.messages ?? [];
    setActiveMessages(msgs);
    setIsLoadingMessages(false);
    return msgs;
  } catch {
    setActiveMessages([]);
    setIsLoadingMessages(false);
    return [];
  }
}

export async function sendMessage(recipientId: string, body: string): Promise<DMSendResult> {
  try {
    const { data, error } = await safeRpc<DMSendResult>('send_dm', {
      p_recipient_id: recipientId,
      p_body: body,
    });
    if (error) return { error: 'send_failed' };
    return (data as unknown as DMSendResult) ?? { error: 'empty_response' };
  } catch {
    return { error: 'send_failed' };
  }
}

export async function blockUser(blockedId: string): Promise<boolean> {
  const { error } = await safeRpc('block_dm_user', { p_blocked_id: blockedId });
  return !error;
}

export async function unblockUser(blockedId: string): Promise<boolean> {
  const { error } = await safeRpc('unblock_dm_user', { p_blocked_id: blockedId });
  return !error;
}

export async function fetchUnreadCount(): Promise<number> {
  try {
    const { data, error } = await safeRpc<number>('get_dm_unread_count');
    if (error || data === null || data === undefined) return 0;
    const count = Number(data);
    setUnreadTotal(count);
    return count;
  } catch {
    return 0;
  }
}
