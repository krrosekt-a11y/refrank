import Link from "next/link";
import { notFound } from "next/navigation";
import { querySqlite, querySqliteSafe } from "@/lib/local-sqlite";

type Referee = {
  hakem_id: string;
  name: string;
  klasman: string;
  city: string;
  license_no: string;
  class_from_page: string;
  region: string;
};

type RefMatch = {
  mac_id: number | null;
  home_team: string;
  away_team: string;
  score: string;
  match_date: string;
  role: string;
  organization: string;
  yellow_cards: number | null;
  red_cards: number | null;
  second_yellow_red_cards: number | null;
  penalty_goals: number | null;
  home_yellow_total: number | null;
  away_yellow_total: number | null;
  home_second_yellow_red: number | null;
  away_second_yellow_red: number | null;
  home_red_direct: number | null;
  away_red_direct: number | null;
};

type OptionRow = { value: string };
type TeamCardRow = {
  team: string;
  matches: number;
  total_cards: number;
  avg_cards_per_match: number;
  home_cards: number;
  away_cards: number;
};
type HomeAwaySummary = {
  matches: number;
  avg_home_cards: number;
  avg_away_cards: number;
  home_minus_away: number;
};

function esc(value: string): string {
  return value.replace(/'/g, "''");
}

function shortTrDate(raw: string): string {
  const m = raw.match(/^(\d{1,2})\s+([^\s]+)\s+(\d{4})$/);
  if (!m) return raw;
  const mm: Record<string, string> = {
    Ocak: "Oca",
    Şubat: "Şub",
    Mart: "Mar",
    Nisan: "Nis",
    Mayıs: "May",
    Haziran: "Haz",
    Temmuz: "Tem",
    Ağustos: "Ağu",
    Eylül: "Eyl",
    Ekim: "Eki",
    Kasım: "Kas",
    Aralık: "Ara",
  };
  const day = m[1];
  const mon = mm[m[2]] ?? m[2].slice(0, 3);
  const yy = m[3].slice(2);
  return `${day}-${mon}-${yy}`;
}

export default function RefereePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { role?: string; organization?: string; sort?: string };
}) {
  const panel = { border: "1px solid #2b3240", borderRadius: 14, background: "linear-gradient(180deg,#111827 0%,#0b1220 100%)" } as const;
  const muted = { color: "#94a3b8" } as const;
  const tableHead = { textAlign: "left" as const, borderBottom: "1px solid #334155", background: "#0f172a", color: "#cbd5e1", fontSize: 13, letterSpacing: 0.2 };
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
  const input = {
    width: "100%",
    padding: 9,
    background: "#0f172a",
    color: "#e5e7eb",
    border: "1px solid #334155",
    borderRadius: 8,
  } as const;
  const btn = {
    padding: "9px 12px",
    borderRadius: 8,
    border: "1px solid #1d4ed8",
    background: "#1d4ed8",
    color: "#e2e8f0",
    fontWeight: 700,
  } as const;

  const id = params.id.replace(/[^0-9]/g, "");
  if (!id) notFound();
  const role = searchParams?.role ?? "all";
  const organization = searchParams?.organization ?? "all";
  const sort = searchParams?.sort ?? "date_desc";

  const ref = querySqlite<Referee>(`SELECT * FROM referees WHERE hakem_id='${id}' LIMIT 1;`)[0];
  if (!ref) notFound();

  const roleOptions = querySqlite<OptionRow>(`
    SELECT DISTINCT role AS value
    FROM referee_matches
    WHERE hakem_id='${id}' AND role IS NOT NULL AND role <> ''
    ORDER BY role ASC;
  `);
  const orgOptions = querySqlite<OptionRow>(`
    SELECT DISTINCT organization AS value
    FROM referee_matches
    WHERE hakem_id='${id}' AND organization IS NOT NULL AND organization <> ''
    ORDER BY organization ASC;
  `);
  const organizationOptions = orgOptions.filter(
    (o) => !o.value.startsWith("Trendyol Süper Lig")
  );

  const whereParts: string[] = [`rm.hakem_id='${id}'`];
  if (role !== "all") whereParts.push(`rm.role='${esc(role)}'`);
  if (organization === "__trendyol_superlig__" || organization === "__trendyol_superlig_all__") {
    whereParts.push(`rm.organization LIKE 'Trendyol Süper Lig%'`);
  } else if (organization !== "all") {
    whereParts.push(`rm.organization='${esc(organization)}'`);
  }

  const orderBy = sort === "date_asc" ? "id ASC" : "id DESC";

  const matches = querySqlite<RefMatch>(`
    SELECT
      rm.mac_id,
      rm.home_team,
      rm.away_team,
      rm.score,
      rm.match_date,
      rm.role,
      rm.organization,
      ss.yellow_cards,
      ss.red_cards,
      ss.second_yellow_red_cards,
      ss.penalty_goals,
      tc.home_yellow_total,
      tc.away_yellow_total,
      tc.home_second_yellow_red,
      tc.away_second_yellow_red,
      tc.home_red_direct,
      tc.away_red_direct
    FROM referee_matches rm
    LEFT JOIN superlig_hakem_match_stats ss ON ss.mac_id = rm.mac_id
    LEFT JOIN superlig_match_team_cards tc ON tc.mac_id = rm.mac_id
    WHERE ${whereParts.join(" AND ")}
    ORDER BY ${orderBy}
    LIMIT 300;
  `);
  const topTeamsByCards = querySqliteSafe<TeamCardRow>(`
    WITH target_matches AS (
      SELECT rm.mac_id
      FROM referee_matches rm
      WHERE rm.hakem_id='${id}'
        AND rm.role='Hakem'
        AND rm.organization LIKE 'Trendyol Süper Lig%'
    ),
    cards AS (
      SELECT c.home_team AS team,
             (c.home_yellow_total + c.home_red_direct + c.home_second_yellow_red) AS cards_to_team,
             1 AS is_home
      FROM superlig_match_team_cards c
      JOIN target_matches tm ON tm.mac_id = c.mac_id
      UNION ALL
      SELECT c.away_team AS team,
             (c.away_yellow_total + c.away_red_direct + c.away_second_yellow_red) AS cards_to_team,
             0 AS is_home
      FROM superlig_match_team_cards c
      JOIN target_matches tm ON tm.mac_id = c.mac_id
    )
    SELECT team,
           COUNT(*) AS matches,
           SUM(cards_to_team) AS total_cards,
           ROUND(1.0 * SUM(cards_to_team) / COUNT(*), 3) AS avg_cards_per_match,
           SUM(CASE WHEN is_home=1 THEN cards_to_team ELSE 0 END) AS home_cards,
           SUM(CASE WHEN is_home=0 THEN cards_to_team ELSE 0 END) AS away_cards
    FROM cards
    GROUP BY team
    ORDER BY total_cards DESC, avg_cards_per_match DESC
    LIMIT 20;
  `);
  const homeAwaySummary = querySqliteSafe<HomeAwaySummary>(`
    WITH target_matches AS (
      SELECT rm.mac_id
      FROM referee_matches rm
      WHERE rm.hakem_id='${id}'
        AND rm.role='Hakem'
        AND rm.organization LIKE 'Trendyol Süper Lig%'
    )
    SELECT COUNT(*) AS matches,
           ROUND(AVG(c.home_yellow_total + c.home_red_direct + c.home_second_yellow_red), 3) AS avg_home_cards,
           ROUND(AVG(c.away_yellow_total + c.away_red_direct + c.away_second_yellow_red), 3) AS avg_away_cards,
           ROUND(AVG(c.home_yellow_total + c.home_red_direct + c.home_second_yellow_red) -
                 AVG(c.away_yellow_total + c.away_red_direct + c.away_second_yellow_red), 3) AS home_minus_away
    FROM superlig_match_team_cards c
    JOIN target_matches tm ON tm.mac_id = c.mac_id;
  `)[0];
  const tendencyText = !homeAwaySummary || Number(homeAwaySummary.matches ?? 0) === 0
    ? "Veri yok"
    : Number(homeAwaySummary.home_minus_away ?? 0) > 0
      ? "Ev sahibine daha fazla kart"
      : Number(homeAwaySummary.home_minus_away ?? 0) < 0
        ? "Deplasman takımına daha fazla kart"
        : "Dengeli";

  return (
    <main style={{ padding: 24, maxWidth: 1240, margin: "18px auto", fontFamily: "Geist, system-ui, sans-serif", color: "#e5e7eb", border: "1px solid #1f2937", borderRadius: 16, background: "radial-gradient(circle at 0% 0%, #0f1b33 0%, #020617 55%)" }}>
      <p><Link style={chip} href="/localdb">← Geri</Link></p>
      <h1 style={{ marginBottom: 6, fontSize: 30, color: "#f8fafc" }}>{ref.name}</h1>
      <p style={{ ...muted, marginTop: 0 }}>
        Hakem ID: {ref.hakem_id} | Klasman: {ref.klasman || ref.class_from_page} | Şehir/Bölge: {ref.city || ref.region} | Lisans: {ref.license_no || "-"}
      </p>

      <h2 style={{ color: "#f8fafc", fontSize: 24 }}>Son Maçlar (300)</h2>
      <form action={`/localdb/referees/${id}`} method="get" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 16, ...panel, padding: 12 }}>
        <div>
          <label htmlFor="sort" style={{ ...muted, display: "block", marginBottom: 6 }}>Sıralama</label>
          <select id="sort" name="sort" defaultValue={sort} style={input}>
            <option value="date_desc">En yeni</option>
            <option value="date_asc">En eski</option>
          </select>
        </div>
        <div>
          <label htmlFor="role" style={{ ...muted, display: "block", marginBottom: 6 }}>Görev</label>
          <select id="role" name="role" defaultValue={role} style={input}>
            <option value="all">Tümü</option>
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>{r.value}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="organization" style={{ ...muted, display: "block", marginBottom: 6 }}>Organizasyon</label>
          <select id="organization" name="organization" defaultValue={organization} style={input}>
            <option value="all">Tümü</option>
            <option value="__trendyol_superlig__">Trendyol Süper Lig</option>
            {organizationOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.value}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
          <button type="submit" style={btn}>Filtrele</button>
          <Link style={chip} href={`/localdb/referees/${id}`}>Temizle</Link>
        </div>
      </form>

      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <b>Hızlı Görev:</b>
        <Link style={chip} href={`/localdb/referees/${id}?sort=${encodeURIComponent(sort)}&role=Hakem&organization=${encodeURIComponent(organization)}`}>Hakem</Link>
        <Link style={chip} href={`/localdb/referees/${id}?sort=${encodeURIComponent(sort)}&role=VAR&organization=${encodeURIComponent(organization)}`}>VAR</Link>
        <Link style={chip} href={`/localdb/referees/${id}?sort=${encodeURIComponent(sort)}&role=AVAR&organization=${encodeURIComponent(organization)}`}>AVAR</Link>
        <Link style={chip} href={`/localdb/referees/${id}?sort=${encodeURIComponent(sort)}&role=all&organization=${encodeURIComponent(organization)}`}>Tümü</Link>
      </div>

      <p style={{ ...muted, marginTop: 0 }}>
        Liste görünümü örnek formatına göre düzenlendi. `Penaltı` takım bazında tüm maçlarda bulunmayabilir.
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        {matches.map((m, i) => (
          <section key={`${m.mac_id}-${i}`} style={{ ...panel, padding: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 860, borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #1f2937" }}>
                  <td style={{ width: 140, fontWeight: 800, color: "#f8fafc", fontSize: 20, padding: "6px 6px" }}>{shortTrDate(m.match_date)}</td>
                  <td style={{ fontWeight: 800, textDecoration: "underline", color: "#f8fafc", fontSize: 30, padding: "6px 6px" }}>{m.home_team}</td>
                  <td style={{ width: 120, textAlign: "center", fontWeight: 900, fontSize: 34, color: "#f8fafc", letterSpacing: 1, padding: "6px 6px" }}>{m.score || "-"}</td>
                  <td style={{ fontWeight: 800, color: "#f8fafc", fontSize: 30, textTransform: "lowercase", padding: "6px 6px" }}>{m.away_team}</td>
                </tr>
                <tr>
                  <td />
                  <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>{Number(m.home_yellow_total ?? 0)}</td>
                  <td style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 20, padding: "4px 6px" }}>sarı kart</td>
                  <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>{Number(m.away_yellow_total ?? 0)}</td>
                </tr>
                <tr>
                  <td />
                  <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>{Number(m.home_second_yellow_red ?? 0)}</td>
                  <td style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 20, padding: "4px 6px" }}>sarıdan kırmızı</td>
                  <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>{Number(m.away_second_yellow_red ?? 0)}</td>
                </tr>
                <tr>
                  <td />
                  <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>{Number(m.home_red_direct ?? 0)}</td>
                  <td style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 20, padding: "4px 6px" }}>kırmızı</td>
                  <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>{Number(m.away_red_direct ?? 0)}</td>
                </tr>
                <tr>
                  <td />
                  <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>-</td>
                  <td style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 20, padding: "4px 6px" }}>
                    penaltı <span style={{ ...muted, fontSize: 13 }}>(toplam {m.penalty_goals ?? 0})</span>
                  </td>
                  <td style={{ fontSize: 26, fontWeight: 800, textAlign: "right", padding: "4px 6px" }}>-</td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", ...muted }}>
              <span>Görev: {m.role}</span>
              <span>|</span>
              <span>{m.organization}</span>
              {m.mac_id ? (
                <>
                  <span>|</span>
                  <Link style={{ color: "#93c5fd", fontWeight: 700 }} href={`/localdb/matches/${m.mac_id}`}>detay</Link>
                </>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <h2 style={{ marginTop: 28 }}>Süper Lig Kart Eğilimi Analizi</h2>
      <div style={{ ...panel, padding: 12, marginBottom: 14 }}>
        {!homeAwaySummary || Number(homeAwaySummary.matches ?? 0) === 0 ? (
          <p style={{ margin: 0, ...muted }}>Bu hakem için Süper Lig (Hakem rolü) kart eğilimi verisi bulunamadı.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8 }}>
            <div style={{ padding: 10, border: "1px solid #1f2937", borderRadius: 8, background: "#0f172a" }}>
              <b>Maç</b>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{Number(homeAwaySummary.matches ?? 0)}</div>
            </div>
            <div style={{ padding: 10, border: "1px solid #1f2937", borderRadius: 8, background: "#0f172a" }}>
              <b>Ev Sahibi Ort.</b>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{Number(homeAwaySummary.avg_home_cards ?? 0).toFixed(3)}</div>
            </div>
            <div style={{ padding: 10, border: "1px solid #1f2937", borderRadius: 8, background: "#0f172a" }}>
              <b>Deplasman Ort.</b>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{Number(homeAwaySummary.avg_away_cards ?? 0).toFixed(3)}</div>
            </div>
            <div style={{ padding: 10, border: "1px solid #1f2937", borderRadius: 8, background: "#0f172a" }}>
              <b>Fark / Yorum</b>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{Number(homeAwaySummary.home_minus_away ?? 0).toFixed(3)}</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{tendencyText}</div>
            </div>
          </div>
        )}
      </div>

      <h3>En Çok Kart Gösterdiği Takımlar (Süper Lig)</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", ...panel }}>
          <thead>
            <tr style={tableHead}>
              <th style={{ padding: "8px 6px" }}>Takım</th>
              <th style={{ padding: "8px 6px" }}>Maç</th>
              <th style={{ padding: "8px 6px" }}>Toplam Kart</th>
              <th style={{ padding: "8px 6px" }}>Maç Başına</th>
              <th style={{ padding: "8px 6px" }}>Ev Sahibi Top.</th>
              <th style={{ padding: "8px 6px" }}>Deplasman Top.</th>
            </tr>
          </thead>
          <tbody>
            {topTeamsByCards.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "10px 6px", color: "#9ca3af" }}>
                  Bu hakem için Süper Lig (Hakem rolü) takım kart dağılımı verisi yok.
                </td>
              </tr>
            ) : (
              topTeamsByCards.map((r, i) => (
                <tr key={`${r.team}-${i}`} style={{ borderBottom: "1px solid #1f2937", background: i % 2 ? "#0b1220" : "transparent" }}>
                  <td style={{ padding: "8px 6px" }}>{r.team}</td>
                  <td style={{ padding: "8px 6px" }}>{Number(r.matches ?? 0)}</td>
                  <td style={{ padding: "8px 6px", fontWeight: 600 }}>{Number(r.total_cards ?? 0)}</td>
                  <td style={{ padding: "8px 6px" }}>{Number(r.avg_cards_per_match ?? 0).toFixed(3)}</td>
                  <td style={{ padding: "8px 6px" }}>{Number(r.home_cards ?? 0)}</td>
                  <td style={{ padding: "8px 6px" }}>{Number(r.away_cards ?? 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
