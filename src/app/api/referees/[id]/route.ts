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
  const refereeId = parseInt(id, 10);
  if (Number.isNaN(refereeId)) {
    return NextResponse.json({ error: "Invalid referee id" }, { status: 400 });
  }

  const { data: referee, error: refError } = await supabase
    .from("referees")
    .select("*")
    .eq("id", refereeId)
    .single();

  if (refError || !referee) {
    return NextResponse.json({ error: "Referee not found" }, { status: 404 });
  }

  const { data: scores } = await supabase
    .from("referee_scores")
    .select("*")
    .eq("referee_id", refereeId);

  const { data: lastMatches } = await supabase
    .from("referee_match_stats")
    .select(`
      match_id,
      yellow_cards,
      red_cards,
      penalties,
      var_interventions,
      home_yellow_cards,
      away_yellow_cards,
      home_red_cards,
      away_red_cards,
      matches ( date, home_team, away_team, league_id )
    `)
    .eq("referee_id", refereeId)
    .order("match_id", { ascending: false })
    .limit(10);

  return NextResponse.json({
    referee,
    scores: scores || [],
    lastMatches: lastMatches || [],
  });
}
