import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Shield } from "lucide-react";

export function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      const onboarded = localStorage.getItem("refscore_onboarded");
      if (onboarded) {
        navigate("/auth/signin");
      } else {
        navigate("/onboarding/welcome");
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden"
      style={{ background: "#0A0A0F" }}
    >
      {/* Radial glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute"
        style={{
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(200,255,0,0.12) 0%, rgba(200,255,0,0.03) 50%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Outer ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.3, scale: 1 }}
        transition={{ delay: 0.3, duration: 1.0 }}
        className="absolute"
        style={{
          width: 280,
          height: 280,
          borderRadius: "50%",
          border: "1px solid rgba(200,255,0,0.25)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ delay: 0.5, duration: 1.0 }}
        className="absolute"
        style={{
          width: 340,
          height: 340,
          borderRadius: "50%",
          border: "1px solid rgba(200,255,0,0.15)",
        }}
      />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7, type: "spring", stiffness: 200 }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Hex badge */}
        <motion.div
          initial={{ rotate: -15, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6, type: "spring" }}
          className="flex items-center justify-center mb-6"
          style={{
            width: 96,
            height: 96,
            borderRadius: 28,
            background: "linear-gradient(135deg, rgba(200,255,0,0.2) 0%, rgba(200,255,0,0.06) 100%)",
            border: "1.5px solid rgba(200,255,0,0.4)",
            boxShadow: "0 0 40px rgba(200,255,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            fontSize: 44,
          }}
        >
          <Shield size={44} color="#C8FF00" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          style={{ textAlign: "center" }}
        >
          <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-2px", lineHeight: 1 }}>
            <span style={{ color: "#C8FF00" }}>REF</span>
            <span style={{ color: "#fff" }}>SCORE</span>
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: 13,
              letterSpacing: "0.2em",
              marginTop: 8,
            }}
          >
            HAKEM PERFORMANS PLATFORMU
          </div>
        </motion.div>
      </motion.div>

      {/* Loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-24 flex items-center gap-2"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#C8FF00",
            }}
          />
        ))}
      </motion.div>

      {/* Version */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10"
        style={{ color: "#44445A", fontSize: 11 }}
      >
        v2.0.0 · RefScore
      </motion.div>
    </div>
  );
}