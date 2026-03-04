import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { matches, referees } from "../data";

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const leagueColors: Record<string, string> = {
  "Süper Lig": "#C8FF00",
  "UEFA Şampiyonlar Ligi": "#4FA3FF",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Mon=0
}

export function HomeCalendarPage() {
  const navigate = useNavigate();
  const today = new Date("2026-03-03");
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState("2026-03-03");

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const matchDates = new Set(matches.map((m) => m.date));

  const selectedMatches = matches.filter((m) => m.date === selectedDate);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const formatDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const statusLabel: Record<string, string> = {
    live: "CANLI",
    finished: "Bitti",
    upcoming: "Yaklaşan",
  };
  const statusColor: Record<string, string> = {
    live: "#FF5F5F",
    finished: "#44445A",
    upcoming: "#4FA3FF",
  };

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100%" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 48px)",
          backdropFilter: "blur(24px) saturate(180%)",
          background: "rgba(10,10,15,0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3 px-5 pb-3">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate(-1)}
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{ width: 38, height: 38, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ChevronLeft size={20} color="#fff" />
          </motion.button>
          <Calendar size={18} color="#C8FF00" />
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>Takvim</div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <motion.button whileTap={{ scale: 0.88 }} onClick={prevMonth}
            className="flex items-center justify-center rounded-full"
            style={{ width: 36, height: 36, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ChevronLeft size={16} color="#fff" />
          </motion.button>

          <div style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>
            {MONTHS[viewMonth]} {viewYear}
          </div>

          <motion.button whileTap={{ scale: 0.88 }} onClick={nextMonth}
            className="flex items-center justify-center rounded-full"
            style={{ width: 36, height: 36, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ChevronRight size={16} color="#fff" />
          </motion.button>
        </div>

        {/* Calendar grid */}
        <div
          className="rounded-3xl p-4 mb-6"
          style={{ background: "rgba(22,22,30,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-3">
            {DAYS.map((day) => (
              <div key={day} style={{ textAlign: "center", color: "#44445A", fontSize: 11, fontWeight: 600 }}>
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-y-1">
            {/* Padding */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const hasMatch = matchDates.has(dateStr);
              const isToday = dateStr === "2026-03-03";
              const isSelected = dateStr === selectedDate;

              return (
                <motion.button
                  key={day}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setSelectedDate(dateStr)}
                  className="flex flex-col items-center justify-center py-1 rounded-xl relative"
                  style={{
                    background: isSelected
                      ? "#C8FF00"
                      : isToday
                      ? "rgba(200,255,0,0.1)"
                      : "transparent",
                    border: isToday && !isSelected
                      ? "1px solid rgba(200,255,0,0.35)"
                      : "1px solid transparent",
                    minHeight: 38,
                  }}
                >
                  <span
                    style={{
                      color: isSelected ? "#0A0A0F" : isToday ? "#C8FF00" : "#fff",
                      fontSize: 13,
                      fontWeight: isSelected || isToday ? 800 : 500,
                    }}
                  >
                    {day}
                  </span>
                  {hasMatch && (
                    <div
                      style={{
                        width: 4, height: 4, borderRadius: 2,
                        background: isSelected ? "#0A0A0F" : "#C8FF00",
                        marginTop: 1,
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Selected date matches */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>
                {formatDate(selectedDate)}
              </span>
              {selectedMatches.length > 0 && (
                <span style={{ color: "#C8FF00", fontSize: 12, fontWeight: 600 }}>
                  {selectedMatches.length} maç
                </span>
              )}
            </div>

            {selectedMatches.length > 0 ? (
              <div className="flex flex-col gap-3 pb-32">
                {selectedMatches.map((match, i) => {
                  const ref = referees.find((r) => r.id === match.refereeId);
                  const lColor = leagueColors[match.league] ?? "#C8FF00";
                  const sColor = statusColor[match.status];

                  return (
                    <motion.button
                      key={match.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        if (match.status !== "upcoming") navigate(`/referee/${match.refereeId}/vote/${match.id}`);
                      }}
                      className="w-full text-left px-4 py-4 rounded-2xl"
                      style={{
                        background: "rgba(22,22,30,0.9)",
                        border: match.status === "live" ? "1px solid rgba(255,68,68,0.25)" : "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span style={{ color: lColor, fontSize: 10, fontWeight: 700 }}>
                          {match.league}
                        </span>
                        <span style={{ color: sColor, fontSize: 10, fontWeight: 700 }}>
                          {match.status === "live" && "● "}
                          {statusLabel[match.status]}
                          {match.status === "live" && ` ${match.minute}'`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div style={{ flex: 1, textAlign: "center", color: "#fff", fontSize: 15, fontWeight: 700 }}>
                          {match.homeTeam}
                        </div>
                        <div
                          className="px-3 py-2 rounded-xl mx-2"
                          style={{ background: "rgba(255,255,255,0.07)" }}
                        >
                          <span style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>
                            {match.status === "upcoming" ? match.time : `${match.homeScore}–${match.awayScore}`}
                          </span>
                        </div>
                        <div style={{ flex: 1, textAlign: "center", color: "#fff", fontSize: 15, fontWeight: 700 }}>
                          {match.awayTeam}
                        </div>
                      </div>

                      {ref && (
                        <div className="flex items-center gap-2 pt-2"
                          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                        >
                          <img
                            src={ref.photo}
                            alt=""
                            className="rounded-full object-cover"
                            style={{ width: 22, height: 22 }}
                          />
                          <span style={{ color: "#44445A", fontSize: 11 }}>Hakem: {ref.name}</span>
                          {match.status !== "upcoming" && (
                            <span
                              className="ml-auto px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(200,255,0,0.1)", color: "#C8FF00", fontSize: 10, fontWeight: 700 }}
                            >
                              Oy Ver →
                            </span>
                          )}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center py-12 gap-3"
              >
                <Calendar size={48} color="#44445A" />
                <div style={{ color: "#44445A", fontSize: 14 }}>Bu tarihe ait maç yok</div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}