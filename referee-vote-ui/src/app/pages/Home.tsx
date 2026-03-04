import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Search, SlidersHorizontal, Zap, Radio } from "lucide-react";
import type { Referee } from "../data";
import {
  fetchLiveVoteSnapshot,
  getOrCreateVoteUserKey,
  isLiveVotesConfigured,
  submitLiveIncidentVote,
  type IncidentVoteStat,
} from "../lib/liveVotes";
import {
  fetchDbReferees,
  fetchLiveNowFixture,
  fetchMatchDecisionEvents,
  fetchUpcomingFixtures,
  type LiveNowFixture,
  type MatchDecisionEvent,
  type UpcomingFixture,
} from "../lib/localdbApi";

type LiveIncident = {
  id: string;
  minute: string;
  type: "goal" | "yellow" | "red" | "penalty";
  team: string;
  player: string;
  text: string;
};

function mapEventType(ev: MatchDecisionEvent): LiveIncident["type"] {
  const txt = `${ev.type || ""} ${ev.result || ""}`.toLowerCase();
  if (txt.includes("red") || txt.includes("kırmızı")) return "red";
  if (txt.includes("yellow") || txt.includes("sarı")) return "yellow";
  if (txt.includes("penalt")) return "penalty";
  return "goal";
}

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

function parseFixtureDate(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(String(raw).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatFixtureDateShort(d: Date): string {
  return d.toLocaleString("tr-TR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractWeekNumber(round?: string): number | null {
  const txt = (round || "").trim();
  if (!txt) return null;
  const m = txt.match(/(\d{1,2})/);
  if (!m) return null;
  return Number(m[1]);
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) return `${days}g ${String(hours).padStart(2, "0")}s ${String(minutes).padStart(2, "0")}d`;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function Home() {
  const navigate = useNavigate();
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [referees, setReferees] = useState<Referee[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingFixture[]>([]);
  const [liveNowFixture, setLiveNowFixture] = useState<LiveNowFixture | null>(null);
  const [liveNowIncidents, setLiveNowIncidents] = useState<LiveIncident[]>([]);
  const [nowTick, setNowTick] = useState(Date.now());
  const [votes, setVotes] = useState<Record<string, number | undefined>>({});
  const [statsByIncident, setStatsByIncident] = useState<Record<string, IncidentVoteStat>>({});
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [syncingIncidentId, setSyncingIncidentId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState("");

  const [supabaseReady] = useState(isLiveVotesConfigured);
  const [currentUserKey] = useState(getOrCreateVoteUserKey);
  const liveIncidentKeys = useMemo(
    () =>
      liveNowFixture
        ? liveNowIncidents.map((item) => `${String(liveNowFixture.fixture_id)}:${item.id}`)
        : [],
    [liveNowFixture, liveNowIncidents],
  );

  useEffect(() => {
    if (!supabaseReady) return;
    let alive = true;
    setLoadingSnapshot(true);
    fetchLiveVoteSnapshot(liveIncidentKeys, currentUserKey)
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
  }, [supabaseReady, currentUserKey, liveIncidentKeys]);

  useEffect(() => {
    let alive = true;
    fetchDbReferees(200)
      .then((rows) => {
        if (alive) setReferees(rows);
      })
      .catch(() => {
        if (alive) setReferees([]);
      });

    fetchUpcomingFixtures(21)
      .then((upcomingRows) => {
        if (alive) setUpcoming(upcomingRows);
      })
      .catch(() => {
        if (alive) setUpcoming([]);
      });

    fetchLiveNowFixture()
      .then(async (live) => {
        if (!alive) return;
        setLiveNowFixture(live);
        if (!live) {
          setLiveNowIncidents([]);
          return;
        }
        const rows = await fetchMatchDecisionEvents({
          fixtureId: live.fixture_id,
          homeTeam: live.home_team,
          awayTeam: live.away_team,
          date: live.date,
        });
        if (!alive) return;
        const mapped = rows
          .map((ev) => ({
            id: String(ev.id || ""),
            minute: `${Number(ev.minute || 0)}${Number(ev.extra_minute || 0) > 0 ? `+${Number(ev.extra_minute)}` : ""}'`,
            type: mapEventType(ev),
            team: String(ev.team || "-"),
            player: String(ev.player || ev.related_player || "Bilinmiyor"),
            text: String(ev.result || ev.type || "Hakem kararı"),
          }))
          .filter((ev) => ev.id);
        setLiveNowIncidents(mapped);
      })
      .catch(() => {
        if (alive) {
          setLiveNowFixture(null);
          setLiveNowIncidents([]);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const votedCount = useMemo(() => {
    return liveIncidentKeys.filter((k) => typeof votes[k] === "number").length;
  }, [liveIncidentKeys, votes]);

  const myAverageScore = useMemo(() => {
    const values = liveIncidentKeys
      .map((k) => votes[k])
      .filter((v): v is number => typeof v === "number");
    if (!values.length) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }, [liveIncidentKeys, votes]);

  const communityStats = useMemo(() => {
    let totalVotes = 0;
    let weightedSum = 0;
    for (const key of liveIncidentKeys) {
      const stats = statsByIncident[key] || EMPTY_STAT;
      totalVotes += stats.totalVotes;
      weightedSum += (stats.average || 0) * stats.totalVotes;
    }
    return {
      totalVotes,
      average: totalVotes ? weightedSum / totalVotes : null,
    };
  }, [liveIncidentKeys, statsByIncident]);

  const filteredReferees = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("tr-TR");
    if (!query) return [];
    return referees
      .filter((ref) => {
        const haystack = `${ref.name} ${ref.league}`.toLocaleLowerCase("tr-TR");
        return haystack.includes(query);
      })
      .slice(0, 6);
  }, [searchQuery]);

  const displayMatches = useMemo(() => {
    if (liveNowFixture) {
      const scoreMatch = String(liveNowFixture.score || "").match(/(\d+)\s*[-:]\s*(\d+)/);
      const homeScore = scoreMatch ? Number(scoreMatch[1]) : 0;
      const awayScore = scoreMatch ? Number(scoreMatch[2]) : 0;
      return [
        {
          id: String(liveNowFixture.fixture_id),
          league: liveNowFixture.league_name || "Canlı Lig",
          statusLabel: "CANLI",
          homeTeam: liveNowFixture.home_team,
          awayTeam: liveNowFixture.away_team,
          homeScore,
          awayScore,
          kickoffMs: Date.now(),
          isLive: true,
          countdownLabel: "",
        },
      ];
    }

    const TARGET_WEEK = 25;
    const now = new Date(nowTick);

    const parsed = upcoming
      .map((f) => {
        const d = parseFixtureDate(f.date);
        if (!d) return null;
        return { fixture: f, date: d, week: extractWeekNumber(f.round) };
      })
      .filter(
        (x): x is { fixture: UpcomingFixture; date: Date; week: number | null } =>
          Boolean(x),
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    let picked = parsed.filter((x) => x.week === TARGET_WEEK);
    if (!picked.length) {
      picked = parsed.filter((x) => x.date.getTime() >= now.getTime());
    }
    if (!picked.length) {
      picked = parsed;
    }

    return picked.slice(0, 3).map(({ fixture, date }) => {
      const kickoffMs = date.getTime();
      const deltaMs = kickoffMs - nowTick;
      const isLive = deltaMs <= 0 && deltaMs >= -2 * 60 * 60 * 1000;
      return {
      id: String(fixture.fixture_id),
      league: fixture.league_name || "Lig",
      statusLabel: isLive ? "CANLI" : formatFixtureDateShort(date),
      homeTeam: fixture.home_team,
      awayTeam: fixture.away_team,
      homeScore: 0,
      awayScore: 0,
      kickoffMs,
      isLive,
      countdownLabel: formatCountdown(deltaMs),
    };
    });
  }, [liveNowFixture, upcoming, nowTick]);

  const liveCount = useMemo(
    () => displayMatches.filter((m) => m.isLive).length,
    [displayMatches],
  );
  const hasLive = liveCount > 0;

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
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hakem ara..."
              className="flex-1 bg-transparent outline-none"
              style={{ color: "#D8DDF0", fontSize: 15, letterSpacing: "-0.2px", fontWeight: 500 }}
            />
            <div className="ml-auto">
              <SlidersHorizontal size={22} color="#5E6382" />
            </div>
          </div>

          <AnimatePresence>
            {searchQuery.trim().length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="mt-3 rounded-3xl overflow-hidden"
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(14,16,26,0.95)",
                }}
              >
                {filteredReferees.length > 0 ? (
                  filteredReferees.map((ref, index) => (
                    <button
                      key={ref.id}
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        navigate(`/referee/${ref.id}`);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3"
                      style={{
                        borderBottom:
                          index < filteredReferees.length - 1
                            ? "1px solid rgba(255,255,255,0.05)"
                            : "none",
                      }}
                    >
                      <img
                        src={ref.photo}
                        alt={ref.name}
                        className="rounded-full object-cover"
                        style={{ width: 34, height: 34, border: "1px solid rgba(255,255,255,0.12)" }}
                      />
                      <div className="text-left min-w-0">
                        <div style={{ color: "#F4F7FF", fontSize: 13, fontWeight: 700 }}>{ref.name}</div>
                        <div style={{ color: "#7D88A7", fontSize: 11 }}>{ref.league}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3" style={{ color: "#7D88A7", fontSize: 12 }}>
                    Eşleşen hakem bulunamadı.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
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
              {hasLive ? "Canlı Maçlar" : "Gelecek Maçlar"}
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
            <Radio size={14} /> {hasLive ? `${liveCount} CANLI` : `${displayMatches.length} GELECEK`}
          </div>
        </div>

        {displayMatches.length > 0 ? (
          <div style={{ display: "grid", gap: 12 }}>
            {displayMatches.map((card, idx) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className="rounded-[30px] p-4"
                style={{
                  border: "1px solid rgba(174,228,24,0.36)",
                  background:
                    "linear-gradient(145deg, rgba(108,148,0,0.2), rgba(18,21,32,0.94) 68%)",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span style={{ color: "#D6FF5D", fontSize: 13, fontWeight: 800 }}>{card.league}</span>
                  <span
                    style={{
                      color: card.isLive ? "#FF5D66" : "#9FB1CF",
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    • {card.statusLabel}
                  </span>
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
                    {card.homeTeam}
                  </div>
                  <div
                    className="rounded-[20px] px-4 py-2"
                    style={{
                      border: "1px solid rgba(174,228,24,0.4)",
                      background: "rgba(128,170,0,0.18)",
                      color: "#C8FF00",
                      fontSize: card.isLive ? 30 : 16,
                      lineHeight: 1,
                      fontWeight: 900,
                      minWidth: card.isLive ? undefined : 128,
                      textAlign: "center",
                    }}
                  >
                    {card.isLive ? `${card.homeScore}-${card.awayScore}` : card.countdownLabel}
                  </div>
                  <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, minWidth: 0, textAlign: "center" }}>
                    {card.awayTeam}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setExpandedMatchId((prev) => (prev === card.id ? null : card.id))
                  }
                  className="mt-4 w-full rounded-full py-3 inline-flex items-center justify-center gap-2"
                  style={{
                    border: "1px solid rgba(174,228,24,0.45)",
                    background: "linear-gradient(90deg, rgba(106,140,0,0.4), rgba(140,190,0,0.32), rgba(106,140,0,0.4))",
                    color: "#C8FF00",
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  <Zap size={18} /> {expandedMatchId === card.id ? "CANLI OYU GIZLE" : "CANLI OY VER"}
                </button>

                <AnimatePresence initial={false}>
                  {expandedMatchId === card.id && (
                    <motion.div
                      key={`vote-panel-${card.id}`}
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
                      Sen: {votedCount}/{liveIncidentKeys.length}
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

                  {liveNowIncidents.length === 0 && (
                    <div style={{ color: "#8EA0BE", fontSize: 11 }}>
                      Bu maç için canlı olay verisi henüz gelmedi.
                    </div>
                  )}

                  {liveNowIncidents.map((item) => {
                    const incidentKey = `${card.id}:${item.id}`;
                    const badge = incidentBadge(item.type);
                    const selected = votes[incidentKey];
                    const selectedMeta = scoreMeta(selected);
                    const incidentStats = statsByIncident[incidentKey] || EMPTY_STAT;

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
                                onClick={() => setVote(incidentKey, score)}
                                disabled={syncingIncidentId === incidentKey}
                                className="rounded-lg py-1.5"
                                style={{
                                  border: isActive
                                    ? `1px solid ${meta?.color || "#C8FF00"}`
                                    : "1px solid rgba(255,255,255,0.12)",
                                  background: isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                                  color: isActive ? "#fff" : "#8E99B3",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  opacity: syncingIncidentId === incidentKey ? 0.7 : 1,
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
            ))}
          </div>
        ) : (
          <div
            className="rounded-[30px] p-5"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(18,21,32,0.7)",
              color: "#8EA0BE",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Şu anda canlı maç verisi bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}
