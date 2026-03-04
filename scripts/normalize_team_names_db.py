#!/usr/bin/env python3
import argparse
import re
import sqlite3
import unicodedata


DEFAULT_DB = "/Users/aliozkan/RefereeRank/data/tff_referees_matches_full.db"


def normalize_text(s: str) -> str:
    x = (s or "").upper()
    x = (
        x.replace("İ", "I")
        .replace("İ", "I")
        .replace("Ş", "S")
        .replace("Ğ", "G")
        .replace("Ü", "U")
        .replace("Ö", "O")
        .replace("Ç", "C")
    )
    x = unicodedata.normalize("NFKD", x)
    x = "".join(ch for ch in x if not unicodedata.combining(ch))
    x = re.sub(r"[^A-Z0-9 ]+", " ", x)
    return re.sub(r"\s+", " ", x).strip()


def simplify_team_name(name: str) -> str:
    n = normalize_text(name)
    if not n:
        return (name or "").strip()

    mapping = [
        ("GALATASARAY", "Galatasaray"),
        ("FENERBAHCE", "Fenerbahçe"),
        ("BESIKTAS", "Beşiktaş"),
        ("TRABZONSPOR", "Trabzonspor"),
        ("BASAKSEHIR", "Başakşehir"),
        ("GOZTEPE", "Göztepe"),
        ("KASIMPASA", "Kasımpaşa"),
        ("KAYSERISPOR", "Kayserispor"),
        ("KONYASPOR", "Konyaspor"),
        ("RIZESPOR", "Rizespor"),
        ("EYUPSPOR", "Eyüpspor"),
        ("ALANYASPOR", "Alanyaspor"),
        ("ANTALYASPOR", "Antalyaspor"),
        ("GAZIANTEP", "Gaziantep FK"),
        ("GENCLERBIRLIGI", "Gençlerbirliği"),
        ("SAMSUNSPOR", "Samsunspor"),
        ("KOCAELISPOR", "Kocaelispor"),
        ("HATAYSPOR", "Hatayspor"),
        ("ADANA DEMIRSPOR", "Adana Demirspor"),
        ("FATIH KARAGUMRUK", "Karagümrük"),
        ("KARAGUMRUK", "Karagümrük"),
        ("ANKARAGUCU", "Ankaragücü"),
        ("SIVASSPOR", "Sivasspor"),
        ("PENDIKSPOR", "Pendikspor"),
        ("ISTANBULSPOR", "İstanbulspor"),
        ("BODRUM FK", "Bodrum FK"),
    ]
    for key, out in mapping:
        if key in n:
            return out

    # Fallback: strip common corporate/sponsor noise and title-case.
    cleaned = re.sub(
        r"\b(A S|AS|A S|FK|FUTBOL KULUBU|FUTBOL KULUBU AS|SPOR AS|COM|TR|GRUP|MISIRLI|RAMS|CORENDON|HESAP|ZECORNER|BELLONA|NATURA DUNYASI|ATKO|SIPAY|TUMOSAN|IKAS|ATAKAS|OZBELSAN|MKE)\b",
        " ",
        n,
    )
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return (name or "").strip()
    words = cleaned.split(" ")
    return " ".join(w.capitalize() for w in words)


def update_column(conn: sqlite3.Connection, table: str, column: str, where_clause: str = "") -> int:
    query = f"SELECT DISTINCT {column} AS v FROM {table}"
    if where_clause:
        query += f" WHERE {where_clause}"
    rows = conn.execute(query).fetchall()
    changed = 0
    for (v,) in rows:
        if v is None:
            continue
        old = str(v)
        new = simplify_team_name(old)
        if new and new != old:
            conn.execute(f"UPDATE {table} SET {column}=? WHERE {column}=?", (new, old))
            changed += 1
    return changed


def main():
    ap = argparse.ArgumentParser(description="Normalize/simplify club names in local SQLite DB")
    ap.add_argument("--db", default=DEFAULT_DB, help="SQLite DB path")
    args = ap.parse_args()

    conn = sqlite3.connect(args.db, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=60000;")

    total_changes = 0
    try:
        targets = [
            ("superlig_hakem_match_stats", "home_team", ""),
            ("superlig_hakem_match_stats", "away_team", ""),
            ("superlig_match_team_cards", "home_team", ""),
            ("superlig_match_team_cards", "away_team", ""),
            ("referee_matches", "home_team", ""),
            ("referee_matches", "away_team", ""),
            ("upcoming_fixtures_cache", "home_team", ""),
            ("upcoming_fixtures_cache", "away_team", ""),
            ("api_football_superlig_matches", "home_team_name", ""),
            ("api_football_superlig_matches", "away_team_name", ""),
            ("match_details", "value", "key IN ('Ev Sahibi','Misafir')"),
        ]

        existing_tables = {
            r[0]
            for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }

        for table, col, where in targets:
            if table not in existing_tables:
                continue
            cols = {
                r[1]
                for r in conn.execute(f"PRAGMA table_info({table})").fetchall()
            }
            if col not in cols:
                continue
            c = update_column(conn, table, col, where)
            total_changes += c
            print(f"[ok] {table}.{col} changed_values={c}")

        conn.commit()
        print(f"[done] total_changed_values={total_changes}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

