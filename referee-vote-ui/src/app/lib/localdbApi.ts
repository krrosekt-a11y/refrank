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

type SnapshotData = {
  generated_at: string;
  referees: Referee[];
  matches: DbMatch[];
  referee_matches_by_id: Record<string, DbMatch[]>;
  referee_teams_by_id: Record<string, TeamCard[]>;
  referee_team_matches_by_key: Record<string, TeamMatchCard[]>;
  upcoming: UpcomingFixture[];
};

let snapshotPromise: Promise<SnapshotData | null> | null = null;

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`API error ${r.status}`);
  }
  return (await r.json()) as T;
}

async function getSnapshot(): Promise<SnapshotData | null> {
  if (!snapshotPromise) {
    snapshotPromise = fetch("/data/snapshot.json")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return snapshotPromise;
}

export async function fetchDbReferees(limit = 120): Promise<Referee[]> {
  try {
    const res = await getJson<{ data: Referee[] }>(`/api/localdb/referees?limit=${limit}`);
    return res.data || [];
  } catch {
    const snap = await getSnapshot();
    return (snap?.referees || []).slice(0, limit);
  }
}

export async function fetchDbReferee(id: string): Promise<Referee | null> {
  try {
    const res = await getJson<{ data: Referee }>(`/api/localdb/referees/${encodeURIComponent(id)}`);
    return res.data ?? null;
  } catch {
    const snap = await getSnapshot();
    return (snap?.referees || []).find((r) => r.id === id) || null;
  }
}

export async function fetchDbRefereeMatches(id: string, limit = 80): Promise<DbMatch[]> {
  try {
    const res = await getJson<{ data: DbMatch[] }>(
      `/api/localdb/referees/${encodeURIComponent(id)}/matches?limit=${limit}`
    );
    return res.data || [];
  } catch {
    const snap = await getSnapshot();
    return (snap?.referee_matches_by_id?.[id] || []).slice(0, limit);
  }
}

export async function fetchDbRefereeTeams(id: string): Promise<TeamCard[]> {
  try {
    const res = await getJson<{ data: TeamCard[] }>(
      `/api/localdb/referees/${encodeURIComponent(id)}/teams`
    );
    return res.data || [];
  } catch {
    const snap = await getSnapshot();
    return snap?.referee_teams_by_id?.[id] || [];
  }
}

export async function fetchDbRefereeTeamMatches(id: string, team: string): Promise<TeamMatchCard[]> {
  try {
    const res = await getJson<{ data: TeamMatchCard[] }>(
      `/api/localdb/referees/${encodeURIComponent(id)}/teams/${encodeURIComponent(team)}/matches`
    );
    return res.data || [];
  } catch {
    const snap = await getSnapshot();
    return snap?.referee_team_matches_by_key?.[`${id}::${team}`] || [];
  }
}

export async function fetchDbMatches(limit = 120): Promise<DbMatch[]> {
  try {
    const res = await getJson<{ data: DbMatch[] }>(`/api/localdb/matches?limit=${limit}`);
    return res.data || [];
  } catch {
    const snap = await getSnapshot();
    return (snap?.matches || []).slice(0, limit);
  }
}

export async function fetchUpcomingFixtures(days = 7): Promise<UpcomingFixture[]> {
  try {
    const res = await getJson<{ data: UpcomingFixture[] }>(`/api/localdb/upcoming-fixtures?days=${days}`);
    return res.data || [];
  } catch {
    const snap = await getSnapshot();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + days + 1);
    return (snap?.upcoming || []).filter((f) => {
      const d = new Date(String(f.date || "").replace(" ", "T"));
      return !Number.isNaN(d.getTime()) && d <= maxDate;
    });
  }
}
