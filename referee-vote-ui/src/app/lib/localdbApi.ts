import { createClient } from "@supabase/supabase-js";
import type { Referee } from "../data";

export type DbMatch = {
  id: number;
  refereeId?: string;
  refereeName?: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  date: string;
  league: string;
  weekNumber?: number;
  penaltyGoals: number;
  yellowCards: number;
  redCards: number;
  secondYellowRedCards: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeSecondYellowRedCards: number;
  awaySecondYellowRedCards: number;
  homeRedCards: number;
  awayRedCards: number;
  homeFouls?: number | null;
  awayFouls?: number | null;
  totalFouls?: number | null;
};

export type TeamCard = {
  team: string;
  matches: number;
  total_cards: number;
  avg_cards_per_match: number;
};

export type TeamMatchCard = {
  id: number;
  date: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  is_home: number;
  yellow_cards: number;
  second_yellow_red_cards: number;
  red_cards: number;
  opp_yellow_cards: number;
  opp_second_yellow_red_cards: number;
  opp_red_cards: number;
};

export type UpcomingFixture = {
  fixture_id: number;
  date: string;
  referee: string;
  referee_is_estimated: boolean;
  referee_confidence: number;
  league_id: number;
  league_name: string;
  round: string;
  home_team: string;
  away_team: string;
  status: string;
};

export type MatchDecisionEvent = {
  id: string;
  minute: number;
  extra_minute: number;
  type: string;
  team: string;
  player: string;
  related_player?: string;
  result: string;
};

export type SportmonksWeekFixture = {
  fixture_id: number;
  date: string;
  league_name: string;
  round: string;
  home_team: string;
  away_team: string;
  referee: string;
  status: string;
  score: string;
  venue: string;
};

export type LiveNowFixture = {
  fixture_id: number;
  date: string;
  league_name: string;
  round: string;
  home_team: string;
  away_team: string;
  status: string;
  minute: number;
  score: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

function n(v: unknown): number {
  return Number(v ?? 0);
}

function shouldHideReferee(ref: Referee): boolean {
  return Number(ref.matches || 0) === 0 && Number(ref.careerScore || 0) >= 9.6;
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`API error ${r.status}`);
  }
  return (await r.json()) as T;
}

async function tryLocalData<T>(url: string): Promise<T[] | null> {
  try {
    const res = await getJson<{ data: T[] }>(url);
    return res.data || [];
  } catch {
    return null;
  }
}

function mapRefereeRow(row: any): Referee {
  return {
    id: String(row.id || ""),
    name: String(row.name || ""),
    age: n(row.age),
    country: String(row.country || "Türkiye"),
    flag: String(row.flag || "🇹🇷"),
    photo: String(row.photo || ""),
    matches: n(row.matches),
    yellowCardsPerMatch: Number(row.yellow_cards_per_match || 0),
    redCardsPerMatch: Number(row.red_cards_per_match || 0),
    foulsPerMatch: Number(row.fouls_per_match || 0),
    accuracy: Number(row.accuracy || 0),
    careerScore: Number(row.career_score || 0),
    totalRatings: n(row.total_ratings),
    badges: Array.isArray(row.badges) ? row.badges : [],
    performanceTrend: [],
    bio: String(row.bio || ""),
    league: String(row.league || "Süper Lig"),
    penalties: n(row.penalties),
    yellowCards: n(row.yellow_cards),
    redCards: n(row.red_cards),
  };
}

function mapMatchRow(row: any): DbMatch {
  return {
    id: n(row.id),
    refereeId: String(row.referee_id || ""),
    refereeName: String(row.referee_name || ""),
    homeTeam: String(row.home_team || ""),
    awayTeam: String(row.away_team || ""),
    score: String(row.score || ""),
    date: String(row.date || ""),
    league: String(row.league || ""),
    weekNumber: row.week_number == null ? undefined : n(row.week_number),
    penaltyGoals: n(row.penalty_goals),
    yellowCards: n(row.yellow_cards),
    redCards: n(row.red_cards),
    secondYellowRedCards: n(row.second_yellow_red_cards),
    homeYellowCards: n(row.home_yellow_cards),
    awayYellowCards: n(row.away_yellow_cards),
    homeSecondYellowRedCards: n(row.home_second_yellow_red_cards),
    awaySecondYellowRedCards: n(row.away_second_yellow_red_cards),
    homeRedCards: n(row.home_red_cards),
    awayRedCards: n(row.away_red_cards),
    homeFouls: row.home_fouls == null ? null : n(row.home_fouls),
    awayFouls: row.away_fouls == null ? null : n(row.away_fouls),
    totalFouls: row.total_fouls == null ? null : n(row.total_fouls),
  };
}

