import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Calendar, Filter, ChevronRight, Clock, CheckCircle, MapPin, ClipboardList } from "lucide-react";
import { fetchDbMatches, type DbMatch } from "../lib/localdbApi";

type UiMatch = {
  id: string;
  refereeId: string;
  refereeName: string;
  league: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  homeYellowCards: number;
  awayYellowCards: number;
  homeSecondYellowRedCards: number;
  awaySecondYellowRedCards: number;
  homeRedCards: number;
  awayRedCards: number;
};

function parseScore(score: string): { home: number | null; away: number | null } {
  const p = String(score || "").split("-");
  const h = Number(p[0]);
  const a = Number(p[1]);
  return {
    home: Number.isFinite(h) ? h : null,
    away: Number.isFinite(a) ? a : null,
  };
}

export function MatchesPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<UiMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState("Tümü");
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchDbMatches(160)
      .then((rows: DbMatch[]) => {
        if (!alive) return;
        const mapped = rows.map((r) => {
          const s = parseScore(r.score);
          return {
            id: String(r.id),
            refereeId: String(r.refereeId || ""),
            refereeName: String(r.refereeName || "Bilinmiyor"),
            league: String(r.league || "Süper Lig"),
            date: String(r.date || ""),
            homeTeam: String(r.homeTeam || ""),
            awayTeam: String(r.awayTeam || ""),
            homeScore: s.home,
            awayScore: s.away,
            homeYellowCards: Number(r.homeYellowCards ?? 0),
            awayYellowCards: Number(r.awayYellowCards ?? 0),
            homeSecondYellowRedCards: Number(r.homeSecondYellowRedCards ?? 0),
            awaySecondYellowRedCards: Number(r.awaySecondYellowRedCards ?? 0),
            homeRedCards: Number(r.homeRedCards ?? 0),
            awayRedCards: Number(r.awayRedCards ?? 0),
          };
        });
        setMatches(mapped);
      })
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const leagues = useMemo(() => {
    const s = new Set<string>(["Tümü"]);
    matches.forEach((m) => s.add(m.league));
    return [...s];
  }, [matches]);

  const filtered = useMemo(() => {
    if (selectedLeague === "Tümü") return matches;
    return matches.filter((m) => m.league === selectedLeague);
  }, [matches, selectedLeague]);

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100%" }}>
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={20} color="#C8FF00" />
              <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px" }}>Maçlar</h1>
            </div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setShowFilter((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full"
              style={{
                background: showFilter ? "rgba(200,255,0,0.12)" : "rgba(255,255,255,0.07)",
                border: showFilter ? "1px solid rgba(200,255,0,0.3)" : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <Filter size={14} color={showFilter ? "#C8FF00" : "#888899"} />
              <span style={{ color: showFilter ? "#C8FF00" : "#888899", fontSize: 12, fontWeight: 600 }}>Filtre</span>
            </motion.button>
          </div>
          {showFilter && (
            <div>
              <div style={{ color: "#44445A", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 8 }}>LİG</div>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {leagues.map((league) => (
                  <button
                    key={league}
                    onClick={() => setSelectedLeague(league)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full"
                    style={{
                      background: selectedLeague === league ? "rgba(200,255,0,0.12)" : "rgba(255,255,255,0.05)",
                      border: selectedLeague === league ? "1px solid rgba(200,255,0,0.35)" : "1px solid rgba(255,255,255,0.08)",
                      color: selectedLeague === league ? "#C8FF00" : "#666677",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {league}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 pb-6">
        {loading ? (
          <div className="py-8" style={{ color: "#666677", fontSize: 12 }}>Veriler yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <ClipboardList size={48} color="#44445A" />
            <div style={{ color: "#44445A", fontSize: 14, marginTop: 12 }}>Maç bulunamadı</div>
          </div>
        ) : (
          <div>
            {filtered.map((m, index) => (
              <motion.button
                key={m.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.24 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/referee/${m.refereeId}`)}
                className="w-full text-left mb-3"
                style={{
                  background: "rgba(22,22,30,0.88)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 24,
                  padding: "16px",
                  backdropFilter: "blur(16px)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: "#C8FF00", fontSize: 10, fontWeight: 800 }}>{m.league}</span>
                  <span style={{ color: "#666677", fontSize: 11, display: "inline-flex", gap: 4, alignItems: "center" }}>
                    <Clock size={11} /> {m.date}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>{m.homeTeam}</div>
                  <div style={{ color: "#fff", fontSize: 19, fontWeight: 900 }}>
                    {m.homeScore ?? "-"} - {m.awayScore ?? "-"}
                  </div>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>{m.awayTeam}</div>
                </div>
                <div style={{ color: "#8a96ad", fontSize: 11, marginBottom: 8 }}>
                  Sarı: {m.homeYellowCards}-{m.awayYellowCards} ·
                  Sarıdan Kırmızı: {m.homeSecondYellowRedCards}-{m.awaySecondYellowRedCards} ·
                  Kırmızı: {m.homeRedCards}-{m.awayRedCards}
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: "#aaaacc", fontSize: 12, fontWeight: 600 }}>
                    Hakem: {m.refereeName}
                  </span>
                  <span style={{ color: "#93c5fd", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    Profil <ChevronRight size={12} />
                  </span>
                </div>
                <div className="mt-2" style={{ color: "#44445A", fontSize: 10 }}>
                  <MapPin size={10} style={{ display: "inline", marginRight: 4 }} />
                  Trendyol Süper Lig
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

