import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Award, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { HexRating } from "../components/HexRating";
import type { Referee } from "../data";
import { fetchDbReferees } from "../lib/localdbApi";

export function LeaderboardPage() {
  const navigate = useNavigate();
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchDbReferees(200)
      .then((d) => {
        if (alive) setReferees(d);
      })
      .catch(() => {
        if (alive) setReferees([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const sorted = useMemo(
    () => [...referees].sort((a, b) => b.careerScore - a.careerScore),
    [referees]
  );

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100%" }}>
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
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Award size={22} color="#C8FF00" />
            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px" }}>
              Liderlik Tablosu
            </h1>
          </div>
          <p style={{ color: "#68768f", fontSize: 12 }}>Trendyol Süper Lig hakem sıralaması</p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8">
        {loading ? (
          <div style={{ color: "#68768f", fontSize: 12 }}>Veriler yükleniyor...</div>
        ) : (
          sorted.map((ref, idx) => {
            const medalColors: Record<number, string> = {
              0: "#FFD600",
              1: "#C0C0C0",
              2: "#CD7F32",
            };
            const mColor = medalColors[idx] ?? "rgba(255,255,255,0.15)";
            const isTop = idx < 3;
            return (
              <motion.button
                key={ref.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                whileTap={{ scale: 0.975 }}
                onClick={() => navigate(`/referee/${ref.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-3xl mb-2.5"
                style={{
                  background: isTop
                    ? "linear-gradient(135deg, rgba(26,26,34,0.95) 0%, rgba(20,20,28,0.95) 100%)"
                    : "rgba(18,18,26,0.85)",
                  border: isTop
                    ? `1px solid ${mColor}28`
                    : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    background: isTop ? `${mColor}18` : "rgba(255,255,255,0.06)",
                    border: `1.5px solid ${isTop ? mColor + "44" : "transparent"}`,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800, color: isTop ? mColor : "#44445A" }}>
                    {idx + 1}
                  </span>
                </div>
                <img
                  src={ref.photo}
                  alt={ref.name}
                  className="rounded-full object-cover flex-shrink-0"
                  style={{
                    width: 42,
                    height: 42,
                    border: `2px solid ${isTop ? mColor + "55" : "rgba(255,255,255,0.1)"}`,
                  }}
                />
                <div className="flex-1 min-w-0 text-left">
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{ref.name}</div>
                  <div style={{ color: "#6f7b92", fontSize: 11 }}>
                    {ref.matches} maç · Sarı/Maç {ref.yellowCardsPerMatch.toFixed(2)} · Kırmızı/Maç {ref.redCardsPerMatch.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <HexRating score={ref.careerScore} size="sm" />
                  <ChevronRight size={14} color="rgba(255,255,255,0.18)" />
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}

