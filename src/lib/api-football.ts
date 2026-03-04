const BASE = process.env.API_FOOTBALL_BASE_URL || "https://v3.football.api-sports.io";
const KEY = process.env.API_FOOTBALL_KEY || "";

function headers() {
  return {
    "x-rapidapi-key": KEY,
    "x-apisports-key": KEY,
  };
}

export type ApiFixture = {
  fixture: { id: number; date: string; status: { short: string } };
  league: { id: number; name: string; country: string };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  referee?: string;
};

export type ApiFixtureStatsRow = {
  team: { id: number; name: string };
  statistics: Array<{ type: string; value: number | string | null }>;
};

export async function fetchFixturesByLeagueAndDate(
  leagueId: number,
  date: string
): Promise<ApiFixture[]> {
  const res = await fetch(
    `${BASE}/fixtures?league=${leagueId}&date=${date}`,
    { headers: headers(), next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`API-Football fixtures error: ${res.status}`);
  const data = await res.json();
  if (data.response && Array.isArray(data.response)) return data.response;
  return [];
}

export async function fetchFixturesByLeagueAndSeason(
  leagueId: number,
  season: number
): Promise<ApiFixture[]> {
  const res = await fetch(
    `${BASE}/fixtures?league=${leagueId}&season=${season}`,
    { headers: headers(), next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`API-Football fixtures error: ${res.status}`);
  const data = await res.json();
  if (data.response && Array.isArray(data.response)) return data.response;
  return [];
}

export async function fetchFixtureStats(fixtureId: number): Promise<ApiFixtureStatsRow[]> {
  const res = await fetch(
    `${BASE}/fixtures/statistics?fixture=${fixtureId}`,
    { headers: headers(), next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`API-Football stats error: ${res.status}`);
  const data = await res.json();
  if (data.response && Array.isArray(data.response)) return data.response;
  return [];
}

export async function fetchRefereesByLeagueAndSeason(
  leagueId: number,
  season: number
): Promise<Array<{ id: number; name: string }>> {
  const res = await fetch(
    `${BASE}/referees?league=${leagueId}&season=${season}`,
    { headers: headers(), next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`API-Football referees error: ${res.status}`);
  const data = await res.json();
  if (data.response && Array.isArray(data.response)) {
    return data.response.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name }));
  }
  return [];
}

export async function fetchLeagues(): Promise<Array<{ id: number; name: string; country: string }>> {
  const res = await fetch(`${BASE}/leagues`, { headers: headers(), next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`API-Football leagues error: ${res.status}`);
  const data = await res.json();
  if (data.response && Array.isArray(data.response)) {
    return data.response.map((l: { league: { id: number; name: string; country: string } }) => ({
      id: l.league.id,
      name: l.league.name,
      country: l.league.country,
    }));
  }
  return [];
}