export async function fetchDbReferees(limit = 120): Promise<Referee[]> {
  const local = await tryLocalData<Referee>(`/api/localdb/referees?limit=${limit}`);
  if (local) return local.filter((r) => !shouldHideReferee(r));

  if (!supabase) return [];
  const { data, error } = await supabase
    .from("app_referees")
    .select("*")
    .order("career_score", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []).map(mapRefereeRow).filter((r) => !shouldHideReferee(r));
}

export async function fetchDbReferee(id: string): Promise<Referee | null> {
  try {
    const res = await getJson<{ data: Referee }>(`/api/localdb/referees/${encodeURIComponent(id)}`);
    if (!res.data) return null;
    return shouldHideReferee(res.data) ? null : res.data;
  } catch {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("app_referees")
      .select("*")
      .eq("id", String(id))
      .maybeSingle();
    if (error || !data) return null;
    const mapped = mapRefereeRow(data);
    return shouldHideReferee(mapped) ? null : mapped;
  }
}

export async function fetchDbRefereeMatches(id: string, limit = 80): Promise<DbMatch[]> {
  const local = await tryLocalData<DbMatch>(`/api/localdb/referees/${encodeURIComponent(id)}/matches?limit=${limit}`);
  if (local) return local;

  if (!supabase) return [];
  const { data, error } = await supabase
    .from("app_matches")
    .select("*")
    .eq("referee_id", String(id))
    .order("match_date_iso", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []).map(mapMatchRow);
}

export async function fetchDbRefereeTeams(id: string): Promise<TeamCard[]> {
  const local = await tryLocalData<TeamCard>(`/api/localdb/referees/${encodeURIComponent(id)}/teams`);
  if (local) return local;

  const matches = await fetchDbRefereeMatches(id, 400);
  const map = new Map<string, { matches: number; cards: number }>();
  for (const m of matches) {
    const homeCards = n(m.homeYellowCards) + n(m.homeRedCards) + n(m.homeSecondYellowRedCards);
    const awayCards = n(m.awayYellowCards) + n(m.awayRedCards) + n(m.awaySecondYellowRedCards);
    const prevHome = map.get(m.homeTeam) || { matches: 0, cards: 0 };
    map.set(m.homeTeam, { matches: prevHome.matches + 1, cards: prevHome.cards + homeCards });
    const prevAway = map.get(m.awayTeam) || { matches: 0, cards: 0 };
    map.set(m.awayTeam, { matches: prevAway.matches + 1, cards: prevAway.cards + awayCards });
  }
  return [...map.entries()]
    .map(([team, agg]) => ({
      team,
      matches: agg.matches,
      total_cards: agg.cards,
      avg_cards_per_match: agg.matches ? Number((agg.cards / agg.matches).toFixed(3)) : 0,
    }))
    .sort((a, b) => b.total_cards - a.total_cards)
    .slice(0, 20);
}

export async function fetchDbRefereeTeamMatches(id: string, team: string): Promise<TeamMatchCard[]> {
  const local = await tryLocalData<TeamMatchCard>(
    `/api/localdb/referees/${encodeURIComponent(id)}/teams/${encodeURIComponent(team)}/matches`,
  );
  if (local) return local;

  const matches = await fetchDbRefereeMatches(id, 600);
  return matches
    .filter((m) => m.homeTeam === team || m.awayTeam === team)
    .map((m) => {
      const isHome = m.homeTeam === team ? 1 : 0;
      return {
        id: m.id,
        date: m.date,
        league: m.league,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        score: m.score,
        is_home: isHome,
        yellow_cards: isHome ? n(m.homeYellowCards) : n(m.awayYellowCards),
        second_yellow_red_cards: isHome
          ? n(m.homeSecondYellowRedCards)
          : n(m.awaySecondYellowRedCards),
        red_cards: isHome ? n(m.homeRedCards) : n(m.awayRedCards),
        opp_yellow_cards: isHome ? n(m.awayYellowCards) : n(m.homeYellowCards),
        opp_second_yellow_red_cards: isHome
          ? n(m.awaySecondYellowRedCards)
          : n(m.homeSecondYellowRedCards),
        opp_red_cards: isHome ? n(m.awayRedCards) : n(m.homeRedCards),
      };
    })
    .slice(0, 120);
}

export async function fetchDbMatches(limit = 120): Promise<DbMatch[]> {
  const local = await tryLocalData<DbMatch>(`/api/localdb/matches?limit=${limit}`);
  if (local) return local;

  if (!supabase) return [];
  const { data, error } = await supabase
    .from("app_matches")
    .select("*")
    .order("match_date_iso", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []).map(mapMatchRow);
}

