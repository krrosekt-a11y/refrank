import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Activity, Calendar, ChevronLeft, ChevronRight, Clock3, MapPin, ShieldAlert, ShieldCheck, Star, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Referee } from "../data";
import {
  fetchDbMatches,
  fetchDbReferees,
  fetchMatchDecisionEvents,
  fetchSportmonksWeekFixtures,
  fetchUpcomingFixtures,
  type DbMatch,
  type MatchDecisionEvent,
  type SportmonksWeekFixture,
  type UpcomingFixture,
} from "../lib/localdbApi";
import {
  fetchLiveVoteSnapshot,
  getOrCreateVoteUserKey,
  isLiveVotesConfigured,
  submitLiveIncidentVote,
  type IncidentVoteStat,
} from "../lib/liveVotes";
import { upsertDecisionVoteCloud } from "../lib/decisionVotesCloud";

type TimelineItem = {
  id: string;
  matchId?: number;
  refereeId?: string;
  date: Date;
  dateLabel: string;
  home: string;
  away: string;
  league: string;
  score?: string;
  referee?: string;
  refereeEstimated?: boolean;
  refereeConfidence?: number;
  round?: string;
  weekNum?: number;
  statusCode?: string;
  venue?: string;
  isPast: boolean;
};

type MatchEventKind = "goal" | "yellow" | "red" | "sub" | "penalty" | "var" | "other";
type MatchEventSide = "home" | "away" | "neutral";
type MatchFeedItem = {
  id: string;
  sourceIndex: number;
  side: MatchEventSide;
  minuteLabel: string;
  minute: number;
  extraMinute: number;
  sortMinute: number;
  kind: MatchEventKind;
  title: string;
  relatedPlayer?: string;
};


function detectEventKind(type: string, result: string): MatchEventKind {
  const txt = `${type} ${result}`.toLowerCase();
  if (txt.includes("sub")) return "sub";
  if (txt.includes("yellow") || txt.includes("sarı")) return "yellow";
  if (txt.includes("red") || txt.includes("kırmızı")) return "red";
  if (txt.includes("pen")) return "penalty";
  if (txt.includes("var")) return "var";
  if (txt.includes("goal") || txt.includes("gol")) return "goal";
  return "other";
}

function eventIcon(kind: MatchEventKind) {
  if (kind === "yellow") {
    return (
      <span
        style={{
          width: 9,
          height: 16,
          borderRadius: 2,
          background: "#facc15",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.12)",
        }}
      />
    );
  }
  if (kind === "red") {
    return (
      <span
        style={{
          width: 9,
          height: 16,
          borderRadius: 2,
          background: "#ef4444",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.12)",
        }}
      />
    );
  }
  if (kind === "sub") {
    return <span style={{ color: "#34d399", fontSize: 12, fontWeight: 900 }}>↪</span>;
  }
  if (kind === "goal") {
    return <span style={{ color: "#60a5fa", fontSize: 12 }}>⚽</span>;
  }
  if (kind === "penalty") {
    return <span style={{ color: "#f59e0b", fontSize: 12 }}>◎</span>;
  }
  if (kind === "var") {
    return <span style={{ color: "#a78bfa", fontSize: 11, fontWeight: 800 }}>VAR</span>;
  }
  return <span style={{ color: "#8fa0be", fontSize: 10 }}>•</span>;
}


