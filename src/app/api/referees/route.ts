import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  let query = supabase
    .from("referee_scores")
    .select(`
      referee_score,
      total_matches,
      referees ( id, name )
    `)
    .order("referee_score", { ascending: false })
    .limit(limit);

  if (leagueId) query = query.eq("league_id", leagueId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
