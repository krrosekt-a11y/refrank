import { useLocation, useNavigate } from "react-router";
import { Home, Trophy, Calendar, User, Search } from "lucide-react";
import { motion } from "motion/react";

const navItems = [
  { label: "Ana Sayfa", icon: Home, path: "/" },
  { label: "Maçlar", icon: Calendar, path: "/matches" },
  { label: "Ara", icon: Search, path: "/search" },
  { label: "Liderlik", icon: Trophy, path: "/leaderboard" },
  { label: "Profil", icon: User, path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full z-50 flex justify-center"
      style={{
        maxWidth: 430,
        paddingBottom: "env(safe-area-inset-bottom, 16px)",
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 8,
        background: "linear-gradient(to top, rgba(13,13,16,0.98) 60%, transparent)",
        pointerEvents: "none",
      }}
    >
      {/* Floating Glass Pill */}
      <div
        className="flex items-center justify-around"
        style={{
          pointerEvents: "all",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          background: "rgba(22, 22, 30, 0.82)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 40,
          padding: "6px 8px",
          width: "100%",
          maxWidth: 360,
          boxShadow:
            "0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset",
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <motion.button
              key={item.label}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex flex-col items-center gap-0.5 relative"
              style={{
                flex: 1,
                paddingTop: 8,
                paddingBottom: 8,
                minHeight: 48,
                justifyContent: "center",
              }}
            >
              {/* Active background pill */}
              {active && (
                <motion.div
                  layoutId="activePill"
                  className="absolute inset-0 rounded-3xl"
                  style={{
                    background: "rgba(200,255,0,0.12)",
                    border: "1px solid rgba(200,255,0,0.22)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}

              <motion.div
                animate={{
                  y: active ? -1 : 0,
                  scale: active ? 1.08 : 1,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="relative z-10"
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 1.6}
                  color={active ? "#C8FF00" : "#55556A"}
                />
                {/* Live badge on Matches */}
                {item.badge && !active && (
                  <span
                    className="absolute flex items-center justify-center rounded-full"
                    style={{
                      width: 14,
                      height: 14,
                      background: "#FF4444",
                      top: -4,
                      right: -4,
                      fontSize: 8,
                      color: "#fff",
                      fontWeight: 800,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </motion.div>

              <span
                className="relative z-10"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.03em",
                  color: active ? "#C8FF00" : "#55556A",
                  fontWeight: active ? 700 : 500,
                  transition: "color 0.2s",
                }}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
