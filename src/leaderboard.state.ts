/**
 * THE MODERATOR — Leaderboard State
 * Shared module-level state for all leaderboard sub-modules.
 */

import type { LeaderboardTab, LeaderboardEntry } from './leaderboard.types.ts';

export let currentTab: LeaderboardTab = 'elo';
export let liveData: LeaderboardEntry[] | null = null;
export let myRank: number | null = null;
export let isLoading = false;
export let currentOffset = 0;
export let hasMore = false;
export let searchQuery = '';
export let searchResults: LeaderboardEntry[] | null = null;
export const PAGE_SIZE = 50;

export function setCurrentTab(t: LeaderboardTab): void { currentTab = t; }
export function setLiveData(d: LeaderboardEntry[] | null): void { liveData = d; }
export function setMyRank(r: number | null): void { myRank = r; }
export function setIsLoading(v: boolean): void { isLoading = v; }
export function setCurrentOffset(v: number): void { currentOffset = v; }
export function setHasMore(v: boolean): void { hasMore = v; }
export function setSearchQuery(q: string): void { searchQuery = q; }
export function setSearchResults(r: LeaderboardEntry[] | null): void { searchResults = r; }
