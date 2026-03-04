import Link from "next/link";
import { getDbPath, querySqlite, querySqliteSafe } from "@/lib/local-sqlite";

type CountRow = { c: number };
type RefRow = {
  hakem_id: string;
  name: string;
  city: string;
  klasman: string;
  match_count: number;
};

type OptionRow = { value: string };
type RefTeamCardRow = {
  referee_name: string;
  team: string;
  matches: number;
  total_cards: number;
  avg_cards_per_match: number;
};
type HomeAwayRow = {
  referee_name: string;
  matches: number;
  avg_home_cards: number;
  avg_away_cards: number;
  home_minus_away: number;
};

function n(value: unknown): number {
  return Number(value ?? 0);
}

function esc(value: string): string {
  return value.replace(/'/g, "''");
}

export default function LocalDbPage({
  searchParams,
}: {
  searchParams?: { sort?: string; role?: string; organization?: string };
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

  const sort = searchParams?.sort ?? "matches_desc";
  const role = searchParams?.role ?? "all";
  const organization = searchParams?.organization ?? "all";
  const referees = n(querySqlite<CountRow>("SELECT COUNT(*) AS c FROM referees;")[0]?.c);
  const refereeMatches = n(querySqlite<CountRow>("SELECT COUNT(*) AS c FROM referee_matches;")[0]?.c);
  const matches = n(querySqlite<CountRow>("SELECT COUNT(*) AS c FROM matches;")[0]?.c);
  const matchDetails = n(querySqlite<CountRow>("SELECT COUNT(*) AS c FROM match_details;")[0]?.c);

  const orderBy = (() => {
    if (sort === "name_asc") return "r.name ASC";
    if (sort === "name_desc") return "r.name DESC";
    if (sort === "matches_asc") return "match_count ASC, r.name ASC";
    return "match_count DESC, r.name ASC";
  })();

  const roles = querySqlite<OptionRow>(`
    SELECT DISTINCT role AS value
    FROM referee_matches
    WHERE role IS NOT NULL AND role <> ''
    ORDER BY role ASC;
  `);

  const organizations = querySqlite<OptionRow>(`
    SELECT DISTINCT organization AS value
    FROM referee_matches
    WHERE organization IS NOT NULL AND organization <> ''
    ORDER BY organization ASC;
  `);
  const organizationOptions = organizations.filter(
    (o) => !o.value.startsWith("Trendyol Süper Lig")
  );

  const joinFilters: string[] = [];
  if (role !== "all") joinFilters.push(`rm.role = '${esc(role)}'`);
  if (organization === "__trendyol_superlig__" || organization === "__trendyol_superlig_all__") {
    joinFilters.push(`rm.organization LIKE 'Trendyol Süper Lig%'`);
  } else if (organization !== "all") {
    joinFilters.push(`rm.organization = '${esc(organization)}'`);
  }
  const joinFilterClause = joinFilters.length ? ` AND ${joinFilters.join(" AND ")}` : "";

  const topReferees = querySqlite<RefRow>(`
    SELECT r.hakem_id, r.name, r.city, r.klasman, COUNT(rm.id) AS match_count
    FROM referees r
    LEFT JOIN referee_matches rm ON rm.hakem_id = r.hakem_id${joinFilterClause}
    GROUP BY r.hakem_id, r.name, r.city, r.klasman
    ORDER BY ${orderBy}
    LIMIT 200;
  `);
  const topRefToTeamCards = querySqliteSafe<RefTeamCardRow>(`
    WITH cards AS (
      SELECT s.referee_name AS referee_name,
             c.home_team AS team,
             (c.home_yellow_total + c.home_red_direct + c.home_second_yellow_red) AS cards_to_team
      FROM superlig_hakem_match_stats s
      JOIN superlig_match_team_cards c ON c.mac_id = s.mac_id
      UNION ALL
      SELECT s.referee_name AS referee_name,
             c.away_team AS team,
             (c.away_yellow_total + c.away_red_direct + c.away_second_yellow_red) AS cards_to_team
      FROM superlig_hakem_match_stats s
      JOIN superlig_match_team_cards c ON c.mac_id = s.mac_id
    )
    SELECT referee_name,
           team,
           COUNT(*) AS matches,
           SUM(cards_to_team) AS total_cards,
           ROUND(1.0 * SUM(cards_to_team) / COUNT(*), 3) AS avg_cards_per_match
    FROM cards
    GROUP BY referee_name, team
    HAVING COUNT(*) >= 2
    ORDER BY total_cards DESC, avg_cards_per_match DESC
    LIMIT 25;
  `);
  const homeAwayTendency = querySqliteSafe<HomeAwayRow>(`
    SELECT s.referee_name AS referee_name,
           COUNT(*) AS matches,
           ROUND(AVG(c.home_yellow_total + c.home_red_direct + c.home_second_yellow_red), 3) AS avg_home_cards,
           ROUND(AVG(c.away_yellow_total + c.away_red_direct + c.away_second_yellow_red), 3) AS avg_away_cards,
           ROUND(AVG(c.home_yellow_total + c.home_red_direct + c.home_second_yellow_red) -
                 AVG(c.away_yellow_total + c.away_red_direct + c.away_second_yellow_red), 3) AS home_minus_away
    FROM superlig_hakem_match_stats s
    JOIN superlig_match_team_cards c ON c.mac_id = s.mac_id
    GROUP BY s.referee_name
    HAVING COUNT(*) >= 5
    ORDER BY ABS(home_minus_away) DESC, matches DESC
    LIMIT 25;
  `);

  return (
    <main style={{ padding: 24, maxWidth: 1240, margin: "18px auto", fontFamily: "Geist, system-ui, sans-serif", color: "#e5e7eb", border: "1px solid #1f2937", borderRadius: 16, background: "radial-gradient(circle at 0% 0%, #0f1b33 0%, #020617 55%)" }}>
      <h1 style={{ marginBottom: 8, fontSize: 32, letterSpacing: 0.3, color: "#f8fafc" }}>TFF Local Database</h1>
      <p style={{ marginTop: 0, ...muted }}>{getDbPath()}</p>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 12, marginBottom: 24 }}>
        <div style={{ ...panel, padding: 14 }}><b style={{ ...muted, fontWeight: 600 }}>Hakem</b><div style={{ fontSize: 30, fontWeight: 800 }}>{referees}</div></div>
        <div style={{ ...panel, padding: 14 }}><b style={{ ...muted, fontWeight: 600 }}>Hakem-Maç</b><div style={{ fontSize: 30, fontWeight: 800 }}>{refereeMatches}</div></div>
        <div style={{ ...panel, padding: 14 }}><b style={{ ...muted, fontWeight: 600 }}>Maç</b><div style={{ fontSize: 30, fontWeight: 800 }}>{matches}</div></div>
        <div style={{ ...panel, padding: 14 }}><b style={{ ...muted, fontWeight: 600 }}>Maç Detay</b><div style={{ fontSize: 30, fontWeight: 800 }}>{matchDetails}</div></div>
      </section>

      <h2 style={{ color: "#f8fafc", fontSize: 24 }}>Hakemler</h2>
      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link style={chip} href={`/localdb?sort=name_asc&role=${encodeURIComponent(role)}&organization=${encodeURIComponent(organization)}`}>İsme göre A-Z</Link>
        <Link style={chip} href={`/localdb?sort=name_desc&role=${encodeURIComponent(role)}&organization=${encodeURIComponent(organization)}`}>İsme göre Z-A</Link>
        <Link style={chip} href={`/localdb?sort=matches_desc&role=${encodeURIComponent(role)}&organization=${encodeURIComponent(organization)}`}>Maç sayısı (çoktan aza)</Link>
        <Link style={chip} href={`/localdb?sort=matches_asc&role=${encodeURIComponent(role)}&organization=${encodeURIComponent(organization)}`}>Maç sayısı (azdan çoğa)</Link>
      </div>

      <form action="/localdb" method="get" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 16, ...panel, padding: 12 }}>
        <div>
          <label htmlFor="sort" style={{ ...muted, display: "block", marginBottom: 6 }}>Sıralama</label>
          <select id="sort" name="sort" defaultValue={sort} style={input}>
            <option value="name_asc">İsim A-Z</option>
            <option value="name_desc">İsim Z-A</option>
            <option value="matches_desc">Maç sayısı (çoktan aza)</option>
            <option value="matches_asc">Maç sayısı (azdan çoğa)</option>
          </select>
        </div>
        <div>
          <label htmlFor="role" style={{ ...muted, display: "block", marginBottom: 6 }}>Görev</label>
          <select id="role" name="role" defaultValue={role} style={input}>
            <option value="all">Tümü</option>
            {roles.map((r) => (
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
          <Link style={chip} href="/localdb">Temizle</Link>
        </div>
      </form>

      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <b>Hızlı Görev:</b>
        <Link style={chip} href={`/localdb?sort=${encodeURIComponent(sort)}&role=Hakem&organization=${encodeURIComponent(organization)}`}>Hakem</Link>
        <Link style={chip} href={`/localdb?sort=${encodeURIComponent(sort)}&role=VAR&organization=${encodeURIComponent(organization)}`}>VAR</Link>
        <Link style={chip} href={`/localdb?sort=${encodeURIComponent(sort)}&role=AVAR&organization=${encodeURIComponent(organization)}`}>AVAR</Link>
        <Link style={chip} href={`/localdb?sort=${encodeURIComponent(sort)}&role=all&organization=${encodeURIComponent(organization)}`}>Tümü</Link>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", ...panel }}>
          <thead>
            <tr style={tableHead}>
              <th style={{ padding: "8px 6px" }}>Hakem</th>
              <th style={{ padding: "8px 6px" }}>Klasman</th>
              <th style={{ padding: "8px 6px" }}>Şehir</th>
              <th style={{ padding: "8px 6px" }}>Maç</th>
            </tr>
          </thead>
          <tbody>
            {topReferees.map((r, i) => (
              <tr key={r.hakem_id} style={{ borderBottom: "1px solid #1f2937", background: i % 2 ? "#0b1220" : "transparent" }}>
                <td style={{ padding: "8px 6px" }}>
                  <Link
                    href={`/localdb/referees/${r.hakem_id}?role=${encodeURIComponent(
                      role
                    )}&organization=${encodeURIComponent(
                      organization
                    )}&sort=date_desc`}
                  >
                    {r.name}
                  </Link>
                </td>
                <td style={{ padding: "8px 6px", ...muted }}>{r.klasman}</td>
                <td style={{ padding: "8px 6px", ...muted }}>{r.city}</td>
                <td style={{ padding: "8px 6px", fontWeight: 600 }}>{n(r.match_count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 28 }}>Hangi Hakem Hangi Takıma En Çok Kart Gösteriyor (Süper Lig)</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", ...panel }}>
          <thead>
            <tr style={tableHead}>
              <th style={{ padding: "8px 6px" }}>Hakem</th>
              <th style={{ padding: "8px 6px" }}>Takım</th>
              <th style={{ padding: "8px 6px" }}>Maç</th>
              <th style={{ padding: "8px 6px" }}>Toplam Kart</th>
              <th style={{ padding: "8px 6px" }}>Maç Başına</th>
            </tr>
          </thead>
          <tbody>
            {topRefToTeamCards.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "10px 6px", ...muted }}>
                  Takım kart analizi verisi bulunamadı. Data mining scriptini tekrar çalıştırın.
                </td>
              </tr>
            ) : (
              topRefToTeamCards.map((r, i) => (
                <tr key={`${r.referee_name}-${r.team}-${i}`} style={{ borderBottom: "1px solid #1f2937", background: i % 2 ? "#0b1220" : "transparent" }}>
                  <td style={{ padding: "8px 6px" }}>{r.referee_name}</td>
                  <td style={{ padding: "8px 6px" }}>{r.team}</td>
                  <td style={{ padding: "8px 6px" }}>{n(r.matches)}</td>
                  <td style={{ padding: "8px 6px", fontWeight: 600 }}>{n(r.total_cards)}</td>
                  <td style={{ padding: "8px 6px" }}>{n(r.avg_cards_per_match).toFixed(3)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 28 }}>Ev Sahibi mi Deplasman mı Daha Çok Kart Görüyor (Süper Lig)</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", ...panel }}>
          <thead>
            <tr style={tableHead}>
              <th style={{ padding: "8px 6px" }}>Hakem</th>
              <th style={{ padding: "8px 6px" }}>Maç</th>
              <th style={{ padding: "8px 6px" }}>Ev Sahibi Ort.</th>
              <th style={{ padding: "8px 6px" }}>Deplasman Ort.</th>
              <th style={{ padding: "8px 6px" }}>Fark (Ev-Deplasman)</th>
              <th style={{ padding: "8px 6px" }}>Yorum</th>
            </tr>
          </thead>
          <tbody>
            {homeAwayTendency.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "10px 6px", ...muted }}>
                  Ev/deplasman eğilim verisi bulunamadı. Data mining scriptini tekrar çalıştırın.
                </td>
              </tr>
            ) : (
              homeAwayTendency.map((r, i) => {
                const diff = n(r.home_minus_away);
                const direction = diff > 0 ? "Ev sahibine daha fazla" : diff < 0 ? "Deplasman takımına daha fazla" : "Dengeli";
                return (
                  <tr key={`${r.referee_name}-${i}`} style={{ borderBottom: "1px solid #1f2937", background: i % 2 ? "#0b1220" : "transparent" }}>
                    <td style={{ padding: "8px 6px" }}>{r.referee_name}</td>
                    <td style={{ padding: "8px 6px" }}>{n(r.matches)}</td>
                    <td style={{ padding: "8px 6px" }}>{n(r.avg_home_cards).toFixed(3)}</td>
                    <td style={{ padding: "8px 6px" }}>{n(r.avg_away_cards).toFixed(3)}</td>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>{diff.toFixed(3)}</td>
                    <td style={{ padding: "8px 6px", ...muted }}>{direction}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
