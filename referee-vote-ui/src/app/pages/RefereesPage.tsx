import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Search, SlidersHorizontal, ChevronLeft, Users, SearchX } from "lucide-react";
import type { Referee } from "../data";
import { RefereeCard } from "../components/RefereeCard";
import { motion, AnimatePresence } from "motion/react";
import { fetchDbReferees } from "../lib/localdbApi";

const FILTERS = ["Tümü", "En Yüksek", "En Düşük", "Süper Lig", "UEFA Pro"];

export function RefereesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState("Tümü");
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchDbReferees(180)
      .then((list) => {
        if (alive) setReferees(list);
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

  const filtered = [...referees]
    .filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (activeFilter === "Süper Lig") return r.league === "Süper Lig";
      if (activeFilter === "UEFA Pro") return r.league === "UEFA Pro";
      return true;
    })
    .sort((a, b) => {
      if (activeFilter === "En Yüksek") return b.careerScore - a.careerScore;
      if (activeFilter === "En Düşük") return a.careerScore - b.careerScore;
      return b.careerScore - a.careerScore;
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
              <Users size={20} color="#C8FF00" />
              Hakem Listesi
            </div>
            <div style={{ color: "#44445A", fontSize: 11 }}>
              {filtered.length} hakem listeleniyor
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <motion.div
            animate={{
              borderColor: searchFocused
                ? "rgba(200,255,0,0.35)"
                : "rgba(255,255,255,0.08)",
            }}
            className="flex items-center gap-3 px-4"
            style={{
              height: 46,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 23,
              backdropFilter: "blur(12px)",
            }}
          >
            <Search size={16} color={searchFocused ? "#C8FF00" : "#44445A"} />
            <input
              type="text"
              placeholder="Hakem ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 bg-transparent outline-none"
              style={{ color: "#fff", fontSize: 14 }}
            />
            {search ? (
              <button
                onClick={() => setSearch("")}
                style={{ color: "#44445A", fontSize: 18 }}
              >
                <SearchX size={18} color="#44445A" />
              </button>
            ) : (
              <SlidersHorizontal size={15} color="#44445A" />
            )}
          </motion.div>
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

      <div className="px-4 pt-4 pb-32">
        {loading && (
          <div className="py-3" style={{ color: "#666677", fontSize: 12 }}>
            Veriler yükleniyor...
          </div>
        )}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <SearchX size={48} color="#44445A" />
              <div style={{ color: "#44445A", fontSize: 14, textAlign: "center" }}>
                Hakem bulunamadı
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {filtered.map((ref, idx) => (
                <motion.div
                  key={ref.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <RefereeCard referee={ref} rank={idx + 1} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
