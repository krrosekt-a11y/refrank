import { ChevronLeft, ChevronRight, Check, Globe, Trophy, Star, Medal, CircleDot, User, Building2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { competitions, matches, referees } from "../data";

const SPORT_TYPES: { id: string; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "all", label: "Tümü", icon: <Globe size={14} />, color: "#C8FF00" },
  { id: "league", label: "Ligler", icon: <Trophy size={14} />, color: "#4FA3FF" },
  { id: "international", label: "Avrupa", icon: <Star size={14} />, color: "#FFD600" },
  { id: "cup", label: "Kupalar", icon: <Medal size={14} />, color: "#FF6B35" },
];

export function SportMenuPage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState("all");
  const [selectedComp, setSelectedComp] = useState<string | null>(null);

  const filtered = competitions.filter(
    (c) => selectedType === "all" || c.type === selectedType
  );

  const getMatchCount = (compName: string) =>
    matches.filter((m) => m.league === compName).length;

  const getRefereeCount = (compName: string) => {
    const ids = new Set(matches.filter((m) => m.league === compName).map((m) => m.refereeId));
    return ids.size;
  };

  const selectedCompData = competitions.find((c) => c.id === selectedComp);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0A0A0F" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-5"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 48px)",
          paddingBottom: 12,
          backdropFilter: "blur(24px) saturate(180%)",
          background: "rgba(10,10,15,0.88)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate(-1)}
            className="flex items-center justify-center rounded-full"
            style={{ width: 38, height: 38, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ChevronLeft size={20} color="#fff" />
          </motion.button>
          <div className="flex-1">
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>Lig Seç</div>
            <div style={{ color: "#44445A", fontSize: 11 }}>Hakemlik platformu filtrele</div>
          </div>
          <div
            className="px-3 py-1.5 rounded-full"
            style={{ background: "rgba(200,255,0,0.1)", border: "1px solid rgba(200,255,0,0.25)" }}
          >
            <span style={{ color: "#C8FF00", fontSize: 11, fontWeight: 700 }}>
              {filtered.length} lig
            </span>
          </div>
        </div>

        {/* Type tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {SPORT_TYPES.map((type) => (
            <motion.button
              key={type.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => setSelectedType(type.id)}
              className="flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-full"
              style={{
                background: selectedType === type.id ? `${type.color}15` : "rgba(255,255,255,0.04)",
                border: `1px solid ${selectedType === type.id ? `${type.color}40` : "rgba(255,255,255,0.08)"}`,
                color: selectedType === type.id ? type.color : "#55556A",
                fontSize: 12,
                fontWeight: selectedType === type.id ? 700 : 500,
              }}
            >
              <span>{type.icon}</span>
              <span>{type.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedType}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            {filtered.map((comp, i) => {
              const isSelected = selectedComp === comp.id;
              const matchCount = getMatchCount(comp.name);
              const refCount = getRefereeCount(comp.name);

              return (
                <motion.button
                  key={comp.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedComp(isSelected ? null : comp.id)}
                  className="w-full text-left"
                  style={{
                    background: isSelected ? `${comp.color}08` : "rgba(22,22,30,0.9)",
                    border: `1px solid ${isSelected ? `${comp.color}35` : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 24,
                    padding: "16px 18px",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex-shrink-0 flex items-center justify-center rounded-2xl"
                      style={{
                        width: 56, height: 56,
                        background: isSelected ? `${comp.color}15` : "rgba(255,255,255,0.06)",
                        border: `1px solid ${isSelected ? `${comp.color}40` : "rgba(255,255,255,0.1)"}`,
                        fontSize: 26,
                      }}
                    >
                      {comp.logo}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div style={{ color: isSelected ? "#fff" : "#ccccdd", fontSize: 15, fontWeight: 700 }}>
                        {comp.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
                          {comp.flag} {comp.country}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded-full"
                          style={{ background: `${comp.color}15`, color: comp.color, fontSize: 9, fontWeight: 700 }}
                        >
                          {comp.season}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span style={{ color: "#44445A", fontSize: 11 }}>
                          <CircleDot size={11} color="#44445A" style={{ display: "inline", marginRight: 2 }} />
                          {matchCount} maç
                        </span>
                        <span style={{ color: "#44445A", fontSize: 11 }}>
                          <User size={11} color="#44445A" style={{ display: "inline", marginRight: 2 }} />
                          {refCount} hakem
                        </span>
                        <span style={{ color: "#44445A", fontSize: 11 }}>
                          <Building2 size={11} color="#44445A" style={{ display: "inline", marginRight: 2 }} />
                          {comp.teams} takım
                        </span>
                      </div>
                    </div>

                    <motion.div
                      animate={{
                        background: isSelected ? comp.color : "rgba(255,255,255,0.06)",
                      }}
                      className="flex-shrink-0 flex items-center justify-center rounded-full"
                      style={{ width: 32, height: 32, border: "1px solid rgba(255,255,255,0.15)" }}
                    >
                      {isSelected ? (
                        <Check size={16} color="#0A0A0F" strokeWidth={2.5} />
                      ) : (
                        <ChevronRight size={16} color="#44445A" />
                      )}
                    </motion.div>
                  </div>

                  {/* Expanded: referees in this league */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="mt-4 pt-4 flex flex-col gap-2"
                          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 4 }}>
                            LİGDEKİ HAKEMLER
                          </div>
                          {referees
                            .filter((r) => r.league === comp.name || (comp.name.includes("Şampiyonlar") && r.league === "UEFA Pro"))
                            .slice(0, 3)
                            .map((ref) => {
                              const scoreColor = ref.careerScore >= 8 ? "#C8FF00" : ref.careerScore >= 6 ? "#FFD600" : "#FF5F5F";
                              return (
                                <motion.button
                                  key={ref.id}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={(e) => { e.stopPropagation(); navigate(`/referee/${ref.id}`); }}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
                                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                                >
                                  <img
                                    src={ref.photo}
                                    alt={ref.name}
                                    className="rounded-full object-cover flex-shrink-0"
                                    style={{ width: 34, height: 34, border: `1.5px solid ${scoreColor}44` }}
                                  />
                                  <div className="flex-1">
                                    <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{ref.name}</div>
                                    <div style={{ color: "#44445A", fontSize: 10 }}>{ref.matches} maç · {ref.accuracy}%</div>
                                  </div>
                                  <div style={{ color: scoreColor, fontSize: 16, fontWeight: 900 }}>
                                    {ref.careerScore.toFixed(1)}
                                  </div>
                                </motion.button>
                              );
                            })}
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => { e.stopPropagation(); navigate("/referees"); }}
                            className="flex items-center justify-center gap-1 py-2 rounded-xl"
                            style={{ background: `${comp.color}10`, border: `1px solid ${comp.color}25` }}
                          >
                            <span style={{ color: comp.color, fontSize: 12, fontWeight: 700 }}>
                              Tüm Hakemleri Gör
                            </span>
                            <ChevronRight size={12} color={comp.color} />
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky apply button */}
      {selectedComp && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4"
          style={{ maxWidth: 430, width: "100%", zIndex: 50 }}
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${selectedCompData?.color ?? "#C8FF00"} 0%, ${selectedCompData?.color ?? "#a8e000"}bb 100%)`,
              boxShadow: `0 8px 24px ${selectedCompData?.color ?? "#C8FF00"}30`,
            }}
          >
            <span style={{ color: "#0A0A0F", fontSize: 15, fontWeight: 800 }}>
              {selectedCompData?.name} ile Filtrele
            </span>
            <ChevronRight size={16} color="#0A0A0F" strokeWidth={2.5} />
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}