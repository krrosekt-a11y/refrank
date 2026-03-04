import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ChevronLeft, Lock, Eye, EyeOff, ChevronRight } from "lucide-react";

const requirements = [
  { label: "En az 8 karakter", test: (p: string) => p.length >= 8 },
  { label: "Büyük harf içermeli", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Rakam içermeli", test: (p: string) => /[0-9]/.test(p) },
];

export function NewPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const allMet = requirements.every((r) => r.test(password));
  const matches = password && confirm && password === confirm;
  const canSubmit = allMet && matches;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0A0A0F" }}>
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
            background: "rgba(200,255,0,0.1)",
            border: "1.5px solid rgba(200,255,0,0.3)",
            backdropFilter: "blur(20px)",
          }}
        >
          <Lock size={32} color="#C8FF00" />
        </motion.div>
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
          Yeni Şifre Belirle
        </h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
          Güçlü bir şifre belirle ve hesabını güvende tut.
        </p>
      </div>

      <div className="flex-1 px-6">
        {/* New password */}
        <div className="mb-4">
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, marginBottom: 8, display: "block" }}>
            Yeni Şifre
          </label>
          <motion.div
            animate={{ borderColor: passFocused ? "rgba(200,255,0,0.4)" : "rgba(255,255,255,0.1)" }}
            className="flex items-center gap-3 px-4"
            style={{ height: 54, background: "rgba(255,255,255,0.05)", border: "1px solid", borderRadius: 16 }}
          >
            <Lock size={16} color={passFocused ? "#C8FF00" : "#44445A"} />
            <input
              type={showPass ? "text" : "password"} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Yeni şifren"
              onFocus={() => setPassFocused(true)}
              onBlur={() => setPassFocused(false)}
              className="flex-1 bg-transparent outline-none"
              style={{ color: "#fff", fontSize: 14 }}
            />
            <button onClick={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff size={16} color="#44445A" /> : <Eye size={16} color="#44445A" />}
            </button>
          </motion.div>
        </div>

        {/* Requirements */}
        {password.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex flex-col gap-1.5">
            {requirements.map((req) => {
              const met = req.test(password);
              return (
                <div key={req.label} className="flex items-center gap-2">
                  <motion.div
                    animate={{ background: met ? "rgba(200,255,0,0.2)" : "rgba(255,255,255,0.06)" }}
                    style={{
                      width: 16, height: 16, borderRadius: "50%",
                      border: `1px solid ${met ? "rgba(200,255,0,0.5)" : "rgba(255,255,255,0.15)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: "#C8FF00", fontWeight: 900,
                    }}
                  >
                    {met && "✓"}
                  </motion.div>
                  <span style={{ color: met ? "rgba(200,255,0,0.8)" : "rgba(255,255,255,0.3)", fontSize: 12 }}>
                    {req.label}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Confirm */}
        <div className="mb-6">
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, marginBottom: 8, display: "block" }}>
            Şifreyi Onayla
          </label>
          <motion.div
            animate={{
              borderColor: confirmFocused
                ? confirm && !matches ? "rgba(255,95,95,0.5)" : "rgba(200,255,0,0.4)"
                : "rgba(255,255,255,0.1)",
            }}
            className="flex items-center gap-3 px-4"
            style={{ height: 54, background: "rgba(255,255,255,0.05)", border: "1px solid", borderRadius: 16 }}
          >
            <Lock size={16} color={confirmFocused ? "#C8FF00" : "#44445A"} />
            <input
              type={showConfirm ? "text" : "password"} value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Şifreni tekrar gir"
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
              className="flex-1 bg-transparent outline-none"
              style={{ color: "#fff", fontSize: 14 }}
            />
            <button onClick={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? <EyeOff size={16} color="#44445A" /> : <Eye size={16} color="#44445A" />}
            </button>
          </motion.div>
          {confirm && !matches && (
            <span style={{ color: "#FF5F5F", fontSize: 12, marginTop: 4, display: "block" }}>
              Şifreler eşleşmiyor
            </span>
          )}
          {matches && (
            <span style={{ color: "#C8FF00", fontSize: 12, marginTop: 4, display: "block" }}>
              ✓ Şifreler eşleşiyor
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pb-14 pt-2">
        <motion.button
          whileTap={{ scale: canSubmit ? 0.97 : 1 }}
          onClick={() => canSubmit && navigate("/auth/reset-success")}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl"
          style={{
            background: canSubmit
              ? "linear-gradient(135deg, #C8FF00 0%, #a8e000 100%)"
              : "rgba(255,255,255,0.06)",
            boxShadow: canSubmit ? "0 8px 24px rgba(200,255,0,0.25)" : "none",
            transition: "all 0.25s",
          }}
        >
          <span style={{ color: canSubmit ? "#0A0A0F" : "#333344", fontSize: 16, fontWeight: 800 }}>
            Şifreyi Güncelle
          </span>
          {canSubmit && <ChevronRight size={18} color="#0A0A0F" strokeWidth={2.5} />}
        </motion.button>
      </div>
    </div>
  );
}