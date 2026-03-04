#!/usr/bin/env python3
import datetime as dt
import html
import re
import sqlite3
import urllib.request
from typing import Optional
import argparse

DB_PATH = "/Users/aliozkan/RefereeRank/data/tff_referees_matches_full.db"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

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
    mon_name = m.group(2)
    year = int(m.group(3))
    mon = MONTHS_TR.get(mon_name)
    if not mon:
        return None
    try:
        return dt.date(year, mon, day)
    except ValueError:
        return None


def fetch_html(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        },
    )
    with urllib.request.urlopen(req, timeout=35) as resp:
        raw = resp.read()
        enc = resp.headers.get_content_charset() or "windows-1254"
    return raw.decode(enc, errors="replace")


def extract_counts(raw_html: str):
    page = raw_html or ""

    # Direct yellow cards.
    yellow_direct = len(
        re.findall(
            r'<img[^>]+(?:alt="Sarı Kart"|icon\.sarikart)',
            page,
            flags=re.I,
        )
    )
    # Direct red cards.
    red_direct = len(
        re.findall(
            r'<img[^>]+(?:alt="Kırmızı Kart"|icon\.kirmizikart)',
            page,
            flags=re.I,
        )
    )
    # Second yellow resulting in red.
    second_yellow_red = len(
        re.findall(
            r'<img[^>]+(?:alt="Çift Sarı Kart"|icon\.sarikirmizikart)',
            page,
            flags=re.I,
        )
    )

    # UI expectation: yellow total includes second-yellow incidents.
    yellow_total = yellow_direct + second_yellow_red

    # Penalty goals: goal entries containing (P)
    goal_entries = re.findall(r'lblGol"[^>]*>(.*?)</a>', page, flags=re.I)
    penalty_goals = 0
    for g in goal_entries:
        txt = html.unescape(re.sub(r"<[^>]+>", " ", g))
        if "(P)" in txt:
            penalty_goals += 1

    return yellow_total, red_direct, second_yellow_red, penalty_goals


def ensure_schema(conn: sqlite3.Connection):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS superlig_hakem_match_stats (
            mac_id INTEGER PRIMARY KEY,
            hakem_id TEXT,
            referee_name TEXT,
            match_date TEXT,
            match_date_iso TEXT,
            organization TEXT,
            home_team TEXT,
            away_team TEXT,
            score TEXT,
            yellow_cards INTEGER,
            red_cards INTEGER,
            second_yellow_red_cards INTEGER DEFAULT 0,
            penalty_goals INTEGER,
            source TEXT,
            scraped_at TEXT
        )
        """
    )
    cols = {r[1] for r in conn.execute("PRAGMA table_info(superlig_hakem_match_stats)").fetchall()}
    if "second_yellow_red_cards" not in cols:
        conn.execute("ALTER TABLE superlig_hakem_match_stats ADD COLUMN second_yellow_red_cards INTEGER DEFAULT 0")


def main(recompute: bool):
    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=60000;")

    ensure_schema(conn)

    cutoff = dt.date.today() - dt.timedelta(days=365 * 5)

    rows = conn.execute(
        """
        SELECT
          rm.hakem_id,
          r.name,
          rm.mac_id,
          rm.home_team,
          rm.away_team,
          rm.score,
          rm.match_date,
          rm.organization,
          m.detail_url,
          m.raw_html
        FROM referee_matches rm
        JOIN referees r ON r.hakem_id = rm.hakem_id
        LEFT JOIN matches m ON m.mac_id = rm.mac_id
        WHERE rm.role = 'Hakem'
          AND rm.organization LIKE 'Trendyol Süper Lig%'
          AND rm.mac_id IS NOT NULL
        ORDER BY rm.id DESC
        """
    ).fetchall()

    candidates = []
    for row in rows:
        d = parse_tr_date(row[6] or "")
        if d and d >= cutoff:
            candidates.append((row, d))

    print(f"[info] cutoff={cutoff.isoformat()} candidates={len(candidates)}")

    existing_ids = {
        x[0]
        for x in conn.execute("SELECT mac_id FROM superlig_hakem_match_stats").fetchall()
    }

    inserted = 0
    updated = 0
    skipped_existing = 0
    fetched_from_web = 0
    failed = 0

    for idx, (row, date_obj) in enumerate(candidates, start=1):
        hakem_id, referee_name, mac_id, home_team, away_team, score, match_date, org, detail_url, raw_html = row

        if (not recompute) and mac_id in existing_ids:
            skipped_existing += 1
            continue

        html_page = raw_html or ""
        if not html_page.strip():
            try:
                url = detail_url or f"https://www.tff.org/Default.aspx?pageID=29&macId={mac_id}"
                html_page = fetch_html(url)
                fetched_from_web += 1
                conn.execute(
                    "UPDATE matches SET raw_html=?, scraped_at=? WHERE mac_id=?",
                    (html_page, dt.datetime.utcnow().isoformat(), mac_id),
                )
            except Exception:
                failed += 1
                continue

        yellow, red, second_yellow_red, penalty = extract_counts(html_page)

        conn.execute(
            """
            INSERT OR REPLACE INTO superlig_hakem_match_stats (
                mac_id, hakem_id, referee_name, match_date, match_date_iso,
                organization, home_team, away_team, score,
                yellow_cards, red_cards, second_yellow_red_cards, penalty_goals,
                source, scraped_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                mac_id,
                hakem_id,
                referee_name,
                match_date,
                date_obj.isoformat(),
                org,
                home_team,
                away_team,
                score,
                yellow,
                red,
                second_yellow_red,
                penalty,
                detail_url or f"https://www.tff.org/Default.aspx?pageID=29&macId={mac_id}",
                dt.datetime.utcnow().isoformat(),
            ),
        )
        if mac_id in existing_ids:
            updated += 1
        else:
            inserted += 1
        existing_ids.add(mac_id)

        if idx % 100 == 0:
            conn.commit()
            print(f"  [progress] {idx}/{len(candidates)} processed")

    conn.commit()

    total = conn.execute("SELECT COUNT(*) FROM superlig_hakem_match_stats").fetchone()[0]
    print(
        f"[done] inserted={inserted} updated={updated} skipped_existing={skipped_existing} fetched_from_web={fetched_from_web} failed={failed} total={total}"
    )

    sample = conn.execute(
        """
        SELECT match_date_iso, referee_name, home_team, away_team, score, yellow_cards, red_cards, second_yellow_red_cards, penalty_goals
        FROM superlig_hakem_match_stats
        ORDER BY match_date_iso DESC, mac_id DESC
        LIMIT 10
        """
    ).fetchall()

    print("[sample]")
    for s in sample:
        print("|".join(str(x) for x in s))

    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--recompute", action="store_true", help="Recompute and update existing rows")
    args = parser.parse_args()
    main(recompute=args.recompute)
