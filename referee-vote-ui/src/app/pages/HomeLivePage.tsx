import { ChevronLeft, Radio, MessageCircle, Star, ChevronRight, Zap } from "lucide-react";
import { matches, referees } from "../data";
import { useNavigate } from "react-router";
import { motion } from "motion/react";

const leagueColors: Record<string, string> = {
  "Süper Lig": "#C8FF00",
  "UEFA Şampiyonlar Ligi": "#4FA3FF",
};

export function HomeLivePage() {
  const navigate = useNavigate();
  const liveMatches = matches.filter((m) => m.status === "live");
  const recentFinished = matches
    .filter((m) => m.status === "finished")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100%" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 48px)",
          backdropFilter: "blur(24px) saturate(180%)",
          background: "rgba(10,10,15,0.9)",
          borderBottom: "1px solid rgba(255,95,95,0.1)",
        }}
      >
        <div className="flex items-center gap-3 px-5 pb-3">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate(-1)}
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{ width: 38, height: 38, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ChevronLeft size={20} color="#fff" />
          </motion.button>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                style={{ width: 8, height: 8, borderRadius: 4, background: "#FF4444" }}
              />
              <span style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>
                Canlı Maçlar
              </span>
            </div>
            <span style={{ color: "#44445A", fontSize: 11 }}>
              {liveMatches.length} maç yayında
            </span>
          </div>

          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(255,68,68,0.12)", border: "1px solid rgba(255,68,68,0.3)" }}
          >
            <Radio size={11} color="#FF5F5F" />
            <span style={{ color: "#FF5F5F", fontSize: 11, fontWeight: 800 }}>
              {liveMatches.length} CANLI
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8">
        {/* Live matches - big cards */}
        {liveMatches.length > 0 ? (
          <div className="flex flex-col gap-4 mb-8">
            {liveMatches.map((match, i) => {
              const ref = referees.find((r) => r.id === match.refereeId);
              const lColor = leagueColors[match.league] ?? "#C8FF00";
              const lastScore = ref?.performanceTrend.at(-1)?.score ?? 0;
              const scoreColor = lastScore >= 8 ? "#C8FF00" : lastScore >= 6 ? "#FFD600" : "#FF5F5F";

              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  style={{
                    background: "linear-gradient(135deg, rgba(255,68,68,0.06) 0%, rgba(22,22,30,0.95) 100%)",
                    border: "1px solid rgba(255,68,68,0.2)",
                    borderRadius: 28,
                    overflow: "hidden",
                  }}
                >
                  {/* Match header */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <span style={{ color: lColor, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>
                      {match.league}
                    </span>
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ repeat: Infinity, duration: 1.1 }}
                        style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF4444" }}
                      />
                      <span style={{ color: "#FF5F5F", fontSize: 13, fontWeight: 800 }}>
                        {match.minute}'
                      </span>
                    </div>
                  </div>

                  {/* Score board */}
                  <div
                    className="flex items-center justify-between px-5 pb-4"
                    style={{ gap: 12 }}
                  >
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{match.homeTeam}</div>
                    </div>
                    <div
                      className="flex items-center justify-center px-5 py-3 rounded-2xl"
                      style={{
                        background: "rgba(255,68,68,0.12)",
                        border: "1px solid rgba(255,68,68,0.25)",
                        minWidth: 80,
                      }}
                    >
                      <span style={{ color: "#fff", fontSize: 28, fontWeight: 900 }}>
                        {match.homeScore}–{match.awayScore}
                      </span>
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{match.awayTeam}</div>
                    </div>
                  </div>

                  {/* Referee bar */}
                  {ref && (
                    <div
                      className="mx-4 mb-4 px-4 py-3 rounded-2xl flex items-center gap-3"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <img
                        src={ref.photo}
                        alt={ref.name}
                        className="rounded-full object-cover flex-shrink-0"
                        style={{ width: 36, height: 36, border: `1.5px solid ${scoreColor}44` }}
                      />
                      <div className="flex-1 min-w-0">
                        <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                          {ref.name}
                        </div>
                        <div style={{ color: "#44445A", fontSize: 11 }}>
                          {ref.matches} maç · {ref.accuracy}% doğruluk
                        </div>
                      </div>
                      <div>
                        <div style={{ color: scoreColor, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
                          {lastScore.toFixed(1)}
                        </div>
                        <div style={{ color: "#333344", fontSize: 9 }}>/10</div>
                      </div>
                    </div>
                  )}

                  {/* Stats row */}
                  <div
                    className="px-4 pb-4 flex items-center gap-3"
                  >
                    <div className="flex items-center gap-1">
                      <MessageCircle size={13} color="#44445A" />
                      <span style={{ color: "#44445A", fontSize: 12 }}>
                        {(match.commentCount ?? 0).toLocaleString("tr")} yorum
                      </span>
                    </div>
                    <div style={{ flex: 1 }} />
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => navigate(`/referee/${match.refereeId}/vote/${match.id}`)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl"
                      style={{
                        background: "linear-gradient(135deg, #C8FF00 0%, #a8e000 100%)",
                      }}
                    >
                      <span style={{ color: "#0A0A0F", fontSize: 12, fontWeight: 800 }}>
                        <Zap size={12} color="#0A0A0F" style={{ display: "inline", marginRight: 2 }} />
                        OY VER
                      </span>
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-16 gap-4"
          >
            <Radio size={56} color="#44445A" />
            <div style={{ color: "#44445A", fontSize: 15, fontWeight: 600 }}>
              Şu an canlı maç yok
            </div>
            <div style={{ color: "#333344", fontSize: 13, textAlign: "center", maxWidth: 220 }}>
              Maçlar başladığında burada canlı takip edebilirsin
            </div>
          </motion.div>
        )}

        {/* Recently finished */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} color="#C8FF00" fill="#C8FF00" />
            <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>
              Yeni Biten Maçlar
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {recentFinished.map((match, i) => {
              const ref = referees.find((r) => r.id === match.refereeId);
              const lColor = leagueColors[match.league] ?? "#C8FF00";

              return (
                <motion.button
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/referee/${match.refereeId}/vote/${match.id}`)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                  style={{ background: "rgba(22,22,30,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div>
                    <div style={{ color: lColor, fontSize: 9, fontWeight: 700 }}>
                      {match.league.length > 10 ? "UCL" : match.league}
                    </div>
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                      {match.homeTeam} <span style={{ color: "#44445A" }}>{match.homeScore}–{match.awayScore}</span> {match.awayTeam}
                    </div>
                    <div style={{ color: "#44445A", fontSize: 11 }}>
                      Hakem: {ref?.name}
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <ChevronRight size={16} color="#333344" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}