import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const DB_PATH =
  process.env.LOCAL_DB_PATH ||
  "/Users/aliozkan/RefereeRank/data/tff_referees_matches_full.db";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function runSql(sql) {
  const out = execFileSync("sqlite3", ["-json", DB_PATH, sql], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  }).trim();
  if (!out) return [];
  return JSON.parse(out);
}

function n(v) {
  return Number(v ?? 0);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function computeCareerScore(matches, yellow, red, syr) {
  if (!matches) return 0;
  const ypm = yellow / matches;
  const rpm = red / matches;
  const spm = syr / matches;
  const penalty = ypm * 0.8 + rpm * 2.8 + spm * 1.6;
  return Math.round(clamp(9.6 - penalty, 3.5, 9.6) * 10) / 10;
}

function computeAccuracy(score) {
  return Math.round(clamp(58 + score * 4.1, 60, 97));
}

async function upsertChunked(table, rows, onConflict, chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw error;
  }
}

async function syncReferees() {
  const rows = runSql(`
    SELECT
      r.hakem_id AS id,
      r.name AS name,
      COALESCE(r.city, 'Türkiye') AS city,
      COALESCE(s.matches, 0) AS matches,
      COALESCE(rm.total_matches, 0) AS total_matches,
      COALESCE(s.yellow_cards, 0) AS yellow_cards,
      COALESCE(s.red_cards, 0) AS red_cards,
      COALESCE(s.second_yellow_red_cards, 0) AS second_yellow_red_cards,
      COALESCE(s.penalties, 0) AS penalties
    FROM referees r
    LEFT JOIN (
      SELECT
        hakem_id,
        COUNT(*) AS matches,
        SUM(yellow_cards) AS yellow_cards,
        SUM(red_cards) AS red_cards,
        SUM(second_yellow_red_cards) AS second_yellow_red_cards,
        SUM(penalty_goals) AS penalties
      FROM superlig_hakem_match_stats
      GROUP BY hakem_id
    ) s ON s.hakem_id = r.hakem_id
    LEFT JOIN (
      SELECT hakem_id, COUNT(*) AS total_matches
      FROM referee_matches
      GROUP BY hakem_id
    ) rm ON rm.hakem_id = r.hakem_id
    ORDER BY COALESCE(s.matches, 0) DESC, COALESCE(rm.total_matches, 0) DESC, r.name ASC;
  `);

  const payload = rows.map((r) => {
    const matches = n(r.matches);
    const yellow = n(r.yellow_cards);
    const red = n(r.red_cards);
    const syr = n(r.second_yellow_red_cards);
    const score = computeCareerScore(matches, yellow, red, syr);
    const ypm = matches ? yellow / matches : 0;
    const rpm = matches ? red / matches : 0;
    return {
      id: String(r.id),
      name: String(r.name || ""),
      age: 32 + (Number(String(r.id).slice(-2)) % 16),
      country: "Türkiye",
      flag: "🇹🇷",
      photo: `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(String(r.name || ""))}`,
      matches,
      yellow_cards_per_match: Number(ypm.toFixed(2)),
      red_cards_per_match: Number(rpm.toFixed(2)),
      fouls_per_match: Number((21 + ypm * 2 + rpm * 5).toFixed(1)),
      accuracy: computeAccuracy(score),
      career_score: score,
      total_ratings: Math.max(300, matches * 120),
      badges: score >= 8.3 ? ["elite"] : score >= 7.7 ? ["consistent"] : [],
      bio: `${String(r.name || "")} için Trendyol Süper Lig bazlı kart profili.`,
      league: "Süper Lig",
      penalties: n(r.penalties),
      yellow_cards: yellow,
      red_cards: red,
      city: String(r.city || ""),
      second_yellow_red_cards: syr,
      updated_at: new Date().toISOString(),
    };
  });

  await upsertChunked("app_referees", payload, "id");
  console.log(`Synced app_referees: ${payload.length}`);
}

