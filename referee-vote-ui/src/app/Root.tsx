import { Navigate, Outlet, useLocation } from "react-router";
import { BottomNav } from "./components/BottomNav";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "./auth/AuthProvider";

const HIDE_NAV_PREFIXES = ["/splash", "/onboarding", "/auth"];
const PUBLIC_PREFIXES = ["/splash", "/onboarding", "/auth"];

export function Root() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [showLaunch, setShowLaunch] = useState(true);
  const isVotePage = location.pathname.includes("/vote");
  const isHideNavRoute = HIDE_NAV_PREFIXES.some((p) =>
    location.pathname.startsWith(p)
  );
  const isPublicRoute = PUBLIC_PREFIXES.some((p) =>
    location.pathname.startsWith(p)
  );
  const showNav = !isVotePage && !isHideNavRoute;

  useEffect(() => {
    const t = setTimeout(() => setShowLaunch(false), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!loading && !user && !isPublicRoute) {
    return <Navigate to="/auth/signin" replace />;
  }

  if (
    !loading &&
    user &&
    (location.pathname === "/auth/signin" || location.pathname === "/auth/signup")
  ) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      className="flex justify-center items-start min-h-screen w-full"
      style={{
        background:
          "radial-gradient(1200px 500px at 50% -120px, rgba(200,255,0,0.08), transparent 60%), #050508",
      }}
    >
      <div
        className="relative w-full flex flex-col min-h-screen overflow-hidden"
        style={{
          maxWidth: 430,
          background: "#0A0A0F",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 2px 0 40px rgba(0,0,0,0.8), -2px 0 40px rgba(0,0,0,0.8)",
        }}
      >
        {/* Ambient glow at top */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: 200,
            background:
              "radial-gradient(ellipse 80% 120px at 50% 0%, rgba(200,255,0,0.04) 0%, transparent 100%)",
            zIndex: 0,
          }}
        />

        <div
          className="flex-1 overflow-y-auto relative"
          style={{ paddingBottom: showNav ? 88 : 0 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ minHeight: "100%" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>

        {showNav && <BottomNav />}
      </div>

      <AnimatePresence>
        {showLaunch ? (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.32 } }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 120,
              background:
                "radial-gradient(500px 240px at 50% 14%, rgba(200,255,0,0.18), rgba(10,10,16,0.96) 55%), #0A0A10",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: "max(env(safe-area-inset-top), 0px)",
              paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              style={{ textAlign: "center" }}
            >
              <div
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: 22,
                  margin: "0 auto 14px",
                  background:
                    "linear-gradient(160deg, rgba(200,255,0,0.95), rgba(148,204,0,0.88))",
                  color: "#0A0A0F",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow:
                    "0 12px 40px rgba(170,230,0,0.28), inset 0 -10px 20px rgba(0,0,0,0.12)",
                }}
              >
                <ShieldCheck size={34} strokeWidth={2.2} />
              </div>
              <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.7px" }}>
                <span style={{ color: "#C8FF00" }}>REF</span>
                <span style={{ color: "#fff" }}>SCORE</span>
              </div>
              <div style={{ marginTop: 6, color: "#96a3be", fontSize: 13, fontWeight: 500 }}>
                Hakem Analitik Platformu
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
