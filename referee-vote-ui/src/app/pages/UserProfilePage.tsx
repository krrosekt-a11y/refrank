import { useState } from "react";
import { useNavigate } from "react-router";
import { matches, referees } from "../data";
import {
  Settings,
  Star,
  Award,
  MessageSquare,
  ChevronRight,
  Edit2,
  Bell,
  Globe,
  Shield,
  CheckSquare,
  Calendar,
  MessageCircle,
  User,
} from "lucide-react";
import { motion } from "motion/react";

const userVotedMatches = matches.slice(0, 3).map((m) => ({
  ...m,
  userScore: [7.5, 8.0, 6.0][matches.indexOf(m) % 3],
}));

export function UserProfilePage() {
  const navigate = useNavigate();
  const [notificationsOn, setNotificationsOn] = useState(true);

  const favoriteReferees = referees.slice(0, 2);

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100%" }}>
      {/* Glass header */}
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
        <div className="flex items-center justify-between px-5 pb-4">
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px" }}>
            Profilim
          </h1>
          <motion.button
            whileTap={{ scale: 0.88 }}
            className="flex items-center justify-center"
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Settings size={18} color="rgba(255,255,255,0.7)" />
          </motion.button>
        </div>
      </div>

      <div className="px-5 pt-5 pb-8">
        {/* User card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-4 p-5 rounded-3xl mb-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(26,26,34,0.95) 0%, rgba(20,20,28,0.95) 100%)",
            border: "1px solid rgba(200,255,0,0.12)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 0 40px rgba(200,255,0,0.04)",
          }}
        >
          <div className="relative">
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: 68,
                height: 68,
                background: "linear-gradient(135deg, #C8FF00 0%, #88CC00 100%)",
                boxShadow: "0 0 20px rgba(200,255,0,0.3)",
              }}
            >
              <User size={32} color="#0A0A0F" />
            </div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full"
              style={{
                width: 24,
                height: 24,
                background: "rgba(22,22,30,0.95)",
                border: "1.5px solid rgba(200,255,0,0.3)",
              }}
            >
              <Edit2 size={10} color="#C8FF00" />
            </motion.button>
          </div>

          <div className="flex-1">
            <div style={{ color: "#fff", fontSize: 17, fontWeight: 800 }}>
              FutbolTaraftarı42
            </div>
            <div style={{ color: "#44445A", fontSize: 12, marginTop: 2 }}>
              🇹🇷 Türkiye • Üye: Ocak 2026
            </div>
            <div
              className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(200,255,0,0.1)",
                border: "1px solid rgba(200,255,0,0.2)",
              }}
            >
              <Star size={9} color="#C8FF00" fill="#C8FF00" />
              <span style={{ color: "#C8FF00", fontSize: 10, fontWeight: 700 }}>
                Aktif Seçmen
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Toplam Oy", value: "47", icon: <CheckSquare size={20} color="#C8FF00" /> },
            { label: "Bu Hafta", value: "8", icon: <Calendar size={20} color="#C8FF00" /> },
            { label: "Yorum", value: "23", icon: <MessageCircle size={20} color="#C8FF00" /> },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="flex flex-col items-center py-5 rounded-3xl"
              style={{
                background: "rgba(20,20,28,0.85)",
                border: "1px solid rgba(255,255,255,0.06)",
                backdropFilter: "blur(12px)",
              }}
            >
              <span style={{ fontSize: 22 }}>{stat.icon}</span>
              <span style={{ color: "#C8FF00", fontSize: 22, fontWeight: 900, marginTop: 6 }}>
                {stat.value}
              </span>
              <span style={{ color: "#44445A", fontSize: 10, marginTop: 2 }}>
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Favorite referees */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Star size={15} color="#C8FF00" />
            <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>
              Favori Hakemlerim
            </h3>
          </div>
          <div className="flex gap-3">
            {favoriteReferees.map((ref) => (
              <motion.button
                key={ref.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/referee/${ref.id}`)}
                className="flex-1 flex flex-col items-center p-4 rounded-3xl"
                style={{
                  background: "rgba(20,20,28,0.85)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <img
                  src={ref.photo}
                  alt={ref.name}
                  className="rounded-full object-cover mb-2"
                  style={{
                    width: 48,
                    height: 48,
                    border: "2px solid rgba(200,255,0,0.3)",
                  }}
                />
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 600, textAlign: "center" }}>
                  {ref.name.split(" ")[0]}
                </span>
                <span style={{ color: "#C8FF00", fontSize: 14, fontWeight: 900 }}>
                  {ref.careerScore.toFixed(1)}
                </span>
              </motion.button>
            ))}
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center p-4 rounded-3xl"
              style={{
                background: "rgba(200,255,0,0.04)",
                border: "1.5px dashed rgba(200,255,0,0.18)",
              }}
            >
              <span style={{ color: "#C8FF00", fontSize: 26 }}>+</span>
              <span style={{ color: "#44445A", fontSize: 10, marginTop: 2 }}>Ekle</span>
            </motion.button>
          </div>
        </div>

        {/* Recent votes */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Award size={15} color="#C8FF00" />
            <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>
              Son Oylarım
            </h3>
          </div>
          {userVotedMatches.map((match) => {
            const ref = referees.find((r) => r.id === match.refereeId);
            const scoreColor =
              match.userScore >= 7
                ? "#C8FF00"
                : match.userScore >= 5
                ? "#FFD600"
                : "#FF5F5F";
            return (
              <motion.div
                key={match.id}
                whileTap={{ scale: 0.975 }}
                className="flex items-center gap-3 p-4 rounded-3xl mb-2.5"
                style={{
                  background: "rgba(20,20,28,0.85)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <img
                  src={ref?.photo}
                  alt={ref?.name}
                  className="rounded-full object-cover flex-shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    border: "1.5px solid rgba(255,255,255,0.1)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
                    {match.homeTeam} - {match.awayTeam}
                  </div>
                  <div style={{ color: "#44445A", fontSize: 11, marginTop: 1 }}>
                    {ref?.name}
                  </div>
                </div>
                <div
                  className="px-3 py-1.5 rounded-2xl"
                  style={{
                    background: `${scoreColor}14`,
                    border: `1px solid ${scoreColor}33`,
                  }}
                >
                  <span style={{ color: scoreColor, fontSize: 15, fontWeight: 900 }}>
                    {match.userScore}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Settings */}
        <div className="mb-5">
          <div
            className="mb-3 px-1"
            style={{
              color: "#44445A",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.07em",
            }}
          >
            AYARLAR
          </div>

          <SettingsRow
            icon={<Bell size={16} color="#C8FF00" />}
            label="Bildirimler"
            right={
              <motion.div
                whileTap={{ scale: 0.9 }}
                onClick={() => setNotificationsOn(!notificationsOn)}
                className="relative cursor-pointer"
                style={{
                  width: 50,
                  height: 30,
                  borderRadius: 15,
                  background: notificationsOn ? "#C8FF00" : "rgba(255,255,255,0.1)",
                  transition: "background 0.25s",
                }}
              >
                <motion.div
                  animate={{ x: notificationsOn ? 22 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{
                    position: "absolute",
                    top: 3,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: notificationsOn ? "#0A0A0F" : "#44445A",
                  }}
                />
              </motion.div>
            }
          />

          <SettingsRow
            icon={<Globe size={16} color="#4FA3FF" />}
            label="Dil: Türkçe"
            right={<ChevronRight size={16} color="#44445A" />}
          />

          <SettingsRow
            icon={<Shield size={16} color="#AF52DE" />}
            label="Gizlilik"
            right={<ChevronRight size={16} color="#44445A" />}
          />

          <SettingsRow
            icon={<MessageSquare size={16} color="#FF9500" />}
            label="Geri Bildirim Gönder"
            right={<ChevronRight size={16} color="#44445A" />}
          />
        </div>

        {/* Version */}
        <div className="text-center">
          <span style={{ color: "#2A2A3A", fontSize: 11 }}>RefScore v1.0.0</span>
        </div>
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  right: React.ReactNode;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="flex items-center justify-between px-4 py-4 rounded-3xl mb-2"
      style={{
        background: "rgba(20,20,28,0.85)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        minHeight: 56,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-xl"
          style={{
            width: 34,
            height: 34,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          {icon}
        </div>
        <span style={{ color: "#fff", fontSize: 14 }}>{label}</span>
      </div>
      {right}
    </motion.div>
  );
}