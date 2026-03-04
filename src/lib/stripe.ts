import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});

const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function createCheckoutSession(userId: string, email: string) {
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase.from("users").select("stripe_customer_id").eq("id", userId).single();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    success_url: `${APP_URL}/dashboard?success=1`,
    cancel_url: `${APP_URL}/dashboard?canceled=1`,
    customer_email: profile?.stripe_customer_id ? undefined : email,
    customer: profile?.stripe_customer_id || undefined,
    metadata: { user_id: userId },
    subscription_data: { metadata: { user_id: userId } },
  });
  return session;
}

export async function getSubscriptionStatus(userId: string): Promise<"free" | "pro"> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  return data ? "pro" : "free";
}
