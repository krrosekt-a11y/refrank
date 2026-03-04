import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Bell, Radio, Star, MessageCircle, TrendingUp, ChevronRight } from "lucide-react";

const notifOptions = [
  {
    id: "live",
    icon: Radio,
    color: "#FF5F5F",
    bg: "rgba(255,95,95,0.1)",
    border: "rgba(255,95,95,0.25)",
    title: "Canlı Maç Bildirimleri",
    desc: "Maç başlarken ve kritik anlarda anında haber al",
  },
  {
    id: "vote",
    icon: Star,
    color: "#C8FF00",
    bg: "rgba(200,255,0,0.08)",
    border: "rgba(200,255,0,0.22)",
    title: "Oy Hatırlatıcıları",
    desc: "Maç bitince hakem için oy kullanmayı unutma",
  },
  {
    id: "comments",
    icon: MessageCircle,
    color: "#4FA3FF",
    bg: "rgba(79,163,255,0.1)",
    border: "rgba(79,163,255,0.25)",
    title: "Yorum Etkileşimleri",
    desc: "Yorumlarına beğeni ve cevap gelince bildir",
  },
  {
    id: "weekly",
    icon: TrendingUp,
    color: "#FFD600",
    bg: "rgba(255,214,0,0.08)",
    border: "rgba(255,214,0,0.22)",
    title: "Haftalık Özet",
    desc: "Her Pazartesi haftanın hakem özetini al",
  },
];

export function NotificationsPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(["live", "vote"]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    navigate("/onboarding/teams");
  };

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "#0A0A0F" }}
    >
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
            boxShadow: "0 0 40px rgba(200,255,0,0.15)",
            backdropFilter: "blur(20px)",
          }}
        >
          <Bell size={44} color="#C8FF00" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 8 }}
        >
          Bildirimleri Ayarla
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 1.6 }}
        >
          Hangi bildirimleri almak istediğini seç. İstediğin zaman ayarlardan değiştirebilirsin.
        </motion.p>
      </div>

      {/* Options */}
      <div className="flex-1 px-5 flex flex-col gap-3">
        {notifOptions.map((opt, i) => {
          const Icon = opt.icon;
          const isOn = selected.includes(opt.id);
          return (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggle(opt.id)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left"
              style={{
                background: isOn ? opt.bg : "rgba(255,255,255,0.04)",
                border: `1px solid ${isOn ? opt.border : "rgba(255,255,255,0.08)"}`,
                transition: "all 0.2s",
              }}
            >
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-xl"
                style={{
                  width: 48,
                  height: 48,
                  background: isOn ? opt.bg : "rgba(255,255,255,0.06)",
                  border: `1px solid ${isOn ? opt.border : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <Icon size={22} color={isOn ? opt.color : "#44445A"} />
              </div>

              <div className="flex-1 min-w-0">
                <div style={{ color: isOn ? "#fff" : "#888899", fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
                  {opt.title}
                </div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, lineHeight: 1.4 }}>
                  {opt.desc}
                </div>
              </div>

              {/* Toggle */}
              <motion.div
                animate={{
                  background: isOn ? opt.color : "rgba(255,255,255,0.12)",
                }}
                className="flex-shrink-0 relative"
                style={{ width: 46, height: 26, borderRadius: 13 }}
              >
                <motion.div
                  animate={{ x: isOn ? 22 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{
                    position: "absolute",
                    top: 3,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  }}
                />
              </motion.div>
            </motion.button>
          );
        })}

        {/* Bell permission notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-start gap-3 px-4 py-3 rounded-2xl mt-1"
          style={{
            background: "rgba(200,255,0,0.04)",
            border: "1px solid rgba(200,255,0,0.1)",
          }}
        >
          <Bell size={16} color="#C8FF00" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, lineHeight: 1.5 }}>
            Bildirimleri etkinleştirmek için sistem izni gerekebilir. Devam ettiğinde izin isteyeceğiz.
          </p>
        </motion.div>
      </div>

      {/* Bottom */}
      <div className="px-5 pb-14 pt-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleContinue}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #C8FF00 0%, #a8e000 100%)",
            boxShadow: "0 8px 24px rgba(200,255,0,0.25)",
          }}
        >
          <span style={{ color: "#0A0A0F", fontSize: 16, fontWeight: 800 }}>
            Devam Et
          </span>
          <ChevronRight size={18} color="#0A0A0F" strokeWidth={2.5} />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleContinue}
          className="w-full text-center mt-3 py-2"
          style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}
        >
          Şimdi değil
        </motion.button>
      </div>
    </div>
  );
}