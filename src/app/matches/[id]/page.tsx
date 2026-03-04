import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSubscriptionStatus } from "@/lib/stripe";
import { RiskBadge } from "@/components/RiskBadge";

export default async function MatchPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tier = await getSubscriptionStatus(user.id);
  if (tier !== "pro") {
    redirect("/matches?pro=required");
  }

  const id = (await params).id;
  const matchId = parseInt(id, 10);
  if (Number.isNaN(matchId)) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-red-400">Invalid match ID.</p>
      </div>
    );
  }

  const { data: match, error } = await supabase
    .from("matches")
    .select(`
      *,
      referees ( id, name ),
      leagues ( id, name )
    `)
    .eq("id", matchId)
    .single();

  if (error || !match) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-red-400">Match not found.</p>
        <Link href="/matches" className="mt-2 inline-block text-pitch-400 hover:underline">Back to matches</Link>
      </div>
    );
  }

  const refereeId = (match as { referee_id: number }).referee_id;
  const leagueId = (match as { league_id: number }).league_id;
  let refereeScore: { referee_score: number; cas_norm: number; pes_norm: number } | null = null;
  if (refereeId) {
    const { data: s } = await supabase
      .from("referee_scores")
      .select("referee_score, cas_norm, pes_norm")
      .eq("referee_id", refereeId)
      .eq("league_id", leagueId)
      .single();
    refereeScore = s;
  }

  const { data: stats } = await supabase
    .from("referee_match_stats")
    .select("yellow_cards, red_cards, penalties")
    .eq("match_id", matchId)
    .single();

  const score = refereeScore?.referee_score ?? 50;
  const overUnderHint = score >= 60 ? "Referee tends to show more cards – consider Over on cards." : score <= 40 ? "Referee tends to show fewer cards – consider Under on cards." : "Referee near league average for cards.";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/matches" className="text-zinc-500 hover:text-zinc-300">← Matches</Link>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h1 className="text-2xl font-bold">
          {(match as { home_team: string }).home_team} vs {(match as { away_team: string }).away_team}
        </h1>
        <p className="mt-1 text-zinc-500">{(match as { date: string }).date} · {(match as { leagues: { name: string } }).leagues?.name ?? "League"}</p>
        <p className="mt-2 text-zinc-400">Referee: {(match as { referees: { name: string } }).referees?.name ?? "–"}</p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Assigned referee score</h2>
        <div className="flex items-center gap-4">
          <RiskBadge score={score} />
          <span className="text-zinc-500">Risk level indicator (0–100)</span>
        </div>
        {refereeScore && (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-zinc-500">Card aggression (CAS)</p>
              <p className="font-medium">{refereeScore.cas_norm?.toFixed(1) ?? "–"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Penalty tendency (PES)</p>
              <p className="font-medium">{refereeScore.pes_norm?.toFixed(1) ?? "–"}</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-pitch-500/30 bg-pitch-500/5 p-6">
        <h2 className="mb-2 text-lg font-semibold text-pitch-400">Over/Under card probability</h2>
        <p className="text-zinc-300">{overUnderHint}</p>
      </section>

      {stats && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Last match stats (if played)</h2>
          <p className="text-zinc-400">Yellows: {(stats as { yellow_cards: number }).yellow_cards}, Reds: {(stats as { red_cards: number }).red_cards}, Penalties: {(stats as { penalties: number }).penalties}</p>
        </section>
      )}
    </div>
  );
}
