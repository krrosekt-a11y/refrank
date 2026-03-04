#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import os
import sqlite3
from collections import defaultdict


DEFAULT_DB = "/Users/aliozkan/RefereeRank/data/tff_referees_matches_full.db"
DEFAULT_OUT = "/Users/aliozkan/RefereeRank/referee-vote-ui/public/data/snapshot.json"


def n(v, d=0):
    try:
        if v is None:
            return d
        return float(v)
    except Exception:
        return d


def compute_score(matches: int, yellow: int, red: int, syr: int) -> float:
    if not matches:
        return 0.0
    ypm = yellow / matches
    rpm = red / matches
    spm = syr / matches
    penalty = ypm * 0.8 + rpm * 2.8 + spm * 1.6
    score = 9.6 - penalty
    return round(max(3.5, min(9.6, score)), 1)


def compute_accuracy(score: float) -> int:
    return round(max(60, min(97, 58 + score * 4.1)))


def main():
    ap = argparse.ArgumentParser(description="Export SQLite data into static snapshot JSON for Cloud deployment")
    ap.add_argument("--db", default=DEFAULT_DB)
    ap.add_argument("--out", default=DEFAULT_OUT)
    args = ap.parse_args()

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row

    # Referees summary
    rows = conn.execute(
        """
        SELECT
          r.hakem_id AS id,
          r.name AS name,
          COALESCE(r.city, 'Türkiye') AS city,
          COALESCE(s.matches, 0) AS matches,
          COALESCE(rm.total_matches, 0) AS total_matches,
          COALESCE(s.yellow_cards, 0) AS yellow_cards,
          COALESCE(s.red_cards, 0) AS red_cards,
          COALESCE(s.second_yellow_red_cards, 0) AS second_yellow_red_cards,
          COALESCE(s.penalties, 0) AS penalties
        FROM referees r
        LEFT JOIN (
          SELECT
            hakem_id,
            COUNT(*) AS matches,
            SUM(yellow_cards) AS yellow_cards,
            SUM(red_cards) AS red_cards,
            SUM(second_yellow_red_cards) AS second_yellow_red_cards,
            SUM(penalty_goals) AS penalties
          FROM superlig_hakem_match_stats
          GROUP BY hakem_id
        ) s ON s.hakem_id = r.hakem_id
        LEFT JOIN (
          SELECT hakem_id, COUNT(*) AS total_matches
          FROM referee_matches
          GROUP BY hakem_id
        ) rm ON rm.hakem_id = r.hakem_id
        ORDER BY COALESCE(s.matches, 0) DESC, COALESCE(rm.total_matches, 0) DESC, r.name ASC
        """
    ).fetchall()

    referees = []
    for r in rows:
        matches = int(r["matches"] or r["total_matches"] or 0)
        yellow = int(r["yellow_cards"] or 0)
        red = int(r["red_cards"] or 0)
        syr = int(r["second_yellow_red_cards"] or 0)
        score = compute_score(matches, yellow, red, syr)
        referees.append(
            {
                "id": str(r["id"]),
                "name": str(r["name"] or ""),
                "age": 32 + (int(str(r["id"])[-2:]) % 16 if str(r["id"]).isdigit() else 0),
                "country": "Türkiye",
                "flag": "🇹🇷",
                "photo": f"https://api.dicebear.com/7.x/personas/svg?seed={str(r['name'] or '')}",
                "matches": matches,
                "yellowCardsPerMatch": round((yellow / matches), 2) if matches else 0,
                "redCardsPerMatch": round((red / matches), 2) if matches else 0,
                "foulsPerMatch": round(21 + (yellow / matches if matches else 0) * 2 + (red / matches if matches else 0) * 5, 1),
                "accuracy": compute_accuracy(score),
                "careerScore": score,
                "totalRatings": max(300, matches * 120),
                "badges": ["elite"] if score >= 8.3 else (["consistent"] if score >= 7.7 else []),
                "performanceTrend": [],
                "bio": f"{str(r['name'] or '')} için Trendyol Süper Lig bazlı kart profili.",
                "league": "Süper Lig",
                "penalties": int(r["penalties"] or 0),
                "yellowCards": yellow,
                "redCards": red,
                "city": str(r["city"] or "Türkiye"),
                "secondYellowRedCards": syr,
            }
        )

    matches = [
        dict(row)
        for row in conn.execute(
            """
            SELECT
              s.mac_id AS id,
              s.hakem_id AS refereeId,
              s.referee_name AS refereeName,
              s.home_team AS homeTeam,
              s.away_team AS awayTeam,
              s.score AS score,
              s.match_date AS date,
              s.organization AS league,
              s.penalty_goals AS penaltyGoals,
              fw.week_number AS weekNumber,
              s.yellow_cards AS yellowCards,
              s.red_cards AS redCards,
              s.second_yellow_red_cards AS secondYellowRedCards,
              c.home_yellow_total AS homeYellowCards,
              c.away_yellow_total AS awayYellowCards,
              c.home_second_yellow_red AS homeSecondYellowRedCards,
              c.away_second_yellow_red AS awaySecondYellowRedCards,
              c.home_red_direct AS homeRedCards,
              c.away_red_direct AS awayRedCards
            FROM superlig_hakem_match_stats s
            LEFT JOIN superlig_fixture_weeks fw ON fw.mac_id = s.mac_id
            LEFT JOIN superlig_match_team_cards c ON c.mac_id = s.mac_id
            ORDER BY s.match_date_iso DESC
            """
        ).fetchall()
    ]

    ref_matches = defaultdict(list)
    for row in conn.execute(
        """
        SELECT
          s.hakem_id AS refereeId,
          s.mac_id AS id,
          s.home_team AS homeTeam,
          s.away_team AS awayTeam,
          s.score AS score,
          s.match_date AS date,
          s.organization AS league,
          s.penalty_goals AS penaltyGoals,
          s.yellow_cards AS yellowCards,
          s.red_cards AS redCards,
          s.second_yellow_red_cards AS secondYellowRedCards,
          c.home_yellow_total AS homeYellowCards,
          c.away_yellow_total AS awayYellowCards,
          c.home_second_yellow_red AS homeSecondYellowRedCards,
          c.away_second_yellow_red AS awaySecondYellowRedCards,
          c.home_red_direct AS homeRedCards,
          c.away_red_direct AS awayRedCards
        FROM superlig_hakem_match_stats s
        LEFT JOIN superlig_match_team_cards c ON c.mac_id = s.mac_id
        ORDER BY s.match_date_iso DESC
        """
    ):
        ref_matches[str(row["refereeId"] or "")].append(dict(row))

    ref_teams = defaultdict(list)
    for row in conn.execute(
        """
        WITH cards AS (
          SELECT s.hakem_id AS refereeId, c.home_team AS team,
                 (c.home_yellow_total + c.home_red_direct + c.home_second_yellow_red) AS cards_to_team
          FROM superlig_match_team_cards c
          JOIN superlig_hakem_match_stats s ON s.mac_id = c.mac_id
          UNION ALL
          SELECT s.hakem_id AS refereeId, c.away_team AS team,
                 (c.away_yellow_total + c.away_red_direct + c.away_second_yellow_red) AS cards_to_team
          FROM superlig_match_team_cards c
          JOIN superlig_hakem_match_stats s ON s.mac_id = c.mac_id
        )
        SELECT refereeId, team, COUNT(*) AS matches, SUM(cards_to_team) AS total_cards,
               ROUND(1.0 * SUM(cards_to_team) / COUNT(*), 3) AS avg_cards_per_match
        FROM cards
        GROUP BY refereeId, team
        ORDER BY total_cards DESC
        """
    ):
        ref_teams[str(row["refereeId"] or "")].append(
            {
                "team": row["team"],
                "matches": int(row["matches"] or 0),
                "total_cards": int(row["total_cards"] or 0),
                "avg_cards_per_match": n(row["avg_cards_per_match"]),
            }
        )

    ref_team_matches = defaultdict(list)
    for row in conn.execute(
        """
        WITH team_side AS (
          SELECT
            s.hakem_id AS refereeId,
            c.home_team AS team,
            s.mac_id AS id,
            s.match_date AS date,
            s.organization AS league,
            s.home_team AS homeTeam,
            s.away_team AS awayTeam,
            s.score AS score,
            1 AS is_home,
            c.home_yellow_total AS yellow_cards,
            c.home_second_yellow_red AS second_yellow_red_cards,
            c.home_red_direct AS red_cards,
            c.away_yellow_total AS opp_yellow_cards,
            c.away_second_yellow_red AS opp_second_yellow_red_cards,
            c.away_red_direct AS opp_red_cards
          FROM superlig_hakem_match_stats s
          JOIN superlig_match_team_cards c ON c.mac_id = s.mac_id
          UNION ALL
          SELECT
            s.hakem_id AS refereeId,
            c.away_team AS team,
            s.mac_id AS id,
            s.match_date AS date,
            s.organization AS league,
            s.home_team AS homeTeam,
            s.away_team AS awayTeam,
            s.score AS score,
            0 AS is_home,
            c.away_yellow_total AS yellow_cards,
            c.away_second_yellow_red AS second_yellow_red_cards,
            c.away_red_direct AS red_cards,
            c.home_yellow_total AS opp_yellow_cards,
            c.home_second_yellow_red AS opp_second_yellow_red_cards,
            c.home_red_direct AS opp_red_cards
          FROM superlig_hakem_match_stats s
          JOIN superlig_match_team_cards c ON c.mac_id = s.mac_id
        )
        SELECT * FROM team_side
        ORDER BY id DESC
        """
    ):
        key = f"{row['refereeId']}::{row['team']}"
        ref_team_matches[key].append(dict(row))

    upcoming = [
        dict(row)
        for row in conn.execute(
            """
            SELECT fixture_id, date, referee, referee_is_estimated, referee_confidence,
                   league_id, league_name, round_name AS round, home_team, away_team, status
            FROM upcoming_fixtures_cache
            ORDER BY date ASC
            """
        ).fetchall()
    ]

    payload = {
        "generated_at": dt.datetime.utcnow().isoformat() + "Z",
        "referees": referees,
        "matches": matches,
        "referee_matches_by_id": dict(ref_matches),
        "referee_teams_by_id": dict(ref_teams),
        "referee_team_matches_by_key": dict(ref_team_matches),
        "upcoming": upcoming,
    }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    print(f"[ok] snapshot written: {args.out}")
    print(
        f"[meta] referees={len(referees)} matches={len(matches)} upcoming={len(upcoming)} "
        f"ref_match_keys={len(payload['referee_matches_by_id'])}"
    )


if __name__ == "__main__":
    main()

