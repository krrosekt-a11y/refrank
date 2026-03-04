import type { StatRow } from "@/lib/scores";
import {
  calcCAS,
  calcConsistencyFactor,
  calcHBS,
  calcPES,
  calcRefereeScore,
  calcVRS,
  normalizeTo100,
  std,
} from "@/lib/scores";
import { createServiceRoleClient } from "@/lib/supabase/service";

const supabase = createServiceRoleClient();

export async function recalculateScoresForLeague(leagueId: number): Promise<number> {
  const { data: stats } = await supabase
    .from("referee_match_stats")
    .select("*")
    .eq("league_id", leagueId);

  if (!stats || stats.length === 0) return 0;

  const byReferee = new Map<string, StatRow[]>();
  for (const row of stats as unknown as (StatRow & { id: string })[]) {
    const key = `${row.referee_id}-${row.league_id}`;
    if (!byReferee.has(key)) byReferee.set(key, []);
    byReferee.get(key)!.push(row);
  }

  const refereeIds = [...new Set(stats.map((s: { referee_id: number }) => s.referee_id))];
  const allCAS: number[] = [];
  const allPES: number[] = [];
  const allHBS: number[] = [];
  const allVRS: number[] = [];

  for (const [, rows] of byReferee) {
    const n = rows.length;
    allCAS.push(calcCAS(rows, n));
    allPES.push(calcPES(rows, n));
    allHBS.push(calcHBS(rows, n));
    allVRS.push(calcVRS(rows, n));
  }

  const avgCAS = allCAS.length ? allCAS.reduce((a, b) => a + b, 0) / allCAS.length : 0;
  const avgPES = allPES.length ? allPES.reduce((a, b) => a + b, 0) / allPES.length : 0;
  const avgHBS = allHBS.length ? allHBS.reduce((a, b) => a + b, 0) / allHBS.length : 0;
  const avgVRS = allVRS.length ? allVRS.reduce((a, b) => a + b, 0) / allVRS.length : 0;
  const stdCAS = std(allCAS) || 0.01;
  const stdPES = std(allPES) || 0.01;
  const stdHBS = std(allHBS) || 0.01;
  const stdVRS = std(allVRS) || 0.01;

  let upserted = 0;
  for (const [key, rows] of byReferee) {
    const [refereeIdStr, leagueIdStr] = key.split("-");
    const refereeId = parseInt(refereeIdStr, 10);
    const leagueIdNum = parseInt(leagueIdStr, 10);
    const totalMatches = rows.length;

    const casRaw = calcCAS(rows, totalMatches);
    const pesRaw = calcPES(rows, totalMatches);
    const hbsRaw = calcHBS(rows, totalMatches);
    const vrsRaw = calcVRS(rows, totalMatches);
    const consistency = calcConsistencyFactor(rows, totalMatches);

    const casNorm = normalizeTo100(casRaw, avgCAS, stdCAS);
    const pesNorm = normalizeTo100(pesRaw, avgPES, stdPES);
    const hbsNorm = normalizeTo100(hbsRaw, avgHBS, stdHBS);
    const vrsNorm = normalizeTo100(vrsRaw, avgVRS, stdVRS);

    const refereeScore = calcRefereeScore({
      cas_norm: casNorm,
      pes_norm: pesNorm,
      hbs_norm: hbsNorm,
      vrs_norm: vrsNorm,
      consistency_factor: consistency,
    });

    const { error } = await supabase.from("referee_scores").upsert(
      {
        referee_id: refereeId,
        league_id: leagueIdNum,
        total_matches: totalMatches,
        cas_raw: casRaw,
        pes_raw: pesRaw,
        hbs_raw: hbsRaw,
        vrs_raw: vrsRaw,
        cas_norm: casNorm,
        pes_norm: pesNorm,
        hbs_norm: hbsNorm,
        vrs_norm: vrsNorm,
        consistency_factor: consistency,
        referee_score: refereeScore,
      },
      { onConflict: "referee_id,league_id" }
    );
    if (!error) upserted++;
  }
  return upserted;
}

export async function recalculateAllScores(): Promise<{ leagues: number; scores: number }> {
  const { data: leagues } = await supabase.from("leagues").select("id");
  if (!leagues || leagues.length === 0) return { leagues: 0, scores: 0 };
  let totalScores = 0;
  for (const l of leagues) {
    totalScores += await recalculateScoresForLeague(l.id);
  }
  return { leagues: leagues.length, scores: totalScores };
}
