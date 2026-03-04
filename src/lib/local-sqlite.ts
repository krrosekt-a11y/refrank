import { execFileSync } from "node:child_process";

const DB_PATH = "/Users/aliozkan/RefereeRank/data/tff_referees_matches_full.db";

export function querySqlite<T = Record<string, unknown>>(sql: string): T[] {
  const output = execFileSync("sqlite3", ["-json", DB_PATH, sql], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  const trimmed = output.trim();
  if (!trimmed) return [];

  try {
    return JSON.parse(trimmed) as T[];
  } catch {
    return [];
  }
}

export function querySqliteSafe<T = Record<string, unknown>>(sql: string): T[] {
  try {
    return querySqlite<T>(sql);
  } catch {
    return [];
  }
}

export function getDbPath() {
  return DB_PATH;
}
