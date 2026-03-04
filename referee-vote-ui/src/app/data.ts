export interface Referee {
  id: string;
  name: string;
  age: number;
  country: string;
  flag: string;
  photo: string;
  matches: number;
  yellowCardsPerMatch: number;
  redCardsPerMatch: number;
  foulsPerMatch: number;
  accuracy: number;
  careerScore: number;
  totalRatings: number;
  badges: string[];
  performanceTrend: { match: string; score: number }[];
  bio: string;
  league: string;
  penalties: number;
  yellowCards: number;
  redCards: number;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  time?: string;
  refereeId: string;
  league: string;
  stadium: string;
  hasVoted?: boolean;
  status: "live" | "finished" | "upcoming";
  minute?: number; // for live matches
  commentCount?: number;
}

export interface Vote {
  refereeId: string;
  matchId: string;
  overall: number;
  matchControl: number;
  cardDecisions: number;
  penaltyDecisions: number;
  gameFlow: number;
  comment: string;
}

export interface Comment {
  id: string;
  matchId: string;
  refereeId: string;
  userName: string;
  userAvatar: string;
  text: string;
  likes: number;
  time: string;
  score: number;
}

export const referees: Referee[] = [
  {
    id: "1",
    name: "Cüneyt Çakır",
    age: 47,
    country: "Türkiye",
    flag: "🇹🇷",
    photo: "https://images.unsplash.com/photo-1723295634141-c15c4651d823?w=400",
    matches: 312,
    yellowCardsPerMatch: 1.8,
    redCardsPerMatch: 0.3,
    foulsPerMatch: 22.4,
    accuracy: 91,
    careerScore: 8.7,
    totalRatings: 18420,
    badges: ["elite", "veteran", "international"],
    performanceTrend: [
      { match: "M1", score: 8.2 },
      { match: "M2", score: 8.8 },
      { match: "M3", score: 7.9 },
      { match: "M4", score: 9.1 },
      { match: "M5", score: 8.5 },
      { match: "M6", score: 8.9 },
      { match: "M7", score: 8.3 },
      { match: "M8", score: 9.0 },
    ],
    bio: "UEFA A Kategorisi hakem. Şampiyonlar Ligi ve Dünya Kupası deneyimli.",
    league: "UEFA Pro",
    penalties: 140,
    yellowCards: 562,
    redCards: 94,
  },
  {
    id: "2",
    name: "Halil Umut Meler",
    age: 38,
    country: "Türkiye",
    flag: "🇹🇷",
    photo: "https://images.unsplash.com/photo-1762885590877-0829975f2cc2?w=400",
    matches: 198,
    yellowCardsPerMatch: 2.1,
    redCardsPerMatch: 0.4,
    foulsPerMatch: 24.8,
    accuracy: 87,
    careerScore: 7.9,
    totalRatings: 9840,
    badges: ["rising-star", "var-expert"],
    performanceTrend: [
      { match: "M1", score: 7.5 },
      { match: "M2", score: 8.2 },
      { match: "M3", score: 7.8 },
      { match: "M4", score: 8.4 },
      { match: "M5", score: 7.2 },
      { match: "M6", score: 8.0 },
      { match: "M7", score: 8.6 },
      { match: "M8", score: 8.1 },
    ],
    bio: "FIFA lisanslı hakem. VAR kullanımında öne çıkıyor.",
    league: "Süper Lig",
    penalties: 89,
    yellowCards: 416,
    redCards: 79,
  },
  {
    id: "3",
    name: "Arda Kardeşler",
    age: 35,
    country: "Türkiye",
    flag: "🇹🇷",
    photo: "https://images.unsplash.com/photo-1758600432264-b8d2a0fd7d83?w=400",
    matches: 142,
    yellowCardsPerMatch: 2.6,
    redCardsPerMatch: 0.5,
    foulsPerMatch: 26.1,
    accuracy: 79,
    careerScore: 6.4,
    totalRatings: 6210,
    badges: [],
    performanceTrend: [
      { match: "M1", score: 6.8 },
      { match: "M2", score: 5.9 },
      { match: "M3", score: 6.5 },
      { match: "M4", score: 7.1 },
      { match: "M5", score: 5.5 },
      { match: "M6", score: 6.9 },
      { match: "M7", score: 6.0 },
      { match: "M8", score: 6.3 },
    ],
    bio: "Süper Lig hakemi. Tartışmalı kararlarıyla sık gündemde.",
    league: "Süper Lig",
    penalties: 71,
    yellowCards: 369,
    redCards: 71,
  },
  {
    id: "4",
    name: "Mete Kalkavan",
    age: 40,
    country: "Türkiye",
    flag: "🇹🇷",
    photo: "https://images.unsplash.com/photo-1747994723854-a77c99997656?w=400",
    matches: 211,
    yellowCardsPerMatch: 1.9,
    redCardsPerMatch: 0.3,
    foulsPerMatch: 21.8,
    accuracy: 89,
    careerScore: 8.1,
    totalRatings: 11340,
    badges: ["veteran", "consistent"],
    performanceTrend: [
      { match: "M1", score: 8.0 },
      { match: "M2", score: 8.3 },
      { match: "M3", score: 7.8 },
      { match: "M4", score: 8.5 },
      { match: "M5", score: 8.1 },
      { match: "M6", score: 7.9 },
      { match: "M7", score: 8.4 },
      { match: "M8", score: 8.6 },
    ],
    bio: "Tutarlı performansıyla takdir gören deneyimli hakem.",
    league: "Süper Lig",
    penalties: 101,
    yellowCards: 401,
    redCards: 63,
  },
  {
    id: "5",
    name: "Ali Palabıyık",
    age: 42,
    country: "Türkiye",
    flag: "🇹🇷",
    photo: "https://images.unsplash.com/photo-1711925842622-ea8d87129ea1?w=400",
    matches: 256,
    yellowCardsPerMatch: 2.3,
    redCardsPerMatch: 0.4,
    foulsPerMatch: 23.7,
    accuracy: 83,
    careerScore: 7.2,
    totalRatings: 13560,
    badges: ["veteran"],
    performanceTrend: [
      { match: "M1", score: 7.4 },
      { match: "M2", score: 6.8 },
      { match: "M3", score: 7.5 },
      { match: "M4", score: 7.0 },
      { match: "M5", score: 7.8 },
      { match: "M6", score: 6.9 },
      { match: "M7", score: 7.3 },
      { match: "M8", score: 7.1 },
    ],
    bio: "Tecrübeli Süper Lig hakemi. Büyük derbilerde görev almakta.",
    league: "Süper Lig",
    penalties: 115,
    yellowCards: 589,
    redCards: 102,
  },
  {
    id: "6",
    name: "Zorbay Küçük",
    age: 36,
    country: "Türkiye",
    flag: "🇹🇷",
    photo: "https://images.unsplash.com/photo-1747994723854-a77c99997656?w=400",
    matches: 118,
    yellowCardsPerMatch: 2.8,
    redCardsPerMatch: 0.6,
    foulsPerMatch: 27.3,
    accuracy: 75,
    careerScore: 5.8,
    totalRatings: 4890,
    badges: [],
    performanceTrend: [
      { match: "M1", score: 5.5 },
      { match: "M2", score: 6.2 },
      { match: "M3", score: 5.8 },
      { match: "M4", score: 5.1 },
      { match: "M5", score: 6.5 },
      { match: "M6", score: 5.9 },
      { match: "M7", score: 5.3 },
      { match: "M8", score: 6.0 },
    ],
    bio: "Genç hakem. Karar tutarlılığı konusunda gelişme alanı var.",
    league: "Süper Lig",
    penalties: 55,
    yellowCards: 330,
    redCards: 71,
  },
];

