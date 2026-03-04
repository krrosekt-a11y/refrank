import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RiskBadge } from "@/components/RiskBadge";
import { RefereeCharts } from "@/components/RefereeCharts";

export default async function RefereeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const id = (await params).id;
  const refereeId = parseInt(id, 10);
  if (Number.isNaN(refereeId)) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-red-400">Invalid referee ID.</p>
      </div>
    );
  }

  const { data: referee, error: refError } = await supabase
    .from("referees")
    .select("*")
    .eq("id", refereeId)
    .single();

  if (refError || !referee) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-red-400">Referee not found.</p>
        <Link href="/referees" className="mt-2 inline-block text-pitch-400 hover:underline">Back to referees</Link>
      </div>
    );
  }

  const { data: scores } = await supabase
    .from("referee_scores")
    .select("*")
    .eq("referee_id", refereeId);

  const { data: lastMatches } = await supabase
    .from("referee_match_stats")
    .select(`
      match_id,
      yellow_cards,
      red_cards,
      penalties,
      var_interventions,
      home_yellow_cards,
      away_yellow_cards,
      home_red_cards,
      away_red_cards,
      matches ( date, home_team, away_team, league_id )
    `)
    .eq("referee_id", refereeId)
    .order("match_id", { ascending: false })
    .limit(10);

  const primaryScore = Array.isArray(scores) && scores.length > 0 ? scores[0] : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/referees" className="text-zinc-500 hover:text-zinc-300">← Referees</Link>
        <h1 className="text-2xl font-bold">{(referee as { name: string }).name}</h1>
        {primaryScore && (
          <RiskBadge score={(primaryScore as { referee_score: number }).referee_score} />
        )}
      </div>

      {primaryScore && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Risk interpretation</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div>
              <p className="text-xs text-zinc-500">CAS (Card Aggression)</p>
              <p className="text-lg font-medium">{(primaryScore as { cas_norm: number }).cas_norm?.toFixed(1) ?? "–"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">PES (Penalty Tendency)</p>
              <p className="text-lg font-medium">{(primaryScore as { pes_norm: number }).pes_norm?.toFixed(1) ?? "–"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">HBS (Home Bias)</p>
              <p className="text-lg font-medium">{(primaryScore as { hbs_norm: number }).hbs_norm?.toFixed(1) ?? "–"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">VRS (VAR Reliance)</p>
              <p className="text-lg font-medium">{(primaryScore as { vrs_norm: number }).vrs_norm?.toFixed(1) ?? "–"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Consistency</p>
              <p className="text-lg font-medium">{(primaryScore as { consistency_factor: number }).consistency_factor?.toFixed(0) ?? "–"}</p>
            </div>
          </div>
        </section>
      )}

      <RefereeCharts
        lastMatches={(lastMatches || []) as Array<{
          yellow_cards: number;
          red_cards: number;
          home_yellow_cards?: number;
          away_yellow_cards?: number;
          home_red_cards?: number;
          away_red_cards?: number;
          matches: { date: string; home_team: string; away_team: string } | null;
        }>}
      />

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Last 10 matches</h2>
        <ul className="space-y-2">
          {(lastMatches || []).map((m: { match_id: number; yellow_cards: number; red_cards: number; matches: { date: string; home_team: string; away_team: string } | null }) => (
            <li key={m.match_id} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2 text-sm">
              <span className="text-zinc-400">
                {(m.matches as { date: string; home_team: string; away_team: string })?.home_team ?? "?"} vs {(m.matches as { home_team: string; away_team: string })?.away_team ?? "?"}
              </span>
              <span className="text-zinc-500">{m.yellow_cards}Y {m.red_cards}R</span>
            </li>
          ))}
        </ul>
        {(!lastMatches || lastMatches.length === 0) && (
          <p className="text-zinc-500">No match history.</p>
        )}
      </section>
    </div>
  );
}
