/**
 * THE COLOSSEUM — Supabase Database Types
 *
 * AUTO-GENERATE THIS FILE — do not edit manually.
 *
 * Run from repo root (requires Supabase CLI + login):
 *   npx supabase gen types typescript --project-id faomczmipsccwbhpivmp > src/types/database.ts
 *
 * Or via npm script:
 *   npm run gen:types
 *
 * This placeholder defines the most-referenced table types so Phase 1
 * migration can start before the CLI is set up. Replace entirely when
 * auto-generated types are available.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          username: string | null;
          avatar_url: string | null;
          bio: string | null;
          elo_rating: number;
          token_balance: number;
          level: number;
          xp: number;
          streak_freezes: number;
          questions_answered: number;
          wins: number;
          losses: number;
          draws: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          username?: string | null;
          [key: string]: unknown;
        };
        Update: {
          display_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          [key: string]: unknown;
        };
      };
      arena_debates: {
        Row: {
          id: string;
          topic: string | null;
          category: string | null;
          mode: string;
          status: 'pending' | 'lobby' | 'matched' | 'live' | 'completed';
          participant_a: string | null;
          participant_b: string | null;
          winner: string | null;
          score_a: number | null;
          score_b: number | null;
          vote_count_a: number;
          vote_count_b: number;
          created_at: string;
        };
        Insert: {
          topic?: string | null;
          category?: string | null;
          mode: string;
          status?: string;
          [key: string]: unknown;
        };
        Update: {
          status?: string;
          winner?: string | null;
          score_a?: number | null;
          score_b?: number | null;
          [key: string]: unknown;
        };
      };
      stakes: {
        Row: {
          id: string;
          debate_id: string;
          user_id: string;
          amount: number;
          predicted_winner: string;
          created_at: string;
        };
        Insert: {
          debate_id: string;
          user_id: string;
          amount: number;
          predicted_winner: string;
        };
        Update: {
          [key: string]: unknown;
        };
      };
      token_earn_log: {
        Row: {
          id: string;
          user_id: string;
          earn_type: string;
          amount: number;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          earn_type: string;
          amount: number;
          reference_id?: string | null;
        };
        Update: {
          [key: string]: unknown;
        };
      };
      hot_takes: {
        Row: {
          id: string;
          user_id: string;
          body: string;
          section: string;
          fire_count: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          body: string;
          section: string;
        };
        Update: {
          [key: string]: unknown;
        };
      };
    };
    Functions: {
      // Key RPCs — add full signatures as modules migrate
      place_stake: {
        Args: {
          p_debate_id: string;
          p_user_id: string;
          p_amount: number;
          p_predicted_winner: string;
        };
        Returns: Json;
      };
      settle_stakes: {
        Args: {
          p_debate_id: string;
          p_winner: string;
        };
        Returns: Json;
      };
      increment_questions_answered: {
        Args: {
          p_count: number;
        };
        Returns: number;
      };
      claim_action_tokens: {
        Args: {
          p_action: string;
          p_ref_id: string;
        };
        Returns: Json;
      };
      get_category_counts: {
        Args: Record<string, never>;
        Returns: Array<{
          section: string;
          live_debates: number;
          hot_takes: number;
        }>;
      };
    };
  };
}
