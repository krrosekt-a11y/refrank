import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Globe,
  Shield,
  Moon,
  Sun,
  Eye,
  EyeOff,
  MessageSquare,
  HelpCircle,
  Info,
  LogOut,
  Trash2,
  ChevronRight,
  User,
  Lock,
  Palette,
  Vibrate,
  Star,
  Heart,
  FileText,
  ExternalLink,
  Smartphone,
  Zap,
  Volume2,
  VolumeX,
  UserX,
  Mail,
  AlertTriangle,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type ThemeMode = "dark" | "light" | "system";
type Language = "tr" | "en" | "de" | "fr";

const languageLabels: Record<Language, string> = {
  tr: "Turkce",
  en: "English",
  de: "Deutsch",
  fr: "Français",
};

export function SettingsPage() {
  const navigate = useNavigate();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [matchAlerts, setMatchAlerts] = useState(true);
  const [voteReminders, setVoteReminders] = useState(true);
  const [commentReplies, setCommentReplies] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [compactMode, setCompactMode] = useState(false);

  const [profilePublic, setProfilePublic] = useState(true);
  const [showVoteHistory, setShowVoteHistory] = useState(true);

  const [language, setLanguage] = useState<Language>("tr");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100%" }}>
      <div
        className="sticky top-0 z-40"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 48px)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          background: "rgba(10,10,15,0.82)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3 px-5 pb-4">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate(-1)}
            className="flex items-center justify-center"
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <ArrowLeft size={20} color="#fff" />
          </motion.button>
          <h1
            style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "-0.5px",
            }}
          >
            Ayarlar
          </h1>
        </div>
      </div>

      <div className="px-5 pt-5 pb-32">
        <SectionLabel label="HESAP" />

        <SettingsRow
          icon={<User size={16} color="#C8FF00" />}
          label="Profili Duzenle"
          right={<ChevronRight size={16} color="#44445A" />}
          onTap={() => navigate("/profile")}
        />
        <SettingsRow
          icon={<Mail size={16} color="#4FA3FF" />}
          label="E-posta Degistir"
          subtitle="f***42@email.com"
          right={<ChevronRight size={16} color="#44445A" />}
        />
        <SettingsRow
          icon={<Lock size={16} color="#AF52DE" />}
          label="Sifre Degistir"
          right={<ChevronRight size={16} color="#44445A" />}
        />

        <SectionLabel label="BILDIRIMLER" />

        <SettingsRow
          icon={
            pushEnabled ? (
              <Bell size={16} color="#C8FF00" />
            ) : (
              <BellOff size={16} color="#44445A" />
            )
          }
          label="Anlik Bildirimler"
          right={
            <ToggleSwitch
              value={pushEnabled}
              onToggle={() => setPushEnabled(!pushEnabled)}
            />
          }
        />

        <AnimatePresence>
          {pushEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: "hidden" }}
            >
              <SettingsRow
                icon={<Zap size={16} color="#FFD600" />}
                label="Canli Mac Uyarilari"
                subtitle="Mac basladiginda bildirim al"
                right={
                  <ToggleSwitch
                    value={matchAlerts}
                    onToggle={() => setMatchAlerts(!matchAlerts)}
                  />
                }
                indent
              />
              <SettingsRow
                icon={<Star size={16} color="#FF9500" />}
                label="Oy Hatirlaticilari"
                subtitle="Mac bittikten sonra oylama hatirlatmasi"
                right={
                  <ToggleSwitch
                    value={voteReminders}
                    onToggle={() => setVoteReminders(!voteReminders)}
                  />
                }
                indent
              />
              <SettingsRow
                icon={<MessageSquare size={16} color="#4FA3FF" />}
                label="Yorum Yanitlari"
                subtitle="Yorumlarina yanit geldiginde"
                right={
                  <ToggleSwitch
                    value={commentReplies}
                    onToggle={() => setCommentReplies(!commentReplies)}
                  />
                }
                indent
              />
            </motion.div>
          )}
        </AnimatePresence>

        <SettingsRow
          icon={
            soundEnabled ? (
              <Volume2 size={16} color="#30C0FF" />
            ) : (
              <VolumeX size={16} color="#44445A" />
            )
          }
          label="Bildirim Sesi"
          right={
            <ToggleSwitch
              value={soundEnabled}
              onToggle={() => setSoundEnabled(!soundEnabled)}
            />
          }
        />
        <SettingsRow
          icon={<Vibrate size={16} color="#AF52DE" />}
          label="Titresim"
          right={
            <ToggleSwitch
              value={vibrationEnabled}
              onToggle={() => setVibrationEnabled(!vibrationEnabled)}
            />
          }
        />

        <SectionLabel label="GORUNUM" />

        <div className="mb-2">
          <div
            className="flex items-center gap-3 px-4 py-4 rounded-t-3xl"
            style={{
              background: "rgba(20,20,28,0.85)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderBottom: "none",
            }}
          >
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 34,
                height: 34,
                background: "rgba(255,255,255,0.05)",
              }}
            >
              <Palette size={16} color="#C8FF00" />
            </div>
            <span style={{ color: "#fff", fontSize: 14 }}>Tema</span>
          </div>
          <div
            className="flex gap-2 px-4 pb-4 pt-2 rounded-b-3xl"
            style={{
              background: "rgba(20,20,28,0.85)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderTop: "none",
            }}
          >
            {(
              [
                { key: "dark", label: "Koyu", icon: <Moon size={14} /> },
                { key: "light", label: "Acik", icon: <Sun size={14} /> },
                {
                  key: "system",
                  label: "Sistem",
                  icon: <Smartphone size={14} />,
                },
              ] as const
            ).map((opt) => (
              <motion.button
                key={opt.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTheme(opt.key)}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl"
                style={{
                  background:
                    theme === opt.key
                      ? "rgba(200,255,0,0.12)"
                      : "rgba(255,255,255,0.04)",
                  border:
                    theme === opt.key
                      ? "1px solid rgba(200,255,0,0.25)"
                      : "1px solid rgba(255,255,255,0.06)",
                  transition: "all 0.2s",
                }}
              >
                <span
                  style={{
                    color: theme === opt.key ? "#C8FF00" : "#55556A",
                  }}
                >
                  {opt.icon}
                </span>
                <span
                  style={{
                    color: theme === opt.key ? "#C8FF00" : "#55556A",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {opt.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        <SettingsRow
          icon={<Eye size={16} color="#30C0FF" />}
          label="Kompakt Gorunum"
          subtitle="Daha fazla icerik goster"
          right={
            <ToggleSwitch
              value={compactMode}
              onToggle={() => setCompactMode(!compactMode)}
            />
          }
        />

        <SectionLabel label="DIL" />

        <SettingsRow
          icon={<Globe size={16} color="#4FA3FF" />}
          label="Uygulama Dili"
          subtitle={languageLabels[language]}
          right={<ChevronRight size={16} color="#44445A" />}
          onTap={() => setShowLanguagePicker(!showLanguagePicker)}
        />

        <AnimatePresence>
          {showLanguagePicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: "hidden" }}
              className="mb-2"
            >
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  background: "rgba(20,20,28,0.85)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {(Object.entries(languageLabels) as [Language, string][]).map(
                  ([key, label], i, arr) => (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setLanguage(key);
                        setShowLanguagePicker(false);
                      }}
                      className="w-full flex items-center justify-between px-5 py-3.5"
                      style={{
                        borderBottom:
                          i < arr.length - 1
                            ? "1px solid rgba(255,255,255,0.04)"
                            : "none",
                      }}
                    >
                      <span
                        style={{
                          color: language === key ? "#C8FF00" : "#BBBBC8",
                          fontSize: 14,
                          fontWeight: language === key ? 700 : 400,
                        }}
                      >
                        {label}
                      </span>
                      {language === key && (
                        <Check size={16} color="#C8FF00" />
                      )}
                    </motion.button>
                  ),
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <SectionLabel label="GIZLILIK VE GUVENLIK" />

        <SettingsRow
          icon={
            profilePublic ? (
              <Eye size={16} color="#C8FF00" />
            ) : (
              <EyeOff size={16} color="#44445A" />
            )
          }
          label="Herkese Acik Profil"
          subtitle="Diger kullanicilar profilini gorebilir"
          right={
            <ToggleSwitch
              value={profilePublic}
              onToggle={() => setProfilePublic(!profilePublic)}
            />
          }
        />
        <SettingsRow
          icon={<FileText size={16} color="#FFD600" />}
          label="Oy Gecmisi Gorunurlugu"
          subtitle="Verdigin oylari baskalari gorebilsin"
          right={
            <ToggleSwitch
              value={showVoteHistory}
              onToggle={() => setShowVoteHistory(!showVoteHistory)}
            />
          }
        />
        <SettingsRow
          icon={<UserX size={16} color="#FF9500" />}
          label="Engellenen Kullanicilar"
          subtitle="0 engellenen"
          right={<ChevronRight size={16} color="#44445A" />}
        />
        <SettingsRow
          icon={<Shield size={16} color="#AF52DE" />}
          label="Gizlilik Politikasi"
          right={<ExternalLink size={14} color="#44445A" />}
        />

        <SectionLabel label="DESTEK" />

        <SettingsRow
          icon={<MessageSquare size={16} color="#FF9500" />}
          label="Geri Bildirim Gonder"
          right={<ChevronRight size={16} color="#44445A" />}
        />
        <SettingsRow
          icon={<HelpCircle size={16} color="#4FA3FF" />}
          label="Yardim Merkezi"
          right={<ExternalLink size={14} color="#44445A" />}
        />
        <SettingsRow
          icon={<Heart size={16} color="#FF5F5F" />}
          label="Uygulamayi Degerlendir"
          right={<ExternalLink size={14} color="#44445A" />}
        />
        <SettingsRow
          icon={<Info size={16} color="#55556A" />}
          label="Hakkinda"
          subtitle="RefScore v1.0.0"
          right={<ChevronRight size={16} color="#44445A" />}
        />

        <SectionLabel label="OTURUM" />

        <SettingsRow
          icon={<LogOut size={16} color="#FFD600" />}
          label="Cikis Yap"
          labelColor="#FFD600"
          onTap={() => setShowLogoutDialog(true)}
        />
        <SettingsRow
          icon={<Trash2 size={16} color="#FF5F5F" />}
          label="Hesabi Sil"
          labelColor="#FF5F5F"
          onTap={() => setShowDeleteDialog(true)}
        />

        <div className="text-center mt-8 mb-4">
          <span style={{ color: "#2A2A3A", fontSize: 11 }}>
            RefScore v1.0.0 • Build 2026.03
          </span>
        </div>
      </div>

      <AnimatePresence>
        {showLogoutDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setShowLogoutDialog(false)}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-[28px] p-6"
              style={{
                maxWidth: 430,
                background: "rgba(22,22,30,0.98)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderBottom: "none",
                backdropFilter: "blur(40px)",
                paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
              }}
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div
                  className="flex items-center justify-center rounded-full mb-4"
                  style={{
                    width: 56,
                    height: 56,
                    background: "rgba(255,214,0,0.1)",
                    border: "1px solid rgba(255,214,0,0.2)",
                  }}
                >
                  <LogOut size={24} color="#FFD600" />
                </div>
                <h3
                  style={{
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  Cikis Yap
                </h3>
                <p style={{ color: "#888899", fontSize: 13, lineHeight: 1.5 }}>
                  Hesabindan cikis yapmak istedigine emin misin? Tekrar giris
                  yaparak devam edebilirsin.
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setShowLogoutDialog(false);
                  navigate("/auth/signin");
                }}
                className="w-full py-4 rounded-2xl mb-3"
                style={{
                  background: "#FFD600",
                  color: "#0A0A0F",
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                Evet, Cikis Yap
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowLogoutDialog(false)}
                className="w-full py-4 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#888899",
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Vazgec
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setShowDeleteDialog(false)}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-[28px] p-6"
              style={{
                maxWidth: 430,
                background: "rgba(22,22,30,0.98)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderBottom: "none",
                backdropFilter: "blur(40px)",
                paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
              }}
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div
                  className="flex items-center justify-center rounded-full mb-4"
                  style={{
                    width: 56,
                    height: 56,
                    background: "rgba(255,59,48,0.1)",
                    border: "1px solid rgba(255,59,48,0.2)",
                  }}
                >
                  <AlertTriangle size={24} color="#FF3B30" />
                </div>
                <h3
                  style={{
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  Hesabi Sil
                </h3>
                <p style={{ color: "#888899", fontSize: 13, lineHeight: 1.5 }}>
                  Bu islem geri alinamaz. Tum oylarin, yorumlarin ve profil
                  bilgilerin kalici olarak silinecek.
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setShowDeleteDialog(false);
                  navigate("/splash");
                }}
                className="w-full py-4 rounded-2xl mb-3"
                style={{
                  background: "#FF3B30",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                Evet, Hesabimi Sil
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowDeleteDialog(false)}
                className="w-full py-4 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#888899",
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Vazgec
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      className="mt-6 mb-3 px-1"
      style={{
        color: "#44445A",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.07em",
      }}
    >
      {label}
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  subtitle,
  right,
  onTap,
  indent,
  labelColor,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  onTap?: () => void;
  indent?: boolean;
  labelColor?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onTap}
      className="w-full flex items-center justify-between px-4 py-3.5 rounded-3xl mb-2"
      style={{
        background: "rgba(20,20,28,0.85)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        minHeight: 56,
        marginLeft: indent ? 16 : 0,
        width: indent ? "calc(100% - 16px)" : "100%",
      }}
    >
      <div className="flex items-center gap-3 text-left">
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{
            width: 34,
            height: 34,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          {icon}
        </div>
        <div>
          <span style={{ color: labelColor || "#fff", fontSize: 14 }}>
            {label}
          </span>
          {subtitle && (
            <div style={{ color: "#44445A", fontSize: 11, marginTop: 1 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </motion.button>
  );
}

function ToggleSwitch({
  value,
  onToggle,
}: {
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.9 }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="relative cursor-pointer flex-shrink-0"
      style={{
        width: 50,
        height: 30,
        borderRadius: 15,
        background: value ? "#C8FF00" : "rgba(255,255,255,0.1)",
        transition: "background 0.25s",
      }}
    >
      <motion.div
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          position: "absolute",
          top: 3,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: value ? "#0A0A0F" : "#44445A",
        }}
      />
    </motion.div>
  );
}
