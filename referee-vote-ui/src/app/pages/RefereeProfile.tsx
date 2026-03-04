import { ArrowLeft, Clock, ChevronRight, Star, Zap, Share2, Medal, Globe, Rocket, Monitor, Gem, Activity, Scale, Target, UserX, Radio, MapPin, MessageCircle, ThumbsUp, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { trendingComments, type Referee } from "../data";
import { CareerRing } from "../components/CareerRing";
import { motion, AnimatePresence } from "motion/react";
import { fetchDbReferee, fetchDbRefereeMatches, fetchDbRefereeTeams, type DbMatch, type TeamCard } from "../lib/localdbApi";
import { isFavoriteReferee, toggleFavoriteReferee } from "../lib/favorites";

const badgeInfo: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  elite: { label: "Elit", icon: <Star size={10} />, color: "#FFD600" },
  veteran: { label: "Veteran", icon: <Medal size={10} />, color: "#C8FF00" },
  international: { label: "Uluslararası", icon: <Globe size={10} />, color: "#4FA3FF" },
  "rising-star": { label: "Yükselen Yıldız", icon: <Rocket size={10} />, color: "#FF9500" },
  "var-expert": { label: "VAR Uzmanı", icon: <Monitor size={10} />, color: "#AF52DE" },
  consistent: { label: "Tutarlı", icon: <Gem size={10} />, color: "#30C0FF" },
};

