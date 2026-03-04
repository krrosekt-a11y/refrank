import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Calendar, ChevronLeft, ChevronRight, Star, Trophy } from "lucide-react";
import { motion } from "motion/react";
import type { Referee } from "../data";
import { RefereeCard } from "../components/RefereeCard";
import { fetchDbMatches, fetchDbReferees, fetchUpcomingFixtures, type DbMatch, type UpcomingFixture } from "../lib/localdbApi";

type TimelineItem = {
  id: string;
  matchId?: number;
  refereeId?: string;
  date: Date;
  dateLabel: string;
  home: string;
  away: string;
  league: string;
  score?: string;
  referee?: string;
  refereeEstimated?: boolean;
  refereeConfidence?: number;
  round?: string;
  weekNum?: number;
  isPast: boolean;
};

function parseFixtureDate(s: string): Date | null {
  if (!s) return null;
  const normalized = s.replace(" - ", " ");
  const isoLike = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (isoLike) {
    const d = new Date(`${isoLike[1]}-${isoLike[2]}-${isoLike[3]}T${isoLike[4]}:${isoLike[5]}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const trDot = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})[ T](\d{2}):(\d{2})/);
  if (trDot) {
    const d = new Date(`${trDot[3]}-${trDot[2].padStart(2, "0")}-${trDot[1].padStart(2, "0")}T${trDot[4]}:${trDot[5]}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const months: Record<string, string> = {
    ocak: "01",
    şubat: "02",
    subat: "02",
    mart: "03",
    nisan: "04",
    mayıs: "05",
    mayis: "05",
    haziran: "06",
    temmuz: "07",
    ağustos: "08",
    agustos: "08",
    eylül: "09",
    eylul: "09",
    ekim: "10",
    kasım: "11",
    kasim: "11",
    aralık: "12",
    aralik: "12",
  };
  const trLong = normalized.match(/^(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (trLong) {
    const mon = months[(trLong[2] || "").toLowerCase()];
    if (mon) {
      const hh = (trLong[4] || "12").padStart(2, "0");
      const mm = (trLong[5] || "00").padStart(2, "0");
      const d = new Date(`${trLong[3]}-${mon}-${trLong[1].padStart(2, "0")}T${hh}:${mm}:00`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractRoundWeekNumber(round?: string): number | null {
  const txt = (round || "").trim();
  if (!txt) return null;
  const m = txt.match(/(\d{1,2})/);
  if (!m) return null;
  return Number(m[1]);
}

function weekStartKey(d: Date): number {
  const x = new Date(d);
  const day = x.getDay();
  const shift = (day + 6) % 7;
  x.setDate(x.getDate() - shift);
  x.setHours(0, 0, 0, 0);
  return Math.floor(x.getTime() / 86400000);
}

function seasonKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const start = m >= 7 ? y : y - 1;
  const end = String((start + 1) % 100).padStart(2, "0");
  return `${start}-${end}`;
}

function compactLeagueName(name: string): string {
  const t = (name || "").toLowerCase();
  if (t.includes("trendyol süper lig")) return "Trendyol Süper Lig";
  if (t.includes("ziraat türkiye kupası")) return "Ziraat Türkiye Kupası";
  return (name || "").replace(/\s*\(.*?\)\s*/g, "").trim();
}

function compactTeamName(name: string): string {
  const s = (name || "").trim();
  const up = s
    .toUpperCase()
    .replace(/İ/g, "I")
    .replace(/Ş/g, "S")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C");

  const map: Array<[string, string]> = [
    ["GALATASARAY", "Galatasaray"],
    ["FENERBAHCE", "Fenerbahçe"],
    ["BESIKTAS", "Beşiktaş"],
    ["TRABZONSPOR", "Trabzonspor"],
    ["BASAKSEHIR", "Başakşehir"],
    ["GOZTEPE", "Göztepe"],
    ["KASIMPASA", "Kasımpaşa"],
    ["KAYSERISPOR", "Kayserispor"],
    ["KONYASPOR", "Konyaspor"],
    ["RIZESPOR", "Rizespor"],
    ["EYUPSPOR", "Eyüpspor"],
    ["ALANYASPOR", "Alanyaspor"],
    ["ANTALYASPOR", "Antalyaspor"],
    ["GAZIANTEP", "Gaziantep FK"],
    ["GENCLERBIRLIGI", "Gençlerbirliği"],
    ["SAMSUNSPOR", "Samsunspor"],
    ["KOCAELISPOR", "Kocaelispor"],
    ["HATAYSPOR", "Hatayspor"],
    ["ADANA DEMIRSPOR", "Adana Demirspor"],
    ["FATIH KARAGUMRUK", "Karagümrük"],
    ["ANKARAGUCU", "Ankaragücü"],
    ["SIVASSPOR", "Sivasspor"],
  ];
  const hit = map.find(([k]) => up.includes(k));
  if (hit) return hit[1];

  return s
    .replace(/\bA\.?Ş\.?\b/gi, "")
    .replace(/\bFUTBOL KULÜBÜ\b/gi, "")
    .replace(/\bFK\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function teamKey(name: string): string {
  return compactTeamName(name)
    .toUpperCase()
    .replace(/İ/g, "I")
    .replace(/Ş/g, "S")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatScoreInline(score?: string): string {
  const s = (score || "").trim();
  if (!s) return "";
  const m = s.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (m) return `${m[1]} - ${m[2]}`;
  return s;
}

export function MatchesPage() {
  const navigate = useNavigate();
  const [referees, setReferees] = useState<Referee[]>([]);
  const [matches, setMatches] = useState<DbMatch[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingFixture[]>([]);
  const [activeWeek, setActiveWeek] = useState(25);
  const [selectedMatch, setSelectedMatch] = useState<TimelineItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchDbReferees(120), fetchDbMatches(400), fetchUpcomingFixtures(21)])
      .then(([rs, ms, up]) => {
        if (!alive) return;
        setReferees(rs);
        setMatches(ms);
        setUpcoming(up);
      })
      .catch(() => {
        if (!alive) return;
        setReferees([]);
        setMatches([]);
        setUpcoming([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const topReferees = useMemo(
    () => [...referees].sort((a, b) => b.careerScore - a.careerScore).slice(0, 8),
    [referees]
  );
  const recentMatches = useMemo(() => matches.slice(0, 10), [matches]);

  const fixtureView = useMemo(() => {
    const now = new Date();
    const currentSeason = seasonKeyFromDate(now);
    const timeline: TimelineItem[] = [];
    for (const m of matches) {
      const d = parseFixtureDate(m.date);
      if (!d) continue;
      if (seasonKeyFromDate(d) !== currentSeason) continue;
      timeline.push({
        id: `m-${m.id}`,
        matchId: m.id,
        refereeId: m.refereeId,
        date: d,
        dateLabel: m.date,
        home: m.homeTeam,
        away: m.awayTeam,
        league: m.league,
        score: m.score,
        referee: m.refereeName || "",
        weekNum: Number(m.weekNumber || 0) || undefined,
        isPast: d.getTime() <= now.getTime(),
      });
    }

    let inferredCurrentWeek: number | null = null;
    let anchorCurrentWeekStartMs: number | null = null;
    const upcomingCandidates: Array<{ week: number; date: Date }> = [];
    for (const f of upcoming) {
      const d = parseFixtureDate(f.date);
      if (!d) continue;
      if (seasonKeyFromDate(d) !== currentSeason) continue;
      const parsedRound = extractRoundWeekNumber(f.round);
      if (parsedRound) {
        upcomingCandidates.push({ week: parsedRound, date: d });
      }
      timeline.push({
        id: `u-${f.fixture_id}`,
        matchId: f.fixture_id,
        date: d,
        dateLabel: f.date,
        home: f.home_team,
        away: f.away_team,
        league: f.league_name,
        referee: f.referee,
        refereeEstimated: f.referee_is_estimated,
        refereeConfidence: f.referee_confidence,
        round: f.round,
        weekNum: parsedRound || undefined,
        isPast: false,
      });
    }

    if (upcomingCandidates.length) {
      const sortedFuture = upcomingCandidates
        .filter((x) => x.date.getTime() >= now.getTime() - 24 * 3600 * 1000)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      const first = sortedFuture[0] || upcomingCandidates[0];
      inferredCurrentWeek = first.week;
      const sameWeek = upcomingCandidates
        .filter((x) => x.week === first.week)
        .map((x) => x.date.getTime());
      anchorCurrentWeekStartMs = sameWeek.length ? Math.min(...sameWeek) : first.date.getTime();
    }
    const currentWeekNum = inferredCurrentWeek || 25;
    const anchorMs = anchorCurrentWeekStartMs ?? now.getTime();

    for (const item of timeline) {
      if (item.weekNum) continue;
      const diffWeeks = Math.floor((item.date.getTime() - anchorMs) / (7 * 24 * 3600 * 1000));
      item.weekNum = currentWeekNum + diffWeeks;
    }

    const dedup = new Map<string, TimelineItem>();
    const quality = (x: TimelineItem) => {
      let q = 0;
      if (x.id.startsWith("m-")) q += x.isPast ? 4 : 1;
      if (!x.isPast && x.id.startsWith("u-")) q += 2;
      if (x.score && /\d+\s*[-:]\s*\d+/.test(x.score)) q += 3;
      if (x.referee) q += x.refereeEstimated ? 1 : 2;
      if (!x.isPast && x.referee) q += 3;
      if (x.isPast) q += 1;
      return q;
    };
    for (const item of timeline) {
      const dayKey = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, "0")}-${String(item.date.getDate()).padStart(2, "0")}`;
      const weekKey = item.weekNum ? `w${item.weekNum}` : `d${dayKey}`;
      const key = `${weekKey}|${teamKey(item.home)}|${teamKey(item.away)}`;
      const prev = dedup.get(key);
      if (!prev || quality(item) > quality(prev)) {
        dedup.set(key, item);
      }
    }
    const timelineUnique = [...dedup.values()];

    const groups = new Map<number, TimelineItem[]>();
    for (const item of timelineUnique) {
      const k = Number(item.weekNum || 0);
      if (!k) continue;
      const arr = groups.get(k) || [];
      arr.push(item);
      groups.set(k, arr);
    }
    const sortedKeys = [...groups.keys()].sort((a, b) => a - b);
    const grouped = sortedKeys.map((k) => {
      const items = (groups.get(k) || []).sort((a, b) => a.date.getTime() - b.date.getTime());
      return { week: k, label: `${k}. Hafta`, items };
    });
    return { currentWeekNum, grouped };
  }, [matches, upcoming]);

  const visibleWeeks = useMemo(() => {
    const base = activeWeek || fixtureView.currentWeekNum || 25;
    return [base - 2, base - 1, base, base + 1, base + 2].filter((w) => w >= 1);
  }, [activeWeek, fixtureView.currentWeekNum]);

  useEffect(() => {
    setActiveWeek(fixtureView.currentWeekNum || 25);
  }, [fixtureView.currentWeekNum]);

  const selectedWeek = fixtureView.grouped.find((w) => w.week === activeWeek);

  const refereeIdByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of referees) {
      const key = (r.name || "")
        .toUpperCase()
        .replace(/İ/g, "I")
        .replace(/Ş/g, "S")
        .replace(/Ğ/g, "G")
        .replace(/Ü/g, "U")
        .replace(/Ö/g, "O")
        .replace(/Ç/g, "C")
        .replace(/[^A-Z0-9 ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (key) m.set(key, r.id);
    }
    return m;
  }, [referees]);

  function openReferee(refName?: string, refId?: string) {
    if (refId) {
      navigate(`/referee/${refId}`);
      return;
    }
    const key = (refName || "")
      .toUpperCase()
      .replace(/İ/g, "I")
      .replace(/Ş/g, "S")
      .replace(/Ğ/g, "G")
      .replace(/Ü/g, "U")
      .replace(/Ö/g, "O")
      .replace(/Ç/g, "C")
      .replace(/[^A-Z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const found = key ? refereeIdByName.get(key) : "";
    if (found) navigate(`/referee/${found}`);
  }

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100%", overflowX: "hidden" }}>
      <div
        className="sticky top-0 z-40"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 48px)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          background: "rgba(10,10,15,0.88)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="px-5 pb-3">
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.8px" }}>
            <span style={{ color: "#C8FF00" }}>REF</span>
            <span style={{ color: "#fff" }}>SCORE</span>
          </div>
          <div style={{ color: "#67748d", fontSize: 12 }}>Local DB entegrasyonu aktif</div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-28">
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2">
            <Calendar size={16} color="#C8FF00" />
            <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>Yaklaşan Fikstür (API-Football)</h2>
          </div>
          {fixtureView.grouped.length === 0 ? (
            <div className="p-3 rounded-2xl" style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)", color: "#7f8ba3", fontSize: 12 }}>
              Fikstür verisi bulunamadı.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <div className="p-2 rounded-2xl" style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setActiveWeek((x) => Math.max(1, x - 1))}
                    className="p-1 rounded-lg"
                    style={{ color: "#cbd5e1" }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>
                    {selectedWeek?.label || "-"}
                  </div>
                  <button
                    onClick={() => setActiveWeek((x) => x + 1)}
                    className="p-1 rounded-lg"
                    style={{ color: "#cbd5e1" }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div style={{ marginTop: 6, maxWidth: "100%", overflowX: "auto", overflowY: "hidden", paddingBottom: 2 }}>
                  <div style={{ display: "flex", justifyContent: "center", width: "100%", minWidth: "max-content" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                    {visibleWeeks.map((w) => (
                      <button
                        key={w}
                        onClick={() => setActiveWeek(w)}
                        className="px-2 py-1 rounded-lg whitespace-nowrap"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: w === activeWeek ? "#0A0A0F" : "#b6c2d9",
                          background: w === activeWeek ? "#C8FF00" : "rgba(255,255,255,0.08)",
                          flex: "0 0 auto",
                        }}
                      >
                        {w}. Hafta
                      </button>
                    ))}
                    </div>
                  </div>
                </div>
              </div>

              {(selectedWeek?.items || []).slice(0, 12).map((f) => (
                <div key={f.id} className="p-3 rounded-2xl" style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 150px", gap: 12, alignItems: "start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 800 }}>
                        <span style={{ color: "#C8FF00" }}>{compactLeagueName(f.league)}</span>
                        <span style={{ color: "#8f99ad", fontWeight: 600 }}> - {f.dateLabel}</span>
                      </div>
                      <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", alignItems: "center", gap: 6, width: "100%" }}>
                        <span
                          title={compactTeamName(f.home)}
                          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}
                        >
                          {compactTeamName(f.home)}
                        </span>
                        {f.score ? (
                          <button
                            onClick={() => setSelectedMatch(f)}
                            type="button"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "rgba(200,255,0,0.2)",
                              border: "1px solid rgba(200,255,0,0.35)",
                              color: "#C8FF00",
                              fontWeight: 900,
                              fontSize: 11,
                              letterSpacing: "0.2px",
                              cursor: "pointer",
                            }}
                          >
                            {formatScoreInline(f.score)}
                          </button>
                        ) : (
                          <span style={{ color: "#8f99ad", fontWeight: 600 }}>-</span>
                        )}
                        <span
                          title={compactTeamName(f.away)}
                          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, textAlign: "right" }}
                        >
                          {compactTeamName(f.away)}
                        </span>
                      </div>
                    </div>
                    <div style={{ borderLeft: "1px solid rgba(255,255,255,0.12)", paddingLeft: 10, minWidth: 0, textAlign: "right" }}>
                      <div style={{ color: "#7f8ba3", fontSize: 10 }}>Hakem</div>
                      <button
                        type="button"
                        onClick={() => openReferee(f.referee, f.refereeId)}
                        disabled={!f.referee}
                        style={{
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 700,
                          lineHeight: 1.3,
                          overflowWrap: "anywhere",
                          background: "transparent",
                          border: 0,
                          padding: 0,
                          textAlign: "right",
                          cursor: f.referee ? "pointer" : "default",
                        }}
                      >
                        {f.referee || "Hakem Ataması Bekleniyor"}
                      </button>
                      {!f.isPast && typeof f.refereeConfidence === "number" ? (
                        <div style={{ color: "#aeb8cd", fontSize: 9, marginTop: 2 }}>
                          Güven: %{Number(f.refereeConfidence || 0).toFixed(1)}
                        </div>
                      ) : null}
                      {!f.isPast && f.referee ? (
                        <div style={{ color: f.refereeEstimated ? "#facc15" : "#93c5fd", fontSize: 9, marginTop: 2 }}>
                          {f.refereeEstimated ? "Tahmini Atama" : "Resmi / API"}
                        </div>
                      ) : (
                        <div style={{ color: "#7f8ba3", fontSize: 9, marginTop: 2 }}>
                          {f.isPast ? "Geçmiş Maç" : "Atama Bekleniyor"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-3 rounded-2xl" style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#7f8ba3", fontSize: 10 }}>Hakem</div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 900 }}>{referees.length}</div>
          </div>
          <div className="p-3 rounded-2xl" style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#7f8ba3", fontSize: 10 }}>Maç</div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 900 }}>{matches.length}</div>
          </div>
          <div className="p-3 rounded-2xl" style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#7f8ba3", fontSize: 10 }}>Ortalama Skor</div>
            <div style={{ color: "#C8FF00", fontSize: 20, fontWeight: 900 }}>
              {referees.length
                ? (referees.reduce((s, r) => s + r.careerScore, 0) / referees.length).toFixed(2)
                : "0.00"}
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={16} color="#C8FF00" />
            <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>Öne Çıkan Hakemler</h2>
          </div>
          <button onClick={() => navigate("/referees")} style={{ color: "#93c5fd", fontSize: 12, fontWeight: 700 }}>
            Tümünü Gör
          </button>
        </div>

        {loading ? (
          <div style={{ color: "#67748d", fontSize: 12, padding: "12px 0" }}>Veriler yükleniyor...</div>
        ) : (
          topReferees.map((ref, idx) => <RefereeCard key={ref.id} referee={ref} rank={idx + 1} />)
        )}

        <div className="mt-6 mb-3 flex items-center gap-2">
          <Calendar size={16} color="#C8FF00" />
          <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>Son Maçlar</h2>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {recentMatches.map((m, i) => (
            <motion.button
              key={`${m.id}-${i}`}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/referee/${m.refereeId}`)}
              className="w-full text-left p-3 rounded-2xl"
              style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div style={{ color: "#C8FF00", fontSize: 10, fontWeight: 700 }}>{m.league}</div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                {m.homeTeam} - {m.awayTeam}
              </div>
              <div style={{ color: "#aeb8cd", fontSize: 12 }}>
                {m.score} · Hakem: {m.refereeName}
              </div>
              <div style={{ color: "#76839d", fontSize: 10 }}>
                Sarı {m.homeYellowCards ?? 0}-{m.awayYellowCards ?? 0} ·
                SK {m.homeSecondYellowRedCards ?? 0}-{m.awaySecondYellowRedCards ?? 0} ·
                Kırmızı {m.homeRedCards ?? 0}-{m.awayRedCards ?? 0}
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2">
          <Star size={14} color="#C8FF00" />
          <div style={{ color: "#7f8ba3", fontSize: 11 }}>Bu ekran DB verisi ile çalışıyor</div>
        </div>
      </div>

      {selectedMatch ? (
        <div
          onClick={() => setSelectedMatch(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 70,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              background: "#111320",
              borderTop: "1px solid rgba(255,255,255,0.12)",
              padding: "14px 16px 18px",
            }}
          >
            <div style={{ width: 42, height: 4, borderRadius: 10, background: "rgba(255,255,255,0.25)", margin: "0 auto 10px" }} />
            <div style={{ color: "#C8FF00", fontSize: 11, fontWeight: 800 }}>
              {compactLeagueName(selectedMatch.league)} - {selectedMatch.dateLabel}
            </div>
            <div style={{ color: "#fff", fontSize: 17, fontWeight: 900, marginTop: 3 }}>
              {compactTeamName(selectedMatch.home)} {selectedMatch.score ? formatScoreInline(selectedMatch.score) : "-"} {compactTeamName(selectedMatch.away)}
            </div>
            <div style={{ marginTop: 10, color: "#9eabc4", fontSize: 12 }}>
              Hakem:{" "}
              <button
                type="button"
                onClick={() => {
                  const refId = selectedMatch.refereeId || "";
                  setSelectedMatch(null);
                  openReferee(selectedMatch.referee, refId);
                }}
                style={{ color: "#fff", background: "transparent", border: 0, padding: 0, fontWeight: 700, cursor: "pointer" }}
              >
                {selectedMatch.referee || "Atama yok"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
