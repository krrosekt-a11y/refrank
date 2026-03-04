#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import os
import sqlite3
import sys
import urllib.parse
import urllib.request

API_BASE = "https://v3.football.api-sports.io"
SUPER_LIG_LEAGUE_ID = 203
DEFAULT_DB = "/Users/aliozkan/RefereeRank/data/tff_referees_matches_full.db"


def http_get_json(path: str, params: dict, api_key: str) -> dict:
    q = urllib.parse.urlencode(params)
    url = f"{API_BASE}{path}?{q}"
    req = urllib.request.Request(
        url,
        headers={
            "x-apisports-key": api_key,
            "x-rapidapi-key": api_key,
        },
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    return json.loads(raw)


def _as_int(v):
    if v is None:
        return 0
    if isinstance(v, int):
        return v
    s = str(v).strip()
    if not s:
        return 0
    try:
        return int(float(s))
    except Exception:
        return 0


def _stat_value(stats_rows, team_id: int, stat_type: str) -> int:
    for row in stats_rows:
        team = row.get("team") or {}
        if _as_int(team.get("id")) != team_id:
            continue
        for st in row.get("statistics") or []:
            if (st.get("type") or "").strip().lower() == stat_type.strip().lower():
                return _as_int(st.get("value"))
    return 0


def ensure_schema(conn: sqlite3.Connection):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS api_football_superlig_matches (
            fixture_id INTEGER PRIMARY KEY,
            fetch_date TEXT NOT NULL,
            league_id INTEGER,
            league_name TEXT,
            season INTEGER,
            match_date_utc TEXT,
            status_short TEXT,
            status_long TEXT,
            minute INTEGER,
            referee_name TEXT,
            home_team_id INTEGER,
            home_team_name TEXT,
            away_team_id INTEGER,
            away_team_name TEXT,
            home_goals INTEGER,
            away_goals INTEGER,
            yellow_cards_total INTEGER,
            red_cards_total INTEGER,
            home_yellow_cards INTEGER,
            away_yellow_cards INTEGER,
            home_red_cards INTEGER,
            away_red_cards INTEGER,
            fouls_total INTEGER,
            home_fouls INTEGER,
            away_fouls INTEGER,
            penalty_goals_total INTEGER,
            penalty_goals_home INTEGER,
            penalty_goals_away INTEGER,
            raw_fixture_json TEXT,
            raw_stats_json TEXT,
            raw_events_json TEXT,
            updated_at TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS api_football_fetch_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fetch_date TEXT,
            fetched_at TEXT,
            fixtures_found INTEGER,
            rows_upserted INTEGER,
            note TEXT
        )
        """
    )
    cols = {r[1] for r in conn.execute("PRAGMA table_info(api_football_superlig_matches)").fetchall()}
    if "fouls_total" not in cols:
        conn.execute("ALTER TABLE api_football_superlig_matches ADD COLUMN fouls_total INTEGER")
    if "home_fouls" not in cols:
        conn.execute("ALTER TABLE api_football_superlig_matches ADD COLUMN home_fouls INTEGER")
    if "away_fouls" not in cols:
        conn.execute("ALTER TABLE api_football_superlig_matches ADD COLUMN away_fouls INTEGER")
    conn.commit()


def fetch_and_store(date_str: str, db_path: str, api_key: str):
    conn = sqlite3.connect(db_path)
    try:
        ensure_schema(conn)
        fixtures_json = http_get_json(
            "/fixtures",
            {"league": SUPER_LIG_LEAGUE_ID, "date": date_str},
            api_key,
        )
        fixtures = fixtures_json.get("response") or []
        errors = fixtures_json.get("errors") or {}

        # Free plan can restrict /fixtures?date for historical ranges.
        # Fallback to season query and filter by date locally.
        if (not fixtures) and errors:
            season = int(date_str[:4])
            season_json = http_get_json(
                "/fixtures",
                {"league": SUPER_LIG_LEAGUE_ID, "season": season},
                api_key,
            )
            season_rows = season_json.get("response") or []
            fixtures = []
            for fx in season_rows:
                d = ((fx.get("fixture") or {}).get("date") or "")[:10]
                if d == date_str:
                    fixtures.append(fx)
        upserted = 0
        now_iso = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

        for fx in fixtures:
            fixture = fx.get("fixture") or {}
            league = fx.get("league") or {}
            teams = fx.get("teams") or {}
            goals = fx.get("goals") or {}
            status = fixture.get("status") or {}

            fixture_id = _as_int(fixture.get("id"))
            home = teams.get("home") or {}
            away = teams.get("away") or {}
            home_id = _as_int(home.get("id"))
            away_id = _as_int(away.get("id"))

            stats_json = http_get_json("/fixtures/statistics", {"fixture": fixture_id}, api_key)
            stats_rows = stats_json.get("response") or []
            home_y = _stat_value(stats_rows, home_id, "Yellow Cards")
            away_y = _stat_value(stats_rows, away_id, "Yellow Cards")
            home_r = _stat_value(stats_rows, home_id, "Red Cards")
            away_r = _stat_value(stats_rows, away_id, "Red Cards")
            home_f = _stat_value(stats_rows, home_id, "Fouls")
            away_f = _stat_value(stats_rows, away_id, "Fouls")

            events_json = http_get_json("/fixtures/events", {"fixture": fixture_id}, api_key)
            events = events_json.get("response") or []
            pen_home = 0
            pen_away = 0
            for ev in events:
                ev_type = (ev.get("type") or "").strip().lower()
                detail = (ev.get("detail") or "").strip().lower()
                if ev_type == "goal" and "penalty" in detail:
                    t = ev.get("team") or {}
                    tid = _as_int(t.get("id"))
                    if tid == home_id:
                        pen_home += 1
                    elif tid == away_id:
                        pen_away += 1

            referee_name = (fixture.get("referee") or fx.get("referee") or "").strip()

            conn.execute(
                """
                INSERT OR REPLACE INTO api_football_superlig_matches (
                    fixture_id, fetch_date, league_id, league_name, season, match_date_utc,
                    status_short, status_long, minute, referee_name,
                    home_team_id, home_team_name, away_team_id, away_team_name,
                    home_goals, away_goals,
                    yellow_cards_total, red_cards_total,
                    home_yellow_cards, away_yellow_cards,
                    home_red_cards, away_red_cards,
                    fouls_total, home_fouls, away_fouls,
                    penalty_goals_total, penalty_goals_home, penalty_goals_away,
                    raw_fixture_json, raw_stats_json, raw_events_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    fixture_id,
                    date_str,
                    _as_int(league.get("id")),
                    league.get("name") or "",
                    _as_int(league.get("season")),
                    fixture.get("date") or "",
                    status.get("short") or "",
                    status.get("long") or "",
                    _as_int(status.get("elapsed")),
                    referee_name,
                    home_id,
                    home.get("name") or "",
                    away_id,
                    away.get("name") or "",
                    _as_int(goals.get("home")),
                    _as_int(goals.get("away")),
                    home_y + away_y,
                    home_r + away_r,
                    home_y,
                    away_y,
                    home_r,
                    away_r,
                    home_f + away_f,
                    home_f,
                    away_f,
                    pen_home + pen_away,
                    pen_home,
                    pen_away,
                    json.dumps(fx, ensure_ascii=False),
                    json.dumps(stats_rows, ensure_ascii=False),
                    json.dumps(events, ensure_ascii=False),
                    now_iso,
                ),
            )
            upserted += 1

        note = "api-football daily superlig sync"
        if errors and fixtures:
            note = "api-football daily sync (season fallback used)"
        conn.execute(
            """
            INSERT INTO api_football_fetch_log (fetch_date, fetched_at, fixtures_found, rows_upserted, note)
            VALUES (?, ?, ?, ?, ?)
            """,
            (date_str, now_iso, len(fixtures), upserted, note),
        )
        conn.commit()
        return len(fixtures), upserted
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Fetch daily Super Lig fixtures from API-Football and archive into SQLite")
    parser.add_argument("--date", default=dt.date.today().isoformat(), help="Date in YYYY-MM-DD")
    parser.add_argument("--db", default=DEFAULT_DB, help="SQLite DB path")
    parser.add_argument("--api-key", default=os.environ.get("API_FOOTBALL_KEY", ""), help="API-Football key")
    args = parser.parse_args()

    if not args.api_key:
        print("ERROR: API key required. Use --api-key or API_FOOTBALL_KEY env.", file=sys.stderr)
        sys.exit(2)

    fixtures, upserted = fetch_and_store(args.date, args.db, args.api_key)
    print(f"[ok] date={args.date} fixtures={fixtures} upserted={upserted} db={args.db}")


if __name__ == "__main__":
    main()
