// ============================================================
// THE MODERATOR — TURN Credentials Edge Function
// Session 221: RTC-BUG-1 — Cloudflare TURN credential generation
//
// Generates short-lived TURN credentials via Cloudflare Realtime API.
// Client calls this before creating RTCPeerConnection.
// Secrets required: CLOUDFLARE_TURN_KEY_ID, CLOUDFLARE_TURN_API_TOKEN
//
// Deploy: supabase functions deploy turn-credentials
// ============================================================

const CREDENTIAL_TTL = 86400; // 24 hours — covers any debate length

const ALLOWED_ORIGINS = [
  'https://colosseum-six.vercel.app',
  'https://thecolosseum.app',
  'https://themoderator.app',
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
    console.error('[turn-credentials] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
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
    console.error('[turn-credentials] Auth check failed:', err);
    return new Response(
      JSON.stringify({ error: 'Auth service unreachable' }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }

  // --- Generate TURN credentials via Cloudflare API ---
  const keyId = Deno.env.get('CLOUDFLARE_TURN_KEY_ID');
  const apiToken = Deno.env.get('CLOUDFLARE_TURN_API_TOKEN');

  if (!keyId || !apiToken) {
    console.error('[turn-credentials] Missing CLOUDFLARE_TURN_KEY_ID or CLOUDFLARE_TURN_API_TOKEN');
    return new Response(
      JSON.stringify({ error: 'TURN not configured' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const cfRes = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: CREDENTIAL_TTL }),
      },
    );

    if (!cfRes.ok) {
      const errText = await cfRes.text();
      console.error(`[turn-credentials] Cloudflare API ${cfRes.status}: ${errText}`);
      return new Response(
        JSON.stringify({ error: 'TURN credential generation failed' }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const cfData = await cfRes.json();

    // Validate response shape
    if (!cfData.iceServers || !Array.isArray(cfData.iceServers)) {
      console.error('[turn-credentials] Unexpected Cloudflare response:', JSON.stringify(cfData));
      return new Response(
        JSON.stringify({ error: 'Invalid TURN response' }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ iceServers: cfData.iceServers }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[turn-credentials] Cloudflare fetch error:', err);
    return new Response(
      JSON.stringify({ error: 'TURN service unreachable' }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
