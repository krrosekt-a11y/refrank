import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { Referee } from "../data";
import {
  Settings,
  Star,
  Award,
  MessageSquare,
  ChevronRight,
  Edit2,
  Bell,
  Globe,
  Shield,
  CheckSquare,
  Calendar,
  MessageCircle,
  User,
  AlertTriangle,
  ShieldCheck,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { fetchDbReferees } from "../lib/localdbApi";
import { getFavoriteRefereeIds } from "../lib/favorites";
import { listSavedMatchVotes, type SavedMatchVote } from "../lib/matchVotes";
import {
  isDecisionVotesCloudConfigured,
  listDecisionVotesCloud,
  upsertDecisionVoteCloud,
  type CloudDecisionVoteItem,
} from "../lib/decisionVotesCloud";
import {
  fetchLiveVoteSnapshot,
  getOrCreateVoteUserKey,
  isLiveVotesConfigured,
  submitLiveIncidentVote,
  type IncidentVoteStat,
} from "../lib/liveVotes";

type VoteEventKind = "goal" | "yellow" | "red" | "sub" | "penalty" | "var" | "other";
type VoteEventSide = "home" | "away" | "neutral";

function parseVoteEvent(titleRaw: string): {
  kind: VoteEventKind;
  side: VoteEventSide;
  label: string;
} {
  const raw = String(titleRaw || "");
  const piped = raw.split("|");
  if (piped.length >= 3) {
    const maybeKind = String(piped[0]).trim().toLowerCase();
    const maybeSide = String(piped[1]).trim().toLowerCase();
    const label = piped.slice(2).join("|").trim() || "Hakem Kararı";
    if (
      maybeKind === "goal" ||
      maybeKind === "yellow" ||
      maybeKind === "red" ||
      maybeKind === "sub" ||
      maybeKind === "penalty" ||
      maybeKind === "var" ||
      maybeKind === "other"
    ) {
      const side: VoteEventSide =
        maybeSide === "home" || maybeSide === "away" || maybeSide === "neutral"
          ? (maybeSide as VoteEventSide)
          : "neutral";
      return { kind: maybeKind as VoteEventKind, side, label };
    }
  }
  if (piped.length >= 2) {
    const maybeKind = String(piped[0]).trim().toLowerCase();
    const label = piped.slice(1).join("|").trim() || "Hakem Kararı";
    if (
      maybeKind === "goal" ||
      maybeKind === "yellow" ||
      maybeKind === "red" ||
      maybeKind === "sub" ||
      maybeKind === "penalty" ||
      maybeKind === "var" ||
      maybeKind === "other"
    ) {
      return { kind: maybeKind as VoteEventKind, side: "neutral", label };
    }
  }

  const txt = raw.toLowerCase();
  if (txt.includes("goal") || txt.includes("gol")) return { kind: "goal", side: "neutral", label: raw };
  if (txt.includes("yellow") || txt.includes("sarı")) return { kind: "yellow", side: "neutral", label: raw };
  if (txt.includes("red") || txt.includes("kırmızı")) return { kind: "red", side: "neutral", label: raw };
  if (txt.includes("penalt")) return { kind: "penalty", side: "neutral", label: raw };
  if (txt.includes("sub") || txt.includes("değiş")) return { kind: "sub", side: "neutral", label: raw };
  if (txt.includes("var")) return { kind: "var", side: "neutral", label: raw };
  return { kind: "other", side: "neutral", label: raw || "Hakem Kararı" };
}

function VoteEventIcon({ kind }: { kind: VoteEventKind }) {
  if (kind === "yellow") {
    return <span style={{ width: 8, height: 12, borderRadius: 2, background: "#FACC15", display: "inline-block" }} />;
  }
  if (kind === "red") {
    return <span style={{ width: 8, height: 12, borderRadius: 2, background: "#EF4444", display: "inline-block" }} />;
  }
  if (kind === "goal") {
    return <span style={{ color: "#E5EDF8", fontSize: 12 }}>⚽</span>;
  }
  if (kind === "penalty") {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full"
        style={{ width: 14, height: 14, border: "1px solid #60A5FA", color: "#60A5FA", fontSize: 8, fontWeight: 800 }}
      >
        P
      </span>
    );
  }
  if (kind === "sub") {
    return <span style={{ color: "#34D399", fontSize: 12 }}>↔</span>;
  }
  if (kind === "var") {
    return (
      <span style={{ color: "#A78BFA", fontSize: 9, fontWeight: 800 }}>
        VAR
      </span>
    );
  }
  return <span style={{ width: 6, height: 6, borderRadius: 999, background: "#94A3B8", display: "inline-block" }} />;
}

