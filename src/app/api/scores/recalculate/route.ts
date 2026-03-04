import { NextResponse } from "next/server";
import { recalculateAllScores, recalculateScoresForLeague } from "@/lib/recalculate-scores";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const leagueId = body.leagueId as number | undefined;

    if (leagueId != null) {
      const scores = await recalculateScoresForLeague(leagueId);
      return NextResponse.json({ ok: true, leagueId, scores });
    }
    const result = await recalculateAllScores();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Recalculate failed" },
      { status: 500 }
    );
  }
}
