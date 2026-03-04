import { createClient } from "@supabase/supabase-js";
import { getOrCreateVoteUserKey } from "./liveVotes";

const MATCH_VOTES_KEY = "refscore_match_votes_v1";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export type SavedMatchVote = {
  matchId: string;
  refereeId: string;
  overall: number;
  average: number;
  matchControl: number;
  cardDecisions: number;
  penaltyDecisions: number;
  gameFlow: number;
  comment: string;
  submittedAt: string;
  homeTeam: string;
  awayTeam: string;
  refereeName: string;
  refereePhoto?: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readAll(): SavedMatchVote[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(MATCH_VOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is SavedMatchVote => {
      if (!x || typeof x !== "object") return false;
      const v = x as SavedMatchVote;
      return typeof v.matchId === "string" && typeof v.refereeId === "string";
    });
  } catch {
    return [];
  }
}

function writeAll(votes: SavedMatchVote[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(MATCH_VOTES_KEY, JSON.stringify(votes));
  window.dispatchEvent(new Event("refscore:match-votes-updated"));
}

export function listSavedMatchVotes(): SavedMatchVote[] {
  return readAll().sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
}

export function getSavedMatchVote(
  matchId: string,
  refereeId: string,
): SavedMatchVote | null {
  const found = readAll().find(
    (v) => v.matchId === String(matchId) && v.refereeId === String(refereeId),
  );
  return found || null;
}

export function saveMatchVote(vote: SavedMatchVote): void {
  const all = readAll();
  const next = all.filter(
    (v) => !(v.matchId === vote.matchId && v.refereeId === vote.refereeId),
  );
  next.push(vote);
  writeAll(next);

  if (!supabase) return;
  const userKey = getOrCreateVoteUserKey();
  void supabase.from("match_vote_history").upsert(
    {
      vote_user_key: userKey,
      match_id: vote.matchId,
      referee_id: vote.refereeId,
      overall: Number(vote.overall),
      average: Number(vote.average),
      match_control: Number(vote.matchControl),
      card_decisions: Number(vote.cardDecisions),
      penalty_decisions: Number(vote.penaltyDecisions),
      game_flow: Number(vote.gameFlow),
      comment: String(vote.comment || ""),
      submitted_at: vote.submittedAt,
      home_team: vote.homeTeam,
      away_team: vote.awayTeam,
      referee_name: vote.refereeName,
      referee_photo: vote.refereePhoto || null,
    },
    { onConflict: "vote_user_key,match_id,referee_id" },
  );
}

type MatchVoteHistoryRow = {
  match_id: string | number;
  referee_id: string | number;
  overall: number;
  average: number;
  match_control: number;
  card_decisions: number;
  penalty_decisions: number;
  game_flow: number;
  comment: string | null;
  submitted_at: string;
  home_team: string | null;
  away_team: string | null;
  referee_name: string | null;
  referee_photo: string | null;
};

export async function hydrateMatchVotesFromCloud(): Promise<SavedMatchVote[]> {
  const local = listSavedMatchVotes();
  if (!supabase) return local;

  const userKey = getOrCreateVoteUserKey();
  const { data, error } = await supabase
    .from("match_vote_history")
    .select(
      "match_id, referee_id, overall, average, match_control, card_decisions, penalty_decisions, game_flow, comment, submitted_at, home_team, away_team, referee_name, referee_photo",
    )
    .eq("vote_user_key", userKey)
    .order("submitted_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  const mapped: SavedMatchVote[] = (data || []).map((row: MatchVoteHistoryRow) => ({
    matchId: String(row.match_id),
    refereeId: String(row.referee_id),
    overall: Number(row.overall || 0),
    average: Number(row.average || 0),
    matchControl: Number(row.match_control || 0),
    cardDecisions: Number(row.card_decisions || 0),
    penaltyDecisions: Number(row.penalty_decisions || 0),
    gameFlow: Number(row.game_flow || 0),
    comment: String(row.comment || ""),
    submittedAt: String(row.submitted_at || new Date().toISOString()),
    homeTeam: String(row.home_team || ""),
    awayTeam: String(row.away_team || ""),
    refereeName: String(row.referee_name || ""),
    refereePhoto: row.referee_photo || undefined,
  }));

  writeAll(mapped);
  return mapped;
}