export function RefereeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<"stats" | "trend" | "matches">("matches");
  const [referee, setReferee] = useState<Referee | null>(null);
  const [loading, setLoading] = useState(true);
  const [refMatchesDb, setRefMatchesDb] = useState<DbMatch[]>([]);
  const [teamCards, setTeamCards] = useState<TeamCard[]>([]);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [showDisciplineInfo, setShowDisciplineInfo] = useState(false);
  const [showAccuracyInfo, setShowAccuracyInfo] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    Promise.all([
      fetchDbReferee(id),
      fetchDbRefereeMatches(id, 120),
      fetchDbRefereeTeams(id),
    ])
      .then(([r, m, t]) => {
        if (!alive) return;
        setReferee(r);
        setRefMatchesDb(m);
        setTeamCards(t);
      })
      .catch(() => {
        if (!alive) return;
        setReferee(null);
        setRefMatchesDb([]);
        setTeamCards([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setIsFavorite(isFavoriteReferee(id));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: "#0A0A0F", color: "#666677" }}>
        Veriler yükleniyor...
      </div>
    );
  }

  if (!referee || !id) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen"
        style={{ background: "#0A0A0F" }}
      >
        <UserX size={48} color="#44445A" />
        <div style={{ color: "#44445A", marginTop: 12 }}>Hakem bulunamadı</div>
        <button
          onClick={() => navigate("/")}
          style={{ color: "#C8FF00", marginTop: 16, fontSize: 14 }}
        >
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  const refMatches = refMatchesDb.map((m) => {
    const parts = String(m.score || "").split("-");
    const hs = Number(parts[0]);
    const as = Number(parts[1]);
    return {
      id: String(m.id),
      refereeId: String(id),
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: Number.isFinite(hs) ? hs : undefined,
      awayScore: Number.isFinite(as) ? as : undefined,
      date: m.date,
      time: "",
      league: m.league,
      stadium: "Trendyol Süper Lig",
      status: "finished" as const,
      minute: undefined,
      commentCount: 0,
      homeYellowCards: Number(m.homeYellowCards ?? 0),
      awayYellowCards: Number(m.awayYellowCards ?? 0),
      homeRedCards: Number(m.homeRedCards ?? 0),
      awayRedCards: Number(m.awayRedCards ?? 0),
      homeSecondYellowRedCards: Number(m.homeSecondYellowRedCards ?? 0),
      awaySecondYellowRedCards: Number(m.awaySecondYellowRedCards ?? 0),
      penaltyGoals: Number(m.penaltyGoals ?? 0),
      homeFouls: m.homeFouls,
      awayFouls: m.awayFouls,
      totalFouls: m.totalFouls,
    };
  });
  const refereeComments = trendingComments
    .filter((c) => c.refereeId === id)
    .sort((a, b) => b.likes - a.likes);

  const toggleLike = (commentId: string) => {
    setLikedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const categoryScores = [
    { label: "Kondisyon", icon: <Activity size={14} />, value: referee.accuracy / 10 + 0.5 },
    { label: "Karar İsabeti", icon: <Scale size={14} />, value: referee.careerScore },
    { label: "VAR Kullanımı", icon: <Monitor size={14} />, value: referee.careerScore - 0.3 },
    { label: "Otorite", icon: <Target size={14} />, value: referee.careerScore + 0.2 },
  ].map((c) => ({ ...c, value: Math.min(10, Math.max(1, c.value)) }));

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100%" }}>
      {/* Hero */}
      <div className="relative" style={{ height: 300 }}>
        <img
          src={referee.photo}
          alt={referee.name}
          className="w-full h-full object-cover"
          style={{ objectPosition: "center top" }}
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,15,0.2) 0%, rgba(10,10,15,0.5) 50%, rgba(10,10,15,1) 100%)",
          }}
        />

        {/* Top bar with glass buttons */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-4"
          style={{ paddingTop: "max(env(safe-area-inset-top), 48px)" }}
        >
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate(-1)}
            className="flex items-center justify-center"
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              background: "rgba(10,10,15,0.6)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(16px)",
            }}
          >
            <ArrowLeft size={20} color="#fff" />
          </motion.button>

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                if (!id) return;
                setIsFavorite(toggleFavoriteReferee(id));
              }}
              className="flex items-center justify-center"
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                background: isFavorite ? "rgba(255,95,95,0.2)" : "rgba(10,10,15,0.6)",
                border: `1px solid ${isFavorite ? "rgba(255,95,95,0.45)" : "rgba(255,255,255,0.14)"}`,
                backdropFilter: "blur(16px)",
              }}
              aria-label={isFavorite ? "Favoriden çıkar" : "Favoriye ekle"}
            >
              <Heart size={18} color={isFavorite ? "#FF5F5F" : "#fff"} fill={isFavorite ? "#FF5F5F" : "none"} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              className="flex items-center justify-center"
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                background: "rgba(10,10,15,0.6)",
                border: "1px solid rgba(255,255,255,0.14)",
                backdropFilter: "blur(16px)",
              }}
            >
              <Share2 size={18} color="#fff" />
            </motion.button>
          </div>
        </div>

        {/* Name & info overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <h1
              style={{
                color: "#fff",
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: "-0.5px",
                lineHeight: 1.1,
              }}
            >
              {referee.name.toUpperCase()}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span style={{ fontSize: 18 }}>{referee.flag}</span>
              <span style={{ color: "#AAAABC", fontSize: 13, fontWeight: 500 }}>
                {referee.country}
              </span>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
              <span style={{ color: "#AAAABC", fontSize: 13 }}>{referee.age} yaş</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-5 pb-8">
        {/* Discipline index ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="py-6"
        >
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowDisciplineInfo((v) => !v)}
              className="rounded-full"
              style={{ cursor: "pointer" }}
            >
              <CareerRing score={referee.careerScore} size={168} />
            </button>
          </div>
          <div className="text-center mt-2">
            <button
              type="button"
              onClick={() => setShowDisciplineInfo((v) => !v)}
              style={{ color: "#8EA0BE", fontSize: 11, textDecoration: "underline" }}
            >
              Disiplin Endeksi nedir?
            </button>
          </div>

          {showDisciplineInfo && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 mx-auto rounded-2xl px-4 py-3"
              style={{
                maxWidth: 520,
                background: "rgba(20,24,34,0.9)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#B7C1D9",
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              Disiplin Endeksi, hakemin geçmiş maçlarındaki kart yoğunluğuna göre
              hesaplanan istatistiksel bir göstergedir. Sarı, kırmızı ve ikinci
              sarıdan kırmızı kart oranları birlikte değerlendirilir.
              <br />
              <span style={{ color: "#DDE6FF" }}>
                Yüksek değer: daha dengeli ve düşük kart profili.
              </span>{" "}
              <span style={{ color: "#DDE6FF" }}>
                Düşük değer: daha yüksek kart yoğunluğu.
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Badges */}
        {referee.badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap gap-2 justify-center mb-5"
          >
            {referee.badges.map((badge) => {
              const info = badgeInfo[badge];
              if (!info) return null;
              return (
                <div
                  key={badge}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{
                    background: `${info.color}14`,
                    border: `1px solid ${info.color}38`,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <span style={{ fontSize: 13 }}>{info.icon}</span>
                  <span style={{ color: info.color, fontSize: 12, fontWeight: 600 }}>
                    {info.label}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Stat boxes */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: "MAÇLAR", value: referee.matches, color: "#fff" },
            { label: "SARI", value: referee.yellowCards, color: "#FFD600" },
            { label: "KIRMIZI", value: referee.redCards, color: "#FF3B30" },
            { label: "PENALTİ", value: referee.penalties, color: "#4FA3FF" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.05 }}
              className="flex flex-col items-center py-3 rounded-3xl"
              style={{
                background: "rgba(22,22,30,0.85)",
                border: "1px solid rgba(255,255,255,0.06)",
                backdropFilter: "blur(12px)",
              }}
            >
              <span style={{ color: stat.color, fontSize: 20, fontWeight: 800 }}>
                {stat.value}
              </span>
              <span
                style={{
                  color: "#44445A",
                  fontSize: 8,
                  marginTop: 2,
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                }}
              >
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Accuracy row */}
        <div
          className="grid grid-cols-3 gap-2 mb-5 p-4 rounded-3xl"
          style={{
            background: "rgba(22,22,30,0.85)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
          }}
        >
          <button
            type="button"
            onClick={() => setShowAccuracyInfo((v) => !v)}
            className="text-center"
            style={{ cursor: "pointer" }}
          >
            <div style={{ color: "#C8FF00", fontSize: 18, fontWeight: 800 }}>
              %{referee.accuracy}
            </div>
            <div style={{ color: "#44445A", fontSize: 10, marginTop: 2, textDecoration: "underline" }}>
              İsabet
            </div>
          </button>
          <div
            className="text-center"
            style={{
              borderLeft: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ color: "#FFD600", fontSize: 18, fontWeight: 800 }}>
              {referee.yellowCardsPerMatch.toFixed(1)}
            </div>
            <div style={{ color: "#44445A", fontSize: 10, marginTop: 2 }}>
              Sarı/Maç
            </div>
          </div>
          <div
            className="text-center"
            style={{
              borderLeft: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ color: "#FF3B30", fontSize: 18, fontWeight: 800 }}>
              {referee.redCardsPerMatch.toFixed(1)}
            </div>
            <div style={{ color: "#44445A", fontSize: 10, marginTop: 2 }}>
              Kırmızı/Maç
            </div>
          </div>
        </div>

        {/* Team card tendencies */}
        <div
          className="mb-5 p-4 rounded-3xl"
          style={{
            background: "rgba(22,22,30,0.85)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>Takımlara Gösterilen Kartlar</div>
            <div style={{ color: "#666677", fontSize: 11 }}>Top 8</div>
          </div>
          {teamCards.length === 0 ? (
            <div style={{ color: "#666677", fontSize: 12 }}>Veri bulunamadı</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {teamCards.slice(0, 8).map((t) => (
                <motion.button
                  key={t.team}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/referee/${id}/team/${encodeURIComponent(t.team)}/cards`)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div style={{ color: "#dbe4ff", fontSize: 12, fontWeight: 600 }}>{t.team}</div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#C8FF00", fontSize: 13, fontWeight: 800 }}>{t.total_cards} kart</div>
                    <div style={{ color: "#7b88a0", fontSize: 10 }}>{t.matches} maç · {Number(t.avg_cards_per_match).toFixed(2)} / maç</div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Section tabs */}
        <div
          className="flex p-1 mb-5 rounded-2xl"
          style={{ background: "rgba(22,22,30,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {([
            { key: "matches", label: "Maçlar" },
            { key: "stats", label: "Kategoriler" },
            { key: "trend", label: "Trend" },
          ] as const).map((tab) => (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveSection(tab.key)}
              className="flex-1 py-2.5 rounded-xl transition-all relative"
              style={{
                background: activeSection === tab.key ? "#C8FF00" : "transparent",
                color: activeSection === tab.key ? "#0A0A0F" : "#55556A",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Category scores */}
        {activeSection === "stats" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-2 gap-3 mb-5"
          >
            {categoryScores.map((cat) => {
              const pct = ((cat.value - 1) / 9) * 100;
              const catColor =
                cat.value >= 8 ? "#C8FF00" : cat.value >= 6 ? "#FFD600" : "#FF5F5F";
              return (
                <div
                  key={cat.label}
                  className="p-4 rounded-3xl"
                  style={{
                    background: "rgba(22,22,30,0.85)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 18 }}>{cat.icon}</span>
                    <span style={{ color: "#888899", fontSize: 11, fontWeight: 500 }}>
                      {cat.label}
                    </span>
                  </div>
                  <div style={{ color: catColor, fontSize: 22, fontWeight: 900 }}>
                    {cat.value.toFixed(1)}
                  </div>
                  <div
                    className="relative rounded-full mt-2"
                    style={{ height: 4, background: "rgba(255,255,255,0.07)" }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                      className="absolute top-0 left-0 h-full rounded-full"
                      style={{ background: catColor, boxShadow: `0 0 6px ${catColor}66` }}
                    />
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Trend chart */}
        {activeSection === "trend" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-5"
          >
            <div
              className="p-4 rounded-3xl"
              style={{
                background: "rgba(22,22,30,0.85)",
                border: "1px solid rgba(255,255,255,0.06)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Star size={15} color="#C8FF00" />
                  <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>
                    Performans Trendi
                  </span>
                </div>
                <span style={{ color: "#44445A", fontSize: 11 }}>Son 8 maç</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={referee.performanceTrend}>
                  <XAxis
                    dataKey="match"
                    tick={{ fill: "#44445A", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fill: "#44445A", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={22}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(22,22,30,0.95)",
                      border: "1px solid rgba(200,255,0,0.3)",
                      borderRadius: 12,
                      color: "#fff",
                      fontSize: 12,
                      backdropFilter: "blur(12px)",
                    }}
                    labelStyle={{ color: "#C8FF00" }}
                  />
                  <ReferenceLine
                    y={7}
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="3 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#C8FF00"
                    strokeWidth={2.5}
                    dot={{ fill: "#C8FF00", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#C8FF00", filter: "drop-shadow(0 0 4px #C8FF00)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Recent matches */}
        {activeSection === "matches" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-5"
          >
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
              Yönettiği Maçlar
            </div>
            {refMatches.length === 0 ? (
              <div className="text-center py-10" style={{ color: "#44445A" }}>
                Maç bulunamadı
              </div>
            ) : (
              refMatches.map((match, i) => (
                <motion.button
                  key={match.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileTap={{ scale: 0.975 }}
                  onClick={() => {
                    if (match.status !== "upcoming")
                      navigate(`/referee/${referee.id}/vote/${match.id}`);
                  }}
                  className="w-full flex items-center justify-between px-4 py-4 rounded-3xl mb-2.5"
                  style={{
                    background: match.status === "live"
                      ? "linear-gradient(135deg, rgba(200,255,0,0.06) 0%, rgba(22,22,30,0.9) 100%)"
                      : "rgba(22,22,30,0.85)",
                    border: match.status === "live"
                      ? "1px solid rgba(200,255,0,0.2)"
                      : "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div className="text-left">
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
                      {match.homeTeam}{" "}
                      <span style={{ color: "#C8FF00" }}>
                        {match.status === "upcoming"
                          ? "vs"
                          : `${match.homeScore ?? 0}-${match.awayScore ?? 0}`}
                      </span>{" "}
                      {match.awayTeam}
                    </div>
                    <div style={{ color: "#44445A", fontSize: 11, marginTop: 2 }}>
                      {match.league} • {match.date}
                      {match.status === "live" && (
                        <span style={{ color: "#FF5F5F", marginLeft: 6, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Radio size={10} color="#FF5F5F" /> {match.minute}&apos; CANLI
                        </span>
                      )}
                      {match.status === "upcoming" && (
                        <span style={{ color: "#888899", marginLeft: 6, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Clock size={10} color="#888899" /> {match.time}
                        </span>
                      )}
                    </div>
                    <div style={{ color: "#7b88a0", fontSize: 10, marginTop: 2 }}>
                      Sarı {match.homeYellowCards ?? 0}-{match.awayYellowCards ?? 0} ·
                      SK {match.homeSecondYellowRedCards ?? 0}-{match.awaySecondYellowRedCards ?? 0} ·
                      Kırmızı {match.homeRedCards ?? 0}-{match.awayRedCards ?? 0}
                    </div>
                    <div style={{ color: "#7b88a0", fontSize: 10, marginTop: 2 }}>
                      Faul {(match.homeFouls ?? "-")} - {(match.awayFouls ?? "-")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {match.status !== "upcoming" && (
                      <div
                        className="px-2.5 py-1 rounded-xl"
                        style={{
                          background: "rgba(200,255,0,0.1)",
                          border: "1px solid rgba(200,255,0,0.2)",
                        }}
                      >
                        <span style={{ color: "#C8FF00", fontSize: 11, fontWeight: 700 }}>
                          {match.status === "live" ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <Zap size={11} color="#C8FF00" /> CANLI
                            </span>
                          ) : "OY VER"}
                        </span>
                      </div>
                    )}
                    <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
                  </div>
                </motion.button>
              ))
            )}
          </motion.div>
        )}

        {/* Bio */}
        <div
          className="p-5 rounded-3xl"
          style={{
            background: "rgba(22,22,30,0.85)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} color="#C8FF00" />
            <h3 style={{ color: "#888899", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em" }}>
              BİYOGRAFİ
            </h3>
          </div>
          <p style={{ color: "#BBBBC8", fontSize: 13, lineHeight: 1.7 }}>
            {referee.bio}
          </p>
        </div>

        {/* Comments Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="mt-5"
        >
          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} color="#C8FF00" />
              <h3 style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>
                Yorumlar
              </h3>
              <span
                className="px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(200,255,0,0.12)",
                  color: "#C8FF00",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {refereeComments.length}
              </span>
            </div>
          </div>

          {refereeComments.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 rounded-3xl"
              style={{
                background: "rgba(22,22,30,0.85)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <MessageCircle size={36} color="#33334A" />
              <p style={{ color: "#44445A", fontSize: 13, marginTop: 10 }}>
                Henüz yorum yapılmamış
              </p>
              <p style={{ color: "#33334A", fontSize: 11, marginTop: 4 }}>
                İlk yorumu sen yap!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {refereeComments.map((comment, i) => {
                const isLiked = likedComments.has(comment.id);
                const scoreColor =
                  comment.score >= 8
                    ? "#C8FF00"
                    : comment.score >= 6
                    ? "#FFD600"
                    : comment.score >= 4
                    ? "#FF9500"
                    : "#FF5F5F";
                const matchInfo = refMatches.find((m) => m.id === comment.matchId);

                return (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                    className="p-4 rounded-3xl"
                    style={{
                      background: "rgba(22,22,30,0.85)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    {/* Comment header */}
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            background: "rgba(200,255,0,0.08)",
                            border: "1px solid rgba(200,255,0,0.15)",
                            fontSize: 16,
                          }}
                        >
                          {comment.userAvatar}
                        </div>
                        <div>
                          <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                            {comment.userName}
                          </div>
                          <div style={{ color: "#44445A", fontSize: 10, marginTop: 1 }}>
                            {comment.time}
                          </div>
                        </div>
                      </div>

                      {/* Score badge */}
                      <div
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl"
                        style={{
                          background: `${scoreColor}14`,
                          border: `1px solid ${scoreColor}30`,
                        }}
                      >
                        <Star size={10} color={scoreColor} fill={scoreColor} />
                        <span style={{ color: scoreColor, fontSize: 12, fontWeight: 800 }}>
                          {comment.score.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Match info tag */}
                    {matchInfo && (
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mb-2.5"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <span style={{ color: "#55556A", fontSize: 10, fontWeight: 600 }}>
                          {matchInfo.homeTeam} {matchInfo.homeScore ?? 0}-{matchInfo.awayScore ?? 0} {matchInfo.awayTeam}
                        </span>
                      </div>
                    )}

                    {/* Comment text */}
                    <p style={{ color: "#BBBBC8", fontSize: 13, lineHeight: 1.65, marginBottom: 10 }}>
                      {comment.text}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleLike(comment.id)}
                        className="flex items-center gap-1.5"
                      >
                        <Heart
                          size={14}
                          color={isLiked ? "#FF5F5F" : "#44445A"}
                          fill={isLiked ? "#FF5F5F" : "none"}
                        />
                        <span
                          style={{
                            color: isLiked ? "#FF5F5F" : "#44445A",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {comment.likes + (isLiked ? 1 : 0)}
                        </span>
                      </motion.button>

                      <button className="flex items-center gap-1.5">
                        <MessageCircle size={13} color="#44445A" />
                        <span style={{ color: "#44445A", fontSize: 12, fontWeight: 600 }}>
                          Yanıtla
                        </span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showAccuracyInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center px-5"
            style={{ background: "rgba(0,0,0,0.58)" }}
            onClick={() => setShowAccuracyInfo(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-3xl p-5"
              style={{
                maxWidth: 420,
                background: "rgba(18,22,34,0.98)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
              }}
            >
              <div style={{ color: "#E9F0FF", fontSize: 15, fontWeight: 800, marginBottom: 8 }}>
                İsabet Oranı Nedir?
              </div>
              <div style={{ color: "#B7C1D9", fontSize: 12, lineHeight: 1.6 }}>
                İsabet oranı, Disiplin Endeksi değerinden türetilen istatistiksel bir göstergedir.
                Doğrudan VAR ya da doğru karar ölçümü değildir; kart dağılımı ve maç başına kart
                yoğunluğu üzerinden genel bir tutarlılık sinyali verir.
                <br />
                <span style={{ color: "#DDE6FF" }}>
                  Yüksek oran: daha dengeli kart profili.
                </span>{" "}
                <span style={{ color: "#DDE6FF" }}>
                  Düşük oran: daha yüksek kart yoğunluğu.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAccuracyInfo(false)}
                className="w-full mt-4 py-3 rounded-2xl"
                style={{
                  background: "rgba(200,255,0,0.14)",
                  border: "1px solid rgba(200,255,0,0.3)",
                  color: "#C8FF00",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Kapat
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
