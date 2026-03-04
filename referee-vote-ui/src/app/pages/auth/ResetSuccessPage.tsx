import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { CheckCircle } from "lucide-react";

export function ResetSuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate("/auth/signin"), 3500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 relative overflow-hidden"
      style={{ background: "#0A0A0F" }}
    >
      {/* Glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2 }}
        className="absolute pointer-events-none"
        style={{
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,255,0,0.08) 0%, transparent 65%)",
        }}
      />

      {/* Success ring animation */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
        transition={{ duration: 0.7, times: [0, 0.6, 1] }}
        className="relative z-10 mb-8 flex items-center justify-center"
        style={{
          width: 110, height: 110, borderRadius: 32,
          background: "rgba(200,255,0,0.1)",
          border: "2px solid rgba(200,255,0,0.4)",
          boxShadow: "0 0 50px rgba(200,255,0,0.15)",
          fontSize: 52,
        }}
      >
        <CheckCircle size={52} color="#C8FF00" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 text-center mb-3"
        style={{ color: "#fff", fontSize: 26, fontWeight: 900 }}
      >
        Şifre Güncellendi!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 text-center mb-10"
        style={{ color: "rgba(255,255,255,0.4)", fontSize: 15, lineHeight: 1.6, maxWidth: 280 }}
      >
        Şifreni başarıyla sıfırladın. Artık yeni şifrenle giriş yapabilirsin.
      </motion.p>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="relative z-10 w-full mb-4"
        style={{ maxWidth: 280 }}
      >
        <div
          style={{
            height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, delay: 0.5, ease: "linear" }}
            style={{ height: "100%", background: "#C8FF00", borderRadius: 2 }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span style={{ color: "#44445A", fontSize: 11 }}>Giriş sayfasına yönlendiriliyor</span>
          <span style={{ color: "#44445A", fontSize: 11 }}>3s</span>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => navigate("/auth/signin")}
        className="relative z-10 px-8 py-3 rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #C8FF00 0%, #a8e000 100%)",
          boxShadow: "0 8px 24px rgba(200,255,0,0.25)",
        }}
      >
        <span style={{ color: "#0A0A0F", fontSize: 15, fontWeight: 800 }}>
          Giriş Yap →
        </span>
      </motion.button>
    </div>
  );
}