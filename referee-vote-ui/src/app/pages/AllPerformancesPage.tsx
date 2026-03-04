import { ChevronLeft, Star, ChevronRight, SlidersHorizontal, SearchX } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { referees, matches } from "../data";
import { motion } from "motion/react";

const leagueColors: Record<string, string> = {
  "Süper Lig": "#C8FF00",
  "UEFA Şampiyonlar Ligi": "#4FA3FF",
};

const SCORE_FILTERS = ["Tümü", "En Yüksek", "En Düşük", "8+", "6–8", "6 Altı"];
const LEAGUE_FILTERS = ["Tüm Ligler", "Süper Lig", "UEFA Şampiyonlar Ligi"];

type PerformanceEntry = {
  referee: (typeof referees)[0];
  match: (typeof matches)[0];
  score: number;
};

export function AllPerformancesPage() {
  const navigate = useNavigate();
  const [scoreFilter, setScoreFilter] = useState("Tümü");
  const [leagueFilter, setLeagueFilter] = useState("Tüm Ligler");
  const [showLeagueFilter, setShowLeagueFilter] = useState(false);

  // Build performance entries: for each finished match, get referee + last score
  const allPerformances: PerformanceEntry[] = matches
    .filter((m) => m.status === "finished")
    .map((match) => {
      const referee = referees.find((r) => r.id === match.refereeId)!;
      if (!referee) return null;
      const score = referee.performanceTrend.at(-1)?.score ?? 0;
      return { referee, match, score };
    })
    .filter(Boolean) as PerformanceEntry[];

  const filtered = allPerformances
    .filter((p) => {
      if (leagueFilter !== "Tüm Ligler" && p.match.league !== leagueFilter) return false;
      if (scoreFilter === "8+") return p.score >= 8;
      if (scoreFilter === "6–8") return p.score >= 6 && p.score < 8;
      if (scoreFilter === "6 Altı") return p.score < 6;
      return true;
    })
    .sort((a, b) => {
      if (scoreFilter === "En Yüksek") return b.score - a.score;
      if (scoreFilter === "En Düşük") return a.score - b.score;
      // Default: by date descending
      return new Date(b.match.date).getTime() - new Date(a.match.date).getTime();
    });

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100%" }}>
      {/* Header */}
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
        <div className="flex items-center gap-3 px-5 pb-3">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate(-1)}
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              width: 38,
              height: 38,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <ChevronLeft size={20} color="#fff" />
          </motion.button>

          <div className="flex-1">
            <div
              className="flex items-center gap-2"
              style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}
            >
              <Star size={20} color="#C8FF00" fill="#C8FF00" />
              Son Performanslar
            </div>
            <div style={{ color: "#44445A", fontSize: 11 }}>
              {filtered.length} performans kaydı
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowLeagueFilter(!showLeagueFilter)}
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              width: 38,
              height: 38,
              background: showLeagueFilter
                ? "rgba(200,255,0,0.15)"
                : "rgba(255,255,255,0.07)",
              border: showLeagueFilter
                ? "1px solid rgba(200,255,0,0.35)"
                : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <SlidersHorizontal
              size={17}
              color={showLeagueFilter ? "#C8FF00" : "rgba(255,255,255,0.5)"}
            />
          </motion.button>
        </div>

        {/* Score filter chips */}
        <div
          className="flex gap-2 px-5 pb-2 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {SCORE_FILTERS.map((f) => (
            <motion.button
              key={f}
              whileTap={{ scale: 0.92 }}
              onClick={() => setScoreFilter(f)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full"
              style={{
                background:
                  scoreFilter === f
                    ? "rgba(200,255,0,0.15)"
                    : "rgba(255,255,255,0.05)",
                border:
                  scoreFilter === f
                    ? "1px solid rgba(200,255,0,0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
                color: scoreFilter === f ? "#C8FF00" : "#55556A",
                fontSize: 11,
                fontWeight: scoreFilter === f ? 700 : 500,
                whiteSpace: "nowrap",
              }}
            >
              {f}
            </motion.button>
          ))}
        </div>

        {/* League filter (collapsible) */}
        {showLeagueFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 px-5 pb-3 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {LEAGUE_FILTERS.map((f) => (
              <motion.button
                key={f}
                whileTap={{ scale: 0.92 }}
                onClick={() => setLeagueFilter(f)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full"
                style={{
                  background:
                    leagueFilter === f
                      ? "rgba(79,163,255,0.15)"
                      : "rgba(255,255,255,0.05)",
                  border:
                    leagueFilter === f
                      ? "1px solid rgba(79,163,255,0.4)"
                      : "1px solid rgba(255,255,255,0.08)",
                  color: leagueFilter === f ? "#4FA3FF" : "#55556A",
                  fontSize: 11,
                  fontWeight: leagueFilter === f ? 700 : 500,
                  whiteSpace: "nowrap",
                }}
              >
                {f}
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>

      <div className="px-4 pt-4 pb-32 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Star size={48} color="#44445A" />
            <div style={{ color: "#44445A", fontSize: 14 }}>
              Performans kaydı bulunamadı
            </div>
          </div>
        ) : (
          filtered.map((entry, i) => {
            const { referee, match, score } = entry;
            const scoreColor =
              score >= 8 ? "#C8FF00" : score >= 6 ? "#FFD600" : "#FF5F5F";
            const lColor = leagueColors[match.league] ?? "#C8FF00";
            const dateLabel = new Date(match.date).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
            });

            return (
              <motion.button
                key={`${match.id}-${referee.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.975 }}
                onClick={() => navigate(`/referee/${referee.id}/vote/${match.id}`)}
                className="w-full text-left"
                style={{
                  background: "rgba(22,22,30,0.9)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 24,
                  padding: "16px 18px",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Referee photo */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={referee.photo}
                      alt={referee.name}
                      className="rounded-full object-cover"
                      style={{
                        width: 54,
                        height: 54,
                        border: `2px solid ${scoreColor}44`,
                      }}
                    />
                    {/* Score badge */}
                    <div
                      className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center"
                      style={{
                        width: 24,
                        height: 24,
                        background: "#0A0A0F",
                        border: `1.5px solid ${scoreColor}`,
                        fontSize: 9,
                        fontWeight: 900,
                        color: scoreColor,
                      }}
                    >
                      {score.toFixed(0)}
                    </div>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>
                        {referee.name}
                      </span>
                      <div
                        className="px-1.5 py-0.5 rounded-full"
                        style={{ background: `${scoreColor}18` }}
                      >
                        <span
                          style={{
                            color: scoreColor,
                            fontSize: 9,
                            fontWeight: 800,
                          }}
                        >
                          {score.toFixed(1)} / 10
                        </span>
                      </div>
                    </div>

                    <div
                      style={{ color: lColor, fontSize: 9, fontWeight: 700, marginBottom: 4 }}
                    >
                      {match.league}
                    </div>

                    <div style={{ color: "#55556A", fontSize: 11 }}>
                      {match.homeTeam}{" "}
                      <span style={{ color: "#fff", fontWeight: 700 }}>
                        {match.homeScore}–{match.awayScore}
                      </span>{" "}
                      {match.awayTeam}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <span style={{ color: "#333344", fontSize: 10 }}>
                        {dateLabel}
                      </span>
                      <span style={{ color: "#333344", fontSize: 10 }}>·</span>
                      <span style={{ color: "#333344", fontSize: 10 }}>
                        {match.stadium}
                      </span>
                    </div>
                  </div>

                  {/* Score ring */}
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 900,
                        color: scoreColor,
                        lineHeight: 1,
                      }}
                    >
                      {score.toFixed(1)}
                    </div>
                    <div style={{ color: "#333344", fontSize: 9 }}>/10</div>
                    <Star
                      size={14}
                      color={scoreColor}
                      fill={`${scoreColor}55`}
                    />
                  </div>

                  <ChevronRight size={16} color="rgba(255,255,255,0.15)" />
                </div>

                {/* Trend mini bar */}
                <div className="flex items-end gap-0.5 mt-3 pt-3"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span style={{ color: "#333344", fontSize: 9, marginRight: 4 }}>
                    Trend:
                  </span>
                  {referee.performanceTrend.slice(-6).map((pt, ti) => {
                    const h = Math.max(4, ((pt.score - 1) / 9) * 28);
                    const barColor =
                      pt.score >= 8
                        ? "#C8FF00"
                        : pt.score >= 6
                        ? "#FFD600"
                        : "#FF5F5F";
                    return (
                      <div
                        key={ti}
                        style={{
                          width: 6,
                          height: h,
                          borderRadius: 3,
                          background: `${barColor}88`,
                          marginTop: "auto",
                        }}
                      />
                    );
                  })}
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
