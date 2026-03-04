/**
 * Referee Intelligence Engine - Score calculations
 * CAS, PES, HBS, VRS, consistency, and final referee_score (0-100)
 */

export type StatRow = {
  referee_id: number;
  league_id: number;
  yellow_cards: number;
  red_cards: number;
  penalties: number;
  fouls: number;
  var_interventions: number;
  home_yellow_cards?: number;
  away_yellow_cards?: number;
  home_red_cards?: number;
  away_red_cards?: number;
};

export type LeagueAverages = {
  league_id: number;
  avg_cas: number;
  avg_pes: number;
  avg_hbs: number;
  avg_vrs: number;
  std_cas: number;
  std_pes: number;
  std_hbs: number;
  std_vrs: number;
};

/** Card Aggression Score: (yellow_cards + red_cards*3) / total_matches */
export function calcCAS(stats: StatRow[], totalMatches: number): number {
  if (totalMatches === 0) return 0;
  const sum = stats.reduce(
    (acc, s) => acc + s.yellow_cards + s.red_cards * 3,
    0
  );
  return sum / totalMatches;
}

/** Penalty Tendency Score: penalties / total_matches */
export function calcPES(stats: StatRow[], totalMatches: number): number {
  if (totalMatches === 0) return 0;
  const sum = stats.reduce((acc, s) => acc + s.penalties, 0);
  return sum / totalMatches;
}

/** Home Bias Score: average of (home_team_cards - away_team_cards) */
export function calcHBS(stats: StatRow[], totalMatches: number): number {
  if (totalMatches === 0) return 0;
  const homeY = (s: StatRow) => s.home_yellow_cards ?? 0;
  const awayY = (s: StatRow) => s.away_yellow_cards ?? 0;
  const homeR = (s: StatRow) => s.home_red_cards ?? 0;
  const awayR = (s: StatRow) => s.away_red_cards ?? 0;
  const sum = stats.reduce(
    (acc, s) =>
      acc + (homeY(s) + homeR(s) * 3) - (awayY(s) + awayR(s) * 3),
    0
  );
  return sum / totalMatches;
}

/** VAR Reliance Score: var_interventions / total_matches */
export function calcVRS(stats: StatRow[], totalMatches: number): number {
  if (totalMatches === 0) return 0;
  const sum = stats.reduce((acc, s) => acc + s.var_interventions, 0);
  return sum / totalMatches;
}

/** Consistency: lower std of per-match "card intensity" = higher consistency (0-100) */
export function calcConsistencyFactor(stats: StatRow[], totalMatches: number): number {
  if (totalMatches < 2) return 50;
  const intensities = stats.map(
    (s) => s.yellow_cards + s.red_cards * 3 + (s.penalties ?? 0)
  );
  const mean = intensities.reduce((a, b) => a + b, 0) / intensities.length;
  const variance =
    intensities.reduce((acc, v) => acc + (v - mean) ** 2, 0) / intensities.length;
  const std = Math.sqrt(variance);
  const maxStd = 10;
  const normalized = Math.min(1, std / maxStd);
  return Math.round((1 - normalized) * 100);
}

/** Normalize value to 0-100 using league average and std (min 0, max 100) */
export function normalizeTo100(
  value: number,
  leagueAvg: number,
  leagueStd: number
): number {
  if (leagueStd === 0) return 50;
  const z = (value - leagueAvg) / leagueStd;
  const normalized = 50 + z * 25;
  return Math.max(0, Math.min(100, Math.round(normalized * 100) / 100));
}

/** Absolute HBS for formula: we want to penalize bias (either direction) */
export function hbsNormForFormula(hbsNorm: number): number {
  return Math.min(100, Math.abs(hbsNorm - 50) * 2);
}

/**
 * Final referee score (0-100)
 * 0.30 * CAS_norm + 0.20 * PES_norm + 0.20 * |HBS_norm| + 0.15 * VRS_norm + 0.15 * consistency
 */
export function calcRefereeScore(params: {
  cas_norm: number;
  pes_norm: number;
  hbs_norm: number;
  vrs_norm: number;
  consistency_factor: number;
}): number {
  const { cas_norm, pes_norm, hbs_norm, vrs_norm, consistency_factor } = params;
  const hbsComponent = hbsNormForFormula(hbs_norm);
  const score =
    0.3 * cas_norm +
    0.2 * pes_norm +
    0.2 * hbsComponent +
    0.15 * vrs_norm +
    0.15 * (consistency_factor / 100) * 100;
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

export function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}
