import {
  ArrowLeft,
  CheckCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Radio,
  Gamepad2,
  CreditCard,
  CircleDot,
  Waves,
  BarChart3,
  Star,
  MapPin,
  UserX,
  PenLine,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import type { Referee } from "../data";
import { CircularGauge } from "../components/CircularGauge";
import { CategorySlider } from "../components/CategorySlider";
import { motion, AnimatePresence } from "motion/react";
import { fetchDbMatches, fetchDbReferee, type DbMatch } from "../lib/localdbApi";
import { getSavedMatchVote, saveMatchVote } from "../lib/matchVotes";

const CATEGORIES = [
  {
    key: "matchControl",
    label: "Maç Kontrolü",
    icon: <Gamepad2 size={16} />,
    description: "Oyunu baştan sona ne kadar iyi yönetti?",
  },
  {
    key: "cardDecisions",
    label: "Kart Kararları",
    icon: <CreditCard size={16} />,
    description: "Sarı/kırmızı kart kararlarının isabeti",
  },
  {
    key: "penaltyDecisions",
    label: "Penaltı Kararları",
    icon: <CircleDot size={16} />,
    description: "Penaltı pozisyonlarını doğru değerlendirme",
  },
  {
    key: "gameFlow",
    label: "Oyunun Akışı",
    icon: <Waves size={16} />,
    description: "Oyunun temposunu ve akışını yönetme",
  },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

export function VotePage() {
  const { id, matchId } = useParams();
  const navigate = useNavigate();

  const [dbMatch, setDbMatch] = useState<DbMatch | null>(null);
  const [referee, setReferee] = useState<Referee | null>(null);
  const [loading, setLoading] = useState(true);

  const [overall, setOverall] = useState(7.0);
  const [categories, setCategories] = useState<Record<CategoryKey, number>>({
    matchControl: 7.0,
    cardDecisions: 7.0,
    penaltyDecisions: 7.0,
    gameFlow: 7.0,
  });
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showCategories, setShowCategories] = useState(true);
  const [commentFocused, setCommentFocused] = useState(false);

  useEffect(() => {
    if (!id || !matchId) {
      setLoading(false);
      return;
    }
    let alive = true;
    Promise.all([fetchDbReferee(id), fetchDbMatches(1200)])
      .then(([ref, allMatches]) => {
        if (!alive) return;
        const found = allMatches.find((m) => String(m.id) === String(matchId)) || null;
        setReferee(ref);
        setDbMatch(found);
        const saved = getSavedMatchVote(String(matchId), String(id));
        if (saved) {
          setOverall(saved.overall);
          setCategories({
            matchControl: saved.matchControl,
            cardDecisions: saved.cardDecisions,
            penaltyDecisions: saved.penaltyDecisions,
            gameFlow: saved.gameFlow,
          });
          setComment(saved.comment || "");
        }
      })
      .catch(() => {
        if (!alive) return;
        setReferee(null);
        setDbMatch(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, matchId]);

  const match = useMemo(() => {
    if (!dbMatch) return null;
    const parsed = String(dbMatch.score || "").match(/(\d+)\s*[-:]\s*(\d+)/);
    const homeScore = parsed ? Number(parsed[1]) : undefined;
    const awayScore = parsed ? Number(parsed[2]) : undefined;
    const matchDate = new Date(String(dbMatch.date || "").replace(" ", "T"));
    const now = Date.now();
    const status = !Number.isNaN(matchDate.getTime()) && matchDate.getTime() <= now ? "finished" : "upcoming";
    return {
      id: String(dbMatch.id),
      homeTeam: dbMatch.homeTeam,
      awayTeam: dbMatch.awayTeam,
      homeScore,
      awayScore,
      date: dbMatch.date,
      league: dbMatch.league,
      stadium: dbMatch.league || "Stadyum",
      status,
      minute: undefined as number | undefined,
    };
  }, [dbMatch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: "#0A0A0F", color: "#666677" }}>
        Veriler yükleniyor...
      </div>
    );
  }

  if (!match || !referee || !id || !matchId) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen"
        style={{ background: "#0A0A0F" }}
      >
        <UserX size={48} color="#44445A" />
        <div style={{ color: "#44445A", marginTop: 12 }}>Maç bulunamadı</div>
        <button
          onClick={() => navigate("/")}
          style={{ color: "#C8FF00", marginTop: 16, fontSize: 14 }}
        >
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  const catAvg =
    Object.values(categories).reduce((s, v) => s + v, 0) /
    Object.values(categories).length;
  const avgScore = (overall + catAvg) / 2;
  const isLive = match.status === "live";

  if (submitted) {
    return (
      <SubmitSuccess
        overall={overall}
        avgScore={avgScore}
        refereeName={referee.name}
        onNavigate={() => navigate(`/referee/${referee.id}`)}
      />
    );
  }

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100vh" }}>
      {/* Glass header */}
      <div
        className="sticky top-0 z-40"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 48px)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          background: "rgba(10,10,15,0.88)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center gap-3 px-5 pb-4">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate(-1)}
            className="flex items-center justify-center"
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} color="#fff" />
          </motion.button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1
                style={{
                  color: "#fff",
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: "-0.3px",
                }}
              >
                HAKEM PUANLAMA
              </h1>
              {isLive && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,68,68,0.12)", border: "1px solid rgba(255,68,68,0.25)" }}>
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    style={{ width: 5, height: 5, borderRadius: 3, background: "#FF4444" }}
                  />
                  <span style={{ color: "#FF5F5F", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em" }}>
                    CANLI
                  </span>
                </div>
              )}
            </div>
            <p style={{ color: "#44445A", fontSize: 11 }}>Maç Sonu Değerlendirmesi</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 pb-10">
        {/* Match card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl p-5 mb-5"
          style={{
            background: isLive
              ? "linear-gradient(135deg, rgba(200,255,0,0.06) 0%, rgba(22,22,30,0.95) 100%)"
              : "rgba(22,22,30,0.9)",
            border: isLive
              ? "1px solid rgba(200,255,0,0.22)"
              : "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* League badge + live */}
          <div className="flex items-center justify-between mb-4">
            <span
              className="px-3 py-1 rounded-full"
              style={{
                background: "rgba(200,255,0,0.1)",
                border: "1px solid rgba(200,255,0,0.2)",
                color: "#C8FF00",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {match.league}
            </span>
            {isLive && (
              <div className="flex items-center gap-1.5">
                <Radio size={12} color="#FF5F5F" />
                <span style={{ color: "#FF5F5F", fontSize: 12, fontWeight: 800 }}>
                  {match.minute}&apos; CANLI
                </span>
              </div>
            )}
          </div>

          {/* Teams & Score */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 text-center">
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>
                {match.homeTeam}
              </div>
            </div>
            <div
              className="px-4 py-2.5 rounded-2xl mx-3"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div
                style={{
                  color: isLive ? "#C8FF00" : "#fff",
                  fontSize: 24,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                {match.homeScore} – {match.awayScore}
              </div>
              <div
                style={{
                  color: "#44445A",
                  fontSize: 9,
                  textAlign: "center",
                  marginTop: 2,
                  letterSpacing: "0.05em",
                }}
              >
                TAM SKOR
              </div>
            </div>
            <div className="flex-1 text-center">
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>
                {match.awayTeam}
              </div>
            </div>
          </div>

          {/* Referee info */}
          <div
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <img
              src={referee.photo}
              alt={referee.name}
              className="rounded-full object-cover flex-shrink-0"
              style={{
                width: 40,
                height: 40,
                border: "2px solid rgba(200,255,0,0.3)",
              }}
            />
            <div>
              <div style={{ color: "#55556A", fontSize: 10, letterSpacing: "0.05em" }}>
                HAKEM
              </div>
              <div style={{ color: "#C8FF00", fontSize: 14, fontWeight: 700 }}>
                {referee.name}
              </div>
            </div>
            <div className="ml-auto text-right">
              <div style={{ color: "#44445A", fontSize: 11 }}>{match.stadium}</div>
              <div style={{ color: "#333344", fontSize: 10, marginTop: 2 }}>
                <MapPin size={10} color="#333344" style={{ display: "inline", marginRight: 2 }} />
                {match.date}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ====== GENEL PERFORMANS (1-10) ====== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="rounded-3xl p-5 mb-4"
          style={{
            background: "rgba(22,22,30,0.88)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="rounded-2xl flex items-center justify-center"
              style={{ width: 34, height: 34, background: "rgba(200,255,0,0.12)" }}
            >
              <Star size={18} color="#C8FF00" />
            </div>
            <div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>
                Genel Performans
              </div>
              <div style={{ color: "#44445A", fontSize: 11 }}>
                Maçtaki genel değerlendirme puanı
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <CircularGauge value={overall} onChange={setOverall} size={240} />
            <p className="mt-2 text-center" style={{ color: "#44445A", fontSize: 11 }}>
              Halkayı sürükleyerek puan verin
            </p>
          </div>
        </motion.div>

        {/* ====== CATEGORY RATINGS ====== */}
        <motion.button
          whileTap={{ scale: 0.975 }}
          onClick={() => setShowCategories(!showCategories)}
          className="w-full flex items-center justify-between px-5 py-4 rounded-3xl mb-3"
          style={{
            background: showCategories
              ? "rgba(200,255,0,0.08)"
              : "rgba(22,22,30,0.85)",
            border: `1px solid ${
              showCategories
                ? "rgba(200,255,0,0.28)"
                : "rgba(255,255,255,0.07)"
            }`,
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={18} color={showCategories ? "#C8FF00" : "#44445A"} />
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>
              Detaylı Kategori Puanları
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: "#C8FF00", fontSize: 12, fontWeight: 600 }}>
              {showCategories ? "Gizle" : "Göster"}
            </span>
            {showCategories ? (
              <ChevronUp size={16} color="#C8FF00" />
            ) : (
              <ChevronDown size={16} color="#C8FF00" />
            )}
          </div>
        </motion.button>

        <AnimatePresence>
          {showCategories && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <div
                className="p-5 rounded-3xl mb-4"
                style={{
                  background: "rgba(22,22,30,0.85)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {CATEGORIES.map((cat) => (
                  <CategorySlider
                    key={cat.key}
                    label={cat.label}
                    icon={cat.icon}
                    value={categories[cat.key]}
                    onChange={(v) =>
                      setCategories((prev) => ({ ...prev, [cat.key]: v }))
                    }
                    description={cat.description}
                  />
                ))}

                {/* Category avg summary */}
                <div
                  className="mt-4 p-4 rounded-2xl"
                  style={{
                    background: "rgba(200,255,0,0.07)",
                    border: "1px solid rgba(200,255,0,0.18)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: "#888899", fontSize: 12 }}>
                      Kategori Ortalaması
                    </span>
                    <span
                      style={{
                        color: "#C8FF00",
                        fontSize: 22,
                        fontWeight: 900,
                      }}
                    >
                      {catAvg.toFixed(1)}
                    </span>
                  </div>
                  {/* Mini bars */}
                  <div className="flex flex-col gap-1.5 mt-2">
                    {CATEGORIES.map((cat) => {
                      const val = categories[cat.key];
                      const pct = (val / 10) * 100;
                      const col = val >= 8 ? "#C8FF00" : val >= 6 ? "#FFD600" : "#FF5F5F";
                      return (
                        <div key={cat.key} className="flex items-center gap-2">
                          <span style={{ fontSize: 11, width: 20 }}>{cat.icon}</span>
                          <span style={{ color: "#44445A", fontSize: 10, width: 110 }}>
                            {cat.label}
                          </span>
                          <div
                            className="flex-1 rounded-full overflow-hidden"
                            style={{ height: 4, background: "rgba(255,255,255,0.08)" }}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5 }}
                              style={{ height: "100%", background: col, borderRadius: 99 }}
                            />
                          </div>
                          <span
                            style={{ color: col, fontSize: 11, fontWeight: 800, width: 28, textAlign: "right" }}
                          >
                            {val.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comment */}
        <div className="mb-6">
          <div
            className="flex items-center gap-2 mb-2"
            style={{ color: "#666677", fontSize: 12, fontWeight: 700 }}
          >
            <PenLine size={13} color="#666677" />
            <span>Yorumunuzu Ekleyin</span>
            <span style={{ color: "#333344", fontWeight: 400 }}>
              (İsteğe Bağlı)
            </span>
          </div>
          <motion.textarea
            animate={{
              borderColor: commentFocused
                ? "rgba(200,255,0,0.32)"
                : "rgba(255,255,255,0.07)",
            }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Maç kontrolü, kart kararları, penaltı pozisyonları hakkında görüşlerinizi yazın..."
            rows={3}
            className="w-full outline-none resize-none"
            onFocus={() => setCommentFocused(true)}
            onBlur={() => setCommentFocused(false)}
            style={{
              background: "rgba(22,22,30,0.85)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 20,
              padding: "16px 18px",
              color: "#fff",
              fontSize: 13,
              lineHeight: 1.6,
              backdropFilter: "blur(12px)",
            }}
          />
        </div>

        {/* Score summary before submit */}
        <div
          className="flex items-center justify-between px-5 py-3.5 rounded-2xl mb-4"
          style={{
            background: "rgba(22,22,30,0.85)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center gap-3">
            {[
              { label: "Genel", value: overall },
              { label: "Maç Kont.", value: categories.matchControl },
              { label: "Kartlar", value: categories.cardDecisions },
              { label: "Penaltı", value: categories.penaltyDecisions },
              { label: "Akış", value: categories.gameFlow },
            ].map((item) => {
              const col =
                item.value >= 8
                  ? "#C8FF00"
                  : item.value >= 6
                  ? "#FFD600"
                  : "#FF5F5F";
              return (
                <div key={item.label} className="text-center">
                  <div style={{ color: col, fontSize: 14, fontWeight: 900 }}>
                    {item.value.toFixed(1)}
                  </div>
                  <div style={{ color: "#333344", fontSize: 8, marginTop: 1 }}>
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-right">
            <div style={{ color: "#44445A", fontSize: 9, letterSpacing: "0.05em" }}>
              ORT.
            </div>
            <div
              style={{
                color:
                  avgScore >= 8
                    ? "#C8FF00"
                    : avgScore >= 6
                    ? "#FFD600"
                    : "#FF5F5F",
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              {avgScore.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ boxShadow: "0 0 40px rgba(200,255,0,0.4)" }}
          onClick={() => {
            saveMatchVote({
              matchId: String(matchId),
              refereeId: String(id),
              overall,
              average: avgScore,
              matchControl: categories.matchControl,
              cardDecisions: categories.cardDecisions,
              penaltyDecisions: categories.penaltyDecisions,
              gameFlow: categories.gameFlow,
              comment,
              submittedAt: new Date().toISOString(),
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              refereeName: referee.name,
              refereePhoto: referee.photo,
            });
            setSubmitted(true);
          }}
          className="w-full py-4 rounded-3xl flex items-center justify-center gap-3"
          style={{
            background: "linear-gradient(135deg, #C8FF00 0%, #AAEE00 100%)",
            boxShadow: "0 0 28px rgba(200,255,0,0.28)",
          }}
        >
          <Send size={18} color="#0A0A0F" />
          <span
            style={{
              color: "#0A0A0F",
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: "0.06em",
            }}
          >
            OYU GÖNDER
          </span>
        </motion.button>

        <p className="text-center mt-3" style={{ color: "#333344", fontSize: 10 }}>
          Her maç için 1 oy hakkınız vardır
        </p>
      </div>
    </div>
  );
}

function SubmitSuccess({
  overall,
  avgScore,
  refereeName,
  onNavigate,
}: {
  overall: number;
  avgScore: number;
  refereeName: string;
  onNavigate: () => void;
}) {
  const navigate = useNavigate();
  const color =
    overall >= 8 ? "#C8FF00" : overall >= 6 ? "#FFD600" : "#FF5F5F";

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 relative"
      style={{ background: "#0A0A0F" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 35%, ${color}10 0%, transparent 70%)`,
        }}
      />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative rounded-full p-6 mb-6"
        style={{
          background: "rgba(200,255,0,0.1)",
          border: "2px solid rgba(200,255,0,0.28)",
          backdropFilter: "blur(16px)",
        }}
      >
        <CheckCircle size={54} color="#C8FF00" strokeWidth={1.5} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="text-center"
      >
        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 900 }}>
          Oy Gönderildi!
        </h1>
        <p style={{ color: "#44445A", fontSize: 14, marginTop: 8 }}>
          {refereeName} için değerlendirmeniz kaydedildi
        </p>
      </motion.div>

      {/* Score display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.26, type: "spring", stiffness: 300 }}
        className="my-8 px-12 py-8 rounded-3xl flex flex-col items-center"
        style={{
          background: "rgba(22,22,30,0.9)",
          border: `1px solid ${color}33`,
          boxShadow: `0 0 50px ${color}12`,
          backdropFilter: "blur(16px)",
        }}
      >
        <div
          style={{
            color: "#55556A",
            fontSize: 11,
            letterSpacing: "0.07em",
            marginBottom: 4,
          }}
        >
          GENEL PERFORMANS PUANINIZ
        </div>
        <div style={{ color, fontSize: 64, fontWeight: 900, lineHeight: 1 }}>
          {overall.toFixed(1)}
        </div>
        <div style={{ color: "#44445A", fontSize: 13, marginTop: 2 }}>/ 10</div>
        {Math.abs(avgScore - overall) > 0.1 && (
          <div
            className="mt-4 px-4 py-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <span style={{ color: "#666677", fontSize: 11 }}>
              Tüm kategorilerle ort.:{" "}
              <span style={{ color: "#fff", fontWeight: 700 }}>
                {avgScore.toFixed(1)}
              </span>
            </span>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36 }}
        className="w-full max-w-xs flex flex-col gap-3"
      >
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onNavigate}
          className="w-full py-4 rounded-3xl"
          style={{
            background: "linear-gradient(135deg, #C8FF00 0%, #AAEE00 100%)",
            boxShadow: "0 0 24px rgba(200,255,0,0.24)",
          }}
        >
          <span style={{ color: "#0A0A0F", fontWeight: 900, fontSize: 15 }}>
            Hakem Profiline Git
          </span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/matches")}
          className="w-full py-3.5 rounded-3xl"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <span style={{ color: "#888899", fontSize: 14 }}>Diğer Maçları Gör</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/")}
          className="w-full py-3.5 rounded-3xl"
          style={{
            background: "transparent",
          }}
        >
          <span style={{ color: "#44445A", fontSize: 13 }}>Ana Sayfaya Dön</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
