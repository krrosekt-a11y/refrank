import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RiskBadge } from "@/components/RiskBadge";
import { UpgradeBanner } from "@/components/UpgradeBanner";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: highRisk } = await supabase
    .from("referee_scores")
    .select("referee_id, referee_score, total_matches, referees(id, name)")
    .order("referee_score", { ascending: true })
    .limit(5);
  const { data: lowRisk } = await supabase
    .from("referee_scores")
    .select("referee_id, referee_score, total_matches, referees(id, name)")
    .order("referee_score", { ascending: false })
    .limit(5);

  const { data: avgRow } = await supabase
    .from("referee_scores")
    .select("referee_score")
    .then((r) => {
      if (!r.data?.length) return { data: null };
      const avg = r.data.reduce((a: number, b: { referee_score: number }) => a + b.referee_score, 0) / r.data.length;
      return { data: [{ referee_score: Math.round(avg * 100) / 100 }] };
    });

  const leagueAvg = avgRow?.[0]?.referee_score ?? 50;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <UpgradeBanner />
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-200">League average comparison</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-pitch-400">{leagueAvg.toFixed(1)}</span>
          <span className="text-zinc-500">average referee score (0–100)</span>
        </div>
        <p className="mt-2 text-sm text-zinc-500">Higher score = higher risk. Compared across all leagues.</p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-red-400/90">Top 5 high-risk referees</h2>
          <ul className="space-y-3">
            {(highRisk || []).map((row: { referee_id: number; referee_score: number; total_matches: number; referees: { id: number; name: string } | null }) => (
              <li key={row.referee_id} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
                <Link href={`/referees/${row.referee_id}`} className="font-medium text-zinc-200 hover:text-pitch-400">
                  {(row.referees as { name: string })?.name ?? `Referee ${row.referee_id}`}
                </Link>
                <div className="flex items-center gap-2">
                  <RiskBadge score={row.referee_score} />
                  <span className="text-sm text-zinc-500">{row.total_matches} matches</span>
                </div>
              </li>
            ))}
          </ul>
          {(!highRisk || highRisk.length === 0) && (
            <p className="text-sm text-zinc-500">No referee data yet. Run ingestion to populate.</p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-pitch-400/90">Top 5 low-risk referees</h2>
          <ul className="space-y-3">
            {(lowRisk || []).map((row: { referee_id: number; referee_score: number; total_matches: number; referees: { id: number; name: string } | null }) => (
              <li key={row.referee_id} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
                <Link href={`/referees/${row.referee_id}`} className="font-medium text-zinc-200 hover:text-pitch-400">
                  {(row.referees as { name: string })?.name ?? `Referee ${row.referee_id}`}
                </Link>
                <div className="flex items-center gap-2">
                  <RiskBadge score={row.referee_score} />
                  <span className="text-sm text-zinc-500">{row.total_matches} matches</span>
                </div>
              </li>
            ))}
          </ul>
          {(!lowRisk || lowRisk.length === 0) && (
            <p className="text-sm text-zinc-500">No referee data yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
