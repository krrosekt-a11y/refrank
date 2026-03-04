import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Search, SlidersHorizontal, Zap, Radio } from "lucide-react";
import {
  fetchLiveVoteSnapshot,
  getOrCreateVoteUserKey,
  isLiveVotesConfigured,
  submitLiveIncidentVote,
  type IncidentVoteStat,
} from "../lib/liveVotes";

type LiveIncident = {
  id: string;
  minute: string;
  type: "goal" | "yellow" | "red" | "penalty";
  team: string;
  player: string;
  text: string;
};

const tabs = ["Tüm", "Fit", "Ligler", "Canlı", "Takvim"];

const liveMatch = {
  league: "Süper Lig",
  minute: "67'",
  homeTeam: "Galatasaray",
  awayTeam: "Fenerbahçe",
  homeScore: 1,
  awayScore: 1,
};

const incidents: LiveIncident[] = [
  {
    id: "ev-1",
    minute: "64'",
    type: "goal",
    team: "Galatasaray",
    player: "M. Icardi",
    text: "Gol kararı: ofsayt kontrolünden sonra geçerli sayıldı.",
  },
  {
    id: "ev-2",
    minute: "58'",
    type: "yellow",
    team: "Fenerbahçe",
    player: "Fred",
    text: "Sarı kart: geç müdahale.",
  },
  {
    id: "ev-3",
    minute: "52'",
    type: "penalty",
    team: "Fenerbahçe",
    player: "S. Dzeko",
    text: "Penaltı beklentisi: VAR devam kararı verdi.",
  },
  {
    id: "ev-4",
    minute: "49'",
    type: "red",
    team: "Galatasaray",
    player: "K. Demirbay",
    text: "Kırmızı kart itirazı: hakem sarı kartta kaldı.",
  },
];

function incidentBadge(type: LiveIncident["type"]) {
  if (type === "goal") return { label: "Gol", color: "#46D39A", bg: "rgba(70,211,154,0.16)" };
  if (type === "yellow") return { label: "Sarı", color: "#F6C945", bg: "rgba(246,201,69,0.16)" };
  if (type === "red") return { label: "Kırmızı", color: "#FF5B6B", bg: "rgba(255,91,107,0.16)" };
  return { label: "Penaltı", color: "#7AB8FF", bg: "rgba(122,184,255,0.16)" };
}

function scoreMeta(score?: number) {
  if (typeof score !== "number") return null;
  if (score <= 3) return { label: "Hatalı", color: "#FF9AA4" };
  if (score <= 6) return { label: "Tartışmalı", color: "#A7D1FF" };
  return { label: "Doğru", color: "#8FF6C6" };
}

function normalizeScore(score: number): number {
  return Math.max(0, Math.min(10, Math.round(score)));
}

const EMPTY_STAT: IncidentVoteStat = { totalVotes: 0, average: null };

