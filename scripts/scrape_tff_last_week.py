#!/usr/bin/env python3
import argparse
import datetime as dt
import html
import re
import sqlite3
from typing import Optional

from build_tff_ref_db import (
    TFFClient,
    parse_hidden_fields,
    parse_match_rows,
    parse_next_page_target,
    insert_referee_match,
    upsert_match,
    parse_match_details,
)

DB_DEFAULT = "/Users/aliozkan/RefereeRank/data/tff_referees_matches_full.db"

MONTHS_TR = {
    "Ocak": 1,
    "Şubat": 2,
    "Mart": 3,
    "Nisan": 4,
    "Mayıs": 5,
    "Haziran": 6,
    "Temmuz": 7,
    "Ağustos": 8,
    "Eylül": 9,
    "Ekim": 10,
    "Kasım": 11,
    "Aralık": 12,
}


def parse_tr_date(s: str) -> Optional[dt.date]:
    s = (s or "").strip()
    m = re.match(r"^(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})$", s)
    if not m:
        return None
    day = int(m.group(1))
    mon = MONTHS_TR.get(m.group(2))
    year = int(m.group(3))
    if not mon:
        return None
    try:
        return dt.date(year, mon, day)
    except Exception:
        return None


def collect_recent_rows(client: TFFClient, ref_url: str, cutoff: dt.date):
    page = client.fetch(ref_url)
    seen = set()
    rows = []
    old_streak = 0

    while True:
        page_rows = parse_match_rows(page)
        for r in page_rows:
            key = (r.get("mac_id"), r.get("match_date"), r.get("role"), r.get("organization"))
            if key in seen:
                continue
            seen.add(key)
            d = parse_tr_date(r.get("match_date") or "")
            if d and d >= cutoff:
                rows.append(r)
                old_streak = 0
            elif d:
                old_streak += 1

        # If we already saw many old rows in order, stop early.
        if old_streak >= 30:
            break

        target = parse_next_page_target(page)
        if not target:
            break

        hidden = parse_hidden_fields(page)
        form = dict(hidden)
        form["__EVENTTARGET"] = target
        form["__EVENTARGUMENT"] = ""
        nxt = client.fetch(ref_url, data=form)
        if nxt == page:
            break
        page = nxt

    return rows


def ensure_busy(conn: sqlite3.Connection):
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA busy_timeout=60000;")


def main():
    ap = argparse.ArgumentParser(description="Incremental TFF scrape for last N days from referee pages")
    ap.add_argument("--db", default=DB_DEFAULT)
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--limit-referees", type=int, default=0, help="0 means all")
    args = ap.parse_args()

    cutoff = dt.date.today() - dt.timedelta(days=args.days)
    conn = sqlite3.connect(args.db, timeout=60)
    ensure_busy(conn)
    client = TFFClient(sleep_sec=0.02)

    refs = conn.execute(
        """
        SELECT hakem_id, name, url
        FROM referees
        WHERE url IS NOT NULL AND url <> ''
        ORDER BY name ASC
        """
    ).fetchall()
    if args.limit_referees and args.limit_referees > 0:
        refs = refs[: args.limit_referees]

    inserted_rows = 0
    fetched_match_pages = 0
    seen_recent_match_ids = set()

    for i, (hakem_id, name, url) in enumerate(refs, start=1):
        try:
            rows = collect_recent_rows(client, url, cutoff)
        except Exception as e:
            print(f"[warn] referee page failed {name} ({hakem_id}): {e}")
            continue

        if rows:
            for r in rows:
                before = conn.total_changes
                insert_referee_match(conn, hakem_id, url, r)
                if conn.total_changes > before:
                    inserted_rows += 1
                mid = r.get("mac_id")
                if mid is not None:
                    seen_recent_match_ids.add(int(mid))
        if i % 10 == 0:
            conn.commit()
            print(f"[progress] referees {i}/{len(refs)} inserted_rows={inserted_rows}")

    conn.commit()

    # Upsert match + details for recent match ids that are missing or have empty details
    for mid in sorted(seen_recent_match_ids):
        row = conn.execute("SELECT raw_html FROM matches WHERE mac_id=?", (mid,)).fetchone()
        if row and row[0]:
            # Ensure details exist at least minimally.
            details_count = conn.execute("SELECT COUNT(*) FROM match_details WHERE mac_id=?", (mid,)).fetchone()[0]
            if details_count > 0:
                continue
        try:
            detail_url = f"https://www.tff.org/Default.aspx?pageID=29&macId={mid}"
            page_html = client.fetch(detail_url)
            details = parse_match_details(page_html)
            upsert_match(conn, mid, page_html, details)
            fetched_match_pages += 1
        except Exception as e:
            print(f"[warn] match detail fetch failed mac_id={mid}: {e}")
            continue

    conn.commit()

    recent_count = conn.execute(
        """
        SELECT COUNT(*)
        FROM referee_matches
        WHERE
          (substr(match_date, -4) || '-' ||
           CASE substr(match_date, instr(match_date, ' ')+1, instr(substr(match_date, instr(match_date, ' ')+1), ' ')-1)
             WHEN 'Ocak' THEN '01' WHEN 'Şubat' THEN '02' WHEN 'Mart' THEN '03' WHEN 'Nisan' THEN '04'
             WHEN 'Mayıs' THEN '05' WHEN 'Haziran' THEN '06' WHEN 'Temmuz' THEN '07' WHEN 'Ağustos' THEN '08'
             WHEN 'Eylül' THEN '09' WHEN 'Ekim' THEN '10' WHEN 'Kasım' THEN '11' WHEN 'Aralık' THEN '12'
             ELSE '01'
           END || '-' ||
           printf('%02d', CAST(substr(match_date, 1, instr(match_date, ' ')-1) AS INTEGER))
          ) >= ?
        """,
        (cutoff.isoformat(),),
    ).fetchone()[0]

    print(
        f"[done] cutoff={cutoff.isoformat()} referees={len(refs)} inserted_rows={inserted_rows} "
        f"recent_match_ids={len(seen_recent_match_ids)} fetched_match_pages={fetched_match_pages} "
        f"recent_rows_in_db={recent_count}"
    )


if __name__ == "__main__":
    main()

