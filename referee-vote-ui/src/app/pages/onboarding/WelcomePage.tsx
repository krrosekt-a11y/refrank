import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, CircleDot, BarChart3, Trophy, MessageCircle } from "lucide-react";

const slides = [
  {
    icon: <CircleDot size={64} color="#C8FF00" />,
    bg: "rgba(200,255,0,0.08)",
    border: "rgba(200,255,0,0.25)",
    accent: "#C8FF00",
    title: "Hakemleri Gerçek Zamanlı Puanla",
    desc: "Maç sırasında veya sonrasında hakemin performansını 5 farklı kategoride değerlendir. Sesini duyur!",
  },
  {
    icon: <BarChart3 size={64} color="#4FA3FF" />,
    bg: "rgba(79,163,255,0.08)",
    border: "rgba(79,163,255,0.25)",
    accent: "#4FA3FF",
    title: "İstatistiklerle Desteklenmiş Analiz",
    desc: "Kart kararları, penaltılar ve oyun akışı gibi detaylı kategorilerle derinlemesine analiz yap.",
  },
  {
    icon: <Trophy size={64} color="#FFD600" />,
    bg: "rgba(255,214,0,0.08)",
    border: "rgba(255,214,0,0.25)",
    accent: "#FFD600",
    title: "Liderlik Tablosunu Takip Et",
    desc: "Haftanın en iyi ve en kötü hakemlerini keşfet. Toplulukla birlikte hakemlik standartlarını yükselt.",
  },
  {
    icon: <MessageCircle size={64} color="#C8FF00" />,
    bg: "rgba(200,255,0,0.08)",
    border: "rgba(200,255,0,0.25)",
    accent: "#C8FF00",
    title: "Tartışmalara Katıl",
    desc: "Diğer taraftarların yorumlarına beğeni ekle, kendi analizini paylaş ve futbol camiasıyla buluş.",
  },
];

export function WelcomePage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  const next = () => {
    if (isLast) {
      navigate("/onboarding/notifications");
    } else {
      setCurrent((c) => c + 1);
    }
  };

  return (
    <div
      className="flex flex-col min-h-screen relative overflow-hidden"
      style={{ background: "#0A0A0F" }}
    >
      {/* Background glow */}
      <motion.div
        key={current}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 30%, ${slide.accent}08 0%, transparent 70%)`,
        }}
      />

      {/* Skip button */}
      <div className="flex justify-end px-6 pt-16 relative z-10">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate("/onboarding/notifications")}
          style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}
        >
          Geç
        </motion.button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col items-center text-center"
          >
            {/* Emoji card */}
            <motion.div
              initial={{ scale: 0.7, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
              className="flex items-center justify-center mb-10"
              style={{
                width: 140,
                height: 140,
                borderRadius: 40,
                background: slide.bg,
                border: `1.5px solid ${slide.border}`,
                boxShadow: `0 0 60px ${slide.accent}12`,
              }}
            >
              {slide.icon}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              style={{
                color: "#fff",
                fontSize: 26,
                fontWeight: 800,
                lineHeight: 1.2,
                marginBottom: 16,
              }}
            >
              {slide.title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 15,
                lineHeight: 1.65,
                maxWidth: 300,
              }}
            >
              {slide.desc}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom area */}
      <div className="px-6 pb-14 relative z-10">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => setCurrent(i)}
              animate={{
                width: i === current ? 24 : 8,
                background: i === current ? slide.accent : "rgba(255,255,255,0.18)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ height: 8, borderRadius: 4 }}
            />
          ))}
        </div>

        {/* CTA button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={next}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${slide.accent} 0%, ${slide.accent}bb 100%)`,
            boxShadow: `0 8px 24px ${slide.accent}30`,
          }}
        >
          <span style={{ color: "#0A0A0F", fontSize: 16, fontWeight: 800 }}>
            {isLast ? "Hadi Başlayalım" : "Devam Et"}
          </span>
          <ChevronRight size={18} color="#0A0A0F" strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
}