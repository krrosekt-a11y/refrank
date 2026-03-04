import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

export function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = email && password.length >= 6;

  const handleSignIn = () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    setTimeout(() => {
      setLoading(false);
      navigate("/");
    }, 1200);
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0A0A0F" }}>
      {/* Top decoration */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: 220,
          background: "radial-gradient(ellipse 80% 180px at 50% -20px, rgba(200,255,0,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Logo & Header */}
      <div className="px-6 pt-20 pb-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-1.5px", marginBottom: 24 }}
        >
          <span style={{ color: "#C8FF00" }}>REF</span>
          <span style={{ color: "#fff" }}>SCORE</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 6 }}
        >
          Hoş Geldin
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}
        >
          Hesabına giriş yap ve hakemleri puanlamaya başla
        </motion.p>
      </div>

      <div className="flex-1 px-6 relative z-10">
        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(255,95,95,0.1)", border: "1px solid rgba(255,95,95,0.25)" }}
          >
            <span style={{ color: "#FF5F5F", fontSize: 13 }}>{error}</span>
          </motion.div>
        )}

        {/* Email */}
        <div className="mb-4">
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, marginBottom: 8, display: "block" }}>
            E-posta
          </label>
          <motion.div
            animate={{ borderColor: emailFocused ? "rgba(200,255,0,0.4)" : "rgba(255,255,255,0.1)" }}
            className="flex items-center gap-3 px-4"
            style={{ height: 52, background: "rgba(255,255,255,0.05)", border: "1px solid", borderRadius: 16 }}
          >
            <Mail size={16} color={emailFocused ? "#C8FF00" : "#44445A"} />
            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@mail.com"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              className="flex-1 bg-transparent outline-none"
              style={{ color: "#fff", fontSize: 14 }}
            />
          </motion.div>
        </div>

        {/* Password */}
        <div className="mb-2">
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, marginBottom: 8, display: "block" }}>
            Şifre
          </label>
          <motion.div
            animate={{ borderColor: passFocused ? "rgba(200,255,0,0.4)" : "rgba(255,255,255,0.1)" }}
            className="flex items-center gap-3 px-4"
            style={{ height: 52, background: "rgba(255,255,255,0.05)", border: "1px solid", borderRadius: 16 }}
          >
            <Lock size={16} color={passFocused ? "#C8FF00" : "#44445A"} />
            <input
              type={showPass ? "text" : "password"} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifren"
              onFocus={() => setPassFocused(true)}
              onBlur={() => setPassFocused(false)}
              className="flex-1 bg-transparent outline-none"
              style={{ color: "#fff", fontSize: 14 }}
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            />
            <button onClick={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff size={16} color="#44445A" /> : <Eye size={16} color="#44445A" />}
            </button>
          </motion.div>
        </div>

        {/* Forgot password */}
        <div className="flex justify-end mb-6">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => navigate("/auth/forgot-email")}
            style={{ color: "#C8FF00", fontSize: 13, fontWeight: 600 }}
          >
            Şifremi Unuttum
          </motion.button>
        </div>

        {/* Sign in button */}
        <motion.button
          whileTap={{ scale: canSubmit ? 0.97 : 1 }}
          onClick={handleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center py-4 rounded-2xl mb-5"
          style={{
            background: canSubmit
              ? "linear-gradient(135deg, #C8FF00 0%, #a8e000 100%)"
              : "rgba(255,255,255,0.06)",
            boxShadow: canSubmit ? "0 8px 24px rgba(200,255,0,0.25)" : "none",
            transition: "all 0.25s",
          }}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "#0A0A0F" }}
                />
              ))}
            </div>
          ) : (
            <span style={{ color: canSubmit ? "#0A0A0F" : "#333344", fontSize: 16, fontWeight: 800 }}>
              Giriş Yap
            </span>
          )}
        </motion.button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ color: "#44445A", fontSize: 12 }}>veya</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Social */}
        {["Apple ile Giriş Yap", "Google ile Giriş Yap"].map((label) => (
          <motion.button
            key={label}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center py-3.5 rounded-2xl mb-3"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff", fontSize: 14, fontWeight: 600,
            }}
          >
            {label}
          </motion.button>
        ))}
      </div>

      {/* Sign up link */}
      <div className="px-6 pb-14 pt-4 text-center relative z-10">
        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>Hesabın yok mu? </span>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/auth/signup")}
          style={{ color: "#C8FF00", fontSize: 14, fontWeight: 700 }}
        >
          Üye Ol
        </motion.button>
      </div>
    </div>
  );
}