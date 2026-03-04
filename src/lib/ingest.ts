import type { ApiFixture, ApiFixtureStatsRow } from "@/lib/api-football";
import {
  fetchFixturesByLeagueAndDate,
  fetchFixtureStats,
  fetchLeagues,
  fetchRefereesByLeagueAndSeason,
} from "@/lib/api-football";
import { createServiceRoleClient } from "@/lib/supabase/service";

const supabase = createServiceRoleClient();

const CURRENT_SEASON = new Date().getFullYear();

function getStatValue(stats: ApiFixtureStatsRow[], teamId: number, type: string): number {
  const team = stats.find((s) => s.team.id === teamId);
  if (!team) return 0;
  const stat = team.statistics.find((s) => s.type === type);
  if (!stat || stat.value === null) return 0;
  return typeof stat.value === "number" ? stat.value : parseInt(String(stat.value), 10) || 0;
}

/** Map API-Football fixture to our match + referee (by name; create if missing) */
async function upsertRefereeByName(name: string): Promise<number> {
  const slug = name.toLowerCase().replace(/\s+/g, "_");
  const id = hashStringToId(slug);
  const { data: existing } = await supabase.from("referees").select("id").eq("id", id).single();
  if (existing) return existing.id;
  await supabase.from("referees").upsert({ id, name }, { onConflict: "id" });
  return id;
}

function hashStringToId(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 2147483647;
}

export async function syncLeagues(): Promise<void> {
  const leagues = await fetchLeagues();
  for (const l of leagues) {
    await supabase.from("leagues").upsert(
      { id: l.id, name: l.name, country: l.country },
      { onConflict: "id" }
    );
  }
}

/** Ingest fixtures for a league on a given date; optionally fetch stats per fixture */
export async function ingestFixturesForDate(
  leagueId: number,
  date: string,
  options: { fetchStats?: boolean } = {}
): Promise<{ matches: number; stats: number }> {
  const fixtures: ApiFixture[] = await fetchFixturesByLeagueAndDate(leagueId, date);
  let matchesInserted = 0;
  let statsInserted = 0;

  for (const f of fixtures) {
    const refereeName = f.referee || "Unknown";
    const refereeId = await upsertRefereeByName(refereeName);
    const matchId = f.fixture.id;
    const matchRow = {
      id: matchId,
      league_id: leagueId,
      referee_id: refereeId,
      date: date,
      home_team: f.teams.home.name,
      away_team: f.teams.away.name,
      home_team_id: f.teams.home.id,
      away_team_id: f.teams.away.id,
      status: f.fixture.status?.short,
    };
    const { error: matchErr } = await supabase.from("matches").upsert(matchRow, { onConflict: "id" });
    if (!matchErr) matchesInserted++;

    if (options.fetchStats) {
      const statsRows = await fetchFixtureStats(matchId);
      const homeId = f.teams.home.id;
      const awayId = f.teams.away.id;
      const yellowHome = getStatValue(statsRows, homeId, "Yellow Cards");
      const yellowAway = getStatValue(statsRows, awayId, "Yellow Cards");
      const redHome = getStatValue(statsRows, homeId, "Red Cards");
      const redAway = getStatValue(statsRows, awayId, "Red Cards");
      const totalYellow = yellowHome + yellowAway;
      const totalRed = redHome + redAway;
      const penalties =
        getStatValue(statsRows, homeId, "Penalty") +
        getStatValue(statsRows, awayId, "Penalty");
      const fouls =
        getStatValue(statsRows, homeId, "Fouls") + getStatValue(statsRows, awayId, "Fouls");
      const varInterventions = 0;

      const statRow = {
        match_id: matchId,
        referee_id: refereeId,
        league_id: leagueId,
        yellow_cards: totalYellow,
        red_cards: totalRed,
        penalties,
        fouls,
        var_interventions: varInterventions,
        home_yellow_cards: yellowHome,
        away_yellow_cards: yellowAway,
        home_red_cards: redHome,
        away_red_cards: redAway,
      };
      const { error: statErr } = await supabase
        .from("referee_match_stats")
        .upsert(statRow, { onConflict: "match_id" });
      if (!statErr) statsInserted++;
    }
  }

  return { matches: matchesInserted, stats: statsInserted };
}

/** Ingest referees for a league/season (so we have referee ids); then optionally run fixture ingest */
export async function ingestRefereesForLeague(leagueId: number, season: number = CURRENT_SEASON): Promise<void> {
  const refs = await fetchRefereesByLeagueAndSeason(leagueId, season);
  for (const r of refs) {
    await supabase.from("referees").upsert({ id: r.id, name: r.name }, { onConflict: "id" });
  }
}
