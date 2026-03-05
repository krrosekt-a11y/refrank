import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Eye, EyeOff, Mail, Lock, User, ChevronRight } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";

function InputField({
  label, placeholder, value, onChange, type = "text",
  icon: Icon, rightEl,
}: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string;
  icon: React.ElementType; rightEl?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="mb-4">
      <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, marginBottom: 8, display: "block" }}>
        {label}
      </label>
      <motion.div
        animate={{ borderColor: focused ? "rgba(200,255,0,0.4)" : "rgba(255,255,255,0.1)" }}
        className="flex items-center gap-3 px-4"
        style={{
          height: 52, background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16,
        }}
      >
        <Icon size={16} color={focused ? "#C8FF00" : "#44445A"} />
        <input
          type={type} value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent outline-none"
          style={{ color: "#fff", fontSize: 14 }}
        />
        {rightEl}
      </motion.div>
    </div>
  );
}

export function SignUpPage() {
  const navigate = useNavigate();
  const { signUp, configured } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const canSubmit = name && email && password.length >= 6 && agreed;

  const handleSignUp = async () => {
    if (!canSubmit || loading || !configured) return;
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const { requiresEmailVerification } = await signUp(
        email.trim(),
        password,
        name.trim()
      );
      if (requiresEmailVerification) {
        setInfo(
          "Hesap oluşturuldu. E-postanı doğruladıktan sonra giriş yapabilirsin."
        );
        navigate("/auth/signin");
      } else {
        navigate("/auth/complete-profile");
      }
    } catch (err: any) {
      setError(err?.message || "Kayıt başarısız. Bilgileri kontrol et.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0A0A0F" }}>
      {/* Header */}
      <div className="px-6 pt-20 pb-6">
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1px", marginBottom: 4 }}>
          <span style={{ color: "#C8FF00" }}>REF</span><span style={{ color: "#fff" }}>SCORE</span>
        </div>
        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
          Hesap Oluştur
        </h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
          Topluluğa katıl, hakem oyla!
        </p>
      </div>

      <div className="flex-1 px-6">
        {!configured && (
          <div
            className="mb-4 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(255,95,95,0.1)", border: "1px solid rgba(255,95,95,0.25)" }}
          >
            <span style={{ color: "#FF5F5F", fontSize: 13 }}>
              Supabase yapılandırması eksik. Kayıt aktif değil.
            </span>
          </div>
        )}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(255,95,95,0.1)", border: "1px solid rgba(255,95,95,0.25)" }}
          >
            <span style={{ color: "#FF5F5F", fontSize: 13 }}>{error}</span>
          </div>
        )}
        {info && (
          <div
            className="mb-4 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(200,255,0,0.12)", border: "1px solid rgba(200,255,0,0.25)" }}
          >
            <span style={{ color: "#C8FF00", fontSize: 13 }}>{info}</span>
          </div>
        )}

        <InputField label="Ad Soyad" placeholder="Adın ve soyadın" value={name} onChange={setName} icon={User} />
        <InputField label="E-posta" placeholder="ornek@mail.com" value={email} onChange={setEmail} type="email" icon={Mail} />
        <InputField
          label="Şifre"
          placeholder="En az 6 karakter"
          value={password}
          onChange={setPassword}
          type={showPass ? "text" : "password"}
          icon={Lock}
          rightEl={
            <button onClick={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff size={16} color="#44445A" /> : <Eye size={16} color="#44445A" />}
            </button>
          }
        />

        {/* Password strength */}
        {password.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 -mt-2">
            <div className="flex gap-1 mb-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background:
                      password.length >= level * 3
                        ? level <= 1 ? "#FF5F5F" : level <= 2 ? "#FFD600" : level <= 3 ? "#4FA3FF" : "#C8FF00"
                        : "rgba(255,255,255,0.1)",
                    transition: "background 0.3s",
                  }}
                />
              ))}
            </div>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
              {password.length < 3 ? "Çok zayıf" : password.length < 6 ? "Zayıf" : password.length < 9 ? "Orta" : "Güçlü"}
            </span>
          </motion.div>
        )}

        {/* Terms */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setAgreed(!agreed)}
          className="flex items-start gap-3 mb-6"
        >
          <motion.div
            animate={{ background: agreed ? "#C8FF00" : "rgba(0,0,0,0)", borderColor: agreed ? "#C8FF00" : "rgba(255,255,255,0.2)" }}
            className="flex-shrink-0 flex items-center justify-center rounded-md mt-0.5"
            style={{ width: 20, height: 20, border: "1.5px solid" }}
          >
            {agreed && <span style={{ color: "#0A0A0F", fontSize: 12, fontWeight: 900 }}>✓</span>}
          </motion.div>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, lineHeight: 1.5 }}>
            <span style={{ color: "#C8FF00" }}>Kullanım Koşulları</span> ve{" "}
            <span style={{ color: "#C8FF00" }}>Gizlilik Politikası</span>&apos;nı okudum ve kabul ediyorum.
          </p>
        </motion.button>

        {/* Submit */}
        <motion.button
          whileTap={{ scale: canSubmit ? 0.97 : 1 }}
          onClick={handleSignUp}
          disabled={!canSubmit || loading || !configured}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl mb-5"
          style={{
            background: canSubmit
              ? "linear-gradient(135deg, #C8FF00 0%, #a8e000 100%)"
              : "rgba(255,255,255,0.06)",
            boxShadow: canSubmit ? "0 8px 24px rgba(200,255,0,0.25)" : "none",
            transition: "all 0.25s",
          }}
        >
          <span style={{ color: canSubmit ? "#0A0A0F" : "#333344", fontSize: 16, fontWeight: 800 }}>
            {loading ? "Oluşturuluyor..." : "Hesap Oluştur"}
          </span>
          {canSubmit && <ChevronRight size={18} color="#0A0A0F" strokeWidth={2.5} />}
        </motion.button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ color: "#44445A", fontSize: 12 }}>veya</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Social buttons */}
        {["Apple ile Devam Et", "Google ile Devam Et"].map((label) => (
          <motion.button
            key={label}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center py-3.5 rounded-2xl mb-3"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {label}
          </motion.button>
        ))}
      </div>

      {/* Sign in link */}
      <div className="px-6 pb-14 pt-4 text-center">
        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>Hesabın var mı? </span>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/auth/signin")}
          style={{ color: "#C8FF00", fontSize: 14, fontWeight: 700 }}
        >
          Giriş Yap
        </motion.button>
      </div>
    </div>
  );
}
