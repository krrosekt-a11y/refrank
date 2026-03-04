import { ChevronLeft, Mail } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import { useState, useRef } from "react";

export function ForgotOTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email ?? "e-posta";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (!value && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const filled = otp.every((d) => d !== "");

  const handleVerify = () => {
    if (!filled) return;
    const code = otp.join("");
    if (code === "000000" || code.length === 6) {
      navigate("/auth/new-password");
    } else {
      setError("Kod yanlış. Tekrar dene.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  // Countdown
  useState(() => {
    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  });

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0A0A0F" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-16 pb-6">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => navigate(-1)}
          className="flex items-center justify-center rounded-full"
          style={{ width: 40, height: 40, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <ChevronLeft size={20} color="#fff" />
        </motion.button>
      </div>

      <div className="px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center mb-6"
          style={{
            width: 72, height: 72, borderRadius: 22,
            background: "rgba(79,163,255,0.1)",
            border: "1.5px solid rgba(79,163,255,0.3)",
            fontSize: 32,
          }}
        >
          <Mail size={32} color="#4FA3FF" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}
        >
          Kodu Gir
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 1.6 }}
        >
          <span style={{ color: "#C8FF00", fontWeight: 600 }}>{email}</span> adresine gönderilen 6 haneli doğrulama kodunu gir.
        </motion.p>
      </div>

      <div className="flex-1 px-6">
        {/* OTP inputs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex justify-center gap-3 mb-6"
        >
          {otp.map((digit, i) => (
            <motion.div
              key={i}
              animate={{
                borderColor: digit ? "rgba(200,255,0,0.5)" : "rgba(255,255,255,0.12)",
                background: digit ? "rgba(200,255,0,0.06)" : "rgba(255,255,255,0.04)",
              }}
              style={{ border: "1.5px solid", borderRadius: 16 }}
            >
              <input
                ref={(el) => { inputRefs.current[i] = el; }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="bg-transparent outline-none text-center"
                style={{
                  width: 48, height: 60,
                  color: digit ? "#C8FF00" : "#fff",
                  fontSize: 24, fontWeight: 800,
                  caretColor: "#C8FF00",
                }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-center"
            style={{ color: "#FF5F5F", fontSize: 13 }}
          >
            {error}
          </motion.div>
        )}

        {/* Resend */}
        <div className="text-center mb-6">
          {resendTimer > 0 ? (
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
              Kod tekrar gönder ({resendTimer}s)
            </span>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setResendTimer(60)}
              style={{ color: "#C8FF00", fontSize: 13, fontWeight: 600 }}
            >
              Kodu Tekrar Gönder
            </motion.button>
          )}
        </div>

        {/* Hint for demo */}
        <div className="text-center">
          <span style={{ color: "#333344", fontSize: 12 }}>Demo: Herhangi 6 rakam gir</span>
        </div>
      </div>

      <div className="px-6 pb-14 pt-4">
        <motion.button
          whileTap={{ scale: filled ? 0.97 : 1 }}
          onClick={handleVerify}
          className="w-full py-4 rounded-2xl"
          style={{
            background: filled
              ? "linear-gradient(135deg, #C8FF00 0%, #a8e000 100%)"
              : "rgba(255,255,255,0.06)",
            boxShadow: filled ? "0 8px 24px rgba(200,255,0,0.25)" : "none",
            transition: "all 0.25s",
          }}
        >
          <span style={{ color: filled ? "#0A0A0F" : "#333344", fontSize: 16, fontWeight: 800 }}>
            Doğrula
          </span>
        </motion.button>
      </div>
    </div>
  );
}