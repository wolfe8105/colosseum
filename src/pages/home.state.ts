// LM-HOME-002: All mutable module-level vars live here.
// ES module imports are read-only bindings — direct let exports
// cannot be reassigned from other files. All sibling files do state.foo = x.

import type { Category } from './home.types.ts';
import type { ArsenalReference } from '../reference-arsenal.ts';

export const CATEGORIES: Category[] = [
  { id: 'politics', icon: '🏛️', label: 'Politics', section: 'THE FLOOR', count: '3 Live', hasLive: true },
  { id: 'sports', icon: '🏈', label: 'Sports', section: 'THE PRESSBOX', count: '7 Live', hasLive: true },
  { id: 'entertainment', icon: '🎬', label: 'Film & TV', section: 'THE SPOTLIGHT', count: '2 Live', hasLive: true },
  { id: 'couples', icon: '💔', label: "Couples\nCourt", section: 'COUPLES COURT', count: '5 Live', hasLive: true },
  { id: 'trending', icon: '🔥', label: 'Trending', section: 'THE FIRE', count: '12 Hot', hasLive: false },
  { id: 'music', icon: '🎵', label: 'Music', section: 'THE STAGE', count: '1 Live', hasLive: true },
];

export const state = {
  currentOverlayCat: null as Category | null,
  currentScreen: 'home',
  arsenalForgeCleanup: null as (() => void) | null,
  arsenalActiveTab: 'my-arsenal',
  arsenalRefs: [] as ArsenalReference[],
};
