import { Search, X, ChevronRight, TrendingUp, Clock, Trophy, Building2, CircleDot, Flame, Megaphone, SearchX } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { referees, matches, teams, competitions } from "../data";

type TabType = "all" | "matches" | "competitions" | "teams";

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "Tümü", icon: <Search size={12} /> },
  { id: "matches", label: "Maçlar", icon: <CircleDot size={12} /> },
  { id: "competitions", label: "Ligler", icon: <Trophy size={12} /> },
  { id: "teams", label: "Takımlar", icon: <Building2 size={12} /> },
];

const TRENDING = ["Cüneyt Çakır", "Galatasaray vs Fenerbahçe", "Süper Lig", "Penaltı kararı"];
const RECENT = ["Halil Umut Meler", "Beşiktaş", "UCL", "Hakem hatası"];

const leagueColors: Record<string, string> = {
  "Süper Lig": "#C8FF00",
  "UEFA Şampiyonlar Ligi": "#4FA3FF",
};

export function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("all");

  const q = query.toLowerCase().trim();

  const filteredRefs = referees.filter(
    (r) => r.name.toLowerCase().includes(q) || r.league.toLowerCase().includes(q)
  );
  const filteredMatches = matches.filter(
    (m) =>
      m.homeTeam.toLowerCase().includes(q) ||
      m.awayTeam.toLowerCase().includes(q) ||
      m.league.toLowerCase().includes(q) ||
      m.stadium.toLowerCase().includes(q)
  );
  const filteredComps = competitions.filter(
    (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
  );
  const filteredTeams = teams.filter(
    (t) => t.name.toLowerCase().includes(q) || t.league.toLowerCase().includes(q)
  );

  const hasResults = filteredRefs.length + filteredMatches.length + filteredComps.length + filteredTeams.length > 0;

  const showByTab = (tab: TabType) => {
    if (tab === "all") return true;
    if (tab === "matches") return true;
    if (tab === "competitions") return true;
    if (tab === "teams") return true;
    return false;
  };

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100%" }}>
      {/* Search header */}
      <div
        className="sticky top-0 z-40"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 48px)",
          backdropFilter: "blur(24px) saturate(180%)",
          background: "rgba(10,10,15,0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3 px-5 pb-3">
          <motion.div
            animate={{ borderColor: focused ? "rgba(200,255,0,0.4)" : "rgba(255,255,255,0.1)" }}
            className="flex-1 flex items-center gap-3 px-4"
            style={{
              height: 48, background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 24,
            }}
          >
            <Search size={16} color={focused ? "#C8FF00" : "#44445A"} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Hakem, maç, lig, takım ara..."
              className="flex-1 bg-transparent outline-none"
              style={{ color: "#fff", fontSize: 14 }}
            />
            {query && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setQuery("")}
                className="flex items-center justify-center rounded-full"
                style={{ width: 22, height: 22, background: "rgba(255,255,255,0.12)" }}
              >
                <X size={12} color="#fff" />
              </motion.button>
            )}
          </motion.div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            style={{ color: "#C8FF00", fontSize: 14, fontWeight: 600, flexShrink: 0 }}
          >
            İptal
          </motion.button>
        </div>

        {/* Tabs (when searching) */}
        {query && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 px-5 pb-3 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {TABS.map((tab) => (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => setActiveTab(tab.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: activeTab === tab.id ? "rgba(200,255,0,0.15)" : "rgba(255,255,255,0.05)",
                  border: activeTab === tab.id ? "1px solid rgba(200,255,0,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  color: activeTab === tab.id ? "#C8FF00" : "#55556A",
                  fontSize: 12,
                  fontWeight: activeTab === tab.id ? 700 : 500,
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>

      <div className="px-4 pt-4 pb-32">
        <AnimatePresence mode="wait">
          {!query ? (
            /* ── EMPTY STATE: trending + recent ── */
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Trending */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={14} color="#C8FF00" />
                  <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>Trend Aramalar</span>
                </div>
                <div className="flex flex-col gap-2">
                  {TRENDING.map((term, i) => (
                    <motion.button
                      key={term}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setQuery(term)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                      style={{ background: "rgba(22,22,30,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36 }}>
                        {([<Flame size={18} color="#FF6B35" />, <CircleDot size={18} color="#C8FF00" />, <Trophy size={18} color="#FFD600" />, <Megaphone size={18} color="#4FA3FF" />])[i]}
                      </div>
                      <span style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>{term}</span>
                      <ChevronRight size={14} color="#333344" style={{ marginLeft: "auto" }} />
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Recent */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={14} color="#44445A" />
                    <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>Son Aramalar</span>
                  </div>
                  <button style={{ color: "#C8FF00", fontSize: 12 }}>Temizle</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {RECENT.map((term) => (
                    <motion.button
                      key={term}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setQuery(term)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <Clock size={11} color="#44445A" />
                      <span style={{ color: "#888899", fontSize: 13 }}>{term}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Top referees quick access */}
              <div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", marginBottom: 12 }}>
                  POPÜLER HAKEMLER
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                  {[...referees].sort((a, b) => b.totalRatings - a.totalRatings).slice(0, 4).map((ref) => (
                    <motion.button
                      key={ref.id}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => navigate(`/referee/${ref.id}`)}
                      className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl"
                      style={{
                        background: "rgba(22,22,30,0.9)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        minWidth: 80,
                      }}
                    >
                      <img
                        src={ref.photo} alt={ref.name}
                        className="rounded-full object-cover"
                        style={{ width: 44, height: 44, border: "1.5px solid rgba(200,255,0,0.25)" }}
                      />
                      <span style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>
                        {ref.name.split(" ")[0]}
                      </span>
                      <span style={{ color: "#C8FF00", fontSize: 12, fontWeight: 800 }}>
                        {ref.careerScore.toFixed(1)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : !hasResults ? (
            /* ── NO RESULTS ── */
            <motion.div
              key="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-20 gap-4"
            >
              <SearchX size={52} color="#44445A" />
              <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>
                Sonuç bulunamadı
              </div>
              <div style={{ color: "#44445A", fontSize: 13, textAlign: "center", maxWidth: 240 }}>
                &quot;{query}&quot; için herhangi bir sonuç bulunamadı. Farklı bir arama dene.
              </div>
            </motion.div>
          ) : (
            /* ── RESULTS ── */
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Referees section */}
              {(activeTab === "all" || activeTab === "matches") && filteredRefs.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>
                      HAKEMLER ({filteredRefs.length})
                    </span>
                    {filteredRefs.length > 2 && (
                      <button style={{ color: "#C8FF00", fontSize: 12 }} onClick={() => navigate("/referees")}>
                        Tümü →
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {filteredRefs.slice(0, activeTab === "all" ? 2 : 10).map((ref, i) => {
                      const scoreColor = ref.careerScore >= 8 ? "#C8FF00" : ref.careerScore >= 6 ? "#FFD600" : "#FF5F5F";
                      return (
                        <motion.button
                          key={ref.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => navigate(`/referee/${ref.id}`)}
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                          style={{ background: "rgba(22,22,30,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
                        >
                          <img
                            src={ref.photo} alt={ref.name}
                            className="rounded-full object-cover flex-shrink-0"
                            style={{ width: 46, height: 46, border: `1.5px solid ${scoreColor}44` }}
                          />
                          <div className="flex-1 min-w-0">
                            <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{ref.name}</div>
                            <div style={{ color: "#44445A", fontSize: 11 }}>
                              {ref.flag} {ref.league} · {ref.matches} maç
                            </div>
                          </div>
                          <div style={{ color: scoreColor, fontSize: 20, fontWeight: 900 }}>
                            {ref.careerScore.toFixed(1)}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matches section */}
              {(activeTab === "all" || activeTab === "matches") && filteredMatches.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>
                      MAÇLAR ({filteredMatches.length})
                    </span>
                    {filteredMatches.length > 3 && (
                      <button style={{ color: "#C8FF00", fontSize: 12 }} onClick={() => navigate("/matches")}>
                        Tümü →
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {filteredMatches.slice(0, activeTab === "all" ? 3 : 20).map((match, i) => {
                      const lColor = leagueColors[match.league] ?? "#C8FF00";
                      return (
                        <motion.button
                          key={match.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => match.status !== "upcoming" && navigate(`/referee/${match.refereeId}/vote/${match.id}`)}
                          className="flex items-center justify-between px-4 py-3 rounded-2xl text-left"
                          style={{ background: "rgba(22,22,30,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
                        >
                          <div className="flex-1">
                            <div style={{ color: lColor, fontSize: 9, fontWeight: 700, marginBottom: 2 }}>
                              {match.league}
                            </div>
                            <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                              {match.homeTeam}{" "}
                              <span style={{ color: "#44445A" }}>
                                {match.status === "upcoming" ? "vs" : `${match.homeScore}–${match.awayScore}`}
                              </span>{" "}
                              {match.awayTeam}
                            </div>
                            <div style={{ color: "#44445A", fontSize: 10, marginTop: 1 }}>
                              {match.date} · {match.stadium}
                            </div>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded-full ml-2"
                            style={{
                              background: match.status === "live" ? "rgba(255,68,68,0.15)" : "rgba(255,255,255,0.06)",
                              color: match.status === "live" ? "#FF5F5F" : "#44445A",
                              fontSize: 9, fontWeight: 700,
                            }}
                          >
                            {match.status === "live" ? "● CANLI" : match.status === "finished" ? "Bitti" : "Yaklaşıyor"}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Competitions section */}
              {(activeTab === "all" || activeTab === "competitions") && filteredComps.length > 0 && (
                <div className="mb-6">
                  <div className="mb-3">
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>
                      LİGLER ({filteredComps.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {filteredComps.slice(0, activeTab === "all" ? 3 : 20).map((comp, i) => (
                      <motion.button
                        key={comp.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate("/home/sport-menu")}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                        style={{ background: "rgba(22,22,30,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
                      >
                        <div
                          className="flex-shrink-0 flex items-center justify-center rounded-xl"
                          style={{ width: 42, height: 42, background: `${comp.color}15`, border: `1px solid ${comp.color}35`, fontSize: 20 }}
                        >
                          {comp.logo}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{comp.name}</div>
                          <div style={{ color: "#44445A", fontSize: 11 }}>
                            {comp.flag} {comp.country} · {comp.teams} takım · {comp.season}
                          </div>
                        </div>
                        <ChevronRight size={14} color="#333344" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Teams section */}
              {(activeTab === "all" || activeTab === "teams") && filteredTeams.length > 0 && (
                <div className="mb-6">
                  <div className="mb-3">
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>
                      TAKIMLAR ({filteredTeams.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {filteredTeams.slice(0, activeTab === "all" ? 3 : 20).map((team, i) => (
                      <motion.button
                        key={team.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate("/matches")}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                        style={{ background: "rgba(22,22,30,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
                      >
                        <div
                          className="flex-shrink-0 flex items-center justify-center rounded-xl"
                          style={{
                            width: 42, height: 42,
                            background: `${team.color}15`,
                            border: `1px solid ${team.color}35`,
                            fontSize: 20,
                          }}
                        >
                          {team.logo}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{team.name}</div>
                          <div style={{ color: "#44445A", fontSize: 11 }}>
                            {team.flag} {team.league} · {(team.followers / 1000).toFixed(0)}K takipçi
                          </div>
                        </div>
                        <ChevronRight size={14} color="#333344" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}