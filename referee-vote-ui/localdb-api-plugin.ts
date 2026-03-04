import { execFileSync } from "node:child_process";
import { Plugin } from "vite";

const DB_PATH = "/Users/aliozkan/RefereeRank/data/tff_referees_matches_full.db";
const API_BASE = "https://v3.football.api-sports.io";
const API_KEY = process.env.API_FOOTBALL_KEY || "05652682d958d809537421005dc43c04";
const RAPID_FOOTBALL_BASE = "https://free-api-live-football-data.p.rapidapi.com";
const RAPID_FOOTBALL_HOST = "free-api-live-football-data.p.rapidapi.com";
const RAPID_FOOTBALL_KEY = process.env.RAPIDAPI_FOOTBALL_KEY || "a2fc7f1f3fmshdd830e569832886p182d50jsn91c6b18a6ba1";
const UPCOMING_CACHE_TTL_SEC = 3600;

type Row = Record<string, unknown>;

function runSql<T extends Row = Row>(sql: string): T[] {
  const out = execFileSync("sqlite3", ["-json", DB_PATH, sql], {
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
  }).trim();
  if (!out) return [];
  return JSON.parse(out) as T[];
}

function runSqlExec(sql: string): void {
  execFileSync("sqlite3", [DB_PATH, sql], {
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
  });
}