export const matches: Match[] = [
  // Today - Live
  {
    id: "m9",
    homeTeam: "Galatasaray",
    awayTeam: "Fenerbahçe",
    homeScore: 1,
    awayScore: 1,
    date: "2026-03-03",
    time: "20:00",
    refereeId: "1",
    league: "Süper Lig",
    stadium: "RAMS Park",
    hasVoted: false,
    status: "live",
    minute: 67,
    commentCount: 843,
  },
  {
    id: "m10",
    homeTeam: "Beşiktaş",
    awayTeam: "Trabzonspor",
    homeScore: 2,
    awayScore: 0,
    date: "2026-03-03",
    time: "17:30",
    refereeId: "4",
    league: "Süper Lig",
    stadium: "Tüpraş Stadyumu",
    hasVoted: false,
    status: "live",
    minute: 89,
    commentCount: 412,
  },
  // Today - Upcoming
  {
    id: "m11",
    homeTeam: "Başakşehir",
    awayTeam: "Kayserispor",
    date: "2026-03-03",
    time: "22:00",
    refereeId: "2",
    league: "Süper Lig",
    stadium: "Başakşehir Fatih Terim Stadyumu",
    hasVoted: false,
    status: "upcoming",
    commentCount: 0,
  },
  // Finished - yesterday & before
  {
    id: "m1",
    homeTeam: "Galatasaray",
    awayTeam: "Fenerbahçe",
    homeScore: 3,
    awayScore: 1,
    date: "2026-03-02",
    time: "20:00",
    refereeId: "2",
    league: "Süper Lig",
    stadium: "RAMS Park",
    hasVoted: false,
    status: "finished",
    commentCount: 1247,
  },
  {
    id: "m7",
    homeTeam: "Başakşehir",
    awayTeam: "Sivasspor",
    homeScore: 2,
    awayScore: 1,
    date: "2026-03-02",
    time: "15:00",
    refereeId: "1",
    league: "Süper Lig",
    stadium: "Başakşehir Fatih Terim Stadyumu",
    hasVoted: false,
    status: "finished",
    commentCount: 389,
  },
  {
    id: "m2",
    homeTeam: "Beşiktaş",
    awayTeam: "Trabzonspor",
    homeScore: 2,
    awayScore: 0,
    date: "2026-03-01",
    time: "20:00",
    refereeId: "4",
    league: "Süper Lig",
    stadium: "Tüpraş Stadyumu",
    hasVoted: false,
    status: "finished",
    commentCount: 521,
  },
  {
    id: "m8",
    homeTeam: "Kasımpaşa",
    awayTeam: "Adana Demirspor",
    homeScore: 0,
    awayScore: 0,
    date: "2026-03-01",
    time: "17:30",
    refereeId: "6",
    league: "Süper Lig",
    stadium: "Recep Tayyip Erdoğan Stadyumu",
    hasVoted: false,
    status: "finished",
    commentCount: 198,
  },
  {
    id: "m3",
    homeTeam: "Galatasaray",
    awayTeam: "Arsenal",
    homeScore: 2,
    awayScore: 2,
    date: "2026-02-26",
    time: "22:00",
    refereeId: "1",
    league: "UEFA Şampiyonlar Ligi",
    stadium: "RAMS Park",
    hasVoted: false,
    status: "finished",
    commentCount: 3841,
  },
  {
    id: "m4",
    homeTeam: "Fenerbahçe",
    awayTeam: "Kayserispor",
    homeScore: 4,
    awayScore: 0,
    date: "2026-02-25",
    time: "20:00",
    refereeId: "5",
    league: "Süper Lig",
    stadium: "Ülker Stadyumu",
    hasVoted: false,
    status: "finished",
    commentCount: 672,
  },
  {
    id: "m5",
    homeTeam: "Beşiktaş",
    awayTeam: "Hatayspor",
    homeScore: 1,
    awayScore: 1,
    date: "2026-02-24",
    time: "19:00",
    refereeId: "3",
    league: "Süper Lig",
    stadium: "Tüpraş Stadyumu",
    hasVoted: false,
    status: "finished",
    commentCount: 934,
  },
  {
    id: "m6",
    homeTeam: "Trabzonspor",
    awayTeam: "Antalyaspor",
    homeScore: 3,
    awayScore: 2,
    date: "2026-02-23",
    time: "16:00",
    refereeId: "6",
    league: "Süper Lig",
    stadium: "Şenol Güneş Stadyumu",
    hasVoted: false,
    status: "finished",
    commentCount: 445,
  },
  // Upcoming - tomorrow
  {
    id: "m12",
    homeTeam: "Fenerbahçe",
    awayTeam: "Beşiktaş",
    date: "2026-03-04",
    time: "20:00",
    refereeId: "3",
    league: "Süper Lig",
    stadium: "Ülker Stadyumu",
    hasVoted: false,
    status: "upcoming",
    commentCount: 0,
  },
  {
    id: "m13",
    homeTeam: "Galatasaray",
    awayTeam: "Barcelona",
    date: "2026-03-05",
    time: "22:00",
    refereeId: "1",
    league: "UEFA Şampiyonlar Ligi",
    stadium: "RAMS Park",
    hasVoted: false,
    status: "upcoming",
    commentCount: 0,
  },
];

