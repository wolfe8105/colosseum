/**
 * THE MODERATOR — Profile Debate Archive State
 * Shared mutable state across all sub-modules.
 */

import type { ArchiveEntry } from './profile-debate-archive.types.ts';

export let entries: ArchiveEntry[] = [];
export let filterCat = 'all';
export let filterResult = 'all';
export let filterSearch = '';
export let isOwner = false;

export function setEntries(e: ArchiveEntry[]): void { entries = e; }
export function setFilterCat(v: string): void { filterCat = v; }
export function setFilterResult(v: string): void { filterResult = v; }
export function setFilterSearch(v: string): void { filterSearch = v; }
export function setIsOwner(v: boolean): void { isOwner = v; }

export function resetFilters(): void {
  entries = [];
  filterCat = 'all';
  filterResult = 'all';
  filterSearch = '';
}
