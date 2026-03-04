import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSubscriptionStatus } from "@/lib/stripe";
import { RiskBadge } from "@/components/RiskBadge";

export default async function MatchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tier = await getSubscriptionStatus(user.id);
  if (tier !== "pro") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
        <h2 className="text-lg font-semibold text-amber-400">Match Preview is a Pro feature</h2>
        <p className="mt-2 text-zinc-400">Upgrade to Pro to see referee scores and risk for upcoming matches.</p>
        <a href="/dashboard" className="mt-4 inline-block rounded-lg bg-pitch-600 px-4 py-2 text-sm font-medium text-white hover:bg-pitch-500">
          Back to Dashboard
        </a>
      </div>
    );
  }

  const { data: matches } = await supabase
    .from("matches")
    .select(`
      id,
      date,
      home_team,
      away_team,
      referees ( id, name )
    `)
    .order("date", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Match Preview</h1>
      <p className="text-zinc-500">Referee score and risk for each match. Pro feature.</p>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-800/50">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-300">Date</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Match</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Referee</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Score / Risk</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {(matches || []).map((m: { id: number; date: string; home_team: string; away_team: string; referees: { id: number; name: string } | null }) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </tbody>
        </table>
        {(!matches || matches.length === 0) && (
          <p className="p-6 text-center text-zinc-500">No matches. Run ingestion.</p>
        )}
      </div>
    </div>
  );
}

async function MatchRow({ match }: { match: { id: number; date: string; home_team: string; away_team: string; referees: { id: number; name: string } | null } }) {
  const supabase = await createClient();
  const refereeId = (match.referees as { id: number } | null)?.id;
  let score: number | null = null;
  let leagueId: number | null = null;
  if (refereeId) {
    const { data: matchRow } = await supabase.from("matches").select("league_id").eq("id", match.id).single();
    leagueId = (matchRow as { league_id: number } | null)?.league_id ?? null;
    if (leagueId != null) {
      const { data: s } = await supabase
        .from("referee_scores")
        .select("referee_score")
        .eq("referee_id", refereeId)
        .eq("league_id", leagueId)
        .single();
      score = (s as { referee_score: number } | null)?.referee_score ?? null;
    }
  }
  return (
    <tr className="hover:bg-zinc-800/30">
      <td className="px-4 py-3 text-zinc-400">{match.date}</td>
      <td className="px-4 py-3">
        {match.home_team} vs {match.away_team}
      </td>
      <td className="px-4 py-3 text-zinc-300">{(match.referees as { name: string })?.name ?? "–"}</td>
      <td className="px-4 py-3">
        {score != null ? <RiskBadge score={score} /> : "–"}
      </td>
      <td className="px-4 py-3">
        <Link href={`/matches/${match.id}`} className="text-pitch-400 hover:underline">Preview</Link>
      </td>
    </tr>
  );
}
