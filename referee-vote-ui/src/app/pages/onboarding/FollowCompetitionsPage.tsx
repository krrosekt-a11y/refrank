import { useState } from "react";
import { ChevronRight, Check, Trophy } from "lucide-react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { competitions } from "../../data";

const typeLabels: Record<string, string> = {
  league: "Lig",
  cup: "Kupa",
  international: "Avrupa",
};

export function FollowCompetitionsPage() {
  const navigate = useNavigate();
  const [followed, setFollowed] = useState<string[]>(["c1"]);

  const toggle = (id: string) => {
    setFollowed((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    localStorage.setItem("refscore_onboarded", "true");
    navigate("/auth/signup");
  };

  const typeOrder = ["league", "international", "cup"];
  const grouped = typeOrder.map((type) => ({
    type,
    label: type === "league" ? "Ligler" : type === "international" ? "Avrupa Kupaları" : "Ulusal Kupalar",
    items: competitions.filter((c) => c.type === type),
  }));

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0A0A0F" }}>
      {/* Header */}
      <div className="px-6 pt-20 pb-6">
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
          <Trophy size={44} color="#C8FF00" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 6 }}
        >
          Ligleri Takip Et
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 1.6 }}
        >
          İlgilendiğin liglerin maçlarını ve hakem performanslarını ana sayfanda gör.
        </motion.p>
      </div>

      {/* Competition groups */}
      <div className="flex-1 px-5 overflow-y-auto pb-4">
        {grouped.map((group, gi) => (
          <div key={group.type} className="mb-5">
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: gi * 0.08 }}
              className="flex items-center gap-2 mb-3"
            >
              <div style={{ width: 3, height: 16, borderRadius: 2, background: "#C8FF00" }} />
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>
                {group.label.toUpperCase()}
              </span>
            </motion.div>

            <div className="flex flex-col gap-2">
              {group.items.map((comp, i) => {
                const isFollowed = followed.includes(comp.id);
                return (
                  <motion.button
                    key={comp.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gi * 0.08 + i * 0.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggle(comp.id)}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-left"
                    style={{
                      background: isFollowed
                        ? `${comp.color}10`
                        : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isFollowed ? `${comp.color}35` : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    {/* Logo */}
                    <div
                      className="flex-shrink-0 flex items-center justify-center rounded-xl"
                      style={{
                        width: 48, height: 48,
                        background: isFollowed ? `${comp.color}15` : "rgba(255,255,255,0.06)",
                        border: `1px solid ${isFollowed ? `${comp.color}40` : "rgba(255,255,255,0.1)"}`,
                        fontSize: 22,
                      }}
                    >
                      {comp.logo}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div style={{ color: isFollowed ? "#fff" : "#888899", fontSize: 14, fontWeight: 700 }}>
                        {comp.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
                          {comp.flag} {comp.country}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded-full"
                          style={{
                            background: `${comp.color}15`,
                            color: comp.color,
                            fontSize: 9,
                            fontWeight: 700,
                          }}
                        >
                          {typeLabels[comp.type]}
                        </span>
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 1 }}>
                        {comp.teams} takım · {comp.season}
                      </div>
                    </div>

                    {/* Check circle */}
                    <motion.div
                      animate={{
                        background: isFollowed ? comp.color : "rgba(255,255,255,0.06)",
                        borderColor: isFollowed ? "rgba(0,0,0,0)" : "rgba(255,255,255,0.15)",
                      }}
                      className="flex-shrink-0 flex items-center justify-center rounded-full"
                      style={{ width: 30, height: 30, border: "1px solid" }}
                    >
                      {isFollowed && <Check size={14} color="#0A0A0F" strokeWidth={3} />}
                    </motion.div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="px-5 pb-14 pt-2">
        {followed.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {followed.slice(0, 4).map((id) => {
              const comp = competitions.find((c) => c.id === id);
              return comp ? (
                <span key={id} style={{ fontSize: 16 }}>{comp.logo}</span>
              ) : null;
            })}
            {followed.length > 4 && (
              <span style={{ color: "#C8FF00", fontSize: 12, fontWeight: 700 }}>
                +{followed.length - 4}
              </span>
            )}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleFinish}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #C8FF00 0%, #a8e000 100%)",
            boxShadow: "0 8px 24px rgba(200,255,0,0.25)",
          }}
        >
          <span style={{ color: "#0A0A0F", fontSize: 16, fontWeight: 800 }}>
            Hesap Oluştur
          </span>
          <ChevronRight size={18} color="#0A0A0F" strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
}
