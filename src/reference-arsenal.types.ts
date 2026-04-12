/**
 * THE MODERATOR — Reference Arsenal Types
 *
 * All exported interfaces and type aliases for the reference arsenal system.
 * F-55 schema types.
 */

export interface ArsenalReference {
  id: string;
  user_id: string;
  source_title: string;
  source_author: string;
  source_date: string;
  locator: string;
  claim_text: string;
  source_type: SourceType;
  category: ReferenceCategory;
  source_url: string | null;
  seconds: number;
  strikes: number;
  rarity: Rarity;
  current_power: number;
  graduated: boolean;
  challenge_status: ChallengeStatus;
  created_at: string;
  // Joined field from library query
  owner_username?: string;
}

export interface ForgeParams {
  source_title: string;
  source_author: string;
  source_date: string;
  locator: string;
  claim_text: string;
  source_type: SourceType;
  category: ReferenceCategory;
  source_url?: string;
}

export interface ForgeResult {
  action: 'forged' | 'collision';
  ref_id?: string;
  existing_ref_id?: string;
  existing_owner?: string;
  existing_name?: string;
}

export interface EditResult {
  action: 'edited' | 'collision';
  existing_ref_id?: string;
  existing_owner?: string;
  existing_name?: string;
}

export interface SecondResult {
  action: 'seconded';
  seconds: number;
  strikes: number;
  rarity: string;
  current_power: number;
}

export interface ChallengeResult {
  action: 'challenged' | 'shield_blocked';
  challenge_id?: string;
  escrow_amount?: number;
  event_id?: number;
  message?: string;
}

export interface LoadoutRef {
  reference_id: string;
  cited: boolean;
  cited_at: string | null;
  source_title: string;
  claim_text: string;
  source_author: string;
  source_type: string;
  source_url: string | null;
  current_power: number;
  rarity: string;
  seconds: number;
  strikes: number;
  challenge_status: string;
  graduated: boolean;
}

export interface CiteResult2 {
  success: boolean;
  event_id: number;
  claim: string;
  reference_id: string;
}

export interface ChallengeResult2 {
  blocked: boolean;
  event_id: number;
  challenges_remaining?: number;
  challenge_id?: string;
  message?: string;
}

export type SourceType = 'primary' | 'academic' | 'book' | 'news' | 'other';
export type ReferenceCategory = 'politics' | 'sports' | 'entertainment' | 'music' | 'couples_court';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';
export type ChallengeStatus = 'none' | 'disputed' | 'heavily_disputed' | 'frozen';