function parseFixtureDate(s: string): Date | null {
  if (!s) return null;
  const normalized = s.replace(" - ", " ");
  const isoLike = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (isoLike) {
    const d = new Date(`${isoLike[1]}-${isoLike[2]}-${isoLike[3]}T${isoLike[4]}:${isoLike[5]}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const trDot = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})[ T](\d{2}):(\d{2})/);
  if (trDot) {
    const d = new Date(`${trDot[3]}-${trDot[2].padStart(2, "0")}-${trDot[1].padStart(2, "0")}T${trDot[4]}:${trDot[5]}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const months: Record<string, string> = {
    ocak: "01",
    şubat: "02",
    subat: "02",
    mart: "03",
    nisan: "04",
    mayıs: "05",
    mayis: "05",
    haziran: "06",
    temmuz: "07",
    ağustos: "08",
    agustos: "08",
    eylül: "09",
    eylul: "09",
    ekim: "10",
    kasım: "11",
    kasim: "11",
    aralık: "12",
    aralik: "12",
  };
  const trLong = normalized.match(/^(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (trLong) {
    const mon = months[(trLong[2] || "").toLowerCase()];
    if (mon) {
      const hh = (trLong[4] || "12").padStart(2, "0");
      const mm = (trLong[5] || "00").padStart(2, "0");
      const d = new Date(`${trLong[3]}-${mon}-${trLong[1].padStart(2, "0")}T${hh}:${mm}:00`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractRoundWeekNumber(round?: string): number | null {
  const txt = (round || "").trim();
  if (!txt) return null;
  const m = txt.match(/(\d{1,2})/);
  if (!m) return null;
  return Number(m[1]);
}

function weekStartKey(d: Date): number {
  const x = new Date(d);
  const day = x.getDay();
  const shift = (day + 6) % 7;
  x.setDate(x.getDate() - shift);
  x.setHours(0, 0, 0, 0);
  return Math.floor(x.getTime() / 86400000);
}

function seasonKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const start = m >= 7 ? y : y - 1;
  const end = String((start + 1) % 100).padStart(2, "0");
  return `${start}-${end}`;
}

function compactLeagueName(name: string): string {
  const t = (name || "").toLowerCase();
  if (t.includes("trendyol süper lig")) return "Trendyol Süper Lig";
  if (t.includes("ziraat türkiye kupası")) return "Ziraat Türkiye Kupası";
  return (name || "").replace(/\s*\(.*?\)\s*/g, "").trim();
}

function compactTeamName(name: string): string {
  const s = (name || "").trim();
  const up = s
    .toUpperCase()
    .replace(/İ/g, "I")
    .replace(/Ş/g, "S")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C");

  const map: Array<[string, string]> = [
    ["GALATASARAY", "Galatasaray"],
    ["FENERBAHCE", "Fenerbahçe"],
    ["BESIKTAS", "Beşiktaş"],
    ["TRABZONSPOR", "Trabzonspor"],
    ["BASAKSEHIR", "Başakşehir"],
    ["GOZTEPE", "Göztepe"],
    ["KASIMPASA", "Kasımpaşa"],
    ["KAYSERISPOR", "Kayserispor"],
    ["KONYASPOR", "Konyaspor"],
    ["RIZESPOR", "Rizespor"],
    ["EYUPSPOR", "Eyüpspor"],
    ["ALANYASPOR", "Alanyaspor"],
    ["ANTALYASPOR", "Antalyaspor"],
    ["GAZIANTEP", "Gaziantep FK"],
    ["GENCLERBIRLIGI", "Gençlerbirliği"],
    ["SAMSUNSPOR", "Samsunspor"],
    ["KOCAELISPOR", "Kocaelispor"],
    ["HATAYSPOR", "Hatayspor"],
    ["ADANA DEMIRSPOR", "Adana Demirspor"],
    ["FATIH KARAGUMRUK", "Karagümrük"],
    ["ANKARAGUCU", "Ankaragücü"],
    ["SIVASSPOR", "Sivasspor"],
  ];
  const hit = map.find(([k]) => up.includes(k));
  if (hit) return hit[1];

  return s
    .replace(/\bA\.?Ş\.?\b/gi, "")
    .replace(/\bFUTBOL KULÜBÜ\b/gi, "")
    .replace(/\bFK\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function teamKey(name: string): string {
  return compactTeamName(name)
    .toUpperCase()
    .replace(/İ/g, "I")
    .replace(/Ş/g, "S")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatScoreInline(score?: string): string {
  const s = (score || "").trim();
  if (!s) return "";
  const m = s.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (m) return `${m[1]} - ${m[2]}`;
  return s;
}

function formatMatchDateTime(d: Date): string {
  return d.toLocaleString("tr-TR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatusCode(status?: string): string {
  return String(status || "").trim().toUpperCase();
}

function isLiveMatchStatus(status?: string): boolean {
  const s = normalizeStatusCode(status);
  return ["LIVE", "INPLAY", "HT", "BREAK", "ET", "PEN_LIVE"].includes(s);
}

function isFinishedMatchStatus(status?: string): boolean {
  const s = normalizeStatusCode(status);
  return ["FT", "AET", "PEN", "FINISHED", "AWD", "WO"].includes(s);
}

function matchStatusText(match: TimelineItem): string {
  if (isLiveMatchStatus(match.statusCode)) return "Canlı";
  if (isFinishedMatchStatus(match.statusCode) || match.isPast) return "Tamamlandı";
  return "Gelecek";
}

function NumericVoteControl({
  value,
  onSelect,
}: {
  value?: number;
  onSelect: (score: number) => void;
}) {
  const selectedScore = typeof value === "number" ? Math.max(0, Math.min(10, Math.round(value))) : null;
  const scores = Array.from({ length: 11 }, (_, i) => i);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="flex items-center gap-1" style={{ flexWrap: "wrap" }}>
        {scores.map((score) => {
          const active = selectedScore === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onSelect(score)}
              className="rounded-md"
              style={{
                minWidth: 28,
                height: 28,
                padding: "0 8px",
                fontSize: 12,
                fontWeight: 800,
                color: active ? "#0B1020" : "#c9d6ef",
                background: active ? "#C8FF00" : "rgba(255,255,255,0.08)",
                border: active ? "1px solid rgba(200,255,0,0.65)" : "1px solid rgba(255,255,255,0.18)",
                boxShadow: active ? "0 0 12px rgba(200,255,0,0.45)" : "none",
              }}
            >
              {score}
            </button>
          );
        })}
      </div>
      <div style={{ color: "#8ea0be", fontSize: 10, fontWeight: 700 }}>
        Seçili puan: {selectedScore ?? "-"}
      </div>
    </div>
  );
}

export function MatchesPage() {
  const navigate = useNavigate();
  const [referees, setReferees] = useState<Referee[]>([]);
  const [matches, setMatches] = useState<DbMatch[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingFixture[]>([]);
  const [sportWeek24, setSportWeek24] = useState<SportmonksWeekFixture[]>([]);
  const [activeWeek, setActiveWeek] = useState(25);
  const [selectedMatch, setSelectedMatch] = useState<TimelineItem | null>(null);
  const [activeVoteItem, setActiveVoteItem] = useState<MatchFeedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [decisionVotes, setDecisionVotes] = useState<Record<string, number>>({});
  const [liveVoteStats, setLiveVoteStats] = useState<Record<string, IncidentVoteStat>>({});
  const [liveMyVotes, setLiveMyVotes] = useState<Record<string, number | undefined>>({});
  const [selectedApiEvents, setSelectedApiEvents] = useState<MatchDecisionEvent[]>([]);
  const [loadingApiEvents, setLoadingApiEvents] = useState(false);
  const [voteCloudError, setVoteCloudError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([fetchDbReferees(120), fetchDbMatches(400), fetchUpcomingFixtures(21), fetchSportmonksWeekFixtures(24)])
      .then(([rs, ms, up, sm24]) => {
        if (!alive) return;
        setReferees(rs);
        setMatches(ms);
        setUpcoming(up);
        setSportWeek24(sm24);
      })
      .catch(() => {
        if (!alive) return;
        setReferees([]);
        setMatches([]);
        setUpcoming([]);
        setSportWeek24([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const selectedSportmonksFixtureId = useMemo(() => {
    if (!selectedMatch) return undefined;
    if (String(selectedMatch.id || "").startsWith("s-")) return selectedMatch.matchId;
    const selectedHome = teamKey(selectedMatch.home);
    const selectedAway = teamKey(selectedMatch.away);
    const selectedDay = `${selectedMatch.date.getFullYear()}-${String(selectedMatch.date.getMonth() + 1).padStart(2, "0")}-${String(selectedMatch.date.getDate()).padStart(2, "0")}`;
    const found = sportWeek24.find((fx) => {
      const fxDate = parseFixtureDate(fx.date);
      if (!fxDate) return false;
      const fxDay = `${fxDate.getFullYear()}-${String(fxDate.getMonth() + 1).padStart(2, "0")}-${String(fxDate.getDate()).padStart(2, "0")}`;
      return fxDay === selectedDay && teamKey(fx.home_team) === selectedHome && teamKey(fx.away_team) === selectedAway;
    });
    return found?.fixture_id || selectedMatch.matchId;
  }, [selectedMatch, sportWeek24]);

  useEffect(() => {
    if (!selectedMatch) {
      setSelectedApiEvents([]);
      setLoadingApiEvents(false);
      return;
    }
    let alive = true;
    setLoadingApiEvents(true);
    fetchMatchDecisionEvents({
      fixtureId: selectedSportmonksFixtureId,
      homeTeam: selectedMatch.home,
      awayTeam: selectedMatch.away,
      date: selectedMatch.dateLabel,
    })
      .then((rows) => {
        if (!alive) return;
        setSelectedApiEvents(rows);
      })
      .catch(() => {
        if (!alive) return;
        setSelectedApiEvents([]);
      })
      .finally(() => {
        if (alive) setLoadingApiEvents(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedMatch, selectedSportmonksFixtureId]);

  useEffect(() => {
    setActiveVoteItem(null);
  }, [selectedMatch?.id]);

  const fixtureView = useMemo(() => {
    const now = new Date();
    const currentSeason = seasonKeyFromDate(now);
    const timeline: TimelineItem[] = [];
    for (const m of matches) {
      const d = parseFixtureDate(m.date);
      if (!d) continue;
      if (seasonKeyFromDate(d) !== currentSeason) continue;
      timeline.push({
        id: `m-${m.id}`,
        matchId: m.id,
        refereeId: m.refereeId,
        date: d,
        dateLabel: m.date,
        home: m.homeTeam,
        away: m.awayTeam,
        league: m.league,
        score: m.score,
        referee: m.refereeName || "",
        weekNum: Number(m.weekNumber || 0) || undefined,
        isPast: d.getTime() <= now.getTime(),
      });
    }

    let inferredCurrentWeek: number | null = null;
    let anchorCurrentWeekStartMs: number | null = null;
    const upcomingCandidates: Array<{ week: number; date: Date }> = [];
    for (const f of upcoming) {
      const d = parseFixtureDate(f.date);
      if (!d) continue;
      if (seasonKeyFromDate(d) !== currentSeason) continue;
      const parsedRound = extractRoundWeekNumber(f.round);
      if (parsedRound) {
        upcomingCandidates.push({ week: parsedRound, date: d });
      }
      timeline.push({
        id: `u-${f.fixture_id}`,
        matchId: f.fixture_id,
        date: d,
        dateLabel: f.date,
        home: f.home_team,
        away: f.away_team,
        league: f.league_name,
        referee: f.referee,
        refereeEstimated: f.referee_is_estimated,
        refereeConfidence: f.referee_confidence,
        round: f.round,
        weekNum: parsedRound || undefined,
        statusCode: f.status,
        isPast: false,
      });
    }

    for (const s of sportWeek24) {
      const d = parseFixtureDate(s.date);
      if (!d) continue;
      const status = normalizeStatusCode(s.status);
      timeline.push({
        id: `s-${s.fixture_id}`,
        matchId: s.fixture_id,
        date: d,
        dateLabel: s.date,
        home: s.home_team,
        away: s.away_team,
        league: s.league_name,
        score: s.score || "",
        referee: s.referee || "",
        round: s.round || "24. Hafta",
        weekNum: 24,
        statusCode: status,
        venue: s.venue || "",
        isPast: isFinishedMatchStatus(status) || (!isLiveMatchStatus(status) && d.getTime() < now.getTime()),
      });
    }

    if (upcomingCandidates.length) {
      const sortedFuture = upcomingCandidates
        .filter((x) => x.date.getTime() >= now.getTime() - 24 * 3600 * 1000)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      const first = sortedFuture[0] || upcomingCandidates[0];
      inferredCurrentWeek = first.week;
      const sameWeek = upcomingCandidates
        .filter((x) => x.week === first.week)
        .map((x) => x.date.getTime());
      anchorCurrentWeekStartMs = sameWeek.length ? Math.min(...sameWeek) : first.date.getTime();
    }
    const currentWeekNum = inferredCurrentWeek || 25;
    const anchorMs = anchorCurrentWeekStartMs ?? now.getTime();

    for (const item of timeline) {
      if (item.weekNum) continue;
      const diffWeeks = Math.floor((item.date.getTime() - anchorMs) / (7 * 24 * 3600 * 1000));
      item.weekNum = currentWeekNum + diffWeeks;
    }

    const dedup = new Map<string, TimelineItem>();
    const quality = (x: TimelineItem) => {
      let q = 0;
      if (x.id.startsWith("s-")) q += 8;
      if (x.id.startsWith("m-")) q += x.isPast ? 4 : 1;
      if (!x.isPast && x.id.startsWith("u-")) q += 2;
      if (x.score && /\d+\s*[-:]\s*\d+/.test(x.score)) q += 3;
      if (x.referee) q += x.refereeEstimated ? 1 : 2;
      if (!x.isPast && x.referee) q += 3;
      if (x.isPast) q += 1;
      return q;
    };
    for (const item of timeline) {
      const dayKey = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, "0")}-${String(item.date.getDate()).padStart(2, "0")}`;
      const weekKey = item.weekNum ? `w${item.weekNum}` : `d${dayKey}`;
      const key = `${weekKey}|${teamKey(item.home)}|${teamKey(item.away)}`;
      const prev = dedup.get(key);
      if (!prev || quality(item) > quality(prev)) {
        dedup.set(key, item);
      }
    }
    const timelineUnique = [...dedup.values()];

    const groups = new Map<number, TimelineItem[]>();
    for (const item of timelineUnique) {
      const k = Number(item.weekNum || 0);
      if (!k) continue;
      const arr = groups.get(k) || [];
      arr.push(item);
      groups.set(k, arr);
    }
    const sortedKeys = [...groups.keys()].sort((a, b) => a - b);
    const grouped = sortedKeys.map((k) => {
      const items = (groups.get(k) || []).sort((a, b) => a.date.getTime() - b.date.getTime());
      return { week: k, label: `${k}. Hafta`, items };
    });
    return { currentWeekNum, grouped };
  }, [matches, sportWeek24, upcoming]);

  const visibleWeeks = useMemo(() => {
    const base = activeWeek || fixtureView.currentWeekNum || 25;
    return [base - 2, base - 1, base, base + 1, base + 2].filter((w) => w >= 1);
  }, [activeWeek, fixtureView.currentWeekNum]);

  useEffect(() => {
    setActiveWeek((prev) => {
      if (fixtureView.grouped.some((w) => w.week === prev)) return prev;
      if (fixtureView.grouped.some((w) => w.week === 24)) return 24;
      return fixtureView.currentWeekNum || 25;
    });
  }, [fixtureView.currentWeekNum, fixtureView.grouped]);

  const selectedWeek = fixtureView.grouped.find((w) => w.week === activeWeek);

  const matchFeedItems = useMemo(() => {
    if (!selectedMatch || !selectedApiEvents.length) return [] as MatchFeedItem[];
    const homeKeyNorm = teamKey(selectedMatch.home);
    const awayKeyNorm = teamKey(selectedMatch.away);
    return selectedApiEvents
      .map((ev, index) => {
        const evTeamKey = teamKey(ev.team || "");
        let side: MatchEventSide = "neutral";
        if (evTeamKey && evTeamKey === homeKeyNorm) side = "home";
        else if (evTeamKey && evTeamKey === awayKeyNorm) side = "away";
        const minute = Number(ev.minute || 0);
        const extra = Number(ev.extra_minute || 0);
        const title = String(ev.player || ev.team || ev.type || "Hakem Kararı");
        return {
          id: `feed-${ev.id}`,
          sourceIndex: index,
          side,
          minuteLabel: minute > 0 ? `${minute}${extra > 0 ? `+${extra}` : ""}'` : "'",
          minute,
          extraMinute: extra,
          sortMinute: minute * 10 + extra,
          kind: detectEventKind(String(ev.type || ""), String(ev.result || "")),
          title,
          relatedPlayer: String(ev.related_player || ""),
        } satisfies MatchFeedItem;
      })
      .sort((a, b) => {
        if (b.sortMinute !== a.sortMinute) return b.sortMinute - a.sortMinute;
        return a.sourceIndex - b.sourceIndex;
      });
  }, [selectedApiEvents, selectedMatch]);

  const firstHalfStoppage = useMemo(() => {
    const extras = matchFeedItems
      .filter((item) => item.minute === 45 && item.extraMinute > 0)
      .map((item) => item.extraMinute);
    return extras.length ? Math.max(...extras) : 0;
  }, [matchFeedItems]);
  const secondHalfStoppage = useMemo(() => {
    const extras = matchFeedItems
      .filter((item) => item.minute === 90 && item.extraMinute > 0)
      .map((item) => item.extraMinute);
    return extras.length ? Math.max(...extras) : 0;
  }, [matchFeedItems]);
  const timelineRows = useMemo(
    () =>
      [...matchFeedItems]
        .sort((a, b) => {
          if (b.sortMinute !== a.sortMinute) return b.sortMinute - a.sortMinute;
          return a.sourceIndex - b.sourceIndex;
        })
        .slice(0, 40),
    [matchFeedItems],
  );
  const secondHalfRows = useMemo(
    () => timelineRows.filter((item) => item.minute >= 46),
    [timelineRows],
  );
  const firstHalfRows = useMemo(
    () => timelineRows.filter((item) => item.minute > 0 && item.minute <= 45),
    [timelineRows],
  );
  const finalScoreLine = useMemo(() => {
    const raw = selectedMatch?.score ? formatScoreInline(selectedMatch.score) : "";
    return raw || "-";
  }, [selectedMatch?.score]);
  const firstHalfScoreLine = useMemo(() => {
    let home = 0;
    let away = 0;
    for (const item of matchFeedItems) {
      const isFirstHalf = item.minute < 46 || item.minute === 45;
      if (!isFirstHalf || item.kind !== "goal") continue;
      if (item.side === "home") home += 1;
      if (item.side === "away") away += 1;
    }
    return `${home} - ${away}`;
  }, [matchFeedItems]);
  const liveIncidentIds = useMemo(
    () => (selectedMatch ? matchFeedItems.map((item) => `${selectedMatch.id}:${item.id}`) : []),
    [matchFeedItems, selectedMatch],
  );

  useEffect(() => {
    if (!isLiveVotesConfigured()) {
      setLiveVoteStats({});
      setLiveMyVotes({});
      return;
    }
    if (!liveIncidentIds.length) {
      setLiveVoteStats({});
      setLiveMyVotes({});
      return;
    }
    let alive = true;
    const userKey = getOrCreateVoteUserKey();
    fetchLiveVoteSnapshot(liveIncidentIds, userKey)
      .then((snapshot) => {
        if (!alive) return;
        setLiveVoteStats(snapshot.stats || {});
        setLiveMyVotes(snapshot.myVotes || {});
      })
      .catch(() => {
        if (!alive) return;
        setLiveVoteStats({});
        setLiveMyVotes({});
      });
    return () => {
      alive = false;
    };
  }, [liveIncidentIds]);
  const selectedMatchVoteStats = useMemo(() => {
    if (!selectedMatch) return { voted: 0, average: null as number | null };
    if (isLiveVotesConfigured()) {
      const stats = liveIncidentIds.map((id) => liveVoteStats[id]).filter(Boolean);
      const totalVotes = stats.reduce((sum, s) => sum + Number(s.totalVotes || 0), 0);
      if (!totalVotes) return { voted: 0, average: null as number | null };
      const weightedAverage =
        stats.reduce((sum, s) => sum + Number(s.average || 0) * Number(s.totalVotes || 0), 0) / totalVotes;
      return { voted: totalVotes, average: weightedAverage };
    }
    const prefix = `${selectedMatch.id}:`;
    const values = Object.entries(decisionVotes)
      .filter(([k, v]) => k.startsWith(prefix) && typeof v === "number")
      .map(([, v]) => Number(v));
    if (!values.length) return { voted: 0, average: null };
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    return { voted: values.length, average: avg };
  }, [decisionVotes, liveIncidentIds, liveVoteStats, selectedMatch]);

  const matchNotStarted = useMemo(
    () => Boolean(selectedMatch && !selectedMatch.isPast && !isLiveMatchStatus(selectedMatch.statusCode)),
    [selectedMatch],
  );
  const votingLocked = useMemo(
    () => matchNotStarted && matchFeedItems.length === 0,
    [matchFeedItems.length, matchNotStarted],
  );

  async function voteDecision(itemId: string, score: number) {
    if (!selectedMatch || votingLocked) return;
    if (!isLiveVotesConfigured()) {
      setVoteCloudError("Bulut bağlantısı yok. Oy kaydı için Supabase ayarları zorunlu.");
      return;
    }
    setVoteCloudError("");
    const key = `${selectedMatch.id}:${itemId}`;
    const normalized = Math.max(0, Math.min(10, Math.round(score)));
    const votedItem = matchFeedItems.find((item) => item.id === itemId);
    setDecisionVotes((prev) => {
      const next = { ...prev, [key]: normalized };
      return next;
    });
    try {
      const userKey = getOrCreateVoteUserKey();
      let decisionHistoryFailed = false;

      try {
        await upsertDecisionVoteCloud(userKey, {
          incidentId: key,
          matchId: selectedMatch.id,
          homeTeam: selectedMatch.home,
          awayTeam: selectedMatch.away,
          minuteLabel: votedItem?.minuteLabel || "-",
          eventTitle: `${votedItem?.kind || "other"}|${votedItem?.side || "neutral"}|${votedItem?.title || "Hakem Kararı"}`,
          score: normalized,
        });
      } catch (err) {
        decisionHistoryFailed = true;
        console.error("decision_vote_history upsert failed", err);
      }

      const stat = await submitLiveIncidentVote(key, normalized, userKey);
      setLiveMyVotes((prev) => ({ ...prev, [key]: normalized }));
      setLiveVoteStats((prev) => ({ ...prev, [key]: stat }));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("refscore:decision-votes-updated"));
      }
      if (decisionHistoryFailed) {
        setVoteCloudError("Oy kaydedildi, ancak oy geçmişi tablosuna yazılamadı.");
      }
    } catch (err) {
      console.error("live_incident_votes upsert failed", err);
      setVoteCloudError("Oy buluta kaydedilemedi. Lütfen tekrar dene.");
    }
  }

  const activeVoteValue = useMemo(() => {
    if (!selectedMatch || !activeVoteItem) return undefined;
    const key = `${selectedMatch.id}:${activeVoteItem.id}`;
    return isLiveVotesConfigured() ? liveMyVotes[key] : decisionVotes[key];
  }, [activeVoteItem, decisionVotes, liveMyVotes, selectedMatch]);
  const activeVoteStat = useMemo(() => {
    if (!selectedMatch || !activeVoteItem) return null;
    return liveVoteStats[`${selectedMatch.id}:${activeVoteItem.id}`] || null;
  }, [activeVoteItem, liveVoteStats, selectedMatch]);

  const refereeIdByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of referees) {
      const key = (r.name || "")
        .toUpperCase()
        .replace(/İ/g, "I")
        .replace(/Ş/g, "S")
        .replace(/Ğ/g, "G")
        .replace(/Ü/g, "U")
        .replace(/Ö/g, "O")
        .replace(/Ç/g, "C")
        .replace(/[^A-Z0-9 ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (key) m.set(key, r.id);
    }
    return m;
  }, [referees]);

  function openReferee(refName?: string, refId?: string) {
    if (refId) {
      navigate(`/referee/${refId}`);
      return;
    }
    const key = (refName || "")
      .toUpperCase()
      .replace(/İ/g, "I")
      .replace(/Ş/g, "S")
      .replace(/Ğ/g, "G")
      .replace(/Ü/g, "U")
      .replace(/Ö/g, "O")
      .replace(/Ç/g, "C")
      .replace(/[^A-Z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const found = key ? refereeIdByName.get(key) : "";
    if (found) navigate(`/referee/${found}`);
  }

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100%", overflowX: "hidden" }}>
      <div
        className="sticky top-0 z-40"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 48px)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          background: "rgba(10,10,15,0.88)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="px-5 pb-3">
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.8px" }}>
            <span style={{ color: "#C8FF00" }}>REF</span>
            <span style={{ color: "#fff" }}>SCORE</span>
          </div>
          <div style={{ color: "#67748d", fontSize: 12 }}>Local DB entegrasyonu aktif</div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-28">
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2">
            <Calendar size={16} color="#C8FF00" />
            <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>Yaklaşan Fikstür (Sportmonks)</h2>
          </div>
          {fixtureView.grouped.length === 0 ? (
            <div className="p-3 rounded-2xl" style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)", color: "#7f8ba3", fontSize: 12 }}>
              Fikstür verisi bulunamadı.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <div className="p-2 rounded-2xl" style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setActiveWeek((x) => Math.max(1, x - 1))}
                    className="p-1 rounded-lg"
                    style={{ color: "#cbd5e1" }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>
                    {selectedWeek?.label || "-"}
                  </div>
                  <button
                    onClick={() => setActiveWeek((x) => x + 1)}
                    className="p-1 rounded-lg"
                    style={{ color: "#cbd5e1" }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div style={{ marginTop: 6, maxWidth: "100%", overflowX: "auto", overflowY: "hidden", paddingBottom: 2 }}>
                  <div style={{ display: "flex", justifyContent: "center", width: "100%", minWidth: "max-content" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                    {visibleWeeks.map((w) => (
                      <button
                        key={w}
                        onClick={() => setActiveWeek(w)}
                        className="px-2 py-1 rounded-lg whitespace-nowrap"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: w === activeWeek ? "#0A0A0F" : "#b6c2d9",
                          background: w === activeWeek ? "#C8FF00" : "rgba(255,255,255,0.08)",
                          flex: "0 0 auto",
                        }}
                      >
                        {w}. Hafta
                      </button>
                    ))}
                    </div>
                  </div>
                </div>
              </div>

              {(selectedWeek?.items || []).slice(0, 12).map((f) => (
                <motion.div
                  key={f.id}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setSelectedMatch(f)}
                  className="p-3 rounded-2xl"
                  style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 150px", gap: 12, alignItems: "start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 800 }}>
                        <span style={{ color: "#C8FF00" }}>{compactLeagueName(f.league)}</span>
                        <span style={{ color: "#8f99ad", fontWeight: 600 }}> - {f.dateLabel}</span>
                      </div>
                      <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", alignItems: "center", gap: 6, width: "100%" }}>
                        <span
                          title={compactTeamName(f.home)}
                          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}
                        >
                          {compactTeamName(f.home)}
                        </span>
                        {f.score ? (
                          <button
                            onClick={() => setSelectedMatch(f)}
                            type="button"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "rgba(200,255,0,0.2)",
                              border: "1px solid rgba(200,255,0,0.35)",
                              color: "#C8FF00",
                              fontWeight: 900,
                              fontSize: 11,
                              letterSpacing: "0.2px",
                              cursor: "pointer",
                            }}
                          >
                            {formatScoreInline(f.score)}
                          </button>
                        ) : (
                          <span style={{ color: "#8f99ad", fontWeight: 600 }}>-</span>
                        )}
                        <span
                          title={compactTeamName(f.away)}
                          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, textAlign: "right" }}
                        >
                          {compactTeamName(f.away)}
                        </span>
                      </div>
                    </div>
                    <div style={{ borderLeft: "1px solid rgba(255,255,255,0.12)", paddingLeft: 10, minWidth: 0, textAlign: "right" }}>
                      <div style={{ color: "#7f8ba3", fontSize: 10 }}>Hakem</div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReferee(f.referee, f.refereeId);
                        }}
                        disabled={!f.referee}
                        style={{
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 700,
                          lineHeight: 1.3,
                          overflowWrap: "anywhere",
                          background: "transparent",
                          border: 0,
                          padding: 0,
                          textAlign: "right",
                          cursor: f.referee ? "pointer" : "default",
                        }}
                      >
                        {f.referee || "Hakem Ataması Bekleniyor"}
                      </button>
                      {!f.isPast && typeof f.refereeConfidence === "number" ? (
                        <div style={{ color: "#aeb8cd", fontSize: 9, marginTop: 2 }}>
                          Güven: %{Number(f.refereeConfidence || 0).toFixed(1)}
                        </div>
                      ) : null}
                      {!f.isPast && f.referee ? (
                        <div style={{ color: f.refereeEstimated ? "#facc15" : "#93c5fd", fontSize: 9, marginTop: 2 }}>
                          {f.refereeEstimated ? "Tahmini Atama" : "Resmi / API"}
                        </div>
                      ) : (
                        <div style={{ color: "#7f8ba3", fontSize: 9, marginTop: 2 }}>
                          {matchStatusText(f)}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-3 rounded-2xl" style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#7f8ba3", fontSize: 10 }}>Hakem</div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 900 }}>{referees.length}</div>
          </div>
          <div className="p-3 rounded-2xl" style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#7f8ba3", fontSize: 10 }}>Maç</div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 900 }}>{matches.length}</div>
          </div>
          <div className="p-3 rounded-2xl" style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#7f8ba3", fontSize: 10 }}>Ortalama Skor</div>
            <div style={{ color: "#C8FF00", fontSize: 20, fontWeight: 900 }}>
              {referees.length
                ? (referees.reduce((s, r) => s + r.careerScore, 0) / referees.length).toFixed(2)
                : "0.00"}
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/hakem-listesi")}
          className="w-full mb-3 p-4 rounded-2xl text-left"
          style={{ background: "rgba(22,22,30,0.88)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users size={16} color="#C8FF00" />
              <span style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>Hakem Listesi</span>
            </div>
            <span style={{ color: "#93c5fd", fontSize: 12, fontWeight: 700 }}>Aç</span>
          </div>
          <div style={{ color: "#7f8ba3", fontSize: 11, marginTop: 4 }}>
            Tüm hakemleri ayrı sayfada görüntüle.
          </div>
        </motion.button>

      </div>

      <AnimatePresence>
        {selectedMatch ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 70,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              onClick={() => setSelectedMatch(null)}
              style={{
                width: "100%",
                maxWidth: 430,
                height: "100%",
                background: "rgba(0,0,0,0.58)",
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <motion.div
                initial={{ y: 120, opacity: 0.4 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 160, opacity: 0.2 }}
                transition={{ type: "spring", stiffness: 330, damping: 32 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  maxHeight: "92vh",
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
                  borderTopLeftRadius: 22,
                  borderTopRightRadius: 22,
                  background: "linear-gradient(180deg, #121525 0%, #0F1220 100%)",
                  borderTop: "1px solid rgba(255,255,255,0.14)",
                  padding: "14px 16px 18px",
                  boxShadow: "0 -20px 60px rgba(0,0,0,0.45)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div style={{ width: 42, height: 4, borderRadius: 10, background: "rgba(255,255,255,0.25)" }} />
                  <button
                    type="button"
                    onClick={() => setSelectedMatch(null)}
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center"
                    style={{ color: "#B9C3DA", background: "rgba(255,255,255,0.06)" }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div style={{ color: "#C8FF00", fontSize: 11, fontWeight: 800 }}>
                    {compactLeagueName(selectedMatch.league)}
                  </div>
                  <div
                    className="px-2 py-1 rounded-full"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: isLiveMatchStatus(selectedMatch.statusCode) ? "#ff6b81" : selectedMatch.isPast ? "#93c5fd" : "#facc15",
                      border: `1px solid ${isLiveMatchStatus(selectedMatch.statusCode) ? "rgba(255,107,129,0.45)" : selectedMatch.isPast ? "rgba(147,197,253,0.35)" : "rgba(250,204,21,0.35)"}`,
                      background: isLiveMatchStatus(selectedMatch.statusCode) ? "rgba(255,107,129,0.18)" : selectedMatch.isPast ? "rgba(147,197,253,0.14)" : "rgba(250,204,21,0.14)",
                    }}
                  >
                    {matchStatusText(selectedMatch)}
                  </div>
                </div>

                <div className="mt-1" style={{ color: "#8fa0be", fontSize: 11 }}>
                  {formatMatchDateTime(selectedMatch.date)}
                </div>

                <div
                  className="mt-3 rounded-2xl p-3"
                  style={{
                    background: "linear-gradient(135deg, rgba(200,255,0,0.08) 0%, rgba(76,141,255,0.08) 100%)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ color: "#fff", fontSize: 20, fontWeight: 900, textAlign: "center", letterSpacing: "-0.3px" }}>
                    {compactTeamName(selectedMatch.home)} {selectedMatch.score ? formatScoreInline(selectedMatch.score) : "-"} {compactTeamName(selectedMatch.away)}
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-2" style={{ color: "#9fb0cd", fontSize: 11 }}>
                    <Activity size={12} />
                    {selectedMatch.round || (selectedMatch.weekNum ? `${selectedMatch.weekNum}. Hafta` : "-")}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ color: "#7f8ba3", fontSize: 10, marginBottom: 2 }}>Hafta</div>
                    <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>
                      {selectedMatch.weekNum ? `${selectedMatch.weekNum}. Hafta` : selectedMatch.round || "-"}
                    </div>
                  </div>
                  <div className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ color: "#7f8ba3", fontSize: 10, marginBottom: 2 }}>Hakem Atama</div>
                    <div className="inline-flex items-center gap-1" style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>
                      {selectedMatch.refereeEstimated ? <ShieldAlert size={12} color="#facc15" /> : <ShieldCheck size={12} color="#93c5fd" />}
                      {selectedMatch.isPast ? "Raporlanmış" : selectedMatch.refereeEstimated ? "Tahmini" : "Resmi"}
                    </div>
                  </div>
                  <div className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="inline-flex items-center gap-1" style={{ color: "#7f8ba3", fontSize: 10, marginBottom: 2 }}>
                      <MapPin size={10} />
                      Stadyum
                    </div>
                    <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>
                      {selectedMatch.venue || "-"}
                    </div>
                  </div>
                </div>

                <div className="mt-2 rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div style={{ color: "#7f8ba3", fontSize: 10 }}>Hakem</div>
                      <div style={{ color: "#fff", fontSize: 13, fontWeight: 800, lineHeight: 1.3 }}>
                        {selectedMatch.referee || "Atama yok"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="inline-flex items-center gap-1" style={{ color: "#7f8ba3", fontSize: 10 }}>
                        <Clock3 size={10} />
                        Güven
                      </div>
                      <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>
                        {!selectedMatch.isPast && typeof selectedMatch.refereeConfidence === "number"
                          ? `%${Number(selectedMatch.refereeConfidence || 0).toFixed(1)}`
                          : "-"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div style={{ color: "#C8FF00", fontSize: 11, fontWeight: 700 }}>Maç Akışı</div>
                    <div style={{ color: "#9fb0cd", fontSize: 10 }}>
                      {loadingApiEvents ? "Yükleniyor..." : `Sportmonks · ${selectedApiEvents.length} olay`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.18)" }} />
                    <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 900, letterSpacing: "0.2px" }}>
                      {selectedMatch.isPast ? "MS" : isLiveMatchStatus(selectedMatch.statusCode) ? "CANLI" : "MAÇ"} {finalScoreLine}
                    </div>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.18)" }} />
                  </div>

                  {secondHalfStoppage > 0 ? (
                    <div className="mt-2 flex justify-center">
                      <span
                        className="px-3 py-1 rounded-full"
                        style={{
                          color: "#dbe5f6",
                          fontSize: 10,
                          fontWeight: 700,
                          background: "rgba(255,255,255,0.12)",
                          border: "1px solid rgba(255,255,255,0.18)",
                        }}
                      >
                        +{secondHalfStoppage} Uzatma
                      </span>
                    </div>
                  ) : null}

                  {loadingApiEvents ? (
                    <div style={{ color: "#8ea0be", fontSize: 11, marginTop: 10 }}>Maç olayları yükleniyor...</div>
                  ) : !timelineRows.length ? (
                    <div
                      className="mt-2 rounded-xl p-3"
                      style={{
                        color: "#8ea0be",
                        fontSize: 12,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      Bu maç için olay akışı verisi bulunamadı.
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl p-2.5" style={{ background: "rgba(15,21,28,0.78)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ display: "grid", gap: 10 }}>
                        {secondHalfRows.map((item) => {
                          return (
                            <div
                              key={item.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                {item.side === "home" ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveVoteItem(item)}
                                    style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, width: "100%", textAlign: "left", background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                                  >
                                    <span style={{ color: "#e5edf8", fontSize: 12, fontWeight: 900, minWidth: 40 }}>{item.minuteLabel}</span>
                                    {item.kind === "sub" ? (
                                      <span style={{ minWidth: 0, display: "grid", gap: 2 }}>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                          <span style={{ color: "#34d399", fontSize: 12, fontWeight: 900 }}>↪</span>
                                          <span style={{ color: "#f1f5f9", fontSize: 11, fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {item.title}
                                          </span>
                                        </span>
                                        {item.relatedPlayer ? (
                                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                            <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 900 }}>↩</span>
                                            <span style={{ color: "#cbd5e1", fontSize: 11, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                              {item.relatedPlayer}
                                            </span>
                                          </span>
                                        ) : null}
                                      </span>
                                    ) : (
                                      <>
                                        <span style={{ width: 20, display: "inline-flex", justifyContent: "center" }}>{eventIcon(item.kind)}</span>
                                        <span style={{ color: "#f1f5f9", fontSize: 11, fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                          {item.title}
                                        </span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <div style={{ height: 18 }} />
                                )}
                              </div>

                              <div style={{ minWidth: 0 }}>
                                {item.side === "away" ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveVoteItem(item)}
                                    style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7, minWidth: 0, width: "100%", textAlign: "right", background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                                  >
                                    {item.kind === "sub" ? (
                                      <span style={{ minWidth: 0, display: "grid", gap: 2 }}>
                                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 6, minWidth: 0 }}>
                                          <span style={{ color: "#f1f5f9", fontSize: 11, fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {item.title}
                                          </span>
                                          <span style={{ color: "#34d399", fontSize: 12, fontWeight: 900 }}>↪</span>
                                        </span>
                                        {item.relatedPlayer ? (
                                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 6, minWidth: 0 }}>
                                            <span style={{ color: "#cbd5e1", fontSize: 11, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                              {item.relatedPlayer}
                                            </span>
                                            <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 900 }}>↩</span>
                                          </span>
                                        ) : null}
                                      </span>
                                    ) : (
                                      <>
                                        <span style={{ color: "#f1f5f9", fontSize: 11, fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                          {item.title}
                                        </span>
                                        <span style={{ width: 20, display: "inline-flex", justifyContent: "center" }}>{eventIcon(item.kind)}</span>
                                      </>
                                    )}
                                    <span style={{ color: "#e5edf8", fontSize: 12, fontWeight: 900, minWidth: 40, textAlign: "right" }}>{item.minuteLabel}</span>
                                  </button>
                                ) : (
                                  <div style={{ height: 18 }} />
                                )}
                              </div>
                            </div>
                          );
                        })}

                        <div className="mt-1">
                          <div className="flex items-center gap-2">
                            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.18)" }} />
                            <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 900 }}>İY {firstHalfScoreLine}</div>
                            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.18)" }} />
                          </div>
                          {firstHalfStoppage > 0 ? (
                            <div className="mt-2 flex justify-center">
                              <span
                                className="px-3 py-1 rounded-full"
                                style={{
                                  color: "#dbe5f6",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: "rgba(255,255,255,0.12)",
                                  border: "1px solid rgba(255,255,255,0.18)",
                                }}
                              >
                                +{firstHalfStoppage} Uzatma
                              </span>
                            </div>
                          ) : null}
                        </div>

                        {firstHalfRows.map((item) => {
                          return (
                            <div
                              key={item.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                {item.side === "home" ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveVoteItem(item)}
                                    style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, width: "100%", textAlign: "left", background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                                  >
                                    <span style={{ color: "#e5edf8", fontSize: 12, fontWeight: 900, minWidth: 40 }}>{item.minuteLabel}</span>
                                    {item.kind === "sub" ? (
                                      <span style={{ minWidth: 0, display: "grid", gap: 2 }}>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                          <span style={{ color: "#34d399", fontSize: 12, fontWeight: 900 }}>↪</span>
                                          <span style={{ color: "#f1f5f9", fontSize: 11, fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {item.title}
                                          </span>
                                        </span>
                                        {item.relatedPlayer ? (
                                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                            <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 900 }}>↩</span>
                                            <span style={{ color: "#cbd5e1", fontSize: 11, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                              {item.relatedPlayer}
                                            </span>
                                          </span>
                                        ) : null}
                                      </span>
                                    ) : (
                                      <>
                                        <span style={{ width: 20, display: "inline-flex", justifyContent: "center" }}>{eventIcon(item.kind)}</span>
                                        <span style={{ color: "#f1f5f9", fontSize: 11, fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                          {item.title}
                                        </span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <div style={{ height: 18 }} />
                                )}
                              </div>

                              <div style={{ minWidth: 0 }}>
                                {item.side === "away" ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveVoteItem(item)}
                                    style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7, minWidth: 0, width: "100%", textAlign: "right", background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                                  >
                                    {item.kind === "sub" ? (
                                      <span style={{ minWidth: 0, display: "grid", gap: 2 }}>
                                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 6, minWidth: 0 }}>
                                          <span style={{ color: "#f1f5f9", fontSize: 11, fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {item.title}
                                          </span>
                                          <span style={{ color: "#34d399", fontSize: 12, fontWeight: 900 }}>↪</span>
                                        </span>
                                        {item.relatedPlayer ? (
                                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 6, minWidth: 0 }}>
                                            <span style={{ color: "#cbd5e1", fontSize: 11, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                              {item.relatedPlayer}
                                            </span>
                                            <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 900 }}>↩</span>
                                          </span>
                                        ) : null}
                                      </span>
                                    ) : (
                                      <>
                                        <span style={{ color: "#f1f5f9", fontSize: 11, fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                          {item.title}
                                        </span>
                                        <span style={{ width: 20, display: "inline-flex", justifyContent: "center" }}>{eventIcon(item.kind)}</span>
                                      </>
                                    )}
                                    <span style={{ color: "#e5edf8", fontSize: 12, fontWeight: 900, minWidth: 40, textAlign: "right" }}>{item.minuteLabel}</span>
                                  </button>
                                ) : (
                                  <div style={{ height: 18 }} />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {activeVoteItem ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[95] flex items-end justify-center"
                      style={{ background: "rgba(0,0,0,0.58)" }}
                      onClick={() => setActiveVoteItem(null)}
                    >
                      <motion.div
                        initial={{ y: 120, opacity: 0.5 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 140, opacity: 0.2 }}
                        transition={{ type: "spring", stiffness: 320, damping: 30 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded-t-[24px] p-4"
                        style={{
                          maxWidth: 430,
                          background: "linear-gradient(180deg, #171d31 0%, #101523 56%, #0c1120 100%)",
                          borderTop: "1px solid rgba(255,255,255,0.12)",
                          borderLeft: "1px solid rgba(255,255,255,0.08)",
                          borderRight: "1px solid rgba(255,255,255,0.08)",
                          paddingBottom: "max(env(safe-area-inset-bottom), 18px)",
                          boxShadow: "0 -18px 54px rgba(0,0,0,0.46)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div style={{ color: "#C8FF00", fontSize: 11, fontWeight: 800 }}>Karar Puanla</div>
                          <button
                            type="button"
                            onClick={() => setActiveVoteItem(null)}
                            className="w-7 h-7 rounded-full inline-flex items-center justify-center"
                            style={{ color: "#B9C3DA", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(59,130,246,0.13)", border: "1px solid rgba(59,130,246,0.35)" }}>
                            <div style={{ color: "#93c5fd", fontSize: 10, fontWeight: 700 }}>Topluluk Ort.</div>
                            <div style={{ color: "#fff", fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>
                              {activeVoteStat?.average !== null && typeof activeVoteStat?.average === "number"
                                ? activeVoteStat.average.toFixed(1)
                                : "-"}
                            </div>
                          </div>
                          <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(16,185,129,0.13)", border: "1px solid rgba(16,185,129,0.35)" }}>
                            <div style={{ color: "#6ee7b7", fontSize: 10, fontWeight: 700 }}>Toplam Oy</div>
                            <div style={{ color: "#fff", fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>
                              {activeVoteStat?.totalVotes || 0}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <div className="flex items-center justify-between gap-2">
                            <div style={{ color: "#fff", fontSize: 14, fontWeight: 800, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {activeVoteItem.title}
                            </div>
                            <span className="px-2 py-1 rounded-full" style={{ color: "#dbe5f6", fontSize: 10, fontWeight: 800, border: "1px solid rgba(255,255,255,0.18)" }}>
                              {activeVoteItem.minuteLabel}
                            </span>
                          </div>
                          {activeVoteItem.kind === "sub" && activeVoteItem.relatedPlayer ? (
                            <div style={{ color: "#8ea0be", fontSize: 11, marginTop: 3 }}>
                              Çıkan: {activeVoteItem.relatedPlayer}
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <div style={{ color: "#8ea0be", fontSize: 10, marginBottom: 8 }}>
                            0-10 arası puan ver
                          </div>
                          <NumericVoteControl
                            value={activeVoteValue}
                            onSelect={(score) => {
                              void voteDecision(activeVoteItem.id, score);
                            }}
                          />
                          <div className="mt-2" style={{ color: "#8ea0be", fontSize: 10 }}>
                            {isLiveVotesConfigured()
                              ? "Topluluk ortalaması gerçek zamanlı güncellenir."
                              : "Topluluk ortalaması için Supabase live vote bağlantısı gerekir."}
                          </div>
                          {voteCloudError ? (
                            <div className="mt-2" style={{ color: "#fca5a5", fontSize: 10, fontWeight: 700 }}>
                              {voteCloudError}
                            </div>
                          ) : null}
                        </div>
                      </motion.div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const refId = selectedMatch.refereeId || "";
                      if (!refId && !selectedMatch.referee) return;
                      setSelectedMatch(null);
                      openReferee(selectedMatch.referee, refId);
                    }}
                    className="rounded-xl py-2.5"
                    style={{
                      color: "#D5E2FF",
                      fontSize: 12,
                      fontWeight: 700,
                      border: "1px solid rgba(147,197,253,0.35)",
                      background: "rgba(147,197,253,0.12)",
                    }}
                  >
                    Hakem Profili
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMatch(null)}
                    className="rounded-xl py-2.5"
                    style={{
                      color: "#0A0A0F",
                      fontSize: 12,
                      fontWeight: 800,
                      border: "1px solid rgba(200,255,0,0.42)",
                      background: "linear-gradient(135deg, #C8FF00 0%, #A8E000 100%)",
                    }}
                  >
                    Kapat
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