export const trendingComments: Comment[] = [
  {
    id: "c1",
    matchId: "m9",
    refereeId: "1",
    userName: "DerbiTaktik",
    userAvatar: "🦁",
    text: "Çakır 67. dakikadaki ofsayt kararını doğru uyguladı, VAR desteğiyle mükemmel bir pozisyon yönetimi.",
    likes: 312,
    time: "12 dk önce",
    score: 8.5,
  },
  {
    id: "c2",
    matchId: "m9",
    refereeId: "1",
    userName: "FutbolAnalist",
    userAvatar: "⚽",
    text: "Her iki takıma da eşit yaklaşıyor, sahayı tam kontrol altında tutuyor. Profesyonel yönetim.",
    likes: 198,
    time: "18 dk önce",
    score: 9.0,
  },
  {
    id: "c3",
    matchId: "m1",
    refereeId: "2",
    userName: "SarıLacivert",
    userAvatar: "🟡",
    text: "35. dakikadaki penaltı kararı tamamen yanlıştı! VAR neden devreye girmedi anlamıyorum.",
    likes: 876,
    time: "1 saat önce",
    score: 4.2,
  },
  {
    id: "c4",
    matchId: "m1",
    refereeId: "2",
    userName: "HakemGözlemci",
    userAvatar: "👁️",
    text: "Meler bu maçta açıkçası çok baskı altında kaldı ama yine de genel çizgisini korudu.",
    likes: 445,
    time: "2 saat önce",
    score: 6.8,
  },
  {
    id: "c5",
    matchId: "m3",
    refereeId: "1",
    userName: "UCLTaraftar",
    userAvatar: "🏆",
    text: "Avrupa sahnesinde Çakır her zaman fark yaratan performans sergiliyor. Gurur verici.",
    likes: 1203,
    time: "5 gün önce",
    score: 9.2,
  },
  {
    id: "c6",
    matchId: "m2",
    refereeId: "3",
    userName: "KaleArkası",
    userAvatar: "🥅",
    text: "Arda Kardeşler son haftalarda çok formda, kartlarını dengeli dağıtıyor ve oyunun temposunu iyi yönetiyor.",
    likes: 234,
    time: "3 saat önce",
    score: 7.8,
  },
  {
    id: "c7",
    matchId: "m4",
    refereeId: "3",
    userName: "TaktikBoard",
    userAvatar: "📋",
    text: "İlk yarıda biraz pasif kaldı ama ikinci yarıda toparladı. Penaltı pozisyonunda doğru karar.",
    likes: 167,
    time: "1 gün önce",
    score: 6.5,
  },
  {
    id: "c8",
    matchId: "m5",
    refereeId: "4",
    userName: "AnadoluKartalı",
    userAvatar: "🦅",
    text: "Bahattin Şimşek bu maçta çok fazla sarı kart gösterdi, oyunun akışını bozdu.",
    likes: 543,
    time: "2 gün önce",
    score: 4.5,
  },
  {
    id: "c9",
    matchId: "m6",
    refereeId: "5",
    userName: "FairPlayFan",
    userAvatar: "🤝",
    text: "Atilla Karaoğlan maçı gayet iyi yönetti, her iki takıma da eşit mesafede durdu.",
    likes: 89,
    time: "4 gün önce",
    score: 7.2,
  },
  {
    id: "c10",
    matchId: "m7",
    refereeId: "6",
    userName: "OffsideTrap",
    userAvatar: "🚩",
    text: "Genç hakem için zor bir maçtı ama genel olarak başarılı buldum. Gelecek vadediyor.",
    likes: 156,
    time: "6 gün önce",
    score: 7.0,
  },
  {
    id: "c11",
    matchId: "m8",
    refereeId: "2",
    userName: "TribünSesi",
    userAvatar: "📣",
    text: "Meler'in kart kararları tutarsızdı. İlk yarıda toleranslı, ikinci yarıda çok sert davrandı.",
    likes: 678,
    time: "8 saat önce",
    score: 5.1,
  },
  {
    id: "c12",
    matchId: "m9",
    refereeId: "1",
    userName: "VARekran",
    userAvatar: "📺",
    text: "Çakır VAR kullanımında dünya standartlarında. Monitöre gitme kararı çok isabetliydi.",
    likes: 421,
    time: "3 gün önce",
    score: 8.8,
  },
  {
    id: "c13",
    matchId: "m4",
    refereeId: "4",
    userName: "KırmızıKart",
    userAvatar: "🟥",
    text: "78. dakikadaki kırmızı kart tartışmalıydı ama VAR onayladı. Zor ama doğru karar.",
    likes: 312,
    time: "5 gün önce",
    score: 6.9,
  },
  {
    id: "c14",
    matchId: "m5",
    refereeId: "5",
    userName: "StatGuru",
    userAvatar: "📊",
    text: "Karaoğlan'ın maç başına faul sayısı ortalamanın altında. Oyunu gereksiz durdurmadan yönetiyor.",
    likes: 98,
    time: "1 hafta önce",
    score: 7.5,
  },
];

