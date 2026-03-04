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

type SnapshotData = {
  generated_at: string;
  referees: Referee[];
  matches: DbMatch[];
  referee_matches_by_id: Record<string, DbMatch[]>;
  referee_teams_by_id: Record<string, TeamCard[]>;
  referee_team_matches_by_key: Record<string, TeamMatchCard[]>;
  upcoming: UpcomingFixture[];
};

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


export async function fetchDbReferees(limit = 120): Promise<Referee[]> {
  try {
    const res = await getJson<{ data: Referee[] }>(`/api/localdb/referees?limit=${limit}`);
    return (res.data || []).filter((r) => !shouldHideReferee(r));
  } catch {
    return [];
  }
}

export async function fetchDbReferee(id: string): Promise<Referee | null> {
  try {
    const res = await getJson<{ data: Referee }>(`/api/localdb/referees/${encodeURIComponent(id)}`);
    if (!res.data) return null;
    return shouldHideReferee(res.data) ? null : res.data;
  } catch {
    return null;
  }
}

export async function fetchDbRefereeMatches(id: string, limit = 80): Promise<DbMatch[]> {
  try {
    const res = await getJson<{ data: DbMatch[] }>(
      `/api/localdb/referees/${encodeURIComponent(id)}/matches?limit=${limit}`
    );
    return res.data || [];
  } catch {
    return [];
  }
}

export async function fetchDbRefereeTeams(id: string): Promise<TeamCard[]> {
  try {
    const res = await getJson<{ data: TeamCard[] }>(
      `/api/localdb/referees/${encodeURIComponent(id)}/teams`
    );
    return res.data || [];
  } catch {
    return [];
  }
}

export async function fetchDbRefereeTeamMatches(id: string, team: string): Promise<TeamMatchCard[]> {
  try {
    const res = await getJson<{ data: TeamMatchCard[] }>(
      `/api/localdb/referees/${encodeURIComponent(id)}/teams/${encodeURIComponent(team)}/matches`
    );
    return res.data || [];
  } catch {
    return [];
  }
}

export async function fetchDbMatches(limit = 120): Promise<DbMatch[]> {
  try {
    const res = await getJson<{ data: DbMatch[] }>(`/api/localdb/matches?limit=${limit}`);
    return res.data || [];
  } catch {
    return [];
  }
}

export async function fetchUpcomingFixtures(days = 7): Promise<UpcomingFixture[]> {
  try {
    const res = await getJson<{ data: UpcomingFixture[] }>(`/api/localdb/upcoming-fixtures?days=${days}`);
    return res.data || [];
  } catch {
    return [];
  }
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
    return [];
  }
}

export async function fetchSportmonksWeekFixtures(week = 24): Promise<SportmonksWeekFixture[]> {
  try {
    const res = await getJson<{ data: SportmonksWeekFixture[] }>(
      `/api/localdb/sportmonks-week?week=${week}`,
    );
    return res.data || [];
  } catch {
    return [];
  }
}

export async function fetchLiveNowFixture(): Promise<LiveNowFixture | null> {
  try {
    const res = await getJson<{ data: LiveNowFixture | null }>(`/api/localdb/live-now`);
    return res.data || null;
  } catch {
    return null;
  }
}
