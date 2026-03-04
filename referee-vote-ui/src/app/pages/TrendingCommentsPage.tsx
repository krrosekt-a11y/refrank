import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ThumbsUp, MessageCircle, TrendingUp } from "lucide-react";
import { trendingComments, referees } from "../data";
import { motion } from "motion/react";

function getReferee(id: string) {
  return referees.find((r) => r.id === id);
}

const FILTERS = ["Tümü", "En Çok Beğenilen", "En Yüksek Puan", "En Düşük Puan"];

export function TrendingCommentsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("Tümü");

  const sorted = [...trendingComments].sort((a, b) => {
    if (activeFilter === "En Çok Beğenilen") return b.likes - a.likes;
    if (activeFilter === "En Yüksek Puan") return b.score - a.score;
    if (activeFilter === "En Düşük Puan") return a.score - b.score;
    return b.likes - a.likes;
  });

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100%" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 48px)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          background: "rgba(10,10,15,0.88)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3 px-5 pb-3">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate(-1)}
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              width: 38,
              height: 38,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <ChevronLeft size={20} color="#fff" />
          </motion.button>

          <div className="flex-1">
            <div
              className="flex items-center gap-2"
              style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}
            >
              <TrendingUp size={20} color="#C8FF00" />
              Trend Yorumlar
            </div>
            <div style={{ color: "#44445A", fontSize: 11 }}>
              {sorted.length} yorum listeleniyor
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div
          className="flex gap-2 px-5 pb-3 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {FILTERS.map((f) => (
            <motion.button
              key={f}
              whileTap={{ scale: 0.92 }}
              onClick={() => setActiveFilter(f)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full"
              style={{
                background:
                  activeFilter === f
                    ? "rgba(200,255,0,0.15)"
                    : "rgba(255,255,255,0.05)",
                border:
                  activeFilter === f
                    ? "1px solid rgba(200,255,0,0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
                color: activeFilter === f ? "#C8FF00" : "#55556A",
                fontSize: 11,
                fontWeight: activeFilter === f ? 700 : 500,
                whiteSpace: "nowrap",
              }}
            >
              {f}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-32 flex flex-col gap-3">
        {sorted.map((comment, i) => {
          const ref = getReferee(comment.refereeId);
          const scoreColor =
            comment.score >= 8
              ? "#C8FF00"
              : comment.score >= 6
              ? "#FFD600"
              : "#FF5F5F";

          return (
            <motion.button
              key={comment.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/referee/${comment.refereeId}`)}
              className="w-full text-left"
              style={{
                background: "rgba(22,22,30,0.9)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 22,
                padding: "16px 18px",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Top row: rank badge + user */}
              <div className="flex items-start gap-3">
                {/* Rank */}
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-full"
                  style={{
                    width: 32,
                    height: 32,
                    background: "rgba(200,255,0,0.08)",
                    border: "1px solid rgba(200,255,0,0.18)",
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#C8FF00",
                  }}
                >
                  #{i + 1}
                </div>

                {/* Avatar */}
                <div
                  className="flex-shrink-0 rounded-full flex items-center justify-center"
                  style={{
                    width: 42,
                    height: 42,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontSize: 20,
                  }}
                >
                  {comment.userAvatar}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                      {comment.userName}
                    </span>
                    <span style={{ color: "#333344", fontSize: 10 }}>
                      {comment.time}
                    </span>
                  </div>

                  {/* Referee tag */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <img
                      src={ref?.photo}
                      alt=""
                      className="rounded-full object-cover"
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ color: "#44445A", fontSize: 10 }}>
                      {ref?.name}
                    </span>
                    <div
                      className="px-2 py-0.5 rounded-full ml-1"
                      style={{ background: `${scoreColor}18` }}
                    >
                      <span
                        style={{
                          color: scoreColor,
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        {comment.score.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <p
                    style={{ color: "#aaaacc", fontSize: 13, lineHeight: 1.55 }}
                  >
                    {comment.text}
                  </p>
                </div>
              </div>

              {/* Bottom stats */}
              <div
                className="flex items-center gap-4 mt-3 pt-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="flex items-center gap-1.5">
                  <ThumbsUp size={13} color="#44445A" />
                  <span style={{ color: "#888899", fontSize: 12, fontWeight: 600 }}>
                    {comment.likes.toLocaleString("tr")} beğeni
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageCircle size={13} color="#44445A" />
                  <span style={{ color: "#44445A", fontSize: 11 }}>
                    Hakemi gör →
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}

        {/* Empty padding card */}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center py-20 gap-3">
            <MessageCircle size={48} color="#44445A" />
            <div style={{ color: "#44445A", fontSize: 14 }}>
              Henüz yorum yok
            </div>
          </div>
        )}
      </div>
    </div>
  );
}