async function syncMatches() {
  const rows = runSql(`
    SELECT
      s.mac_id AS id,
      s.hakem_id AS referee_id,
      s.referee_name AS referee_name,
      s.match_date_iso AS match_date_iso,
      s.home_team AS home_team,
      s.away_team AS away_team,
      s.score AS score,
      s.match_date AS date,
      s.organization AS league,
      s.penalty_goals AS penalty_goals,
      fw.week_number AS week_number,
      s.yellow_cards AS yellow_cards,
      s.red_cards AS red_cards,
      s.second_yellow_red_cards AS second_yellow_red_cards,
      c.home_yellow_total AS home_yellow_cards,
      c.away_yellow_total AS away_yellow_cards,
      c.home_second_yellow_red AS home_second_yellow_red_cards,
      c.away_second_yellow_red AS away_second_yellow_red_cards,
      c.home_red_direct AS home_red_cards,
      c.away_red_direct AS away_red_cards,
      af.home_fouls AS home_fouls,
      af.away_fouls AS away_fouls,
      af.fouls_total AS total_fouls
    FROM superlig_hakem_match_stats s
    LEFT JOIN superlig_fixture_weeks fw ON fw.mac_id = s.mac_id
    LEFT JOIN superlig_match_team_cards c ON c.mac_id = s.mac_id
    LEFT JOIN api_football_superlig_matches af ON af.fixture_id = s.mac_id
    ORDER BY s.match_date_iso DESC;
  `);

  const payload = rows.map((r) => ({
    id: n(r.id),
    referee_id: String(r.referee_id || ""),
    referee_name: String(r.referee_name || ""),
    match_date_iso: String(r.match_date_iso || ""),
    date: String(r.date || ""),
    league: String(r.league || ""),
    home_team: String(r.home_team || ""),
    away_team: String(r.away_team || ""),
    score: String(r.score || ""),
    penalty_goals: n(r.penalty_goals),
    week_number: Number.isFinite(n(r.week_number)) ? n(r.week_number) : null,
    yellow_cards: n(r.yellow_cards),
    red_cards: n(r.red_cards),
    second_yellow_red_cards: n(r.second_yellow_red_cards),
    home_yellow_cards: n(r.home_yellow_cards),
    away_yellow_cards: n(r.away_yellow_cards),
    home_second_yellow_red_cards: n(r.home_second_yellow_red_cards),
    away_second_yellow_red_cards: n(r.away_second_yellow_red_cards),
    home_red_cards: n(r.home_red_cards),
    away_red_cards: n(r.away_red_cards),
    home_fouls: Number.isFinite(n(r.home_fouls)) ? n(r.home_fouls) : null,
    away_fouls: Number.isFinite(n(r.away_fouls)) ? n(r.away_fouls) : null,
    total_fouls: Number.isFinite(n(r.total_fouls)) ? n(r.total_fouls) : null,
    updated_at: new Date().toISOString(),
  }));

  await upsertChunked("app_matches", payload, "id");
  console.log(`Synced app_matches: ${payload.length}`);
}

async function syncUpcoming() {
  const rows = runSql(`
    SELECT
      fixture_id, date, referee, referee_is_estimated, referee_confidence,
      league_id, league_name, round_name, home_team, away_team, status,
      fetched_at
    FROM upcoming_fixtures_cache
    WHERE fetched_at = (SELECT MAX(fetched_at) FROM upcoming_fixtures_cache)
    ORDER BY date ASC;
  `);
  const payload = rows.map((r) => ({
    fixture_id: n(r.fixture_id),
    date: String(r.date || ""),
    referee: String(r.referee || ""),
    referee_is_estimated: Boolean(n(r.referee_is_estimated)),
    referee_confidence: Number(r.referee_confidence || 0),
    league_id: n(r.league_id),
    league_name: String(r.league_name || ""),
    round: String(r.round_name || ""),
    home_team: String(r.home_team || ""),
    away_team: String(r.away_team || ""),
    status: String(r.status || ""),
    fetched_at: String(r.fetched_at || new Date().toISOString()),
  }));

  if (!payload.length) return;
  await upsertChunked("app_upcoming_fixtures", payload, "fixture_id");
  console.log(`Synced app_upcoming_fixtures: ${payload.length}`);
}

