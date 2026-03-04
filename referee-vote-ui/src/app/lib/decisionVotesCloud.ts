import { createClient } from "@supabase/supabase-js";

export type CloudDecisionVoteItem = {
  incidentId: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  minuteLabel: string;
  eventTitle: string;
  score: number;
  votedAt: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export function isDecisionVotesCloudConfigured(): boolean {
  return Boolean(supabase);
}

export async function upsertDecisionVoteCloud(
  userKey: string,
  item: Omit<CloudDecisionVoteItem, "votedAt">
): Promise<void> {
  if (!supabase) throw new Error("cloud not configured");
  const { error } = await supabase.from("decision_vote_history").upsert(
    {
      incident_id: item.incidentId,
      vote_user_key: userKey,
      match_id: item.matchId,
      home_team: item.homeTeam,
      away_team: item.awayTeam,
      minute_label: item.minuteLabel,
      event_title: item.eventTitle,
      score: Math.max(0, Math.min(10, Math.round(item.score))),
    },
    { onConflict: "incident_id,vote_user_key" }
  );
  if (error) throw error;
}

export async function listDecisionVotesCloud(
  userKey: string
): Promise<CloudDecisionVoteItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("decision_vote_history")
    .select(
      "incident_id, match_id, home_team, away_team, minute_label, event_title, score, voted_at"
    )
    .eq("vote_user_key", userKey)
    .order("voted_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []).map((row: any) => ({
    incidentId: String(row.incident_id || ""),
    matchId: String(row.match_id || ""),
    homeTeam: String(row.home_team || ""),
    awayTeam: String(row.away_team || ""),
    minuteLabel: String(row.minute_label || ""),
    eventTitle: String(row.event_title || ""),
    score: Number(row.score || 0),
    votedAt: String(row.voted_at || ""),
  }));
}

