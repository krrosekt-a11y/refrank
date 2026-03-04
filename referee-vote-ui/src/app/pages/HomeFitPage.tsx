import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ChevronLeft, TrendingUp, Star, Radio, Users, Trophy } from "lucide-react";
import { referees, matches, weeklyBest, weeklyWorst } from "../data";

const leagueColors: Record<string, string> = {
  "Süper Lig": "#C8FF00",
  "UEFA Şampiyonlar Ligi": "#4FA3FF",
};

export function HomeFitPage() {
  const navigate = useNavigate();

  const liveMatches = matches.filter((m) => m.status === "live");
  const topRef = [...referees].sort((a, b) => b.careerScore - a.careerScore)[0];
  const weeklyTopScore = Math.max(...weeklyBest.map((r) => r.careerScore));
  const weeklyLowScore = Math.min(...weeklyWorst.map((r) => r.careerScore));
  const totalVotes = referees.reduce((s, r) => s + r.totalRatings, 0);

  return (
    <div
      className="flex flex-col"
      style={{ background: "#0A0A0F", minHeight: "100dvh", maxHeight: "100dvh", overflow: "hidden" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 48px)",
          paddingBottom: 12,
          backdropFilter: "blur(24px)",
          background: "rgba(10,10,15,0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}>
          <ChevronLeft size={22} color="#fff" />
        </motion.button>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px" }}>
          <span style={{ color: "#C8FF00" }}>REF</span>
          <span style={{ color: "#fff" }}>SCORE</span>
        </div>
        <div
          className="px-2 py-1 rounded-full"
          style={{ background: "rgba(200,255,0,0.1)", border: "1px solid rgba(200,255,0,0.25)" }}
        >
          <span style={{ color: "#C8FF00", fontSize: 10, fontWeight: 700 }}>FIT</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-hidden">
        {/* Live badge */}
        {liveMatches.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/matches")}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-4 py-3 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(255,68,68,0.12), rgba(22,22,30,0.9))",
              border: "1px solid rgba(255,68,68,0.25)",
            }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                style={{ width: 8, height: 8, borderRadius: 4, background: "#FF4444" }}
              />
              <div>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                  {liveMatches.length} Canlı Maç
                </div>
                <div style={{ color: "#FF5F5F", fontSize: 11 }}>
                  {liveMatches.map((m) => `${m.homeTeam} vs ${m.awayTeam}`).join(" · ")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Radio size={14} color="#FF5F5F" />
              <span style={{ color: "#FF5F5F", fontSize: 11, fontWeight: 700 }}>CANLI</span>
            </div>
          </motion.button>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Toplam Oy", value: (totalVotes / 1000).toFixed(0) + "K", icon: Star, color: "#C8FF00" },
            { label: "Aktif Hakem", value: referees.length, icon: Users, color: "#4FA3FF" },
            { label: "Haftalık En İyi", value: weeklyTopScore.toFixed(1), icon: TrendingUp, color: "#C8FF00", sub: weeklyBest[0].name.split(" ")[0] },
            { label: "Haftalık En Düşük", value: weeklyLowScore.toFixed(1), icon: TrendingUp, color: "#FF5F5F", sub: weeklyWorst[0].name.split(" ")[0] },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="p-4 rounded-2xl"
                style={{
                  background: "rgba(22,22,30,0.9)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon size={12} color={stat.color} />
                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 600 }}>
                    {stat.label}
                  </span>
                </div>
                <div style={{ color: stat.color, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
                  {stat.value}
                </div>
                {stat.sub && (
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>
                    {stat.sub}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Top Referee */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(`/referee/${topRef.id}`)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4 px-4 py-3 rounded-2xl text-left"
          style={{
            background: "rgba(200,255,0,0.05)",
            border: "1px solid rgba(200,255,0,0.15)",
          }}
        >
          <img
            src={topRef.photo}
            alt={topRef.name}
            className="rounded-full object-cover flex-shrink-0"
            style={{ width: 52, height: 52, border: "2px solid rgba(200,255,0,0.35)" }}
          />
          <div className="flex-1 min-w-0">
            <div style={{ color: "#C8FF00", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em" }}>
              <Trophy size={9} color="#C8FF00" style={{ display: "inline", marginRight: 3 }} />
              LİGİN EN İYİ HAKEMİ
            </div>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>{topRef.name}</div>
            <div style={{ color: "#44445A", fontSize: 12 }}>{topRef.matches} maç · {topRef.accuracy}% doğruluk</div>
          </div>
          <div style={{ color: "#C8FF00", fontSize: 32, fontWeight: 900, lineHeight: 1 }}>
            {topRef.careerScore.toFixed(1)}
          </div>
        </motion.button>

        {/* Today's matches compact */}
        <div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", marginBottom: 8 }}>
            BUGÜNÜN MAÇLARI
          </div>
          <div className="flex flex-col gap-2">
            {matches
              .filter((m) => m.date === "2026-03-03")
              .map((match, i) => {
                const lColor = leagueColors[match.league] ?? "#C8FF00";
                return (
                  <motion.button
                    key={match.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.28 + i * 0.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(match.status !== "upcoming" ? `/referee/${match.refereeId}/vote/${match.id}` : "/matches")}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-left"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: match.status === "live" ? "1px solid rgba(200,255,0,0.2)" : "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {match.status === "live" && (
                        <motion.div
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ repeat: Infinity, duration: 1.2 }}
                          style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF4444" }}
                        />
                      )}
                      <span style={{ color: lColor, fontSize: 8, fontWeight: 700 }}>
                        {match.league.length > 10 ? "UCL" : match.league}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-center">
                      <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{match.homeTeam}</span>
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                        {match.status === "upcoming" ? match.time : `${match.homeScore}–${match.awayScore}`}
                      </span>
                      <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{match.awayTeam}</span>
                    </div>
                    <span style={{ color: "#44445A", fontSize: 9 }}>
                      {match.status === "live" ? `${match.minute}'` : match.status === "upcoming" ? "→" : "✓"}
                    </span>
                  </motion.button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}