async function syncWeekFixtures() {
  const rows = runSql(`
    SELECT
      week_number, fixture_id, date, league_name, round_name, home_team, away_team,
      referee, status, score, venue, fetched_at
    FROM sportmonks_week_fixtures_cache;
  `);

  const payload = rows.map((r) => ({
    week_number: n(r.week_number),
    fixture_id: n(r.fixture_id),
    date: String(r.date || ""),
    league_name: String(r.league_name || ""),
    round: String(r.round_name || ""),
    home_team: String(r.home_team || ""),
    away_team: String(r.away_team || ""),
    referee: String(r.referee || ""),
    status: String(r.status || ""),
    score: String(r.score || ""),
    venue: String(r.venue || ""),
    fetched_at: String(r.fetched_at || new Date().toISOString()),
  }));
  if (!payload.length) return;
  await upsertChunked("app_sportmonks_week_fixtures", payload, "week_number,fixture_id");
  console.log(`Synced app_sportmonks_week_fixtures: ${payload.length}`);
}

async function syncEvents() {
  const rows = runSql(`
    SELECT
      e.fixture_id, e.event_id, e.minute, e.extra_minute, e.type_name, e.team_name,
      e.player_name, e.related_player_name, e.result_text, e.fetched_at
    FROM sportmonks_fixture_events_cache e
    ORDER BY e.fixture_id DESC, e.minute DESC
    LIMIT 15000;
  `);

  const payload = rows.map((r) => ({
    fixture_id: n(r.fixture_id),
    event_id: String(r.event_id || ""),
    minute: n(r.minute),
    extra_minute: n(r.extra_minute),
    type: String(r.type_name || ""),
    team: String(r.team_name || ""),
    player: String(r.player_name || ""),
    related_player: String(r.related_player_name || ""),
    result: String(r.result_text || ""),
    home_team: "",
    away_team: "",
    match_date: "",
    fetched_at: String(r.fetched_at || new Date().toISOString()),
  }));

  if (!payload.length) return;
  await upsertChunked("app_match_events", payload, "fixture_id,event_id", 700);
  console.log(`Synced app_match_events: ${payload.length}`);
}

async function syncLiveNow() {
  const row = runSql(`
    SELECT fixture_id, payload_json, fetched_at
    FROM sportmonks_live_now_cache
    WHERE cache_id=1
    LIMIT 1;
  `)[0];

  if (!row) return;
  let payload = null;
  try {
    payload = row.payload_json ? JSON.parse(String(row.payload_json)) : null;
  } catch {
    payload = null;
  }
  const body = {
    id: 1,
    fixture_id: payload?.fixture_id ? n(payload.fixture_id) : null,
    date: payload?.date ? String(payload.date) : null,
    league_name: payload?.league_name ? String(payload.league_name) : null,
    round: payload?.round ? String(payload.round) : null,
    home_team: payload?.home_team ? String(payload.home_team) : null,
    away_team: payload?.away_team ? String(payload.away_team) : null,
    status: payload?.status ? String(payload.status) : null,
    minute: payload?.minute ? n(payload.minute) : 0,
    score: payload?.score ? String(payload.score) : null,
    fetched_at: String(row.fetched_at || new Date().toISOString()),
  };
  const { error } = await supabase.from("app_live_now_cache").upsert(body, {
    onConflict: "id",
  });
  if (error) throw error;
  console.log("Synced app_live_now_cache: 1");
}

async function main() {
  await syncReferees();
  await syncMatches();
  await syncUpcoming();
  await syncWeekFixtures();
  await syncEvents();
  await syncLiveNow();
  console.log("Sync complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
