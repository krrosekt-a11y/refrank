import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { CircleDot, Trophy, MessageCircle, Bell, Sparkles } from "lucide-react";

const perks = [
  { icon: <CircleDot size={18} color="#C8FF00" />, text: "Hakemleri puanla ve değerlendir" },
  { icon: <Trophy size={18} color="#C8FF00" />, text: "Liderlik tablosunu takip et" },
  { icon: <MessageCircle size={18} color="#C8FF00" />, text: "Topluluğa yorum yaz" },
  { icon: <Bell size={18} color="#C8FF00" />, text: "Canlı maç bildirimleri al" },
];

export function AccountSuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate("/"), 4000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 relative overflow-hidden"
      style={{ background: "#0A0A0F" }}
    >
      {/* Background glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute pointer-events-none"
        style={{
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,255,0,0.1) 0%, transparent 65%)",
        }}
      />

      {/* Confetti particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: -20, x: (i - 6) * 30, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            y: [0, 80 + Math.random() * 120],
            x: [(i - 6) * 30, (i - 6) * 30 + (Math.random() - 0.5) * 60],
            scale: [0, 1, 0.5],
            rotate: [0, 360],
          }}
          transition={{ delay: 0.3 + i * 0.07, duration: 1.8, ease: "easeOut" }}
          className="absolute top-1/3"
          style={{
            width: 10, height: 10,
            borderRadius: i % 3 === 0 ? "50%" : i % 3 === 1 ? 2 : 0,
            background: i % 4 === 0 ? "#C8FF00" : i % 4 === 1 ? "#4FA3FF" : i % 4 === 2 ? "#FF5F5F" : "#FFD600",
          }}
        />
      ))}

      {/* Check badge */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 16 }}
        className="flex items-center justify-center mb-6 relative z-10"
        style={{
          width: 100, height: 100, borderRadius: 30,
          background: "rgba(200,255,0,0.12)",
          border: "2px solid rgba(200,255,0,0.4)",
          boxShadow: "0 0 50px rgba(200,255,0,0.2)",
          fontSize: 48,
        }}
      >
        <Sparkles size={48} color="#C8FF00" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 text-center"
        style={{ color: "#fff", fontSize: 28, fontWeight: 900, marginBottom: 8 }}
      >
        Hesabın Hazır!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 text-center mb-8"
        style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, lineHeight: 1.6, maxWidth: 280 }}
      >
        RefScore topluluğuna hoş geldin! Artık hakemleri oylayabilirsin.
      </motion.p>

      {/* Perks list */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="relative z-10 w-full p-5 rounded-3xl mb-8"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          maxWidth: 340,
        }}
      >
        {perks.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.08 }}
            className="flex items-center gap-3 py-2"
            style={{ borderBottom: i < perks.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
          >
            <span style={{ fontSize: 20 }}>{p.icon}</span>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{p.text}</span>
            <div style={{ marginLeft: "auto" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(200,255,0,0.15)", border: "1px solid rgba(200,255,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#C8FF00", fontSize: 10, fontWeight: 900 }}>✓</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Auto redirect indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="relative z-10 flex items-center gap-2"
      >
        <motion.div
          animate={{ scaleX: [1, 0] }}
          transition={{ duration: 3.8, ease: "linear", delay: 0.2 }}
          style={{
            width: 120, height: 3, borderRadius: 2,
            background: "#C8FF00",
            transformOrigin: "left",
          }}
        />
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
          Yönlendiriliyor...
        </span>
      </motion.div>

      {/* Manual button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => navigate("/")}
        className="relative z-10 mt-4 px-8 py-3 rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #C8FF00 0%, #a8e000 100%)",
          boxShadow: "0 8px 24px rgba(200,255,0,0.25)",
        }}
      >
        <span style={{ color: "#0A0A0F", fontSize: 15, fontWeight: 800 }}>
          Ana Sayfaya Git →
        </span>
      </motion.button>
    </div>
  );
}