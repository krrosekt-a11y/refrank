import { ChevronLeft, Mail, ChevronRight, KeyRound } from "lucide-react";

export function ForgotEmailPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSend = () => {
    if (!isValid) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/auth/forgot-otp", { state: { email } });
    }, 1000);
  };

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
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Geri</span>
      </div>

      <div className="px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="flex items-center justify-center mb-6"
          style={{
            width: 72, height: 72, borderRadius: 22,
            background: "rgba(200,255,0,0.1)",
            border: "1.5px solid rgba(200,255,0,0.3)",
            fontSize: 32,
          }}
        >
          <KeyRound size={32} color="#C8FF00" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}
        >
          Şifremi Unuttum
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 1.6 }}
        >
          E-posta adresini gir, sana şifre sıfırlama kodu gönderelim.
        </motion.p>
      </div>

      <div className="flex-1 px-6">
        {/* Email input */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, marginBottom: 8, display: "block" }}>
            E-posta Adresi
          </label>
          <motion.div
            animate={{ borderColor: focused ? "rgba(200,255,0,0.4)" : isValid && email ? "rgba(200,255,0,0.25)" : "rgba(255,255,255,0.1)" }}
            className="flex items-center gap-3 px-4"
            style={{ height: 56, background: "rgba(255,255,255,0.05)", border: "1px solid", borderRadius: 18 }}
          >
            <Mail size={18} color={focused ? "#C8FF00" : "#44445A"} />
            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@mail.com"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="flex-1 bg-transparent outline-none"
              style={{ color: "#fff", fontSize: 15 }}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            {isValid && email && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "rgba(200,255,0,0.2)",
                  border: "1px solid rgba(200,255,0,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#C8FF00", fontSize: 12, fontWeight: 900,
                }}
              >
                ✓
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Info box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-2xl"
          style={{ background: "rgba(79,163,255,0.06)", border: "1px solid rgba(79,163,255,0.15)" }}
        >
          <div className="flex items-start gap-3">
            <Mail size={16} color="#4FA3FF" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.5 }}>
              Sıfırlama kodu kayıtlı e-posta adresine gönderilecektir. Spam klasörünü de kontrol etmeyi unutma.
            </p>
          </div>
        </motion.div>
      </div>

      <div className="px-6 pb-14 pt-4">
        <motion.button
          whileTap={{ scale: isValid ? 0.97 : 1 }}
          onClick={handleSend}
          disabled={loading || !isValid}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl"
          style={{
            background: isValid
              ? "linear-gradient(135deg, #C8FF00 0%, #a8e000 100%)"
              : "rgba(255,255,255,0.06)",
            boxShadow: isValid ? "0 8px 24px rgba(200,255,0,0.25)" : "none",
            transition: "all 0.25s",
          }}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
                  style={{ width: 7, height: 7, borderRadius: "50%", background: "#0A0A0F" }}
                />
              ))}
            </div>
          ) : (
            <>
              <span style={{ color: isValid ? "#0A0A0F" : "#333344", fontSize: 16, fontWeight: 800 }}>
                Kod Gönder
              </span>
              {isValid && <ChevronRight size={18} color="#0A0A0F" strokeWidth={2.5} />}
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}