export const NEON = "#C8FF00";
export const NEON_DIM = "rgba(200,255,0,0.15)";
export const CARD_BG = "#1A1A20";
export const PAGE_BG = "#0D0D10";

export const weeklyBest = [referees[0], referees[3], referees[1]];
export const weeklyWorst = [referees[5], referees[2], referees[4]];

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  league: string;
  country: string;
  flag: string;
  followers: number;
  color: string;
}

export interface Competition {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  country: string;
  flag: string;
  season: string;
  teams: number;
  type: "league" | "cup" | "international";
  color: string;
}

export const teams: Team[] = [
  { id: "t1", name: "Galatasaray", shortName: "GS", logo: "🦁", league: "Süper Lig", country: "Türkiye", flag: "🇹🇷", followers: 2840000, color: "#FFB300" },
  { id: "t2", name: "Fenerbahçe", shortName: "FB", logo: "🦅", league: "Süper Lig", country: "Türkiye", flag: "🇹🇷", followers: 2620000, color: "#FFD700" },
  { id: "t3", name: "Beşiktaş", shortName: "BJK", logo: "🦅", league: "Süper Lig", country: "Türkiye", flag: "🇹🇷", followers: 1980000, color: "#fff" },
  { id: "t4", name: "Trabzonspor", shortName: "TS", logo: "🌊", league: "Süper Lig", country: "Türkiye", flag: "🇹🇷", followers: 1450000, color: "#8B0000" },
  { id: "t5", name: "Başakşehir", shortName: "BAŞAK", logo: "⭐", league: "Süper Lig", country: "Türkiye", flag: "🇹🇷", followers: 620000, color: "#FF6B35" },
  { id: "t6", name: "Kayserispor", shortName: "KSP", logo: "🦁", league: "Süper Lig", country: "Türkiye", flag: "🇹🇷", followers: 380000, color: "#CC0000" },
  { id: "t7", name: "Arsenal", shortName: "ARS", logo: "🔴", league: "Premier League", country: "İngiltere", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", followers: 18200000, color: "#EF0107" },
  { id: "t8", name: "Barcelona", shortName: "BAR", logo: "🔵", league: "La Liga", country: "İspanya", flag: "🇪🇸", followers: 22400000, color: "#A50044" },
  { id: "t9", name: "Sivasspor", shortName: "SİV", logo: "🦅", league: "Süper Lig", country: "Türkiye", flag: "🇹🇷", followers: 290000, color: "#CC0000" },
  { id: "t10", name: "Antalyaspor", shortName: "ANT", logo: "🌴", league: "Süper Lig", country: "Türkiye", flag: "🇹🇷", followers: 240000, color: "#FF4500" },
];

export const competitions: Competition[] = [
  { id: "c1", name: "Süper Lig", shortName: "SL", logo: "🏆", country: "Türkiye", flag: "🇹🇷", season: "2025/26", teams: 19, type: "league", color: "#C8FF00" },
  { id: "c2", name: "UEFA Şampiyonlar Ligi", shortName: "UCL", logo: "⭐", country: "Avrupa", flag: "🇪🇺", season: "2025/26", teams: 36, type: "international", color: "#4FA3FF" },
  { id: "c3", name: "TFF 1. Lig", shortName: "TFF1", logo: "🥈", country: "Türkiye", flag: "🇹🇷", season: "2025/26", teams: 19, type: "league", color: "#FFD600" },
  { id: "c4", name: "UEFA Avrupa Ligi", shortName: "UEL", logo: "🌟", country: "Avrupa", flag: "🇪🇺", season: "2025/26", teams: 36, type: "international", color: "#FF6B35" },
  { id: "c5", name: "Türkiye Kupası", shortName: "TK", logo: "🏅", country: "Türkiye", flag: "🇹🇷", season: "2025/26", teams: 64, type: "cup", color: "#FF4444" },
  { id: "c6", name: "Premier League", shortName: "PL", logo: "🦁", country: "İngiltere", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", season: "2025/26", teams: 20, type: "league", color: "#38003C" },
  { id: "c7", name: "La Liga", shortName: "LL", logo: "🌞", country: "İspanya", flag: "🇪🇸", season: "2025/26", teams: 20, type: "league", color: "#FF4B44" },
  { id: "c8", name: "UEFA Konferans Ligi", shortName: "UECL", logo: "🌍", country: "Avrupa", flag: "🇪🇺", season: "2025/26", teams: 36, type: "international", color: "#00D4AA" },
];