export function UserProfilePage() {
  const navigate = useNavigate();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [savedVotes, setSavedVotes] = useState<SavedMatchVote[]>([]);
  const [decisionVotes, setDecisionVotes] = useState<CloudDecisionVoteItem[]>(
    []
  );
  const [openVotesSheet, setOpenVotesSheet] = useState<"total" | "week" | null>(
    null
  );
  const [activeRevoteItem, setActiveRevoteItem] =
    useState<CloudDecisionVoteItem | null>(null);
  const [activeRevoteScore, setActiveRevoteScore] = useState<number | null>(null);
  const [activeRevoteCommunity, setActiveRevoteCommunity] =
    useState<IncidentVoteStat | null>(null);
  const [loadingRevoteCommunity, setLoadingRevoteCommunity] = useState(false);
  const [revoteSaving, setRevoteSaving] = useState(false);
  const [revoteError, setRevoteError] = useState("");

  useEffect(() => {
    let alive = true;
    fetchDbReferees(40)
      .then((rs) => {
        if (!alive) return;
        setReferees(rs);
      })
      .catch(() => {
        if (!alive) return;
        setReferees([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const syncFavorites = () => setFavoriteIds(getFavoriteRefereeIds());
    syncFavorites();
    if (typeof window === "undefined") return;
    window.addEventListener("focus", syncFavorites);
    window.addEventListener("storage", syncFavorites);
    window.addEventListener(
      "refscore:favorites-updated",
      syncFavorites as EventListener
    );
    return () => {
      window.removeEventListener("focus", syncFavorites);
      window.removeEventListener("storage", syncFavorites);
      window.removeEventListener(
        "refscore:favorites-updated",
        syncFavorites as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const syncVotes = () => setSavedVotes(listSavedMatchVotes());
    syncVotes();
    if (typeof window === "undefined") return;
    window.addEventListener("focus", syncVotes);
    window.addEventListener("storage", syncVotes);
    window.addEventListener("refscore:match-votes-updated", syncVotes as EventListener);
    return () => {
      window.removeEventListener("focus", syncVotes);
      window.removeEventListener("storage", syncVotes);
      window.removeEventListener("refscore:match-votes-updated", syncVotes as EventListener);
    };
  }, []);

  useEffect(() => {
    const syncDecisionVotes = async () => {
      if (!isDecisionVotesCloudConfigured()) {
        setDecisionVotes([]);
        return;
      }
      try {
        const rows = await listDecisionVotesCloud(getOrCreateVoteUserKey());
        setDecisionVotes(rows);
      } catch {
        setDecisionVotes([]);
      }
    };
    void syncDecisionVotes();
    if (typeof window === "undefined") return;
    window.addEventListener("focus", syncDecisionVotes as EventListener);
    window.addEventListener("storage", syncDecisionVotes as EventListener);
    window.addEventListener(
      "refscore:decision-votes-updated",
      syncDecisionVotes as EventListener
    );
    return () => {
      window.removeEventListener("focus", syncDecisionVotes as EventListener);
      window.removeEventListener("storage", syncDecisionVotes as EventListener);
      window.removeEventListener(
        "refscore:decision-votes-updated",
        syncDecisionVotes as EventListener
      );
    };
  }, []);

  const favoriteReferees = useMemo(() => {
    if (!favoriteIds.length) return [];
    const idSet = new Set(favoriteIds);
    return referees
      .filter((r) => idSet.has(String(r.id)))
      .sort((a, b) => favoriteIds.indexOf(String(a.id)) - favoriteIds.indexOf(String(b.id)))
      .slice(0, 2);
  }, [referees, favoriteIds]);
  const userVotedMatches = useMemo(() => {
    return savedVotes.slice(0, 8).map((v) => ({
      id: `${v.matchId}-${v.refereeId}`,
      homeTeam: v.homeTeam,
      awayTeam: v.awayTeam,
      refereeId: v.refereeId,
      refereeName: v.refereeName,
      refereePhoto: v.refereePhoto,
      userScore: Number(v.overall.toFixed(1)),
    }));
  }, [savedVotes]);
  const decisionVoteCount = decisionVotes.length;
  const weeklyDecisionVoteCount = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return decisionVotes.filter(
      (v) => new Date(v.votedAt).getTime() >= weekAgo
    ).length;
  }, [decisionVotes]);
  const weeklyDecisionVotes = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return decisionVotes.filter(
      (v) => new Date(v.votedAt).getTime() >= weekAgo
    );
  }, [decisionVotes]);
  const voteAverage = useMemo(() => {
    if (!decisionVotes.length) return null;
    const total = decisionVotes.reduce((sum, v) => sum + Number(v.score || 0), 0);
    return total / decisionVotes.length;
  }, [decisionVotes]);
  const teamBiasIndex = useMemo(() => {
    const teamSupport = new Map<string, number[]>();
    for (const vote of decisionVotes) {
      const parsed = parseVoteEvent(vote.eventTitle);
      const score = Number(vote.score || 0);
      if (parsed.side === "neutral") continue;
      const home = String(vote.homeTeam || "").trim();
      const away = String(vote.awayTeam || "").trim();
      if (!home || !away) continue;

      const homeImplied = parsed.side === "home" ? score : 10 - score;
      const awayImplied = parsed.side === "away" ? score : 10 - score;
      teamSupport.set(home, [...(teamSupport.get(home) || []), homeImplied]);
      teamSupport.set(away, [...(teamSupport.get(away) || []), awayImplied]);
    }

    const averages = [...teamSupport.values()]
      .filter((arr) => arr.length >= 3)
      .map((arr) => arr.reduce((s, v) => s + v, 0) / arr.length);

    if (averages.length < 2) return 0;
    const mean = averages.reduce((s, v) => s + v, 0) / averages.length;
    const variance =
      averages.reduce((s, v) => s + (v - mean) * (v - mean), 0) / averages.length;
    return Math.sqrt(variance);
  }, [decisionVotes]);
  const reliabilityIndex = useMemo(() => {
    if (voteAverage === null) return null;
    const base = voteAverage * 10;
    const biasPenalty = Math.min(40, teamBiasIndex * 8);
    return Math.max(0, Math.min(100, base - biasPenalty));
  }, [voteAverage, teamBiasIndex]);
  const reliabilityMeta = useMemo(() => {
    if (voteAverage === null) {
      return {
        label: "Yetersiz veri",
        detail: "Endeks için daha fazla oy kullan.",
        color: "#8EA0BE",
        bg: "rgba(142,160,190,0.1)",
        border: "rgba(142,160,190,0.26)",
        warning: false,
      };
    }
    if (teamBiasIndex >= 1.8) {
      return {
        label: "Takım bazlı sapma yüksek",
        detail:
          "Oyların takım bazında dengesiz görünüyor. Farklı takım pozisyonlarını daha dengeli puanla.",
        color: "#FF7D8D",
        bg: "rgba(255,125,141,0.1)",
        border: "rgba(255,125,141,0.28)",
        warning: true,
      };
    }
    if (teamBiasIndex >= 1.1) {
      return {
        label: "Takım etkisi tespit edildi",
        detail:
          "Benzer pozisyonlarda iki tarafa da aynı ölçekte puan vermeye çalış.",
        color: "#F6C945",
        bg: "rgba(246,201,69,0.1)",
        border: "rgba(246,201,69,0.25)",
        warning: true,
      };
    }
    if (voteAverage < 3.5) {
      return {
        label: "Düşük güvenilirlik",
        detail: "Ortalaman çok düşük. Aşırı sert oylar sonuçları bozabilir.",
        color: "#FF7D8D",
        bg: "rgba(255,125,141,0.1)",
        border: "rgba(255,125,141,0.28)",
        warning: true,
      };
    }
    if (voteAverage < 5) {
      return {
        label: "Gözden geçir",
        detail: "Ortalaman düşük. Pozisyonları tekrar kontrol ederek oyla.",
        color: "#F6C945",
        bg: "rgba(246,201,69,0.1)",
        border: "rgba(246,201,69,0.25)",
        warning: true,
      };
    }
    return {
      label: "Dengeli oy profili",
      detail: "Oy dağılımın sistem için güvenilir görünüyor.",
      color: "#76E4A3",
      bg: "rgba(118,228,163,0.1)",
      border: "rgba(118,228,163,0.25)",
      warning: false,
    };
  }, [teamBiasIndex, voteAverage]);

  async function submitRevote() {
    if (!activeRevoteItem || activeRevoteScore === null || revoteSaving) return;
    const userKey = getOrCreateVoteUserKey();
    const normalized = Math.max(0, Math.min(10, Math.round(activeRevoteScore)));
    setRevoteSaving(true);
    setRevoteError("");

    try {
      await upsertDecisionVoteCloud(userKey, {
        incidentId: activeRevoteItem.incidentId,
        matchId: activeRevoteItem.matchId,
        homeTeam: activeRevoteItem.homeTeam,
        awayTeam: activeRevoteItem.awayTeam,
        minuteLabel: activeRevoteItem.minuteLabel,
        eventTitle: activeRevoteItem.eventTitle,
        score: normalized,
      });
      const stat = await submitLiveIncidentVote(activeRevoteItem.incidentId, normalized, userKey);
      setActiveRevoteCommunity(stat);

      setDecisionVotes((prev) =>
        prev.map((v) =>
          v.incidentId === activeRevoteItem.incidentId
            ? { ...v, score: normalized, votedAt: new Date().toISOString() }
            : v
        )
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("refscore:decision-votes-updated"));
      }
      setActiveRevoteItem(null);
      setActiveRevoteScore(null);
    } catch {
      setRevoteError("Oy güncellenemedi. Lütfen tekrar dene.");
    } finally {
      setRevoteSaving(false);
    }
  }

  useEffect(() => {
    if (!activeRevoteItem || !isLiveVotesConfigured()) {
      setActiveRevoteCommunity(null);
      return;
    }
    let alive = true;
    const userKey = getOrCreateVoteUserKey();
    setLoadingRevoteCommunity(true);
    fetchLiveVoteSnapshot([activeRevoteItem.incidentId], userKey)
      .then(({ stats }) => {
        if (!alive) return;
        setActiveRevoteCommunity(stats[activeRevoteItem.incidentId] || null);
      })
      .catch(() => {
        if (!alive) return;
        setActiveRevoteCommunity(null);
      })
      .finally(() => {
        if (alive) setLoadingRevoteCommunity(false);
      });
    return () => {
      alive = false;
    };
  }, [activeRevoteItem]);

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100%" }}>
      {/* Glass header */}
      <div
        className="sticky top-0 z-40"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 48px)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          background: "rgba(10,10,15,0.82)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-between px-5 pb-4">
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px" }}>
            Profilim
          </h1>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate("/settings")}
            className="flex items-center justify-center"
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Settings size={18} color="rgba(255,255,255,0.7)" />
          </motion.button>
        </div>
      </div>

      <div className="px-5 pt-5 pb-8">
        {/* User card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-4 p-5 rounded-3xl mb-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(26,26,34,0.95) 0%, rgba(20,20,28,0.95) 100%)",
            border: "1px solid rgba(200,255,0,0.12)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 0 40px rgba(200,255,0,0.04)",
          }}
        >
          <div className="relative">
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: 68,
                height: 68,
                background: "linear-gradient(135deg, #C8FF00 0%, #88CC00 100%)",
                boxShadow: "0 0 20px rgba(200,255,0,0.3)",
              }}
            >
              <User size={32} color="#0A0A0F" />
            </div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full"
              style={{
                width: 24,
                height: 24,
                background: "rgba(22,22,30,0.95)",
                border: "1.5px solid rgba(200,255,0,0.3)",
              }}
            >
              <Edit2 size={10} color="#C8FF00" />
            </motion.button>
          </div>

          <div className="flex-1">
            <div style={{ color: "#fff", fontSize: 17, fontWeight: 800 }}>
              FutbolTaraftarı42
            </div>
            <div style={{ color: "#44445A", fontSize: 12, marginTop: 2 }}>
              🇹🇷 Türkiye • Üye: Ocak 2026
            </div>
            <div
              className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(200,255,0,0.1)",
                border: "1px solid rgba(200,255,0,0.2)",
              }}
            >
              <Star size={9} color="#C8FF00" fill="#C8FF00" />
              <span style={{ color: "#C8FF00", fontSize: 10, fontWeight: 700 }}>
                Aktif Seçmen
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setOpenVotesSheet("total")}
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: openVotesSheet === "total" ? [1, 1.04, 1] : 1,
            }}
            transition={{ delay: 0.1, duration: 0.24 }}
            className="flex flex-col items-center py-5 rounded-3xl"
            style={{
              background: "rgba(20,20,28,0.85)",
              border:
                openVotesSheet === "total"
                  ? "1px solid rgba(200,255,0,0.42)"
                  : "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
              boxShadow:
                openVotesSheet === "total"
                  ? "0 0 0 1px rgba(200,255,0,0.22), 0 0 22px rgba(200,255,0,0.12)"
                  : "none",
            }}
            key={`total-${openVotesSheet === "total" ? "active" : "idle"}`}
          >
            <span style={{ fontSize: 22 }}><CheckSquare size={20} color="#C8FF00" /></span>
            <span style={{ color: "#C8FF00", fontSize: 22, fontWeight: 900, marginTop: 6 }}>
              {decisionVoteCount}
            </span>
            <span style={{ color: "#44445A", fontSize: 10, marginTop: 2 }}>
              Toplam Oy
            </span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setOpenVotesSheet("week")}
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: openVotesSheet === "week" ? [1, 1.04, 1] : 1,
            }}
            transition={{ delay: 0.16, duration: 0.24 }}
            className="flex flex-col items-center py-5 rounded-3xl"
            style={{
              background: "rgba(20,20,28,0.85)",
              border:
                openVotesSheet === "week"
                  ? "1px solid rgba(200,255,0,0.42)"
                  : "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
              boxShadow:
                openVotesSheet === "week"
                  ? "0 0 0 1px rgba(200,255,0,0.22), 0 0 22px rgba(200,255,0,0.12)"
                  : "none",
            }}
            key={`week-${openVotesSheet === "week" ? "active" : "idle"}`}
          >
            <span style={{ fontSize: 22 }}><Calendar size={20} color="#C8FF00" /></span>
            <span style={{ color: "#C8FF00", fontSize: 22, fontWeight: 900, marginTop: 6 }}>
              {weeklyDecisionVoteCount}
            </span>
            <span style={{ color: "#44445A", fontSize: 10, marginTop: 2 }}>
              Bu Hafta
            </span>
          </motion.button>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="flex flex-col items-center py-5 rounded-3xl"
            style={{
              background: "rgba(20,20,28,0.85)",
              border: "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
            }}
          >
            <span style={{ fontSize: 22 }}><MessageCircle size={20} color="#C8FF00" /></span>
            <span style={{ color: "#C8FF00", fontSize: 22, fontWeight: 900, marginTop: 6 }}>
              23
            </span>
            <span style={{ color: "#44445A", fontSize: 10, marginTop: 2 }}>
              Yorum
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl p-4 mb-5"
          style={{
            background: "rgba(20,20,28,0.88)",
            border: `1px solid ${reliabilityMeta.border}`,
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} color="#C8FF00" />
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>
                  Güvenilirlik İndeksi
                </span>
              </div>
              <div style={{ color: "#66708A", fontSize: 11, marginTop: 2 }}>
                Oy ortalaması ve takım bazlı sapma ile hesaplanır.
              </div>
            </div>
            <div className="text-right">
              <div style={{ color: "#fff", fontSize: 22, fontWeight: 900 }}>
                {reliabilityIndex === null ? "-" : `${Math.round(reliabilityIndex)}`}
              </div>
              <div style={{ color: "#66708A", fontSize: 10 }}>100 üzerinden</div>
            </div>
          </div>
          <div
            className="mt-3 rounded-2xl px-3 py-2.5 flex items-center gap-2"
            style={{
              background: reliabilityMeta.bg,
              border: `1px solid ${reliabilityMeta.border}`,
            }}
          >
            {reliabilityMeta.warning ? (
              <AlertTriangle size={14} color={reliabilityMeta.color} />
            ) : (
              <ShieldCheck size={14} color={reliabilityMeta.color} />
            )}
            <div>
              <div style={{ color: reliabilityMeta.color, fontSize: 12, fontWeight: 700 }}>
                {reliabilityMeta.label}
              </div>
              <div style={{ color: "#9AA6C0", fontSize: 11 }}>
                {reliabilityMeta.detail}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <span style={{ color: "#6E7C98", fontSize: 10 }}>Takım Sapma Endeksi</span>
            <span style={{ color: "#AFC0DE", fontSize: 10, fontWeight: 700 }}>
              {teamBiasIndex.toFixed(2)}
            </span>
          </div>
        </motion.div>

        {/* Favorite referees */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Star size={15} color="#C8FF00" />
            <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>
              Favori Hakemlerim
            </h3>
          </div>
          <div className="flex gap-3">
            {favoriteReferees.length > 0 ? (
              favoriteReferees.map((ref) => (
                <motion.button
                  key={ref.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/referee/${ref.id}`)}
                  className="flex-1 flex flex-col items-center p-4 rounded-3xl"
                  style={{
                    background: "rgba(20,20,28,0.85)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <img
                    src={ref.photo}
                    alt={ref.name}
                    className="rounded-full object-cover mb-2"
                    style={{
                      width: 48,
                      height: 48,
                      border: "2px solid rgba(200,255,0,0.3)",
                    }}
                  />
                  <span style={{ color: "#fff", fontSize: 12, fontWeight: 600, textAlign: "center" }}>
                    {ref.name.split(" ")[0]}
                  </span>
                  <span style={{ color: "#C8FF00", fontSize: 14, fontWeight: 900 }}>
                    {ref.careerScore.toFixed(1)}
                  </span>
                </motion.button>
              ))
            ) : (
              <div
                className="flex-1 p-4 rounded-3xl text-center"
                style={{
                  background: "rgba(20,20,28,0.85)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#5f6780",
                  fontSize: 12,
                }}
              >
                Veritabanında favori hakem verisi bulunamadı.
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/referees")}
              className="flex-1 flex flex-col items-center justify-center p-4 rounded-3xl"
              style={{
                background: "rgba(200,255,0,0.04)",
                border: "1.5px dashed rgba(200,255,0,0.18)",
              }}
            >
              <span style={{ color: "#C8FF00", fontSize: 26 }}>+</span>
              <span style={{ color: "#44445A", fontSize: 10, marginTop: 2 }}>Ekle</span>
            </motion.button>
          </div>
        </div>

        {/* Recent votes */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare size={15} color="#C8FF00" />
            <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>
              Son 3 Oylamam
            </h3>
          </div>
          {decisionVotes.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {decisionVotes.slice(0, 3).map((vote) => {
                const parsed = parseVoteEvent(vote.eventTitle);
                return (
                <motion.button
                  key={vote.incidentId}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setActiveRevoteItem(vote);
                    setActiveRevoteScore(vote.score);
                    setRevoteError("");
                  }}
                  className="p-3 rounded-2xl"
                  style={{
                    background: "rgba(20,20,28,0.85)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    width: "100%",
                    textAlign: "left",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div
                      style={{
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {vote.homeTeam} - {vote.awayTeam}
                    </div>
                    <span
                      className="px-2 py-1 rounded-full"
                      style={{
                        color: "#0A0A0F",
                        background: "#C8FF00",
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {vote.score}
                    </span>
                  </div>
                  <div className="flex items-center gap-2" style={{ color: "#B9C3DA", fontSize: 12, marginTop: 2 }}>
                    <VoteEventIcon kind={parsed.kind} />
                    <span>{vote.minuteLabel} · {parsed.label}</span>
                  </div>
                  <div style={{ color: "#5f6780", fontSize: 10, marginTop: 2 }}>
                    {new Date(vote.votedAt).toLocaleString("tr-TR")}
                  </div>
                </motion.button>
                );
              })}
            </div>
          ) : (
            <div
              className="p-4 rounded-2xl"
              style={{
                background: "rgba(20,20,28,0.85)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#5f6780",
                fontSize: 12,
              }}
            >
              Henüz olay bazlı oy geçmişin yok.
            </div>
          )}
        </div>

        {/* Recent votes */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Award size={15} color="#C8FF00" />
            <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>
              Son Oylarım
            </h3>
          </div>
          {userVotedMatches.map((match) => {
            const ref = referees.find((r) => r.id === match.refereeId);
            const refName = ref?.name || match.refereeName || "Atanmamış";
            const refPhoto = ref?.photo || match.refereePhoto;
            const scoreColor =
              match.userScore >= 7
                ? "#C8FF00"
                : match.userScore >= 5
                ? "#FFD600"
                : "#FF5F5F";
            return (
              <motion.div
                key={match.id}
                whileTap={{ scale: 0.975 }}
                className="flex items-center gap-3 p-4 rounded-3xl mb-2.5"
                style={{
                  background: "rgba(20,20,28,0.85)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {refPhoto ? (
                  <img
                    src={refPhoto}
                    alt={refName}
                    className="rounded-full object-cover flex-shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      border: "1.5px solid rgba(255,255,255,0.1)",
                    }}
                  />
                ) : (
                  <div
                    className="rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      border: "1.5px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <User size={16} color="#68768f" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
                    {match.homeTeam} - {match.awayTeam}
                  </div>
                  <div style={{ color: "#44445A", fontSize: 11, marginTop: 1 }}>
                    {refName}
                  </div>
                </div>
                <div
                  className="px-3 py-1.5 rounded-2xl"
                  style={{
                    background: `${scoreColor}14`,
                    border: `1px solid ${scoreColor}33`,
                  }}
                >
                  <span style={{ color: scoreColor, fontSize: 15, fontWeight: 900 }}>
                    {match.userScore}
                  </span>
                </div>
              </motion.div>
            );
          })}
          {!userVotedMatches.length && (
            <div style={{ color: "#5f6780", fontSize: 12 }}>Henüz oy geçmişin bulunmuyor.</div>
          )}
        </div>

        {/* Settings */}
        <div className="mb-5">
          <div
            className="mb-3 px-1"
            style={{
              color: "#44445A",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.07em",
            }}
          >
            AYARLAR
          </div>

          <SettingsRow
            icon={<Bell size={16} color="#C8FF00" />}
            label="Bildirimler"
            right={
              <motion.div
                whileTap={{ scale: 0.9 }}
                onClick={() => setNotificationsOn(!notificationsOn)}
                className="relative cursor-pointer"
                style={{
                  width: 50,
                  height: 30,
                  borderRadius: 15,
                  background: notificationsOn ? "#C8FF00" : "rgba(255,255,255,0.1)",
                  transition: "background 0.25s",
                }}
              >
                <motion.div
                  animate={{ x: notificationsOn ? 22 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{
                    position: "absolute",
                    top: 3,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: notificationsOn ? "#0A0A0F" : "#44445A",
                  }}
                />
              </motion.div>
            }
          />

          <SettingsRow
            icon={<Globe size={16} color="#4FA3FF" />}
            label="Dil: Türkçe"
            right={<ChevronRight size={16} color="#44445A" />}
          />

          <SettingsRow
            icon={<Shield size={16} color="#AF52DE" />}
            label="Gizlilik"
            right={<ChevronRight size={16} color="#44445A" />}
          />

          <SettingsRow
            icon={<MessageSquare size={16} color="#FF9500" />}
            label="Geri Bildirim Gönder"
            right={<ChevronRight size={16} color="#44445A" />}
          />
        </div>

        {/* Version */}
        <div className="text-center">
          <span style={{ color: "#2A2A3A", fontSize: 11 }}>RefScore v1.0.0</span>
        </div>
      </div>

      <AnimatePresence>
        {openVotesSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.55)" }}
            onClick={() => setOpenVotesSheet(null)}
          >
            <motion.div
              initial={{ y: 220 }}
              animate={{ y: 0 }}
              exit={{ y: 220 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-[28px] p-5"
              style={{
                maxWidth: 430,
                maxHeight: "80vh",
                overflowY: "auto",
                background: "rgba(15,17,27,0.97)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderBottom: "none",
                backdropFilter: "blur(24px)",
                paddingBottom: "max(env(safe-area-inset-bottom), 20px)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>
                  {openVotesSheet === "total" ? "Toplam Oy Listesi" : "Bu Haftaki Oylar"}
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenVotesSheet(null)}
                  className="rounded-full flex items-center justify-center"
                  style={{
                    width: 34,
                    height: 34,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <X size={16} color="#c2cade" />
                </button>
              </div>
              {(openVotesSheet === "total" ? decisionVotes : weeklyDecisionVotes).length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {(openVotesSheet === "total" ? decisionVotes : weeklyDecisionVotes).map(
                    (vote) => {
                      const parsed = parseVoteEvent(vote.eventTitle);
                      return (
                      <motion.button
                        key={`${openVotesSheet}-${vote.incidentId}`}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setActiveRevoteItem(vote);
                          setActiveRevoteScore(vote.score);
                          setRevoteError("");
                        }}
                        className="p-3 rounded-2xl"
                        style={{
                          background: "rgba(20,20,28,0.9)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          width: "100%",
                          textAlign: "left",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div
                            style={{
                              color: "#fff",
                              fontSize: 13,
                              fontWeight: 700,
                              minWidth: 0,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {vote.homeTeam} - {vote.awayTeam}
                          </div>
                          <span
                            className="px-2 py-1 rounded-full"
                            style={{
                              color: "#0A0A0F",
                              background: "#C8FF00",
                              fontSize: 11,
                              fontWeight: 900,
                            }}
                          >
                            {vote.score}
                          </span>
                        </div>
                        <div className="flex items-center gap-2" style={{ color: "#B9C3DA", fontSize: 12, marginTop: 2 }}>
                          <VoteEventIcon kind={parsed.kind} />
                          <span>{vote.minuteLabel} · {parsed.label}</span>
                        </div>
                        <div style={{ color: "#5f6780", fontSize: 10, marginTop: 2 }}>
                          {new Date(vote.votedAt).toLocaleString("tr-TR")}
                        </div>
                      </motion.button>
                      );
                    }
                  )}
                </div>
              ) : (
                <div
                  className="p-4 rounded-2xl"
                  style={{
                    background: "rgba(20,20,28,0.9)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#7f8aa6",
                    fontSize: 12,
                  }}
                >
                  Bu filtre için oy bulunamadı.
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeRevoteItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.62)" }}
            onClick={() => {
              if (revoteSaving) return;
              setActiveRevoteItem(null);
              setActiveRevoteScore(null);
              setRevoteError("");
            }}
          >
            <motion.div
              initial={{ y: 220 }}
              animate={{ y: 0 }}
              exit={{ y: 220 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-[28px] p-5"
              style={{
                maxWidth: 430,
                background: "rgba(15,17,27,0.98)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderBottom: "none",
                backdropFilter: "blur(24px)",
                paddingBottom: "max(env(safe-area-inset-bottom), 20px)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>
                  Oyu Güncelle
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (revoteSaving) return;
                    setActiveRevoteItem(null);
                    setActiveRevoteScore(null);
                    setRevoteError("");
                  }}
                  className="rounded-full flex items-center justify-center"
                  style={{
                    width: 34,
                    height: 34,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <X size={16} color="#c2cade" />
                </button>
              </div>

              <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>
                {activeRevoteItem.homeTeam} - {activeRevoteItem.awayTeam}
              </div>
              <div className="flex items-center gap-2" style={{ color: "#9FB0CE", fontSize: 12, marginTop: 2 }}>
                <VoteEventIcon kind={parseVoteEvent(activeRevoteItem.eventTitle).kind} />
                <span>
                  {activeRevoteItem.minuteLabel} · {parseVoteEvent(activeRevoteItem.eventTitle).label}
                </span>
              </div>
              <div
                className="mt-3 rounded-2xl px-3 py-2 flex items-center justify-between"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div>
                  <div style={{ color: "#8FA3C7", fontSize: 11 }}>Topluluk Ortalaması</div>
                  <div style={{ color: "#E8F1FF", fontSize: 16, fontWeight: 800 }}>
                    {loadingRevoteCommunity
                      ? "Yükleniyor..."
                      : activeRevoteCommunity?.average == null
                        ? "-"
                        : Number(activeRevoteCommunity.average).toFixed(1)}
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ color: "#8FA3C7", fontSize: 11 }}>Toplam Oy</div>
                  <div style={{ color: "#C8FF00", fontSize: 15, fontWeight: 800 }}>
                    {loadingRevoteCommunity ? "-" : activeRevoteCommunity?.totalVotes ?? 0}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-11 gap-1.5 mt-4">
                {Array.from({ length: 11 }, (_, i) => i).map((score) => {
                  const selected = activeRevoteScore === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setActiveRevoteScore(score)}
                      className="h-9 rounded-xl"
                      style={{
                        background: selected ? "rgba(200,255,0,0.95)" : "rgba(255,255,255,0.06)",
                        border: selected
                          ? "1px solid rgba(200,255,0,0.95)"
                          : "1px solid rgba(255,255,255,0.12)",
                        color: selected ? "#0A0A0F" : "#C7D2E8",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>

              {!!revoteError && (
                <div style={{ color: "#FF8B96", fontSize: 12, marginTop: 10 }}>
                  {revoteError}
                </div>
              )}

              <button
                type="button"
                onClick={() => void submitRevote()}
                disabled={activeRevoteScore === null || revoteSaving}
                className="w-full mt-4 h-11 rounded-2xl"
                style={{
                  background:
                    activeRevoteScore === null || revoteSaving
                      ? "rgba(200,255,0,0.35)"
                      : "#C8FF00",
                  color: "#0A0A0F",
                  fontSize: 14,
                  fontWeight: 900,
                }}
              >
                {revoteSaving ? "Kaydediliyor..." : "Yeni Oyu Kaydet"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  right: React.ReactNode;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="flex items-center justify-between px-4 py-4 rounded-3xl mb-2"
      style={{
        background: "rgba(20,20,28,0.85)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        minHeight: 56,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-xl"
          style={{
            width: 34,
            height: 34,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          {icon}
        </div>
        <span style={{ color: "#fff", fontSize: 14 }}>{label}</span>
      </div>
      {right}
    </motion.div>
  );
}
