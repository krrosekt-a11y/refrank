import { createClient } from "@supabase/supabase-js";
import { getOrCreateVoteUserKey } from "./liveVotes";

const FAVORITE_REFEREES_KEY = "refscore_favorite_referees_v1";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

type FavoriteRefereeRow = {
  referee_id: string | number;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function dispatchFavoritesUpdated(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event("refscore:favorites-updated"));
}

function writeAll(ids: string[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(FAVORITE_REFEREES_KEY, JSON.stringify(ids));
  dispatchFavoritesUpdated();
}

export function getFavoriteRefereeIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(FAVORITE_REFEREES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function isFavoriteReferee(id: string): boolean {
  return getFavoriteRefereeIds().includes(String(id));
}

export async function hydrateFavoritesFromCloud(): Promise<string[]> {
  const local = getFavoriteRefereeIds();
  if (!supabase) return local;

  const userKey = getOrCreateVoteUserKey();
  const { data, error } = await supabase
    .from("favorite_referees")
    .select("referee_id")
    .eq("vote_user_key", userKey)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const ids = (data || [])
    .map((row: FavoriteRefereeRow) => String(row.referee_id))
    .filter(Boolean);
  writeAll(ids);
  return ids;
}

export function toggleFavoriteReferee(id: string): boolean {
  if (!isBrowser()) return false;
  const targetId = String(id);
  const current = new Set(getFavoriteRefereeIds());
  const willBeFavorite = !current.has(targetId);
  if (willBeFavorite) current.add(targetId);
  else current.delete(targetId);
  writeAll(Array.from(current));

  if (!supabase) return willBeFavorite;

  const userKey = getOrCreateVoteUserKey();
  if (willBeFavorite) {
    void supabase.from("favorite_referees").upsert(
      { vote_user_key: userKey, referee_id: targetId },
      { onConflict: "vote_user_key,referee_id" },
    );
  } else {
    void supabase
      .from("favorite_referees")
      .delete()
      .eq("vote_user_key", userKey)
      .eq("referee_id", targetId);
  }

  return willBeFavorite;
}
