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
  // VOTING (server-side only)
  // ========================

  async function castVote(debateId, votedFor, round = null) {
    if (isPlaceholder()) {
      return { success: true, vote_count_a: 5, vote_count_b: 3, your_vote: votedFor };
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
  // PUBLIC API
  // ========================

  return {
    // Voting
    castVote,

    // Predictions
    placePrediction,
  };

})();
