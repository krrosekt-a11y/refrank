import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Referee } from "../data";
import { HexRating } from "./HexRating";
import { ChevronRight, Heart } from "lucide-react";
import { motion } from "motion/react";
import { isFavoriteReferee, toggleFavoriteReferee } from "../lib/favorites";

interface RefereeCardProps {
  referee: Referee;
  rank?: number;
}

const rankColors: Record<number, string> = {
  1: "#FFD600",
  2: "#C0C0C0",
  3: "#CD7F32",
};

export function RefereeCard({ referee, rank }: RefereeCardProps) {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const rankColor = rank ? rankColors[rank] ?? "#C8FF00" : "#C8FF00";
  const isTop3 = rank !== undefined && rank <= 3;

  useEffect(() => {
    setIsFavorite(isFavoriteReferee(referee.id));
  }, [referee.id]);

  return (
    <motion.button
      whileTap={{ scale: 0.975 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      onClick={() => navigate(`/referee/${referee.id}`)}
      className="w-full text-left flex items-center gap-3 mb-2.5"
      style={{
        background: isTop3
          ? `linear-gradient(135deg, rgba(26,26,34,0.95) 0%, rgba(22,22,30,0.95) 100%)`
          : "rgba(20,20,28,0.85)",
        border: isTop3
          ? `1px solid ${rankColor}28`
          : "1px solid rgba(255,255,255,0.07)",
        borderRadius: 24,
        padding: "14px 16px",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Rank badge */}
      {rank !== undefined && (
        <div
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: isTop3 ? `${rankColor}18` : "rgba(200,255,0,0.08)",
            border: isTop3 ? `1.5px solid ${rankColor}44` : "1.5px solid rgba(200,255,0,0.16)",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: isTop3 ? rankColor : "#C8FF00",
              fontWeight: 800,
            }}
          >
            #{rank}
          </span>
        </div>
      )}

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <img
          src={referee.photo}
          alt={referee.name}
          className="rounded-full object-cover"
          style={{
            width: 52,
            height: 52,
            border: `2px solid ${isTop3 ? rankColor + "55" : "rgba(200,255,0,0.22)"}`,
          }}
        />
        <div
          className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center"
          style={{
            width: 18,
            height: 18,
            background: "rgba(10,10,15,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: 10,
          }}
        >
          {referee.flag}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
            {referee.name}
          </span>
        </div>
        <div className="flex gap-3" style={{ fontSize: 11, color: "#666677" }}>
          <span>
            <span style={{ color: "#C8FF00" }}>▪</span>{" "}
            {referee.matches} Maç
          </span>
          <span>
            <span style={{ color: "#FFD700" }}>■</span>{" "}
            {referee.yellowCardsPerMatch.toFixed(1)}/m
          </span>
          <span>
            <span style={{ color: "#FF4444" }}>■</span>{" "}
            {referee.redCardsPerMatch.toFixed(1)}/m
          </span>
        </div>
        <div
          className="mt-1 flex items-center gap-1"
          style={{ fontSize: 11, color: "#44445A" }}
        >
          <span style={{ color: "#C8FF00", fontWeight: 600 }}>
            {referee.totalRatings.toLocaleString("tr")}
          </span>{" "}
          oy
        </div>
      </div>

      {/* Score hex */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorite(toggleFavoriteReferee(referee.id));
          }}
          className="flex items-center justify-center rounded-full"
          style={{
            width: 28,
            height: 28,
            background: isFavorite ? "rgba(255,95,95,0.14)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${isFavorite ? "rgba(255,95,95,0.45)" : "rgba(255,255,255,0.1)"}`,
          }}
          aria-label={isFavorite ? "Favoriden çıkar" : "Favoriye ekle"}
        >
          <Heart
            size={14}
            color={isFavorite ? "#FF5F5F" : "#66708A"}
            fill={isFavorite ? "#FF5F5F" : "none"}
          />
        </button>
        <HexRating score={referee.careerScore} size="sm" />
        <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
      </div>
    </motion.button>
  );
}
