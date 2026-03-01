// ============================================================
// COLOSSEUM STRIPE EDGE FUNCTIONS (Item 6.2.1.2, 14.2.1)
// Deploy to Supabase Edge Functions
// Two functions: create-checkout-session + stripe-webhook
// See DEPLOYMENT-GUIDE.md Step 5 for instructions
//
// Session 21 — CORS hardened (wildcard → allowlist)
// ============================================================

/* ============================================================
   FUNCTION 1: create-checkout-session
   Deploy as: supabase/functions/create-checkout-session/index.ts
   Remove the comment wrappers (slash-star / star-slash) when pasting
   ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

// --- CORS ALLOWLIST (was wildcard "*") ---
const ALLOWED_ORIGINS = [
  "https://colosseum-six.vercel.app",
  "https://thecolosseum.app",
  // PLACEHOLDER: Add your custom domain here when you buy one
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { priceId, mode, userId, successUrl, cancelUrl } = await req.json();

    if (!priceId || !mode) {
      return new Response(
        JSON.stringify({ error: "Missing priceId or mode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: mode, // 'subscription' or 'payment'
      success_url: successUrl || "PASTE_YOUR_DEPLOYED_URL_HERE?payment=success",
      cancel_url: cancelUrl || "PASTE_YOUR_DEPLOYED_URL_HERE?payment=canceled",
      metadata: {
        userId: userId || "anonymous",
      },
      // For subscriptions, allow customer to manage later
      ...(mode === "subscription" ? { subscription_data: { metadata: { userId } } } : {}),
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Checkout error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

============================================================ */


/* ============================================================
   FUNCTION 2: stripe-webhook
   Deploy as: supabase/functions/stripe-webhook/index.ts
   Remove the comment wrappers (slash-star / star-slash) when pasting
   NOTE: No CORS needed — Stripe calls this server-to-server
   ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  console.log(`Webhook received: ${event.type}`);

  try {
    switch (event.type) {

      // --- Checkout completed (subscription or one-time) ---
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) break;

        if (session.mode === "subscription") {
          // Determine tier from price
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = subscription.items.data[0]?.price?.id;
          const tier = mapPriceToTier(priceId);

          // Update profile subscription tier
          await supabase
            .from("profiles")
            .update({
              subscription_tier: tier,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
            })
            .eq("id", userId);

          // Log payment
          await supabase.from("payments").insert({
            user_id: userId,
            amount_cents: session.amount_total!,
            currency: session.currency || "usd",
            stripe_payment_id: session.payment_intent as string,
            type: "subscription",
            status: "completed",
          });

        } else if (session.mode === "payment") {
          // Token purchase
          const tokens = mapPriceToTokens(session.amount_total! / 100);

          // Credit tokens
          await supabase.rpc("credit_tokens", {
            p_user_id: userId,
            p_amount: tokens,
            p_reason: "purchase",
          });

          // Log payment
          await supabase.from("payments").insert({
            user_id: userId,
            amount_cents: session.amount_total!,
            currency: session.currency || "usd",
            stripe_payment_id: session.payment_intent as string,
            type: "token_purchase",
            status: "completed",
          });
        }
        break;
      }

      // --- Subscription updated (upgrade/downgrade) ---
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = mapPriceToTier(priceId);

        await supabase
          .from("profiles")
          .update({ subscription_tier: tier })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      // --- Subscription canceled ---
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from("profiles")
          .update({ subscription_tier: "free", stripe_subscription_id: null })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      // --- Payment failed ---
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Look up user by stripe_customer_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          // Log the failure
          await supabase.from("payments").insert({
            user_id: profile.id,
            amount_cents: invoice.amount_due || 0,
            currency: invoice.currency || "usd",
            stripe_payment_id: invoice.id,
            type: "subscription",
            status: "failed",
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});


// --- Helper: map Stripe price ID to tier name ---
// IMPORTANT: Replace these with your actual Stripe price IDs
function mapPriceToTier(priceId: string): string {
  const map: Record<string, string> = {
    "PASTE_STRIPE_PRICE_ID_CONTENDER_MONTHLY": "contender",
    "PASTE_STRIPE_PRICE_ID_CHAMPION_MONTHLY": "champion",
    "PASTE_STRIPE_PRICE_ID_CREATOR_MONTHLY": "creator",
  };
  return map[priceId] || "free";
}

// --- Helper: map dollar amount to token count ---
function mapPriceToTokens(amount: number): number {
  const map: Record<number, number> = {
    0.99: 50,
    3.99: 250,
    7.99: 600,
    19.99: 1800,
  };
  return map[amount] || 0;
}

============================================================ */
