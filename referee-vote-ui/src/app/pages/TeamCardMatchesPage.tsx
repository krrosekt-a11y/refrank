import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { fetchDbRefereeTeamMatches, type TeamMatchCard } from "../lib/localdbApi";

export function TeamCardMatchesPage() {
  const navigate = useNavigate();
  const { id, team } = useParams();
  const decodedTeam = decodeURIComponent(team || "");
  const [rows, setRows] = useState<TeamMatchCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !team) return;
    let alive = true;
    fetchDbRefereeTeamMatches(id, decodedTeam)
      .then((d) => {
        if (alive) setRows(d);
      })
      .catch(() => {
        if (alive) setRows([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, team, decodedTeam]);

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100%" }}>
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
        <div className="px-5 pb-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center rounded-full"
            style={{ width: 38, height: 38, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ArrowLeft size={18} color="#fff" />
          </button>
          <div>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>{decodedTeam}</div>
            <div style={{ color: "#74839d", fontSize: 11 }}>Kart görülen maçlar</div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8">
        {loading ? (
          <div style={{ color: "#74839d", fontSize: 12 }}>Yükleniyor...</div>
        ) : rows.length === 0 ? (
          <div style={{ color: "#74839d", fontSize: 12 }}>Maç bulunamadı</div>
        ) : (
          rows.map((m, i) => (
            <motion.div
              key={`${m.id}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="mb-2 p-3 rounded-2xl"
              style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div style={{ color: "#C8FF00", fontSize: 10, fontWeight: 700 }}>{m.league}</div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                {m.homeTeam} - {m.awayTeam}
              </div>
              <div style={{ color: "#aab4c9", fontSize: 12 }}>{m.score} · {m.date}</div>
              <div style={{ color: "#9cb0d3", fontSize: 11, marginTop: 5, fontWeight: 700 }}>
                Seçili Takım Kartları
              </div>
              <div style={{ color: "#8090aa", fontSize: 11, marginTop: 2 }}>
                Sarı: {m.yellow_cards} · Sarıdan Kırmızı: {m.second_yellow_red_cards} · Kırmızı: {m.red_cards}
              </div>
              <div style={{ color: "#8ea0bf", fontSize: 11, marginTop: 5, fontWeight: 700 }}>
                Rakip Takım Kartları
              </div>
              <div style={{ color: "#8090aa", fontSize: 11, marginTop: 2 }}>
                Sarı: {m.opp_yellow_cards} · Sarıdan Kırmızı: {m.opp_second_yellow_red_cards} · Kırmızı: {m.opp_red_cards}
              </div>
              <div style={{ color: "#69758a", fontSize: 10, marginTop: 2 }}>
                {m.is_home ? "Bu takım ev sahibi" : "Bu takım deplasman"}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
