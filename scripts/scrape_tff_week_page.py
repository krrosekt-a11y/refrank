#!/usr/bin/env python3
import argparse
import datetime as dt
import re
import sqlite3
import subprocess
import time
import urllib.parse
from typing import List, Set

from build_tff_ref_db import init_db, parse_match_details, upsert_match

DEFAULT_DB = "/Users/aliozkan/RefereeRank/data/tff_referees_matches_full.db"
DEFAULT_URL = "https://www.tff.org/Default.aspx?pageID=198&hafta=24"


def extract_match_ids(html_page: str) -> List[int]:
    ids: Set[int] = set()
    pattern = (
        r'href="Default\.aspx\?pageId=29&macId=(\d+)"[^>]*'
        r'id="[^"]*dtlHaftaninMaclari_ctl\d+_A3"'
    )
    for s in re.findall(pattern, html_page, flags=re.I):
        try:
            ids.add(int(s))
        except ValueError:
            continue
    return sorted(ids)

def extract_season_label(html_page: str) -> str:
    m = re.search(r'<div class="moduleTitle">\s*(Trendyol\s+S[üu]per\s+Lig[^<]*Sezonu[^<]*)</div>', html_page, flags=re.I)
    if m:
        return re.sub(r"\s+", " ", m.group(1)).strip()
    return ""

def parse_week_from_url(url: str) -> int:
    q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
    v = (q.get("hafta") or ["0"])[0]
    try:
        w = int(v)
    except ValueError:
        return 0
    return w if 1 <= w <= 50 else 0

def ensure_week_table(conn: sqlite3.Connection):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS superlig_fixture_weeks (
            mac_id INTEGER PRIMARY KEY,
            week_number INTEGER NOT NULL,
            season_label TEXT,
            source_url TEXT,
            updated_at TEXT
        )
        """
    )

def upsert_week_mapping(conn: sqlite3.Connection, mac_id: int, week: int, season_label: str, source_url: str):
    conn.execute(
        """
        INSERT INTO superlig_fixture_weeks (mac_id, week_number, season_label, source_url, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(mac_id) DO UPDATE SET
          week_number=excluded.week_number,
          season_label=excluded.season_label,
          source_url=excluded.source_url,
          updated_at=excluded.updated_at
        """,
        (mac_id, week, season_label, source_url, dt.datetime.utcnow().isoformat()),
    )


def fetch_html(url: str) -> str:
    out_b = subprocess.check_output(
        [
            "curl",
            "-sL",
            url,
            "-H",
            "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "-H",
            "Accept-Language: tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        ],
    )
    out = out_b.decode("windows-1254", errors="replace")
    if not out.strip():
        raise RuntimeError("empty response")
    return out


def fetch_match(mac_id: int):
    url = f"https://www.tff.org/Default.aspx?pageID=29&macId={mac_id}"
    page_html = fetch_html(url)
    details = parse_match_details(page_html)
    return page_html, details


def main():
    ap = argparse.ArgumentParser(description="Scrape TFF league week page, fetch match details, upsert into DB")
    ap.add_argument("--url", default=DEFAULT_URL, help="TFF week page URL (e.g. pageID=198&hafta=24)")
    ap.add_argument("--db", default=DEFAULT_DB, help="SQLite DB path")
    ap.add_argument("--force", action="store_true", help="Re-fetch even if match exists in matches table")
    args = ap.parse_args()

    week_html = fetch_html(args.url)
    mac_ids = extract_match_ids(week_html)
    if not mac_ids:
        print(f"[warn] no macId found on page: {args.url}")
        return
    week_number = parse_week_from_url(args.url)
    season_label = extract_season_label(week_html)

    conn = init_db(args.db)
    conn.execute("PRAGMA busy_timeout=60000;")
    ensure_week_table(conn)

    existing = {
        int(x[0])
        for x in conn.execute("SELECT mac_id FROM matches").fetchall()
        if x and x[0] is not None
    }

    inserted = 0
    skipped = 0
    failed = 0
    for i, mac_id in enumerate(mac_ids, start=1):
        if week_number:
            upsert_week_mapping(conn, mac_id, week_number, season_label, args.url)
        if (not args.force) and mac_id in existing:
            skipped += 1
            continue
        try:
            page_html, details = fetch_match(mac_id)
            for attempt in range(5):
                try:
                    upsert_match(conn, mac_id, page_html, details)
                    break
                except sqlite3.OperationalError as e:
                    if "locked" not in str(e).lower() or attempt == 4:
                        raise
                    time.sleep(0.6 * (attempt + 1))
            inserted += 1
            if i % 5 == 0:
                conn.commit()
        except Exception as e:
            failed += 1
            print(f"[warn] mac_id={mac_id} failed: {e}")
            continue

    conn.commit()

    now = dt.datetime.utcnow().isoformat()
    print(
        f"[ok] scraped_at={now} week_url={args.url}\n"
        f"     found={len(mac_ids)} inserted_or_updated={inserted} skipped_existing={skipped} failed={failed}"
    )

    sample = conn.execute(
        """
        SELECT m.mac_id, COALESCE(md1.value,''), COALESCE(md2.value,''), COALESCE(md3.value,'')
        FROM matches m
        LEFT JOIN match_details md1 ON md1.mac_id=m.mac_id AND md1.key='Tarih'
        LEFT JOIN match_details md2 ON md2.mac_id=m.mac_id AND md2.key='Hakemler'
        LEFT JOIN match_details md3 ON md3.mac_id=m.mac_id AND md3.key='Kartlar'
        WHERE m.mac_id IN (%s)
        ORDER BY m.mac_id DESC
        LIMIT 5
        """
        % ",".join(str(x) for x in mac_ids[:50]),
    ).fetchall()
    print("[sample]")
    for row in sample:
        print(f"  mac_id={row[0]} tarih={row[1]} hakem={row[2][:80]} kartlar={row[3][:80]}")

    conn.close()


if __name__ == "__main__":
    main()
