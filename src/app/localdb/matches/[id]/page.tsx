import Link from "next/link";
import { notFound } from "next/navigation";
import { querySqlite, querySqliteSafe } from "@/lib/local-sqlite";

type Match = {
  mac_id: number;
  title: string;
  detail_url: string;
};

type Detail = {
  key: string;
  value: string;
};

type CriticalStats = {
  yellow_cards: number;
  red_cards: number;
  second_yellow_red_cards: number;
  penalty_goals: number;
  home_team: string;
  away_team: string;
  score: string;
  match_date: string;
};
type TeamCards = {
  home_yellow_total: number | null;
  away_yellow_total: number | null;
  home_second_yellow_red: number | null;
  away_second_yellow_red: number | null;
  home_red_direct: number | null;
  away_red_direct: number | null;
};

export default function MatchPage({ params }: { params: { id: string } }) {
  const panel = { border: "1px solid #2b3240", borderRadius: 14, background: "linear-gradient(180deg,#111827 0%,#0b1220 100%)" } as const;
  const muted = { color: "#94a3b8" } as const;
  const chip = {
    padding: "7px 10px",
    border: "1px solid #334155",
    borderRadius: 999,
    color: "#cbd5e1",
    background: "#0f172a",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 600,
  } as const;

  const id = params.id.replace(/[^0-9]/g, "");
  if (!id) notFound();

  const match = querySqlite<Match>(`SELECT mac_id, title, detail_url FROM matches WHERE mac_id=${id} LIMIT 1;`)[0];
  if (!match) notFound();

  const details = querySqlite<Detail>(`
    SELECT key, value
    FROM match_details
    WHERE mac_id=${id}
    ORDER BY key ASC;
  `);

  const referees = querySqlite<{ name: string; role: string }>(`
    SELECT r.name AS name, rm.role AS role
    FROM referee_matches rm
    JOIN referees r ON r.hakem_id = rm.hakem_id
    WHERE rm.mac_id=${id}
    ORDER BY r.name ASC;
  `);

  const critical = querySqliteSafe<CriticalStats>(`
    SELECT yellow_cards, red_cards, second_yellow_red_cards, penalty_goals, home_team, away_team, score, match_date
    FROM superlig_hakem_match_stats
    WHERE mac_id=${id}
    LIMIT 1;
  `)[0];
  const teamCards = querySqliteSafe<TeamCards>(`
    SELECT home_yellow_total, away_yellow_total, home_second_yellow_red, away_second_yellow_red, home_red_direct, away_red_direct
    FROM superlig_match_team_cards
    WHERE mac_id=${id}
    LIMIT 1;
  `)[0];

  return (
    <main style={{ padding: 24, maxWidth: 1040, margin: "18px auto", fontFamily: "Geist, system-ui, sans-serif", color: "#e5e7eb", border: "1px solid #1f2937", borderRadius: 16, background: "radial-gradient(circle at 0% 0%, #0f1b33 0%, #020617 55%)" }}>
      <p><Link style={chip} href="/localdb">← Geri</Link></p>
      <h1 style={{ marginBottom: 8, fontSize: 30, color: "#f8fafc" }}>Maç #{match.mac_id}</h1>
      <p style={{ marginTop: 0, ...muted }}>{match.title}</p>
      <p>
        <a style={{ color: "#93c5fd", fontWeight: 600 }} href={match.detail_url} target="_blank" rel="noreferrer">TFF sayfası</a>
      </p>

      <h2>Detaylar</h2>
      {critical && teamCards ? (
        <div style={{ marginBottom: 14, ...panel, padding: 10, overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 860, borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #1f2937" }}>
                <td style={{ width: 140, fontWeight: 800, color: "#f8fafc", fontSize: 20, padding: "6px 6px" }}>{critical.match_date}</td>
                <td style={{ fontWeight: 800, textDecoration: "underline", color: "#f8fafc", fontSize: 30, padding: "6px 6px" }}>{critical.home_team}</td>
                <td style={{ width: 120, textAlign: "center", fontWeight: 900, fontSize: 34, color: "#f8fafc", letterSpacing: 1, padding: "6px 6px" }}>{critical.score || "-"}</td>
                <td style={{ fontWeight: 800, color: "#f8fafc", fontSize: 30, textTransform: "lowercase", padding: "6px 6px" }}>{critical.away_team}</td>
              </tr>
              <tr>
                <td />
                <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>{Number(teamCards.home_yellow_total ?? 0)}</td>
                <td style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 20, padding: "4px 6px" }}>sarı kart</td>
                <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>{Number(teamCards.away_yellow_total ?? 0)}</td>
              </tr>
              <tr>
                <td />
                <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>{Number(teamCards.home_second_yellow_red ?? 0)}</td>
                <td style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 20, padding: "4px 6px" }}>sarıdan kırmızı</td>
                <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>{Number(teamCards.away_second_yellow_red ?? 0)}</td>
              </tr>
              <tr>
                <td />
                <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>{Number(teamCards.home_red_direct ?? 0)}</td>
                <td style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 20, padding: "4px 6px" }}>kırmızı</td>
                <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>{Number(teamCards.away_red_direct ?? 0)}</td>
              </tr>
              <tr>
                <td />
                <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>-</td>
                <td style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 20, padding: "4px 6px" }}>
                  penaltı <span style={{ ...muted, fontSize: 13 }}>(toplam {critical.penalty_goals ?? 0})</span>
                </td>
                <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>-</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
      <div style={{ marginBottom: 16, ...panel, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Kritik İstatistikler</h3>
        {critical ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 8 }}>
            <div style={{ padding: 10, border: "1px solid #1f2937", borderRadius: 8, background: "#0f172a" }}>
              <b>Sarı Kart</b>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{Number(critical.yellow_cards ?? 0)}</div>
            </div>
            <div style={{ padding: 10, border: "1px solid #1f2937", borderRadius: 8, background: "#0f172a" }}>
              <b>Sarıdan Kırmızı</b>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{Number(critical.second_yellow_red_cards ?? 0)}</div>
            </div>
            <div style={{ padding: 10, border: "1px solid #1f2937", borderRadius: 8, background: "#0f172a" }}>
              <b>Kırmızı Kart</b>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{Number(critical.red_cards ?? 0)}</div>
            </div>
            <div style={{ padding: 10, border: "1px solid #1f2937", borderRadius: 8, background: "#0f172a" }}>
              <b>Penaltı (Gol)</b>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{Number(critical.penalty_goals ?? 0)}</div>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, ...muted }}>
            Bu maç için kritik istatistik kaydı yok (filtre kapsamı dışında olabilir).
          </p>
        )}
      </div>

      <div style={{ ...panel, padding: 12 }}>
        {details.length === 0 ? (
          <p style={{ margin: 0, ...muted }}>Bu maç için detay alanı yok.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {details.map((d, i) => (
                <tr key={`${d.key}-${i}`} style={{ borderBottom: "1px solid #1f2937", background: i % 2 ? "#0b1220" : "transparent" }}>
                  <td style={{ width: 220, padding: "8px 6px", fontWeight: 600 }}>{d.key}</td>
                  <td style={{ padding: "8px 6px" }}>{d.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 style={{ marginTop: 24 }}>Bu Maçta Görev Alan Hakemler</h2>
      <ul>
        {referees.map((r, i) => (
          <li key={`${r.name}-${i}`}>{r.name} - {r.role}</li>
        ))}
      </ul>
    </main>
  );
}