function esc(value: string): string {
  return value.replace(/'/g, "''");
}

function n(v: unknown): number {
  return Number(v ?? 0);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function computeCareerScore(matches: number, yellow: number, red: number, syr: number): number {
  if (!matches) return 0;
  const ypm = yellow / matches;
  const rpm = red / matches;
  const spm = syr / matches;
  const penalty = ypm * 0.8 + rpm * 2.8 + spm * 1.6;
  return Math.round(clamp(9.6 - penalty, 3.5, 9.6) * 10) / 10;
}

function computeAccuracy(score: number): number {
  return Math.round(clamp(58 + score * 4.1, 60, 97));
}

function sendJson(res: any, body: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function ensureUpcomingCacheSchema() {
  runSqlExec(`
    CREATE TABLE IF NOT EXISTS upcoming_fixtures_cache (
      cache_key TEXT NOT NULL,
      fixture_id INTEGER NOT NULL,
      date TEXT,
      referee TEXT,
      referee_is_estimated INTEGER DEFAULT 0,
      referee_confidence REAL DEFAULT 0,
      league_id INTEGER,
      league_name TEXT,
      round_name TEXT,
      home_team TEXT,
      away_team TEXT,
      status TEXT,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (cache_key, fixture_id)
    );
    CREATE INDEX IF NOT EXISTS idx_upcoming_fixtures_cache_key_fetched_at
      ON upcoming_fixtures_cache (cache_key, fetched_at);
  `);
  const cols = runSql<{ name: string }>("PRAGMA table_info(upcoming_fixtures_cache);").map((c) =>
    String(c.name || "")
  );
  if (!cols.includes("referee_confidence")) {
    runSqlExec("ALTER TABLE upcoming_fixtures_cache ADD COLUMN referee_confidence REAL DEFAULT 0;");
  }
}

function ensureFixtureWeekSchema() {
  runSqlExec(`
    CREATE TABLE IF NOT EXISTS superlig_fixture_weeks (
      mac_id INTEGER PRIMARY KEY,
      week_number INTEGER NOT NULL,
      season_label TEXT,
      source_url TEXT,
      updated_at TEXT
    );
  `);
}

function ensureApiFootballFoulSchema() {
  runSqlExec(`
    CREATE TABLE IF NOT EXISTS api_football_superlig_matches (
      fixture_id INTEGER PRIMARY KEY
    );
  `);
  const cols = runSql<{ name: string }>("PRAGMA table_info(api_football_superlig_matches);").map((c) =>
    String(c.name || "")
  );
  if (!cols.includes("fouls_total")) {
    runSqlExec("ALTER TABLE api_football_superlig_matches ADD COLUMN fouls_total INTEGER;");
  }
  if (!cols.includes("home_fouls")) {
    runSqlExec("ALTER TABLE api_football_superlig_matches ADD COLUMN home_fouls INTEGER;");
  }
  if (!cols.includes("away_fouls")) {
    runSqlExec("ALTER TABLE api_football_superlig_matches ADD COLUMN away_fouls INTEGER;");
  }
}

function ensureMlSchema() {
  runSqlExec(`
    CREATE TABLE IF NOT EXISTS refpredict_model (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      w_rotation REAL NOT NULL,
      w_geo REAL NOT NULL,
      w_tier REAL NOT NULL,
      w_neutrality REAL NOT NULL,
      w_workload REAL NOT NULL,
      temperature REAL NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS refpredict_predictions (
      fixture_id INTEGER PRIMARY KEY,
      fixture_date TEXT,
      home_team TEXT,
      away_team TEXT,
      league_name TEXT,
      predicted_referee TEXT,
      predicted_probability REAL,
      candidates_json TEXT,
      resolved_referee TEXT,
      resolved_at TEXT,
      hit INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function clampWeights(weights: FactorWeights): FactorWeights {
  const floor = 0.03;
  const capped: FactorWeights = {
    rotation: clamp(weights.rotation, floor, 0.75),
    geo: clamp(weights.geo, floor, 0.75),
    tier: clamp(weights.tier, floor, 0.75),
    neutrality: clamp(weights.neutrality, floor, 0.75),
    workload: clamp(weights.workload, floor, 0.75),
  };
  const sum = capped.rotation + capped.geo + capped.tier + capped.neutrality + capped.workload || 1;
  return {
    rotation: capped.rotation / sum,
    geo: capped.geo / sum,
    tier: capped.tier / sum,
    neutrality: capped.neutrality / sum,
    workload: capped.workload / sum,
  };
}

function getModelParams(): ModelParams {
  ensureMlSchema();
  const row = runSql<any>("SELECT * FROM refpredict_model WHERE id=1 LIMIT 1;")[0];
  if (!row) {
    const d = defaultModelParams();
    saveModelParams(d);
    return d;
  }
  const weights = clampWeights({
    rotation: Number(row.w_rotation ?? WEIGHTS.rotation),
    geo: Number(row.w_geo ?? WEIGHTS.geo),
    tier: Number(row.w_tier ?? WEIGHTS.tier),
    neutrality: Number(row.w_neutrality ?? WEIGHTS.neutrality),
    workload: Number(row.w_workload ?? WEIGHTS.workload),
  });
  return {
    weights,
    temperature: clamp(Number(row.temperature ?? DEFAULT_SOFTMAX_TEMPERATURE), 1.1, 5),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function saveModelParams(p: ModelParams): void {
  const w = clampWeights(p.weights);
  const t = clamp(p.temperature, 1.1, 5);
  runSqlExec(`
    INSERT INTO refpredict_model (
      id, w_rotation, w_geo, w_tier, w_neutrality, w_workload, temperature, updated_at
    ) VALUES (
      1, ${w.rotation}, ${w.geo}, ${w.tier}, ${w.neutrality}, ${w.workload}, ${t}, '${esc(p.updatedAt)}'
    )
    ON CONFLICT(id) DO UPDATE SET
      w_rotation=excluded.w_rotation,
      w_geo=excluded.w_geo,
      w_tier=excluded.w_tier,
      w_neutrality=excluded.w_neutrality,
      w_workload=excluded.w_workload,
      temperature=excluded.temperature,
      updated_at=excluded.updated_at;
  `);
}

function readUpcomingCache(cacheKey: string): { fetchedAt: string; data: UpcomingFixture[] } | null {
  const key = esc(cacheKey);
  const rows = runSql<any>(`
    SELECT
      fixture_id, date, referee, referee_is_estimated, referee_confidence, league_id, league_name, round_name, home_team, away_team, status, fetched_at
    FROM upcoming_fixtures_cache
    WHERE cache_key='${key}'
    ORDER BY date ASC, fixture_id ASC
    LIMIT 80;
  `);
  if (!rows.length) return null;
  const fetchedAt = String(rows[0].fetched_at || "");
  if (!fetchedAt) return null;
  const data = rows.map((r) => ({
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
  }));
  return { fetchedAt, data };
}

function writeUpcomingCache(cacheKey: string, data: UpcomingFixture[], fetchedAt: string) {
  const key = esc(cacheKey);
  runSqlExec(`DELETE FROM upcoming_fixtures_cache WHERE cache_key='${key}';`);
  for (const f of data) {
    runSqlExec(`
      INSERT OR REPLACE INTO upcoming_fixtures_cache (
        cache_key, fixture_id, date, referee, referee_is_estimated, referee_confidence, league_id, league_name, round_name, home_team, away_team, status, fetched_at
      ) VALUES (
        '${key}',
        ${n(f.fixture_id)},
        '${esc(String(f.date || ""))}',
        '${esc(String(f.referee || ""))}',
        ${f.referee_is_estimated ? 1 : 0},
        ${Number(f.referee_confidence || 0)},
        ${n(f.league_id)},
        '${esc(String(f.league_name || ""))}',
        '${esc(String(f.round || ""))}',
        '${esc(String(f.home_team || ""))}',
        '${esc(String(f.away_team || ""))}',
        '${esc(String(f.status || ""))}',
        '${esc(fetchedAt)}'
      );
    `);
  }
  runSqlExec(`
    DELETE FROM upcoming_fixtures_cache
    WHERE fetched_at < datetime('now', '-3 day');
  `);
}

type UpcomingFixture = {
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

function isUpcomingStatus(s: string): boolean {
  return ["NS", "TBD", "PST"].includes(s);
}

type PredictorReferee = {
  id: string;
  name: string;
  city: string;
  tier: "elite" | "senior" | "junior";
  totalGames: number;
};

type AssignmentRow = {
  refereeId: string;
  homeTeam: string;
  awayTeam: string;
  weekKey: number;
  dateIso: string;
  score: string;
  yellowCards: number;
  redCards: number;
  secondYellowRedCards: number;
};

type PredictorContext = {
  referees: PredictorReferee[];
  assignments: AssignmentRow[];
};

const WEIGHTS = {
  rotation: 0.3,
  geo: 0.2,
  tier: 0.2,
  neutrality: 0.2,
  workload: 0.1,
} as const;

const DEFAULT_SOFTMAX_TEMPERATURE = 2.5;
const LEARNING_RATE = 0.08;

type FactorWeights = {
  rotation: number;
  geo: number;
  tier: number;
  neutrality: number;
  workload: number;
};

type ModelParams = {
  weights: FactorWeights;
  temperature: number;
  updatedAt: string;
};

type PredRow = {
  refereeId: string;
  referee: string;
  probability: number;
  rawScore: number;
  breakdown: FactorWeights;
  totalGames: number;
};

function defaultModelParams(): ModelParams {
  return {
    weights: { ...WEIGHTS },
    temperature: DEFAULT_SOFTMAX_TEMPERATURE,
    updatedAt: new Date().toISOString(),
  };
}

const CITY_COORDS: Record<string, [number, number]> = {
  ISTANBUL: [41.0082, 28.9784],
  IZMIR: [38.4237, 27.1428],
  ANKARA: [39.9334, 32.8597],
  TRABZON: [41.0027, 39.7168],
  ANTALYA: [36.8969, 30.7133],
  BURSA: [40.195, 29.06],
  ADANA: [37.0, 35.3213],
  GAZIANTEP: [37.0662, 37.3833],
  KONYA: [37.8746, 32.4932],
  RIZE: [41.0201, 40.5234],
  KAYSERI: [38.7312, 35.4787],
  SAMSUN: [41.2867, 36.33],
  HATAY: [36.2021, 36.1603],
  KOCAELI: [40.8533, 29.8815],
};

const TEAM_CITY_BY_CODE: Record<string, string> = {
  GS: "ISTANBUL",
  FB: "ISTANBUL",
  BJK: "ISTANBUL",
  BSK: "ISTANBUL",
  EYP: "ISTANBUL",
  KSM: "ISTANBUL",
  KAR: "ISTANBUL",
  TS: "TRABZON",
  ANT: "ANTALYA",
  ALN: "ANTALYA",
  GAZ: "GAZIANTEP",
  KON: "KONYA",
  RIZ: "RIZE",
  KAY: "KAYSERI",
  SAM: "SAMSUN",
  HAT: "HATAY",
  ADA: "ADANA",
  KOC: "KOCAELI",
  GOZ: "IZMIR",
  GEN: "ANKARA",
  SIV: "SIVAS",
  ANK: "ANKARA",
};

const TEAM_DISPLAY_BY_CODE: Record<string, string> = {
  GS: "Galatasaray",
  FB: "Fenerbahçe",
  BJK: "Beşiktaş",
  BSK: "Başakşehir",
  EYP: "Eyüpspor",
  KSM: "Kasımpaşa",
  KAR: "Karagümrük",
  TS: "Trabzonspor",
  ANT: "Antalyaspor",
  ALN: "Alanyaspor",
  GAZ: "Gaziantep FK",
  KON: "Konyaspor",
  RIZ: "Rizespor",
  KAY: "Kayserispor",
  SAM: "Samsunspor",
  HAT: "Hatayspor",
  ADA: "Adana Demirspor",
  KOC: "Kocaelispor",
  GOZ: "Göztepe",
  GEN: "Gençlerbirliği",
  SIV: "Sivasspor",
  ANK: "Ankaragücü",
};

function normalizeText(s: string): string {
  return (s || "")
    .toUpperCase()
    .replace(/İ/g, "I")
    .replace(/İ/g, "I")
    .replace(/Ş/g, "S")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePersonName(s: string): string {
  return normalizeText(s)
    .replace(/\bHAKEM\b/g, "")
    .replace(/\bVAR\b/g, "")
    .replace(/\bAVAR\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function teamCodeFromName(teamName: string): string {
  const t = normalizeText(teamName);
  if (t.includes("GALATASARAY")) return "GS";
  if (t.includes("FENERBAHCE")) return "FB";
  if (t.includes("BESIKTAS")) return "BJK";
  if (t.includes("BASAKSEHIR")) return "BSK";
  if (t.includes("EYUPSPOR")) return "EYP";
  if (t.includes("KASIMPASA")) return "KSM";
  if (t.includes("KARAGUMRUK")) return "KAR";
  if (t.includes("TRABZONSPOR")) return "TS";
  if (t.includes("ANTALYASPOR")) return "ANT";
  if (t.includes("ALANYASPOR")) return "ALN";
  if (t.includes("GAZIANTEP")) return "GAZ";
  if (t.includes("KONYASPOR")) return "KON";
  if (t.includes("RIZESPOR")) return "RIZ";
  if (t.includes("KAYSERISPOR")) return "KAY";
  if (t.includes("SAMSUNSPOR")) return "SAM";
  if (t.includes("HATAYSPOR")) return "HAT";
  if (t.includes("ADANA DEMIRSPOR")) return "ADA";
  if (t.includes("KOCAELISPOR")) return "KOC";
  if (t.includes("GOZTEPE")) return "GOZ";
  if (t.includes("GENCLERBIRLIGI")) return "GEN";
  if (t.includes("SIVASSPOR")) return "SIV";
  if (t.includes("ANKARAGUCU")) return "ANK";
  return t.slice(0, 3) || "UNK";
}

function cityFromTeam(teamName: string): string {
  const code = teamCodeFromName(teamName);
  return TEAM_CITY_BY_CODE[code] || "";
}

function canonicalTeamName(teamName: string): string {
  const code = teamCodeFromName(teamName);
  const mapped = TEAM_DISPLAY_BY_CODE[code];
  if (mapped) return mapped;
  return String(teamName || "")
    .replace(/\bA\.?Ş\.?\b/gi, "")
    .replace(/\bFUTBOL KULÜBÜ\b/gi, "")
    .replace(/\bFK\b/gi, "FK")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function loadApiFoulMap(): Map<string, { home: number; away: number; total: number }> {
  const map = new Map<string, { home: number; away: number; total: number }>();
  const rows = runSql<any>(`
    SELECT
      substr(match_date_utc, 1, 10) AS match_date_iso,
      home_team_name,
      away_team_name,
      home_fouls,
      away_fouls,
      fouls_total
    FROM api_football_superlig_matches
    WHERE COALESCE(status_short, '') = 'FT';
  `);
  for (const r of rows) {
    const dateIso = String(r.match_date_iso || "");
    if (!dateIso) continue;
    const homeCode = teamCodeFromName(String(r.home_team_name || ""));
    const awayCode = teamCodeFromName(String(r.away_team_name || ""));
    if (!homeCode || !awayCode) continue;
    const key = `${dateIso}|${homeCode}|${awayCode}`;
    map.set(key, {
      home: n(r.home_fouls),
      away: n(r.away_fouls),
      total: n(r.fouls_total),
    });
  }
  return map;
}

function toTier(klasman: string, classFromPage: string, totalGames: number): "elite" | "senior" | "junior" {
  const s = normalizeText(`${klasman} ${classFromPage}`);
  if (s.includes("UST") || s.includes("FIFA") || s.includes("SUPER LIG")) return "elite";
  if (s.includes("KLASMAN") || totalGames >= 60) return "senior";
  return "junior";
}

function isoWeekKey(dateIso: string): number {
  const d0 = new Date(`${dateIso}T12:00:00Z`);
  if (Number.isNaN(d0.getTime())) return 0;
  const d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return d.getUTCFullYear() * 100 + week;
}

function weekOrdinal(weekKey: number): number {
  const year = Math.floor(weekKey / 100);
  const week = weekKey % 100;
  return year * 53 + week;
}

function seasonKeyFromDateIso(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  // Super Lig season rolls over around summer (July+ -> next year season)
  const startYear = m >= 7 ? y : y - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endShort}`;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function getPredictorContext(): PredictorContext {
  const refs = runSql<any>(`
    SELECT
      r.hakem_id AS id,
      r.name AS name,
      COALESCE(r.city, '') AS city,
      COALESCE(r.klasman, '') AS klasman,
      COALESCE(r.class_from_page, '') AS class_from_page,
      COALESCE(x.total_games, 0) AS total_games
    FROM referees r
    LEFT JOIN (
      SELECT hakem_id, COUNT(*) AS total_games
      FROM superlig_hakem_match_stats
      GROUP BY hakem_id
    ) x ON x.hakem_id = r.hakem_id
    ORDER BY r.name COLLATE NOCASE ASC
    LIMIT 120;
  `);

  const referees: PredictorReferee[] = refs
    .map((r) => {
      const totalGames = n(r.total_games);
      return {
        id: String(r.id || ""),
        name: String(r.name || ""),
        city: normalizeText(String(r.city || "")),
        tier: toTier(String(r.klasman || ""), String(r.class_from_page || ""), totalGames),
        totalGames,
      };
    })
    .filter((r) => r.id && r.name);

  const assignmentsRows = runSql<any>(`
    SELECT
      hakem_id AS referee_id,
      home_team,
      away_team,
      match_date_iso,
      score,
      yellow_cards,
      red_cards,
      second_yellow_red_cards
    FROM superlig_hakem_match_stats
    WHERE match_date_iso IS NOT NULL AND match_date_iso <> '';
  `);
  const assignments: AssignmentRow[] = assignmentsRows.map((r) => {
    const dateIso = String(r.match_date_iso || "");
    return {
      refereeId: String(r.referee_id || ""),
      homeTeam: String(r.home_team || ""),
      awayTeam: String(r.away_team || ""),
      dateIso,
      weekKey: isoWeekKey(dateIso),
      score: String(r.score || ""),
      yellowCards: n(r.yellow_cards),
      redCards: n(r.red_cards),
      secondYellowRedCards: n(r.second_yellow_red_cards),
    };
  });

  return { referees, assignments };
}

function parseScore(score: string): { home: number; away: number; total: number; close: boolean } {
  const m = String(score || "").match(/(\d+)\s*[-:]\s*(\d+)/);
  const h = m ? Number(m[1]) : 0;
  const a = m ? Number(m[2]) : 0;
  const total = h + a;
  const close = Math.abs(h - a) <= 1;
  return { home: h, away: a, total, close };
}

function tierExperience(tier: "elite" | "senior" | "junior"): number {
  if (tier === "elite") return 1;
  if (tier === "senior") return 0.82;
  return 0.64;
}

function isDerbyOrHighRisk(homeCode: string, awayCode: string): boolean {
  const big = new Set(["GS", "FB", "BJK", "TS", "BSK"]);
  if (big.has(homeCode) && big.has(awayCode)) return true;
  const derbies = new Set([
    "GS|FB",
    "FB|GS",
    "GS|BJK",
    "BJK|GS",
    "FB|BJK",
    "BJK|FB",
    "TS|GS",
    "GS|TS",
    "TS|FB",
    "FB|TS",
    "TS|BJK",
    "BJK|TS",
  ]);
  return derbies.has(`${homeCode}|${awayCode}`);
}

function calcDisciplineFit(
  yellowAvg: number,
  redAvg: number,
  leagueYellowAvg: number,
  leagueRedAvg: number,
  highRisk: boolean
): number {
  const yellowDev = Math.abs(yellowAvg - leagueYellowAvg);
  const redDev = Math.abs(redAvg - leagueRedAvg);
  const weightedDev = yellowDev + redDev * 2.0;
  const devPenaltyBase = highRisk ? 1.8 : 2.2;
  return clamp(1 - weightedDev / devPenaltyBase, 0.05, 1);
}

function softmaxProb(rawScores: number[], temperature: number): number[] {
  if (!rawScores.length) return [];
  const mean = rawScores.reduce((a, b) => a + b, 0) / rawScores.length;
  const variance = rawScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rawScores.length;
  const std = Math.sqrt(Math.max(variance, 1e-6));
  const sharpness = 1.7 / clamp(temperature, 1.1, 5);
  const scaled = rawScores.map((s) => ((s - mean) / std) * sharpness);
  const m = Math.max(...scaled);
  const exps = scaled.map((s) => Math.exp(s - m));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((x) => (x / sum) * 100);
}

function computePredictionConfidence(top: PredRow | undefined, second: PredRow | undefined, eligibleCount: number): number {
  if (!top) return 0;
  const marginRaw = top.rawScore - (second?.rawScore ?? top.rawScore * 0.92);
  const marginProb = top.probability - (second?.probability ?? top.probability * 0.75);
  const marginComponent = clamp(marginRaw / 0.16, 0, 1) * 0.55 + clamp(marginProb / 14, 0, 1) * 0.45;
  const quality =
    (top.breakdown.rotation +
      top.breakdown.geo +
      top.breakdown.tier +
      top.breakdown.neutrality +
      top.breakdown.workload) / 5;
  const qualityComponent = clamp((quality - 0.45) / 0.5, 0, 1);
  const experienceComponent = clamp(Math.log1p(top.totalGames) / Math.log1p(180), 0, 1);
  const poolPenalty = clamp((eligibleCount - 8) * 0.9, 0, 14);

  const conf =
    24 +
    marginComponent * 42 +
    qualityComponent * 22 +
    experienceComponent * 12 -
    poolPenalty;
  return Number(clamp(conf, 10, 82).toFixed(1));
}

function parseRoundNumber(roundText: string): number | null {
  const m = String(roundText || "").match(/(\d{1,2})/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function fixtureAssignmentBucket(f: UpcomingFixture): string {
  const roundNo = parseRoundNumber(String(f.round || ""));
  if (roundNo) return `round:${roundNo}`;
  const dIso = String(f.date || "").slice(0, 10);
  const wk = isoWeekKey(dIso);
  return wk ? `week:${wk}` : `date:${dIso}`;
}

function predictRefereeByRefPredictModel(
  fixture: UpcomingFixture,
  ctx: PredictorContext,
  model: ModelParams
): { referee: string; probability: number; confidence: number; ranked: PredRow[] } {
  if (!ctx.referees.length) return { referee: "Hakem Ataması Bekleniyor", probability: 0, confidence: 0, ranked: [] };
  const homeCode = teamCodeFromName(fixture.home_team);
  const awayCode = teamCodeFromName(fixture.away_team);
  const dateIso = String(fixture.date || "").slice(0, 10);
  const weekKey = isoWeekKey(dateIso);
  const fixtureWeekOrd = weekOrdinal(weekKey);
  const seasonKey = seasonKeyFromDateIso(dateIso);

  const seasonAssignments = ctx.assignments.filter((a) => seasonKeyFromDateIso(a.dateIso) === seasonKey);
  if (!seasonAssignments.length) return { referee: "Hakem Ataması Bekleniyor", probability: 0, confidence: 0, ranked: [] };

  const refStats = new Map<string, {
    matches: number;
    close: number;
    goalsTotal: number;
    yellowTotal: number;
    redTotal: number;
    teamCounts: Map<string, number>;
    recentTeamWeeks: number[];
  }>();
  let leagueYellowTotal = 0;
  let leagueRedTotal = 0;
  let leagueGoalsTotal = 0;
  let leagueMatches = 0;

  for (const a of seasonAssignments) {
    const p = parseScore(a.score);
    const team1 = teamCodeFromName(a.homeTeam);
    const team2 = teamCodeFromName(a.awayTeam);
    leagueYellowTotal += a.yellowCards + a.secondYellowRedCards;
    leagueRedTotal += a.redCards;
    leagueGoalsTotal += p.total;
    leagueMatches += 1;

    const s = refStats.get(a.refereeId) || {
      matches: 0,
      close: 0,
      goalsTotal: 0,
      yellowTotal: 0,
      redTotal: 0,
      teamCounts: new Map<string, number>(),
      recentTeamWeeks: [],
    };
    s.matches += 1;
    s.close += p.close ? 1 : 0;
    s.goalsTotal += p.total;
    s.yellowTotal += a.yellowCards + a.secondYellowRedCards;
    s.redTotal += a.redCards;
    s.teamCounts.set(team1, (s.teamCounts.get(team1) || 0) + 1);
    s.teamCounts.set(team2, (s.teamCounts.get(team2) || 0) + 1);
    if (a.weekKey) {
      if (team1 === homeCode || team2 === homeCode || team1 === awayCode || team2 === awayCode) {
        s.recentTeamWeeks.push(weekOrdinal(a.weekKey));
      }
    }
    refStats.set(a.refereeId, s);
  }

  const leagueYellowAvg = leagueMatches ? leagueYellowTotal / leagueMatches : 4.6;
  const leagueRedAvg = leagueMatches ? leagueRedTotal / leagueMatches : 0.22;
  const leagueGoalAvg = leagueMatches ? leagueGoalsTotal / leagueMatches : 2.7;
  const highRisk = isDerbyOrHighRisk(homeCode, awayCode);

  const eligibleReferees = ctx.referees.filter((r) => {
      const s = refStats.get(r.id);
      if (!s || !s.matches) return false;

      const sameTeamA = s.teamCounts.get(homeCode) || 0;
      const sameTeamB = s.teamCounts.get(awayCode) || 0;
      if (sameTeamA > 3 || sameTeamB > 3) return false; // Team_Balance constraint (hard)

      const recentHit = s.recentTeamWeeks.some((wOrd) => {
        const diff = fixtureWeekOrd - wOrd;
        return diff >= 1 && diff <= 5; // Recency_Filter hard constraint (last 5 weeks)
      });
      if (recentHit) return false;

      return true;
    });
  if (!eligibleReferees.length) return { referee: "Hakem Ataması Bekleniyor", probability: 0, confidence: 0, ranked: [] };

  const maxSeasonMatches = Math.max(
    ...eligibleReferees.map((r) => refStats.get(r.id)?.matches || 1),
    1
  );

  const rows = eligibleReferees.map((r) => {
    const s = refStats.get(r.id)!;
    const totalMatches = s.matches;
    const closeGameRatio = totalMatches ? s.close / totalMatches : 0;
    const goalAvg = totalMatches ? s.goalsTotal / totalMatches : leagueGoalAvg;
    const yellowAvg = totalMatches ? s.yellowTotal / totalMatches : leagueYellowAvg;
    const redAvg = totalMatches ? s.redTotal / totalMatches : leagueRedAvg;

    const experienceNorm = clamp(totalMatches / maxSeasonMatches, 0, 1);
    const seniorityNorm = tierExperience(r.tier);
    const E = clamp(experienceNorm * 0.7 + seniorityNorm * 0.3, 0, 1);

    const goalTempoFit = clamp(1 - Math.abs(goalAvg - leagueGoalAvg) / Math.max(leagueGoalAvg, 1.8), 0, 1);
    const B = clamp(closeGameRatio * 0.8 + goalTempoFit * 0.2, 0, 1);

    const D = calcDisciplineFit(yellowAvg, redAvg, leagueYellowAvg, leagueRedAvg, highRisk);

    const rawScore = E * 0.4 + B * 0.35 + D * 0.25;
    const breakdown: FactorWeights = {
      rotation: E,
      geo: B,
      tier: D,
      neutrality: goalTempoFit,
      workload: closeGameRatio,
    };
    return { refereeId: r.id, referee: r.name, rawScore, breakdown, totalGames: r.totalGames };
  });

  const probs = softmaxProb(rows.map((r) => r.rawScore), model.temperature);
  const ranked = rows.map((r, i) => ({ ...r, probability: probs[i] || 0 })).sort((a, b) => b.probability - a.probability);
  const top = ranked[0];
  const second = ranked[1];
  const confidence = computePredictionConfidence(top, second, ranked.length);
  return {
    referee: top?.referee || "Hakem Ataması Bekleniyor",
    probability: Number((top?.probability || 0).toFixed(1)),
    confidence,
    ranked,
  };
}

async function fetchApiFootballUpcoming(days: number): Promise<UpcomingFixture[]> {
  const now = new Date();
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const dates: string[] = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(ymd(d));
  }
  const leagues = [203, 206];
  const all: UpcomingFixture[] = [];

  for (const date of dates) {
    for (const league of leagues) {
      const url = `${API_BASE}/fixtures?league=${league}&date=${date}`;
      const r = await fetch(url, {
        headers: {
          "x-apisports-key": API_KEY,
          "x-rapidapi-key": API_KEY,
        },
      });
      if (!r.ok) continue;
      const j = await r.json();
      const rows = (j?.response || []) as any[];
      for (const fx of rows) {
        const fixture = fx?.fixture || {};
        const status = fixture?.status || {};
        const short = String(status?.short || "");
        if (!isUpcomingStatus(short)) continue;
        const leagueObj = fx?.league || {};
        const country = String(leagueObj?.country || "").toLowerCase();
        if (country && !country.includes("turkey") && !country.includes("türkiye")) continue;
        const teams = fx?.teams || {};
        all.push({
          fixture_id: Number(fixture?.id || 0),
          date: String(fixture?.date || "").slice(0, 16).replace("T", " "),
          referee: String(fixture?.referee || ""),
          referee_is_estimated: false,
          referee_confidence: 0,
          league_id: Number(leagueObj?.id || 0),
          league_name: String(leagueObj?.name || ""),
          round: String(leagueObj?.round || ""),
          home_team: canonicalTeamName(String(teams?.home?.name || "")),
          away_team: canonicalTeamName(String(teams?.away?.name || "")),
          status: short,
        });
      }
    }
  }

  return all;
}

function rapidLeagueName(leagueId: number): string {
  if (leagueId === 71) return "Trendyol Süper Lig";
  if (leagueId === 206) return "Ziraat Türkiye Kupası";
  return `League ${leagueId}`;
}

async function fetchRapidFallbackUpcoming(days: number): Promise<UpcomingFixture[]> {
  const end = new Date();
  end.setDate(end.getDate() + days + 1);
  // Rapid fallback only uses leagueid=71 (Turkey Super Lig). leagueid=206 can map to non-Turkey data.
  const leagues = [71];
  const all: UpcomingFixture[] = [];

  for (const leagueId of leagues) {
    const url = `${RAPID_FOOTBALL_BASE}/football-get-all-matches-by-league?leagueid=${leagueId}`;
    const r = await fetch(url, {
      headers: {
        "x-rapidapi-key": RAPID_FOOTBALL_KEY,
        "x-rapidapi-host": RAPID_FOOTBALL_HOST,
      },
    });
    if (!r.ok) continue;
    const j = await r.json();
    const rows = (j?.response?.matches || []) as any[];
    for (const m of rows) {
      const status = m?.status || {};
      const utc = String(status?.utcTime || "");
      if (!utc) continue;
      const when = new Date(utc);
      if (Number.isNaN(when.getTime())) continue;
      if (when < new Date() || when > end) continue;
      const short = status?.reason?.short || (m?.notStarted ? "NS" : "");
      if (!isUpcomingStatus(String(short || "NS"))) continue;
      all.push({
        fixture_id: Number(m?.id || 0),
        date: utc.slice(0, 16).replace("T", " "),
        referee: "",
        referee_is_estimated: false,
        referee_confidence: 0,
        league_id: leagueId,
        league_name: rapidLeagueName(leagueId),
        round: String(m?.tournament?.stage || ""),
        home_team: canonicalTeamName(String(m?.home?.name || "")),
        away_team: canonicalTeamName(String(m?.away?.name || "")),
        status: String(short || "NS"),
      });
    }
  }

  return all;
}

type OfficialFixture = {
  fixture_id: number;
  home_team: string;
  away_team: string;
  fixture_date: string;
  referee: string;
};

async function fetchRecentOfficialAssignments(daysBack = 10): Promise<OfficialFixture[]> {
  const all: OfficialFixture[] = [];
  for (let i = 0; i <= daysBack; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const url = `${API_BASE}/fixtures?league=203&date=${date}`;
    const r = await fetch(url, {
      headers: {
        "x-apisports-key": API_KEY,
        "x-rapidapi-key": API_KEY,
      },
    });
    if (!r.ok) continue;
    const j = await r.json();
    const rows = (j?.response || []) as any[];
    for (const fx of rows) {
      const fixture = fx?.fixture || {};
      const status = fixture?.status || {};
      const short = String(status?.short || "");
      if (!["FT", "AET", "PEN"].includes(short)) continue;
      const referee = String(fixture?.referee || "").trim();
      if (!referee) continue;
      all.push({
        fixture_id: Number(fixture?.id || 0),
        home_team: String(fx?.teams?.home?.name || ""),
        away_team: String(fx?.teams?.away?.name || ""),
        fixture_date: String(fixture?.date || "").slice(0, 10),
        referee,
      });
    }
  }
  return all;
}

function persistPredictionsForLearning(fixtures: Array<{ fixture: UpcomingFixture; ranked: PredRow[] }>) {
  ensureMlSchema();
  const now = new Date().toISOString();
  for (const item of fixtures) {
    const f = item.fixture;
    if (!n(f.fixture_id) || !item.ranked.length) continue;
    const top = item.ranked[0];
    const candidatesJson = esc(JSON.stringify(item.ranked.slice(0, 25)));
    runSqlExec(`
      INSERT INTO refpredict_predictions (
        fixture_id, fixture_date, home_team, away_team, league_name,
        predicted_referee, predicted_probability, candidates_json,
        created_at, updated_at
      ) VALUES (
        ${n(f.fixture_id)},
        '${esc(String(f.date || "").slice(0, 10))}',
        '${esc(String(f.home_team || ""))}',
        '${esc(String(f.away_team || ""))}',
        '${esc(String(f.league_name || ""))}',
        '${esc(String(top.referee || ""))}',
        ${Number(top.probability || 0)},
        '${candidatesJson}',
        '${esc(now)}',
        '${esc(now)}'
      )
      ON CONFLICT(fixture_id) DO UPDATE SET
        fixture_date=excluded.fixture_date,
        home_team=excluded.home_team,
        away_team=excluded.away_team,
        league_name=excluded.league_name,
        predicted_referee=excluded.predicted_referee,
        predicted_probability=excluded.predicted_probability,
        candidates_json=excluded.candidates_json,
        updated_at=excluded.updated_at;
    `);
  }
}

function learnFromResolvedFixtures(model: ModelParams, official: OfficialFixture[]): ModelParams {
  ensureMlSchema();
  if (!official.length) return model;
  const byFixture = new Map<number, OfficialFixture>();
  for (const o of official) byFixture.set(o.fixture_id, o);

  const pending = runSql<any>(`
    SELECT fixture_id, predicted_referee, candidates_json
    FROM refpredict_predictions
    WHERE resolved_referee IS NULL
    ORDER BY fixture_id DESC
    LIMIT 300;
  `);
  let learned = false;
  let m = { ...model, weights: { ...model.weights } };

  for (const row of pending) {
    const fixtureId = n(row.fixture_id);
    const off = byFixture.get(fixtureId);
    if (!off) continue;
    const predName = String(row.predicted_referee || "");
    const actualName = String(off.referee || "");
    let candidates: PredRow[] = [];
    try {
      candidates = JSON.parse(String(row.candidates_json || "[]")) as PredRow[];
    } catch {
      candidates = [];
    }
    const pred = candidates[0];
    const actual = candidates.find((c) => normalizePersonName(c.referee) === normalizePersonName(actualName));
    if (pred && actual && normalizePersonName(predName) !== normalizePersonName(actualName)) {
      const dRotation = actual.breakdown.rotation - pred.breakdown.rotation;
      const dGeo = actual.breakdown.geo - pred.breakdown.geo;
      const dTier = actual.breakdown.tier - pred.breakdown.tier;
      const dNeutrality = actual.breakdown.neutrality - pred.breakdown.neutrality;
      const dWorkload = actual.breakdown.workload - pred.breakdown.workload;
      m.weights.rotation += LEARNING_RATE * dRotation;
      m.weights.geo += LEARNING_RATE * dGeo;
      m.weights.tier += LEARNING_RATE * dTier;
      m.weights.neutrality += LEARNING_RATE * dNeutrality;
      m.weights.workload += LEARNING_RATE * dWorkload;
      m.weights = clampWeights(m.weights);
      learned = true;
    }

    const hit = normalizePersonName(predName) === normalizePersonName(actualName) ? 1 : 0;
    runSqlExec(`
      UPDATE refpredict_predictions
      SET resolved_referee='${esc(actualName)}',
          resolved_at='${esc(new Date().toISOString())}',
          hit=${hit},
          updated_at='${esc(new Date().toISOString())}'
      WHERE fixture_id=${fixtureId};
    `);
  }

  if (learned) {
    m.updatedAt = new Date().toISOString();
    saveModelParams(m);
    return m;
  }
  return model;
}

export function localDbApiPlugin(): Plugin {
  return {
    name: "localdb-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const u = new URL(req.url || "/", "http://localhost");
          if (!u.pathname.startsWith("/api/localdb")) {
            next();
            return;
          }
          ensureFixtureWeekSchema();
          ensureApiFootballFoulSchema();

          if (u.pathname === "/api/localdb/health") {
            sendJson(res, { ok: true });
            return;
          }

          if (u.pathname === "/api/localdb/referees") {
            const limit = clamp(Number(u.searchParams.get("limit") || 120), 1, 500);
            const rows = runSql<{
              id: string;
              name: string;
              city: string;
              matches: number;
              total_matches: number;
              yellow_cards: number;
              red_cards: number;
              second_yellow_red_cards: number;
              penalties: number;
            }>(`
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
              ORDER BY COALESCE(s.matches, 0) DESC, COALESCE(rm.total_matches, 0) DESC, r.name ASC
              LIMIT ${limit};
            `);

            const data = rows.map((r) => {
              const matches = n(r.matches) || n(r.total_matches);
              const yellow = n(r.yellow_cards);
              const red = n(r.red_cards);
              const syr = n(r.second_yellow_red_cards);
              const score = computeCareerScore(matches, yellow, red, syr);
              const ypm = matches ? yellow / matches : 0;
              const rpm = matches ? red / matches : 0;
              return {
                id: String(r.id),
                name: String(r.name),
                age: 32 + (Number(String(r.id).slice(-2)) % 16),
                country: "Türkiye",
                flag: "🇹🇷",
                photo: `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(String(r.name))}`,
                matches,
                yellowCardsPerMatch: Number(ypm.toFixed(2)),
                redCardsPerMatch: Number(rpm.toFixed(2)),
                foulsPerMatch: Number((21 + ypm * 2 + rpm * 5).toFixed(1)),
                accuracy: computeAccuracy(score),
                careerScore: score,
                totalRatings: Math.max(300, matches * 120),
                badges: score >= 8.3 ? ["elite"] : score >= 7.7 ? ["consistent"] : [],
                performanceTrend: [],
                bio: `${r.name} için Trendyol Süper Lig bazlı kart profili.`,
                league: "Süper Lig",
                penalties: n(r.penalties),
                yellowCards: yellow,
                redCards: red,
                city: String(r.city || ""),
                secondYellowRedCards: syr,
              };
            });
            sendJson(res, { data });
            return;
          }

          const refMatch = u.pathname.match(/^\/api\/localdb\/referees\/([^/]+)$/);
          if (refMatch) {
            const id = esc(decodeURIComponent(refMatch[1]));
            const row = runSql<any>(`
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
              WHERE r.hakem_id = '${id}'
              LIMIT 1;
            `)[0];

            if (!row) {
              sendJson(res, { error: "Not found" }, 404);
              return;
            }

            const trendRaw = runSql<any>(`
              SELECT
                match_date AS match_date,
                yellow_cards AS yellow_cards,
                red_cards AS red_cards,
                second_yellow_red_cards AS second_yellow_red_cards
              FROM superlig_hakem_match_stats
              WHERE hakem_id='${id}'
              ORDER BY match_date_iso DESC
              LIMIT 8;
            `);

            const trend = trendRaw
              .map((t, i) => {
                const penalty = n(t.yellow_cards) * 0.35 + n(t.red_cards) * 1.4 + n(t.second_yellow_red_cards) * 0.8;
                return {
                  match: `M${trendRaw.length - i}`,
                  score: Math.round(clamp(9.8 - penalty, 3.5, 10) * 10) / 10,
                  matchDate: String(t.match_date || ""),
                };
              })
              .reverse();

            const matches = n(row.matches) || n(row.total_matches);
            const yellow = n(row.yellow_cards);
            const red = n(row.red_cards);
            const syr = n(row.second_yellow_red_cards);
            const score = computeCareerScore(matches, yellow, red, syr);

            sendJson(res, {
              data: {
                id: String(row.id),
                name: String(row.name),
                age: 32 + (Number(String(row.id).slice(-2)) % 16),
                country: "Türkiye",
                flag: "🇹🇷",
                photo: `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(String(row.name))}`,
                matches,
                yellowCardsPerMatch: Number((matches ? yellow / matches : 0).toFixed(2)),
                redCardsPerMatch: Number((matches ? red / matches : 0).toFixed(2)),
                foulsPerMatch: Number((21 + (matches ? yellow / matches : 0) * 2).toFixed(1)),
                accuracy: computeAccuracy(score),
                careerScore: score,
                totalRatings: Math.max(300, matches * 120),
                badges: score >= 8.3 ? ["elite"] : score >= 7.7 ? ["consistent"] : [],
                performanceTrend: trend,
                bio: `${row.name}, Trendyol Süper Lig son 5 yıl verisi ile hesaplanan profil.`,
                league: "Süper Lig",
                penalties: n(row.penalties),
                yellowCards: yellow,
                redCards: red,
                city: String(row.city || ""),
                secondYellowRedCards: syr,
              },
            });
            return;
          }

          const refMatchesMatch = u.pathname.match(/^\/api\/localdb\/referees\/([^/]+)\/matches$/);
          if (refMatchesMatch) {
            const id = esc(decodeURIComponent(refMatchesMatch[1]));
            const limit = clamp(Number(u.searchParams.get("limit") || 60), 1, 400);
            const data = runSql<any>(`
              SELECT
                s.mac_id AS id,
                s.match_date_iso AS matchDateIso,
                s.home_team AS homeTeam,
                s.away_team AS awayTeam,
                s.score AS score,
                s.match_date AS date,
                s.organization AS league,
                s.penalty_goals AS penaltyGoals,
                s.yellow_cards AS yellowCards,
                s.red_cards AS redCards,
                s.second_yellow_red_cards AS secondYellowRedCards,
                c.home_yellow_total AS homeYellowCards,
                c.away_yellow_total AS awayYellowCards,
                c.home_second_yellow_red AS homeSecondYellowRedCards,
                c.away_second_yellow_red AS awaySecondYellowRedCards,
                c.home_red_direct AS homeRedCards,
                c.away_red_direct AS awayRedCards
              FROM superlig_hakem_match_stats s
              LEFT JOIN superlig_match_team_cards c ON c.mac_id = s.mac_id
              WHERE s.hakem_id='${id}'
              ORDER BY s.match_date_iso DESC
              LIMIT ${limit};
            `);
            const foulMap = loadApiFoulMap();
            const enriched = data.map((row) => {
              const homeTeam = canonicalTeamName(String(row.homeTeam || ""));
              const awayTeam = canonicalTeamName(String(row.awayTeam || ""));
              const key = `${String(row.matchDateIso || "")}|${teamCodeFromName(String(row.homeTeam || ""))}|${teamCodeFromName(String(row.awayTeam || ""))}`;
              const fouls = foulMap.get(key);
              return {
                ...row,
                homeTeam,
                awayTeam,
                homeFouls: fouls ? fouls.home : null,
                awayFouls: fouls ? fouls.away : null,
                totalFouls: fouls ? fouls.total : null,
              };
            });
            sendJson(res, { data: enriched });
            return;
          }

          const refTeamsMatch = u.pathname.match(/^\/api\/localdb\/referees\/([^/]+)\/teams$/);
          if (refTeamsMatch) {
            const id = esc(decodeURIComponent(refTeamsMatch[1]));
            const data = runSql<any>(`
              WITH cards AS (
                SELECT c.home_team AS team,
                       (c.home_yellow_total + c.home_red_direct + c.home_second_yellow_red) AS cards_to_team
                FROM superlig_match_team_cards c
                JOIN superlig_hakem_match_stats s ON s.mac_id = c.mac_id
                WHERE s.hakem_id='${id}'
                UNION ALL
                SELECT c.away_team AS team,
                       (c.away_yellow_total + c.away_red_direct + c.away_second_yellow_red) AS cards_to_team
                FROM superlig_match_team_cards c
                JOIN superlig_hakem_match_stats s ON s.mac_id = c.mac_id
                WHERE s.hakem_id='${id}'
              )
              SELECT
                team,
                COUNT(*) AS matches,
                SUM(cards_to_team) AS total_cards,
                ROUND(1.0 * SUM(cards_to_team) / COUNT(*), 3) AS avg_cards_per_match
              FROM cards
              GROUP BY team
              ORDER BY total_cards DESC, avg_cards_per_match DESC
              LIMIT 20;
            `);
            sendJson(res, {
              data: data.map((row) => ({
                ...row,
                team: canonicalTeamName(String(row.team || "")),
              })),
            });
            return;
          }

          const refTeamMatchesMatch = u.pathname.match(/^\/api\/localdb\/referees\/([^/]+)\/teams\/([^/]+)\/matches$/);
          if (refTeamMatchesMatch) {
            const id = esc(decodeURIComponent(refTeamMatchesMatch[1]));
            const team = esc(decodeURIComponent(refTeamMatchesMatch[2]));
            const data = runSql<any>(`
              WITH team_side AS (
                SELECT
                  s.mac_id AS id,
                  s.match_date AS date,
                  s.organization AS league,
                  s.home_team AS homeTeam,
                  s.away_team AS awayTeam,
                  s.score AS score,
                  CASE WHEN c.home_team='${team}' THEN 1 ELSE 0 END AS is_home,
                  CASE WHEN c.home_team='${team}' THEN c.home_yellow_total ELSE c.away_yellow_total END AS yellow_cards,
                  CASE WHEN c.home_team='${team}' THEN c.home_second_yellow_red ELSE c.away_second_yellow_red END AS second_yellow_red_cards,
                  CASE WHEN c.home_team='${team}' THEN c.home_red_direct ELSE c.away_red_direct END AS red_cards,
                  CASE WHEN c.home_team='${team}' THEN c.away_yellow_total ELSE c.home_yellow_total END AS opp_yellow_cards,
                  CASE WHEN c.home_team='${team}' THEN c.away_second_yellow_red ELSE c.home_second_yellow_red END AS opp_second_yellow_red_cards,
                  CASE WHEN c.home_team='${team}' THEN c.away_red_direct ELSE c.home_red_direct END AS opp_red_cards
                FROM superlig_hakem_match_stats s
                JOIN superlig_match_team_cards c ON c.mac_id = s.mac_id
                WHERE s.hakem_id='${id}' AND (c.home_team='${team}' OR c.away_team='${team}')
              )
              SELECT id, date, league, homeTeam, awayTeam, score, is_home,
                     yellow_cards, second_yellow_red_cards, red_cards,
                     opp_yellow_cards, opp_second_yellow_red_cards, opp_red_cards
              FROM team_side
              ORDER BY id DESC
              LIMIT 120;
            `);
            sendJson(res, {
              data: data.map((row) => ({
                ...row,
                homeTeam: canonicalTeamName(String(row.homeTeam || "")),
                awayTeam: canonicalTeamName(String(row.awayTeam || "")),
              })),
            });
            return;
          }

          if (u.pathname === "/api/localdb/matches") {
            const limit = clamp(Number(u.searchParams.get("limit") || 80), 1, 400);
            const data = runSql<any>(`
              SELECT
                s.mac_id AS id,
                s.hakem_id AS refereeId,
                s.referee_name AS refereeName,
                s.match_date_iso AS matchDateIso,
                s.home_team AS homeTeam,
                s.away_team AS awayTeam,
                s.score AS score,
                s.match_date AS date,
                s.organization AS league,
                s.penalty_goals AS penaltyGoals,
                fw.week_number AS weekNumber,
                s.yellow_cards AS yellowCards,
                s.red_cards AS redCards,
                s.second_yellow_red_cards AS secondYellowRedCards,
                c.home_yellow_total AS homeYellowCards,
                c.away_yellow_total AS awayYellowCards,
                c.home_second_yellow_red AS homeSecondYellowRedCards,
                c.away_second_yellow_red AS awaySecondYellowRedCards,
                c.home_red_direct AS homeRedCards,
                c.away_red_direct AS awayRedCards
              FROM superlig_hakem_match_stats s
              LEFT JOIN superlig_fixture_weeks fw ON fw.mac_id = s.mac_id
              LEFT JOIN superlig_match_team_cards c ON c.mac_id = s.mac_id
              ORDER BY s.match_date_iso DESC
              LIMIT ${limit};
            `);
            const foulMap = loadApiFoulMap();
            const enriched = data.map((row) => {
              const homeTeam = canonicalTeamName(String(row.homeTeam || ""));
              const awayTeam = canonicalTeamName(String(row.awayTeam || ""));
              const key = `${String(row.matchDateIso || "")}|${teamCodeFromName(String(row.homeTeam || ""))}|${teamCodeFromName(String(row.awayTeam || ""))}`;
              const fouls = foulMap.get(key);
              return {
                ...row,
                homeTeam,
                awayTeam,
                homeFouls: fouls ? fouls.home : null,
                awayFouls: fouls ? fouls.away : null,
                totalFouls: fouls ? fouls.total : null,
              };
            });
            sendJson(res, { data: enriched });
            return;
          }

          if (u.pathname === "/api/localdb/upcoming-fixtures") {
            const days = clamp(Number(u.searchParams.get("days") || 7), 1, 14);
            const cacheKey = `days:${days}`;
            ensureUpcomingCacheSchema();
            ensureMlSchema();
            const cached = readUpcomingCache(cacheKey);
            if (cached?.fetchedAt) {
              const ageSec = Math.floor((Date.now() - new Date(cached.fetchedAt).getTime()) / 1000);
              if (!Number.isNaN(ageSec) && ageSec >= 0 && ageSec < UPCOMING_CACHE_TTL_SEC) {
                sendJson(res, { data: cached.data.slice(0, 40), source: "cache", cached: true, fetched_at: cached.fetchedAt });
                return;
              }
            }

            const primary = await fetchApiFootballUpcoming(days);
            const rapid = primary.length < 8 ? await fetchRapidFallbackUpcoming(days) : [];
            const seen = new Set<number>();
            const merged = [...primary, ...rapid].filter((x) => {
              if (!x.fixture_id) return false;
              if (seen.has(x.fixture_id)) return false;
              seen.add(x.fixture_id);
              return true;
            });
            let model = getModelParams();
            const official = await fetchRecentOfficialAssignments(10);
            model = learnFromResolvedFixtures(model, official);
            const predictorCtx = getPredictorContext();
            const predictionSnapshots: Array<{ fixture: UpcomingFixture; ranked: PredRow[] }> = [];
            const noOfficial = merged
              .filter((x) => !(x.referee && x.referee.trim()))
              .sort((a, b) => String(a.date).localeCompare(String(b.date)));
            const targetPredictionBucket = noOfficial.length
              ? fixtureAssignmentBucket(noOfficial[0])
              : null;
            const withReferee = merged.map((x) => {
              if (x.referee && x.referee.trim()) {
                return {
                  ...x,
                  referee: x.referee.trim(),
                  referee_is_estimated: false,
                  referee_confidence: 100,
                };
              }
              // Predict only for the nearest upcoming week/round.
              if (targetPredictionBucket && fixtureAssignmentBucket(x) !== targetPredictionBucket) {
                return {
                  ...x,
                  referee: "",
                  referee_is_estimated: false,
                  referee_confidence: 0,
                } as UpcomingFixture & { __ranked?: PredRow[] };
              }
              const predicted = predictRefereeByRefPredictModel(x, predictorCtx, model);
              predictionSnapshots.push({ fixture: x, ranked: predicted.ranked });
              return {
                ...x,
                referee: predicted.referee,
                referee_is_estimated: true,
                referee_confidence: predicted.confidence,
                __ranked: predicted.ranked,
              } as UpcomingFixture & { __ranked?: PredRow[] };
            });

            // Batch assignment pass:
            // Ensure one referee is not assigned to multiple fixtures in same round/week bucket.
            const usedRefByBucket = new Map<string, Set<string>>();
            const estimated = withReferee
              .filter((f: any) => f.referee_is_estimated)
              .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));

            for (const fx of estimated as Array<UpcomingFixture & { __ranked?: PredRow[] }>) {
              const bucket = fixtureAssignmentBucket(fx);
              const used = usedRefByBucket.get(bucket) || new Set<string>();
              const ranked = fx.__ranked || [];
              let chosen = ranked.find((r) => !used.has(normalizePersonName(r.referee)));
              let rankIndex = chosen ? ranked.findIndex((r) => r.refereeId === chosen?.refereeId) : -1;
              if (!chosen && ranked.length) {
                chosen = ranked[0];
                rankIndex = 0;
              }
              if (chosen) {
                fx.referee = chosen.referee;
                let conf = computePredictionConfidence(chosen, ranked[rankIndex + 1], ranked.length);
                // Lower confidence when we had to move off top candidate due to collision.
                if (rankIndex > 0) {
                  const rankPenalty = clamp(0.12 * rankIndex, 0.12, 0.45);
                  conf = conf * (1 - rankPenalty);
                }
                // If no free candidate in bucket, force low confidence.
                if (ranked.length > 0 && ranked.every((r) => used.has(normalizePersonName(r.referee)))) {
                  conf = Math.min(conf, 28);
                }
                fx.referee_confidence = Number(clamp(conf, 8, 82).toFixed(1));
                used.add(normalizePersonName(chosen.referee));
                usedRefByBucket.set(bucket, used);
              } else {
                fx.referee = "Hakem Ataması Bekleniyor";
                fx.referee_confidence = 0;
              }
              delete (fx as any).__ranked;
            }
            persistPredictionsForLearning(predictionSnapshots);
            withReferee.sort((a, b) => String(a.date).localeCompare(String(b.date)));
            const source =
              primary.length && rapid.length
                ? "api-football+rapidapi"
                : primary.length
                  ? "api-football"
                  : rapid.length
                    ? "rapidapi"
                    : "none";
            const nowIso = new Date().toISOString();
            writeUpcomingCache(cacheKey, withReferee, nowIso);
            sendJson(res, { data: withReferee.slice(0, 40), source, cached: false, fetched_at: nowIso });
            return;
          }

          sendJson(res, { error: "Not found" }, 404);
        } catch (err: any) {
          sendJson(res, { error: err?.message || "Server error" }, 500);
        }
      });
    },
  };
}
