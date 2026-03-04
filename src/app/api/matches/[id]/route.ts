import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = (await params).id;
  const matchId = parseInt(id, 10);
  if (Number.isNaN(matchId)) {
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 });
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(`
      *,
      referees ( id, name ),
      leagues ( id, name )
    `)
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const refereeId = match.referee_id ?? (match.referees as { id: number } | null)?.id;
  let refereeScore = null;
  if (refereeId) {
    const { data: score } = await supabase
      .from("referee_scores")
      .select("*")
      .eq("referee_id", refereeId)
      .eq("league_id", match.league_id)
      .single();
    refereeScore = score;
  }

  const { data: stats } = await supabase
    .from("referee_match_stats")
    .select("*")
    .eq("match_id", matchId)
    .single();

  return NextResponse.json({
    match,
    refereeScore,
    stats: stats || null,
  });
}
