// ============================================================
// STRIPE EDGE FUNCTION — CORS PATCH (Move 3)
// Session 16 — February 28, 2026
//
// WHAT TO DO:
// In your deployed Supabase Edge Functions for Stripe, find:
//
//   const corsHeaders = {
//     "Access-Control-Allow-Origin": "*",
//     ...
//   };
//
// And REPLACE with the code below.
// ============================================================

// --- FIND THIS (in both create-checkout-session AND stripe-webhook): ---

/*
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
*/

// --- REPLACE WITH THIS: ---

const ALLOWED_ORIGINS = [
  "https://colosseum-six.vercel.app",
  "https://thecolosseum.app",
  // PLACEHOLDER: add custom domain when purchased
];

function getCorsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// --- THEN update every usage of corsHeaders: ---

// BEFORE:
//   return new Response("ok", { headers: corsHeaders });
//   return new Response(JSON.stringify(...), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

// AFTER:
//   const cors = getCorsHeaders(req);
//   return new Response("ok", { headers: cors });
//   return new Response(JSON.stringify(...), { headers: { ...cors, "Content-Type": "application/json" } });

// EXAMPLE — full patched serve() handler:
/*
serve(async (req) => {
  const cors = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    // ... your checkout session logic ...

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
*/

// NOTE: The stripe-webhook function does NOT need CORS headers
// because Stripe calls it server-to-server (no browser involved).
// But it's fine to leave them — they don't hurt.
