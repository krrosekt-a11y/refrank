"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type MatchRow = {
  yellow_cards: number;
  red_cards: number;
  home_yellow_cards?: number;
  away_yellow_cards?: number;
  home_red_cards?: number;
  away_red_cards?: number;
  matches: { date: string; home_team: string; away_team: string } | null;
};

export function RefereeCharts({ lastMatches }: { lastMatches: MatchRow[] }) {
  const trendData = lastMatches
    .slice()
    .reverse()
    .map((m, i) => ({
      match: `M${i + 1}`,
      date: m.matches?.date?.slice(0, 10) ?? "",
      cards: m.yellow_cards + (m.red_cards ?? 0) * 3,
      yellow: m.yellow_cards,
      red: m.red_cards ?? 0,
    }));

  const biasData = lastMatches.map((m, i) => {
    const home = (m.home_yellow_cards ?? 0) + ((m.home_red_cards ?? 0) * 3);
    const away = (m.away_yellow_cards ?? 0) + ((m.away_red_cards ?? 0) * 3);
    return {
      match: `M${i + 1}`,
      home,
      away,
      bias: home - away,
    };
  });

  const cardDist = lastMatches.reduce(
    (acc, m) => {
      acc.yellow += m.yellow_cards ?? 0;
      acc.red += m.red_cards ?? 0;
      return acc;
    },
    { yellow: 0, red: 0 }
  );
  const distData = [
    { name: "Yellow", value: cardDist.yellow, fill: "#eab308" },
    { name: "Red", value: cardDist.red, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  if (lastMatches.length === 0) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Trend (last 10 matches)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <XAxis dataKey="match" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#27272a", border: "1px solid #3f3f46" }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <Bar dataKey="cards" name="Card intensity (Y+R*3)" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Home vs away cards</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={biasData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis dataKey="match" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#27272a", border: "1px solid #3f3f46" }}
              />
              <Legend />
              <Bar dataKey="home" name="Home" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="away" name="Away" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {distData.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 md:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Card distribution (last 10)</h2>
          <div className="flex flex-wrap gap-4">
            {distData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded"
                  style={{ backgroundColor: d.fill }}
                />
                <span className="text-zinc-400">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
