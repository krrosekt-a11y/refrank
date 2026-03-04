import { NextResponse } from "next/server";
import { ingestFixturesForDate, syncLeagues } from "@/lib/ingest";
import { recalculateScoresForLeague } from "@/lib/recalculate-scores";

export const maxDuration = 60;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { leagueId, date, recalculate } = {
      leagueId: body.leagueId as number | undefined,
      date: body.date as string | undefined,
      recalculate: body.recalculate !== false,
    };

    if (!date) {
      const today = new Date().toISOString().slice(0, 10);
      return NextResponse.json({
        error: "Missing date; use { date: 'YYYY-MM-DD' } or run cron for today",
        hint: `POST with { "leagueId": 39, "date": "${today}", "recalculate": true }`,
      }, { status: 400 });
    }

    await syncLeagues();

    const leagueIds = leagueId ? [leagueId] : [39, 40, 61, 78, 135, 140, 203];
    let matches = 0;
    let stats = 0;
    for (const lid of leagueIds) {
      const result = await ingestFixturesForDate(lid, date, { fetchStats: true });
      matches += result.matches;
      stats += result.stats;
      if (recalculate) await recalculateScoresForLeague(lid);
    }

    return NextResponse.json({
      ok: true,
      date,
      leagues: leagueIds.length,
      matches,
      stats,
      recalculate,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ingest failed" },
      { status: 500 }
    );
  }
}
