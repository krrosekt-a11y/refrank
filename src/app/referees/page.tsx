import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RiskBadge } from "@/components/RiskBadge";

export default async function RefereesPage() {
  const supabase = await createClient();
  const { data: list } = await supabase
    .from("referee_scores")
    .select("referee_id, referee_score, total_matches, referees(id, name)")
    .order("referee_score", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Referees</h1>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-800/50">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-300">Name</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Score</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Risk</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Matches</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {(list || []).map((row: { referee_id: number; referee_score: number; total_matches: number; referees: { id: number; name: string } | null }) => (
              <tr key={row.referee_id} className="hover:bg-zinc-800/30">
                <td className="px-4 py-3">
                  <Link href={`/referees/${row.referee_id}`} className="font-medium text-pitch-400 hover:underline">
                    {(row.referees as { name: string })?.name ?? `Referee ${row.referee_id}`}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-300">{row.referee_score.toFixed(1)}</td>
                <td className="px-4 py-3">
                  <RiskBadge score={row.referee_score} />
                </td>
                <td className="px-4 py-3 text-zinc-500">{row.total_matches}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!list || list.length === 0) && (
          <p className="p-6 text-center text-zinc-500">No referees in database. Run data ingestion.</p>
        )}
      </div>
    </div>
  );
}
