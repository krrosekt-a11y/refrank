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

export const referees: Referee[] = [];

export const matches: Match[] = [];

export const trendingComments: Comment[] = [];

export const NEON = "#C8FF00";
export const NEON_DIM = "rgba(200,255,0,0.15)";
export const CARD_BG = "#1A1A20";
export const PAGE_BG = "#0D0D10";

export const weeklyBest: Referee[] = [];
export const weeklyWorst: Referee[] = [];

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

export const teams: Team[] = [];

export const competitions: Competition[] = [];
