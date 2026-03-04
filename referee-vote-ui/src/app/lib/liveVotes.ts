import { supabase } from "./supabaseConfig";

type VoteRow = {
  incident_id: string;
  score: number;
};

type VoteStatRow = {
  incident_id: string;
  total_votes: number;
  avg_score: number | null;
};

export type IncidentVoteStat = {
  totalVotes: number;
  average: number | null;
};

const USER_KEY_STORAGE = "refscore_live_vote_user_key_v1";

export function isLiveVotesConfigured(): boolean {
  return Boolean(supabase);
}

export function getOrCreateVoteUserKey(): string {
  if (typeof window === "undefined") return "local-dev-user";
  const existing = window.localStorage.getItem(USER_KEY_STORAGE);
  if (existing) return existing;
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `u-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(USER_KEY_STORAGE, generated);
  return generated;
}

export async function fetchLiveVoteSnapshot(
  incidentIds: string[],
  userKey: string
): Promise<{
  myVotes: Record<string, number | undefined>;
  stats: Record<string, IncidentVoteStat>;
}> {
  if (!supabase) return { myVotes: {}, stats: {} };
  const ids = incidentIds.filter(Boolean);
  if (!ids.length) return { myVotes: {}, stats: {} };

  const [myVotesRes, statsRes] = await Promise.all([
    supabase
      .from("live_incident_votes")
      .select("incident_id, score")
      .eq("vote_user_key", userKey)
      .in("incident_id", ids),
    supabase
      .from("live_incident_vote_stats")
      .select("incident_id, total_votes, avg_score")
      .in("incident_id", ids),
  ]);

  if (myVotesRes.error) throw myVotesRes.error;
  if (statsRes.error) throw statsRes.error;

  const myVotes: Record<string, number | undefined> = {};
  for (const row of (myVotesRes.data || []) as VoteRow[]) {
    myVotes[row.incident_id] = Number(row.score);
  }

  const stats: Record<string, IncidentVoteStat> = {};
  for (const row of (statsRes.data || []) as VoteStatRow[]) {
    stats[row.incident_id] = {
      totalVotes: Number(row.total_votes || 0),
      average:
        typeof row.avg_score === "number"
          ? Number(row.avg_score)
          : row.avg_score === null
            ? null
            : Number(row.avg_score),
    };
  }

  return { myVotes, stats };
}

export async function submitLiveIncidentVote(
  incidentId: string,
  score: number,
  userKey: string
): Promise<IncidentVoteStat> {
  if (!supabase) return { totalVotes: 0, average: null };

  const normalized = Math.max(0, Math.min(10, Math.round(score)));

  const { error: upsertError } = await supabase
    .from("live_incident_votes")
    .upsert(
      {
        incident_id: incidentId,
        vote_user_key: userKey,
        score: normalized,
      },
      { onConflict: "incident_id,vote_user_key" }
    );

  if (upsertError) throw upsertError;

  const { data, error } = await supabase
    .from("live_incident_vote_stats")
    .select("incident_id, total_votes, avg_score")
    .eq("incident_id", incidentId)
    .single();

  if (error) throw error;

  const row = data as VoteStatRow;
  return {
    totalVotes: Number(row.total_votes || 0),
    average:
      typeof row.avg_score === "number"
        ? Number(row.avg_score)
        : row.avg_score === null
          ? null
          : Number(row.avg_score),
  };
}
