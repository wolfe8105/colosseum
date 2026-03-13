// ============================================================
// COLOSSEUM SCORING — Ring 3 Client Module
// Items: 14.1.2.1, 14.1.2.2, 14.3.4, 14.3.6
// Calls server-side Supabase RPC functions for all scoring/votes
// Never calculates Elo or tallies votes on the client
// SESSION 65 SECURITY AUDIT (Session 17): 1 bug fixed
//   - BUG 1 (MEDIUM): PostgREST filter injection via .or() string interpolation
// ============================================================

const ColosseumScoring = (() => {

  // --- Helper: get Supabase client ---
  function getClient() {
    if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.supabase) {
      return ColosseumAuth.supabase;
    }
    // Placeholder mode
    return null;
  }

  function isPlaceholder() {
    return !getClient();
  }

  // BUG 1 FIX: Validate UUID format before use in .or() filter
  // Supabase .or() uses raw PostgREST syntax — string interpolation is a known injection vector
  // (Supabase GitHub discussion #3843)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function validateUUID(id) {
    if (!id || !UUID_RE.test(id)) throw new Error('Invalid user ID format');
    return id;
  }


  // ========================
  // DEBATES
  // ========================

  async function createDebate({ topic, category = 'general', format = 'standard', opponentId = null, side = 'a' }) {
    if (isPlaceholder()) {
      console.log('[PLACEHOLDER] createDebate:', topic);
      return { success: true, debateId: 'placeholder-' + Date.now() };
    }

    const { data, error } = await ColosseumAuth.safeRpc('create_debate', {
      p_topic: topic,
      p_category: category,
      p_format: format,
      p_opponent_id: opponentId,
      p_side: side
    });

    if (error) throw new Error(error.message);
    return { success: true, debateId: data };
  }

  async function joinDebate(debateId) {
    if (isPlaceholder()) {
      console.log('[PLACEHOLDER] joinDebate:', debateId);
      return { success: true, debateId, status: 'matched' };
    }

    const { data, error } = await ColosseumAuth.safeRpc('join_debate', {
      p_debate_id: debateId
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async function startDebate(debateId) {
    if (isPlaceholder()) {
      console.log('[PLACEHOLDER] startDebate:', debateId);
      return { success: true, status: 'live' };
    }

    const { data, error } = await ColosseumAuth.safeRpc('start_debate', {
      p_debate_id: debateId
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async function advanceRound(debateId) {
    if (isPlaceholder()) {
      console.log('[PLACEHOLDER] advanceRound:', debateId);
      return { success: true, status: 'live', round: 2 };
    }

    const { data, error } = await ColosseumAuth.safeRpc('advance_round', {
      p_debate_id: debateId
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async function finalizeDebate(debateId) {
    if (isPlaceholder()) {
      console.log('[PLACEHOLDER] finalizeDebate:', debateId);
      return {
        success: true,
        winner: 'a',
        votes_a: 7,
        votes_b: 3,
        elo_change_a: 16,
        elo_change_b: -16,
        new_elo_a: 1216,
        new_elo_b: 1184
      };
    }

    const { data, error } = await ColosseumAuth.safeRpc('finalize_debate', {
      p_debate_id: debateId
    });

    if (error) throw new Error(error.message);
    return data;
  }


  // ========================
  // VOTING (server-side only)
  // ========================

  async function castVote(debateId, votedFor, round = null) {
    if (isPlaceholder()) {
      console.log('[PLACEHOLDER] castVote:', debateId, votedFor);
      return { success: true, votes_a: 5, votes_b: 3, your_vote: votedFor };
    }

    const { data, error } = await ColosseumAuth.safeRpc('cast_vote', {
      p_debate_id: debateId,
      p_voted_for: votedFor,
      p_round: round
    });

    if (error) throw new Error(error.message);
    return data;
  }


  // ========================
  // PREDICTIONS
  // ========================

  async function placePrediction(debateId, predictedWinnerId, amount) {
    if (isPlaceholder()) {
      console.log('[PLACEHOLDER] placePrediction:', debateId, amount);
      return { success: true, amount, new_balance: 50 - amount };
    }

    const { data, error } = await ColosseumAuth.safeRpc('place_prediction', {
      p_debate_id: debateId,
      p_predicted_winner: predictedWinnerId,
      p_amount: amount
    });

    if (error) throw new Error(error.message);
    return data;
  }


  // ========================
  // QUERIES
  // ========================

  async function getLiveDebates(category = null, limit = 10) {
    if (isPlaceholder()) {
      console.log('[PLACEHOLDER] getLiveDebates');
      return [];
    }

    const { data, error } = await ColosseumAuth.safeRpc('get_live_debates', {
      p_category: category,
      p_limit: limit
    });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async function getLeaderboard(sortBy = 'elo', limit = 50, offset = 0) {
    if (isPlaceholder()) {
      console.log('[PLACEHOLDER] getLeaderboard');
      return [];
    }

    const { data, error } = await ColosseumAuth.safeRpc('get_leaderboard', {
      p_sort_by: sortBy,
      p_limit: limit,
      p_offset: offset
    });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async function getDebate(debateId) {
    if (isPlaceholder()) return null;

    const { data, error } = await getClient()
      .from('debates')
      .select('*, debater_a_profile:profiles!debates_debater_a_fkey(*), debater_b_profile:profiles!debates_debater_b_fkey(*)')
      .eq('id', debateId)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async function getMyDebates(limit = 20) {
    if (isPlaceholder()) return [];

    const userId = ColosseumAuth?.currentUser?.id;
    if (!userId) return [];

    // BUG 1 FIX: Validate UUID before interpolating into .or() PostgREST filter
    // .or() uses raw PostgREST syntax — unvalidated input is a filter injection vector
    const safeId = validateUUID(userId);

    const { data, error } = await getClient()
      .from('debates')
      .select('*')
      .or(`debater_a.eq.${safeId},debater_b.eq.${safeId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  }


  // ========================
  // PUBLIC API
  // ========================

  return {
    // Debate lifecycle
    createDebate,
    joinDebate,
    startDebate,
    advanceRound,
    finalizeDebate,

    // Voting
    castVote,

    // Predictions
    placePrediction,

    // Queries
    getLiveDebates,
    getLeaderboard,
    getDebate,
    getMyDebates
  };

})();