export async function fetchUpcomingFixtures(days = 7): Promise<UpcomingFixture[]> {
  const local = await tryLocalData<UpcomingFixture>(`/api/localdb/upcoming-fixtures?days=${days}`);
  if (local) return local;

  if (!supabase) return [];
  const { data, error } = await supabase
    .from("app_upcoming_fixtures")
    .select("*")
    .order("date", { ascending: true })
    .limit(300);
  if (error) return [];

  const now = Date.now();
  const maxTs = now + days * 24 * 60 * 60 * 1000;
  return (data || [])
    .map((r: any) => ({
      fixture_id: n(r.fixture_id),
      date: String(r.date || ""),
      referee: String(r.referee || ""),
      referee_is_estimated: Boolean(r.referee_is_estimated),
      referee_confidence: Number(r.referee_confidence || 0),
      league_id: n(r.league_id),
      league_name: String(r.league_name || ""),
      round: String(r.round || ""),
      home_team: String(r.home_team || ""),
      away_team: String(r.away_team || ""),
      status: String(r.status || ""),
    }))
    .filter((f) => {
      const t = new Date(String(f.date || "").replace(" ", "T")).getTime();
      if (!Number.isFinite(t)) return true;
      return t >= now - 10 * 60 * 1000 && t <= maxTs + 24 * 60 * 60 * 1000;
    });
}

export async function fetchMatchDecisionEvents(params: {
  fixtureId?: number;
  homeTeam: string;
  awayTeam: string;
  date: string;
}): Promise<MatchDecisionEvent[]> {
  try {
    const byFixture = new URLSearchParams();
    if (params.fixtureId && Number(params.fixtureId) > 0) {
      byFixture.set("fixture_id", String(Math.trunc(params.fixtureId)));
      const res = await getJson<{ data: MatchDecisionEvent[] }>(`/api/localdb/match-events?${byFixture.toString()}`);
      const rows = res.data || [];
      if (rows.length > 0) return rows;
    }

    const byMatch = new URLSearchParams();
    byMatch.set("home", params.homeTeam);
    byMatch.set("away", params.awayTeam);
    byMatch.set("date", params.date);
    const fallback = await getJson<{ data: MatchDecisionEvent[] }>(`/api/localdb/match-events?${byMatch.toString()}`);
    return fallback.data || [];
  } catch {
    if (!supabase) return [];

    if (params.fixtureId && Number(params.fixtureId) > 0) {
      const { data, error } = await supabase
        .from("app_match_events")
        .select("*")
        .eq("fixture_id", Math.trunc(params.fixtureId))
        .order("minute", { ascending: false })
        .order("extra_minute", { ascending: false })
        .limit(400);
      if (!error && data && data.length) {
        return data.map((r: any) => ({
          id: String(r.event_id || ""),
          minute: n(r.minute),
          extra_minute: n(r.extra_minute),
          type: String(r.type || ""),
          team: String(r.team || ""),
          player: String(r.player || ""),
          related_player: String(r.related_player || ""),
          result: String(r.result || ""),
        }));
      }
    }

    return [];
  }
}

export async function fetchSportmonksWeekFixtures(week = 24): Promise<SportmonksWeekFixture[]> {
  const local = await tryLocalData<SportmonksWeekFixture>(`/api/localdb/sportmonks-week?week=${week}`);
  if (local) return local;

  if (!supabase) return [];
  const { data, error } = await supabase
    .from("app_sportmonks_week_fixtures")
    .select("*")
    .eq("week_number", week)
    .order("date", { ascending: true })
    .limit(200);
  if (error) return [];
  return (data || []).map((r: any) => ({
    fixture_id: n(r.fixture_id),
    date: String(r.date || ""),
    league_name: String(r.league_name || ""),
    round: String(r.round || ""),
    home_team: String(r.home_team || ""),
    away_team: String(r.away_team || ""),
    referee: String(r.referee || ""),
    status: String(r.status || ""),
    score: String(r.score || ""),
    venue: String(r.venue || ""),
  }));
}

export async function fetchLiveNowFixture(): Promise<LiveNowFixture | null> {
  try {
    const res = await getJson<{ data: LiveNowFixture | null }>(`/api/localdb/live-now`);
    return res.data || null;
  } catch {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("app_live_now_cache")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data || !data.fixture_id) return null;
    return {
      fixture_id: n(data.fixture_id),
      date: String(data.date || ""),
      league_name: String(data.league_name || ""),
      round: String(data.round || ""),
      home_team: String(data.home_team || ""),
      away_team: String(data.away_team || ""),
      status: String(data.status || ""),
      minute: n(data.minute),
      score: String(data.score || ""),
    };
  }
}
