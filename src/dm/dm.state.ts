/**
 * THE MODERATOR — DM State
 * Session 281: Shared state for the DM inbox module.
 */

import type { DMThread, DMMessage } from './dm.types.ts';

export let threads: DMThread[] = [];
export let activeThreadId: string | null = null;
export let activeMessages: DMMessage[] = [];
export let isLoadingThreads = false;
export let isLoadingMessages = false;
export let unreadTotal = 0;

export function setThreads(t: DMThread[]): void { threads = t; }
export function setActiveThreadId(id: string | null): void { activeThreadId = id; }
export function setActiveMessages(m: DMMessage[]): void { activeMessages = m; }
export function setIsLoadingThreads(v: boolean): void { isLoadingThreads = v; }
export function setIsLoadingMessages(v: boolean): void { isLoadingMessages = v; }
export function setUnreadTotal(n: number): void { unreadTotal = n; }
