import { useState } from "react";
import { ChevronRight, Search, Building2 } from "lucide-react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { teams } from "../../data";

export function FollowTeamsPage() {
  const navigate = useNavigate();
  const [followed, setFollowed] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.league.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    setFollowed((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const formatFollowers = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0A0A0F" }}>
      {/* Header */}
      <div className="px-6 pt-20 pb-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="flex items-center justify-center mb-6"
          style={{
            width: 96, height: 96, borderRadius: 28,
            background: "rgba(200,255,0,0.1)",
            border: "1.5px solid rgba(200,255,0,0.35)",
            backdropFilter: "blur(20px)",
          }}
        >
          <Building2 size={44} color="#C8FF00" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 6 }}
        >
          Takımları Takip Et
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}
        >
          Favori takımlarının maçlarında atanan hakemleri anlık takip et.
        </motion.p>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 px-4"
          style={{
            height: 44, background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 22,
          }}
        >
          <Search size={15} color="#44445A" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Takım ara..."
            className="flex-1 bg-transparent outline-none"
            style={{ color: "#fff", fontSize: 14 }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ color: "#44445A", fontSize: 18 }}>×</button>
          )}
        </motion.div>
      </div>

      {/* Selected count */}
      {followed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 mb-2 py-2 px-4 rounded-2xl flex items-center gap-2"
          style={{ background: "rgba(200,255,0,0.08)", border: "1px solid rgba(200,255,0,0.2)" }}
        >
          <span style={{ color: "#C8FF00", fontSize: 13, fontWeight: 700 }}>
            {followed.length} takım seçildi
          </span>
        </motion.div>
      )}

      {/* Team list */}
      <div className="flex-1 px-5 flex flex-col gap-2 pb-4 overflow-y-auto">
        {filtered.map((team, i) => {
          const isFollowed = followed.includes(team.id);
          return (
            <motion.button
              key={team.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggle(team.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
              style={{
                background: isFollowed
                  ? `${team.color}12`
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${isFollowed ? `${team.color}40` : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {/* Logo */}
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-xl"
                style={{
                  width: 46, height: 46,
                  background: isFollowed ? `${team.color}18` : "rgba(255,255,255,0.06)",
                  border: `1px solid ${isFollowed ? `${team.color}44` : "rgba(255,255,255,0.1)"}`,
                  fontSize: 22,
                }}
              >
                {team.logo}
              </div>

              <div className="flex-1 min-w-0">
                <div style={{ color: isFollowed ? "#fff" : "#888899", fontSize: 14, fontWeight: 700 }}>
                  {team.name}
                </div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
                  {team.flag} {team.league} · {formatFollowers(team.followers)} takipçi
                </div>
              </div>

              {/* Follow button */}
              <motion.div
                animate={{
                  background: isFollowed ? team.color : "rgba(255,255,255,0.08)",
                  borderColor: isFollowed ? "rgba(0,0,0,0)" : "rgba(255,255,255,0.15)",
                }}
                className="flex-shrink-0 px-3 py-1.5 rounded-full"
                style={{ border: "1px solid" }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isFollowed ? "#0A0A0F" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {isFollowed ? "Takip" : "+ Takip"}
                </span>
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="px-5 pb-14 pt-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/onboarding/competitions")}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #C8FF00 0%, #a8e000 100%)",
            boxShadow: "0 8px 24px rgba(200,255,0,0.25)",
          }}
        >
          <span style={{ color: "#0A0A0F", fontSize: 16, fontWeight: 800 }}>
            {followed.length > 0 ? `${followed.length} Takım Seç & Devam` : "Atla"}
          </span>
          <ChevronRight size={18} color="#0A0A0F" strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
}