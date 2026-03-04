import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession, getSubscriptionStatus } from "@/lib/stripe";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getSubscriptionStatus(user.id);
  if (tier === "pro") {
    return NextResponse.json({ error: "Already subscribed", url: null }, { status: 400 });
  }

  const session = await createCheckoutSession(user.id, user.email!);
  return NextResponse.json({ url: session.url });
}