export function Home() {
  const [activeTab, setActiveTab] = useState("Tüm");
  const [expanded, setExpanded] = useState(false);
  const [votes, setVotes] = useState<Record<string, number | undefined>>({});
  const [statsByIncident, setStatsByIncident] = useState<Record<string, IncidentVoteStat>>({});
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [syncingIncidentId, setSyncingIncidentId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState("");

  const [supabaseReady] = useState(isLiveVotesConfigured);
  const [currentUserKey] = useState(getOrCreateVoteUserKey);

  useEffect(() => {
    if (!supabaseReady) return;
    let alive = true;
    setLoadingSnapshot(true);
    fetchLiveVoteSnapshot(
      incidents.map((x) => x.id),
      currentUserKey
    )
      .then(({ myVotes, stats }) => {
        if (!alive) return;
        setVotes(myVotes);
        setStatsByIncident(stats);
      })
      .catch(() => {
        if (!alive) return;
        setVoteError("Topluluk oyları alınamadı.");
      })
      .finally(() => {
        if (alive) setLoadingSnapshot(false);
      });
    return () => {
      alive = false;
    };
  }, [supabaseReady, currentUserKey]);

  const votedCount = useMemo(() => {
    return Object.values(votes).filter((v): v is number => typeof v === "number").length;
  }, [votes]);

  const myAverageScore = useMemo(() => {
    const values = Object.values(votes).filter((v): v is number => typeof v === "number");
    if (!values.length) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }, [votes]);

  const communityStats = useMemo(() => {
    let totalVotes = 0;
    let weightedSum = 0;
    for (const item of incidents) {
      const stats = statsByIncident[item.id] || EMPTY_STAT;
      totalVotes += stats.totalVotes;
      weightedSum += (stats.average || 0) * stats.totalVotes;
    }
    return {
      totalVotes,
      average: totalVotes ? weightedSum / totalVotes : null,
    };
  }, [statsByIncident]);

  async function setVote(incidentId: string, score: number) {
    const normalized = normalizeScore(score);
    const previous = votes[incidentId];

    setVotes((prev) => ({ ...prev, [incidentId]: normalized }));

    if (!supabaseReady) return;

    setSyncingIncidentId(incidentId);
    setVoteError("");

    try {
      const stats = await submitLiveIncidentVote(incidentId, normalized, currentUserKey);
      setStatsByIncident((prev) => ({ ...prev, [incidentId]: stats }));
    } catch {
      setVotes((prev) => ({ ...prev, [incidentId]: previous }));
      setVoteError("Oyun kaydedilemedi. Tekrar dene.");
    } finally {
      setSyncingIncidentId(null);
    }
  }

  return (
    <div style={{ background: "#070910", minHeight: "100%" }}>
      <div
        style={{
          paddingTop: "max(env(safe-area-inset-top), 44px)",
          paddingBottom: 16,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background:
            "radial-gradient(680px 280px at 50% -140px, rgba(170,255,0,0.12), rgba(8,10,16,0.96) 58%), #070910",
        }}
      >
        <div className="px-5">
          <div className="flex items-start justify-between">
            <div>
              <div style={{ fontSize: 30, lineHeight: 0.95, fontWeight: 900, letterSpacing: "-1px" }}>
                <span style={{ color: "#C8FF00" }}>REF</span>
                <span style={{ color: "#fff" }}>SCORE</span>
              </div>
              <div style={{ color: "#555A73", fontSize: 13, marginTop: 4 }}>Hakem Performans Platformu</div>
            </div>
            <button
              type="button"
              className="relative w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <Bell size={22} color="#B8C0D8" />
              <span
                style={{
                  position: "absolute",
                  top: 11,
                  right: 11,
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "#C8FF00",
                  boxShadow: "0 0 0 4px rgba(200,255,0,0.22)",
                }}
              />
            </button>
          </div>

          <div
            className="mt-5 h-16 rounded-full flex items-center px-5"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(22,24,36,0.82)",
              gap: 12,
            }}
          >
            <Search size={22} color="#4F5470" />
            <span style={{ color: "#666B86", fontSize: 15, letterSpacing: "-0.2px", fontWeight: 500 }}>
              Hakem ara...
            </span>
            <div className="ml-auto">
              <SlidersHorizontal size={22} color="#5E6382" />
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {tabs.map((tab) => {
              const active = tab === activeTab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-2 rounded-full whitespace-nowrap"
                  style={{
                    border: active ? "1px solid rgba(200,255,0,0.46)" : "1px solid rgba(255,255,255,0.11)",
                    background: active ? "rgba(136,182,0,0.22)" : "rgba(255,255,255,0.03)",
                    color: active ? "#D6FF5D" : "#616780",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 pb-28">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: "#FF4D4F",
                boxShadow: "0 0 0 5px rgba(255,77,79,0.18)",
              }}
            />
            <h2 style={{ color: "#fff", fontSize: 30, fontWeight: 900, letterSpacing: "-0.8px" }}>
              Canlı Maçlar
            </h2>
          </div>
          <div
            className="rounded-full px-4 py-2 inline-flex items-center gap-2"
            style={{
              border: "1px solid rgba(255,77,79,0.5)",
              background: "rgba(255,77,79,0.12)",
              color: "#FF6068",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            <Radio size={14} /> 2 CANLI
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-[30px] p-4"
          style={{
            border: "1px solid rgba(174,228,24,0.36)",
            background:
              "linear-gradient(145deg, rgba(108,148,0,0.2), rgba(18,21,32,0.94) 68%)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span style={{ color: "#D6FF5D", fontSize: 13, fontWeight: 800 }}>{liveMatch.league}</span>
            <span style={{ color: "#FF5D66", fontSize: 15, fontWeight: 900 }}>• {liveMatch.minute}</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, minWidth: 0, textAlign: "center" }}>
              {liveMatch.homeTeam}
            </div>
            <div
              className="rounded-[20px] px-4 py-2"
              style={{
                border: "1px solid rgba(174,228,24,0.4)",
                background: "rgba(128,170,0,0.18)",
                color: "#C8FF00",
                fontSize: 30,
                lineHeight: 1,
                fontWeight: 900,
              }}
            >
              {liveMatch.homeScore}-{liveMatch.awayScore}
            </div>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, minWidth: 0, textAlign: "center" }}>
              {liveMatch.awayTeam}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-4 w-full rounded-full py-3 inline-flex items-center justify-center gap-2"
            style={{
              border: "1px solid rgba(174,228,24,0.45)",
              background: "linear-gradient(90deg, rgba(106,140,0,0.4), rgba(140,190,0,0.32), rgba(106,140,0,0.4))",
              color: "#C8FF00",
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            <Zap size={18} /> {expanded ? "CANLI OYU GIZLE" : "CANLI OY VER"}
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="vote-panel"
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: "auto", opacity: 1, marginTop: 14 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div
                  className="rounded-2xl p-3"
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(8,10,18,0.72)",
                    display: "grid",
                    gap: 9,
                  }}
                >
                  {!supabaseReady && (
                    <div
                      className="rounded-xl px-3 py-2"
                      style={{
                        border: "1px solid rgba(250,204,21,0.35)",
                        background: "rgba(250,204,21,0.12)",
                        color: "#FACC15",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      Supabase env eksik. Şu an oylar sadece bu tarayıcıda görünür.
                    </div>
                  )}

                  {voteError && (
                    <div
                      className="rounded-xl px-3 py-2"
                      style={{
                        border: "1px solid rgba(255,91,107,0.35)",
                        background: "rgba(255,91,107,0.12)",
                        color: "#FF9AA4",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {voteError}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div style={{ color: "#EAF0FF", fontSize: 13, fontWeight: 700 }}>
                      Anlık Olay Oylaması
                    </div>
                    <div style={{ color: "#8EA0BE", fontSize: 11, textAlign: "right" }}>
                      Topluluk: {communityStats.totalVotes} oy
                      {communityStats.average !== null ? ` · Ort. ${communityStats.average.toFixed(1)}` : ""}
                      <br />
                      Sen: {votedCount}/{incidents.length}
                      {myAverageScore !== null ? ` · Ort. ${myAverageScore.toFixed(1)}` : ""}
                    </div>
                  </div>

                  <div
                    className="rounded-xl px-3 py-2 flex items-center justify-between"
                    style={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.02)",
                      color: "#8EA0BE",
                      fontSize: 11,
                    }}
                  >
                    <span>0 = Hatalı</span>
                    <span>5 = Tartışmalı</span>
                    <span>10 = Doğru</span>
                  </div>

                  {loadingSnapshot && (
                    <div style={{ color: "#8EA0BE", fontSize: 11 }}>Topluluk oyları yükleniyor...</div>
                  )}

                  {incidents.map((item) => {
                    const badge = incidentBadge(item.type);
                    const selected = votes[item.id];
                    const selectedMeta = scoreMeta(selected);
                    const incidentStats = statsByIncident[item.id] || EMPTY_STAT;

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl p-3"
                        style={{
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.03)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="inline-flex items-center gap-2">
                              <span style={{ color: "#FF7A82", fontSize: 11, fontWeight: 800 }}>{item.minute}</span>
                              <span
                                className="px-2 py-1 rounded-full"
                                style={{
                                  color: badge.color,
                                  background: badge.bg,
                                  fontSize: 10,
                                  fontWeight: 800,
                                }}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, marginTop: 4 }}>
                              {item.team} · {item.player}
                            </div>
                            <div style={{ color: "#A8B3CB", fontSize: 11, marginTop: 2 }}>{item.text}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                          <span style={{ color: "#8EA0BE", fontSize: 10 }}>0-10 arası puan ver</span>
                          <span style={{ color: selectedMeta?.color || "#8EA0BE", fontSize: 11, fontWeight: 700 }}>
                            {typeof selected === "number"
                              ? `Puanın: ${selected} (${selectedMeta?.label})`
                              : "Henüz puan vermedin"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                          <span style={{ color: "#94A3BE", fontSize: 10 }}>Topluluk ortalaması</span>
                          <span style={{ color: "#D9E4FF", fontSize: 11, fontWeight: 700 }}>
                            {incidentStats.average !== null ? incidentStats.average.toFixed(1) : "-"} / 10
                            <span style={{ color: "#77839D", fontWeight: 500 }}> · {incidentStats.totalVotes} oy</span>
                          </span>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(11, minmax(0, 1fr))",
                            gap: 6,
                          }}
                        >
                          {Array.from({ length: 11 }, (_, score) => {
                            const isActive = selected === score;
                            const meta = scoreMeta(score);
                            return (
                              <button
                                key={score}
                                type="button"
                                onClick={() => setVote(item.id, score)}
                                disabled={syncingIncidentId === item.id}
                                className="rounded-lg py-1.5"
                                style={{
                                  border: isActive
                                    ? `1px solid ${meta?.color || "#C8FF00"}`
                                    : "1px solid rgba(255,255,255,0.12)",
                                  background: isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                                  color: isActive ? "#fff" : "#8E99B3",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  opacity: syncingIncidentId === item.id ? 0.7 : 1,
                                }}
                              >
                                {score}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
