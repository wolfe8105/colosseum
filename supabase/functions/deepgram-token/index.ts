// ============================================================
// THE MODERATOR — Deepgram Token Edge Function
// Session 238: F-51 Phase 4 — Deepgram STT integration
//
// Generates a short-lived Deepgram JWT (30s TTL) for browser clients.
// Client calls this before opening a Deepgram WebSocket.
// The JWT only needs to be valid at connection time — the WebSocket
// stays open after the token expires.
//
// Secrets required: DEEPGRAM_API_KEY
// Deploy: supabase functions deploy deepgram-token --project-ref faomczmipsccwbhpivmp
// ============================================================

const ALLOWED_ORIGINS = [
  'https://themoderator.app',
  'https://the-moderator.vercel.app',
  'http://localhost:3000',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }

  // --- Auth: verify caller is a real Supabase user ---
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization token' }),
      { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }

  const sbUrl = Deno.env.get('SUPABASE_URL');
  const sbAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!sbUrl || !sbAnonKey) {
    console.error('[deepgram-token] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    return new Response(
      JSON.stringify({ error: 'Server misconfigured' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const authRes = await fetch(`${sbUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': sbAnonKey,
      },
    });

    if (!authRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }
  } catch (err) {
    console.error('[deepgram-token] Auth check failed:', err);
    return new Response(
      JSON.stringify({ error: 'Auth service unreachable' }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }

  // --- Generate Deepgram temporary JWT ---
  const dgKey = Deno.env.get('DEEPGRAM_API_KEY');

  if (!dgKey) {
    console.error('[deepgram-token] Missing DEEPGRAM_API_KEY');
    return new Response(
      JSON.stringify({ error: 'Deepgram not configured' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const dgRes = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${dgKey}`,
        'Content-Type': 'application/json',
      },
      // 30s default TTL — token only needed at WebSocket open, connection persists after
    });

    if (!dgRes.ok) {
      const errText = await dgRes.text();
      console.error(`[deepgram-token] Deepgram API ${dgRes.status}: ${errText}`);
      return new Response(
        JSON.stringify({ error: 'Deepgram token generation failed' }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const dgData = await dgRes.json();

    // Validate response shape
    if (!dgData.access_token) {
      console.error('[deepgram-token] Unexpected Deepgram response:', JSON.stringify(dgData));
      return new Response(
        JSON.stringify({ error: 'Invalid Deepgram response' }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ token: dgData.access_token, expires_in: dgData.expires_in || 30 }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[deepgram-token] Deepgram fetch error:', err);
    return new Response(
      JSON.stringify({ error: 'Deepgram service unreachable' }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
