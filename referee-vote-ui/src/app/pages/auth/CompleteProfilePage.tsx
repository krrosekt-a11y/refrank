import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ChevronRight, Camera, Cat, CircleDot, Trophy, Bird, Flame, Zap, Target, Star, Crown, ThumbsUp, Gamepad2, Gem } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";

const TEAMS = ["Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor", "Başakşehir", "Diğer"];

type AvatarId = "cat" | "ball" | "trophy" | "bird" | "flame" | "zap" | "target" | "star" | "crown" | "thumbsup" | "gamepad" | "gem";
const AVATARS: { id: AvatarId; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { id: "cat", Icon: Cat },
  { id: "ball", Icon: CircleDot },
  { id: "trophy", Icon: Trophy },
  { id: "bird", Icon: Bird },
  { id: "flame", Icon: Flame },
  { id: "zap", Icon: Zap },
  { id: "target", Icon: Target },
  { id: "star", Icon: Star },
  { id: "crown", Icon: Crown },
  { id: "thumbsup", Icon: ThumbsUp },
  { id: "gamepad", Icon: Gamepad2 },
  { id: "gem", Icon: Gem },
];

export function CompleteProfilePage() {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const [avatarId, setAvatarId] = useState<AvatarId>("cat");
  const [username, setUsername] = useState("");
  const [favTeam, setFavTeam] = useState("");
  const [bio, setBio] = useState("");
  const [showAvatars, setShowAvatars] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = username.length >= 3 && favTeam;
  const selectedAvatar = AVATARS.find((a) => a.id === avatarId)!;
  const AvatarIcon = selectedAvatar.Icon;

  const handleSaveProfile = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError("");
    try {
      await updateProfile({
        username: username.trim(),
        favorite_team: favTeam,
        bio: bio.trim(),
        avatar_id: avatarId,
      });
      navigate("/auth/success");
    } catch (err: any) {
      setError(err?.message || "Profil kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0A0A0F" }}>
      {/* Header */}
      <div className="px-6 pt-16 pb-4">
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 16 }}>
          <span style={{ color: "#C8FF00" }}>REF</span><span style={{ color: "#fff" }}>SCORE</span>
        </div>
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Profili Tamamla</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
          Toplulukta nasıl görüneceğini belirle
        </p>
      </div>

      <div className="flex-1 px-6 pb-4 overflow-y-auto">
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(255,95,95,0.1)", border: "1px solid rgba(255,95,95,0.25)" }}
          >
            <span style={{ color: "#FF5F5F", fontSize: 13 }}>{error}</span>
          </div>
        )}

        {/* Avatar selector */}
        <div className="flex flex-col items-center mb-6">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setShowAvatars(!showAvatars)}
            className="relative flex items-center justify-center"
            style={{
              width: 96, height: 96, borderRadius: 30,
              background: "rgba(200,255,0,0.1)",
              border: "2px solid rgba(200,255,0,0.35)",
              boxShadow: "0 0 30px rgba(200,255,0,0.1)",
            }}
          >
            <AvatarIcon size={48} color="#C8FF00" />
            <div
              className="absolute -bottom-2 -right-2 flex items-center justify-center rounded-full"
              style={{
                width: 30, height: 30, background: "#C8FF00",
                border: "2px solid #0A0A0F",
              }}
            >
              <Camera size={14} color="#0A0A0F" />
            </div>
          </motion.button>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 12 }}>
            Avatar seçmek için dokun
          </span>

          {/* Avatar grid */}
          {showAvatars && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-6 gap-2 mt-4 p-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {AVATARS.map((av) => {
                const AvIcon = av.Icon;
                return (
                  <motion.button
                    key={av.id}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => { setAvatarId(av.id); setShowAvatars(false); }}
                    className="flex items-center justify-center rounded-xl"
                    style={{
                      width: 44, height: 44,
                      background: av.id === avatarId ? "rgba(200,255,0,0.15)" : "rgba(255,255,255,0.04)",
                      border: av.id === avatarId ? "1.5px solid rgba(200,255,0,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <AvIcon size={22} color={av.id === avatarId ? "#C8FF00" : "#44445A"} />
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Username */}
        <div className="mb-4">
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, marginBottom: 8, display: "block" }}>
            Kullanıcı Adı *
          </label>
          <div
            className="flex items-center gap-2 px-4"
            style={{
              height: 52, background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16,
            }}
          >
            <span style={{ color: "#44445A", fontSize: 14 }}>@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              placeholder="kullanici_adi"
              className="flex-1 bg-transparent outline-none"
              style={{ color: "#fff", fontSize: 14 }}
            />
            {username.length >= 3 && (
              <span style={{ color: "#C8FF00", fontSize: 18 }}>✓</span>
            )}
          </div>
          <span style={{ color: "#44445A", fontSize: 11, marginTop: 4, display: "block" }}>
            En az 3 karakter, boşluk kullanılamaz
          </span>
        </div>

        {/* Favorite team */}
        <div className="mb-4">
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, marginBottom: 8, display: "block" }}>
            Favori Takım *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TEAMS.map((team) => (
              <motion.button
                key={team}
                whileTap={{ scale: 0.94 }}
                onClick={() => setFavTeam(team)}
                className="py-2.5 px-2 rounded-xl text-center"
                style={{
                  background: favTeam === team ? "rgba(200,255,0,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${favTeam === team ? "rgba(200,255,0,0.4)" : "rgba(255,255,255,0.08)"}`,
                  color: favTeam === team ? "#C8FF00" : "#888899",
                  fontSize: 12,
                  fontWeight: favTeam === team ? 700 : 500,
                }}
              >
                {team}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="mb-4">
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, marginBottom: 8, display: "block" }}>
            Hakkımda (opsiyonel)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Futbol tutkunu, hakem takipçisi..."
            maxLength={120}
            rows={3}
            className="w-full bg-transparent outline-none resize-none px-4 py-3 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff", fontSize: 14, lineHeight: 1.5,
            }}
          />
          <span style={{ color: "#44445A", fontSize: 11 }}>{bio.length}/120</span>
        </div>
      </div>

      {/* Submit */}
      <div className="px-6 pb-14 pt-2">
        <motion.button
          whileTap={{ scale: canSubmit ? 0.97 : 1 }}
          onClick={handleSaveProfile}
          disabled={!canSubmit || saving}
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
            {saving ? "Kaydediliyor..." : "Profili Kaydet"}
          </span>
          {canSubmit && <ChevronRight size={18} color="#0A0A0F" strokeWidth={2.5} />}
        </motion.button>
      </div>
    </div>
  );
}
