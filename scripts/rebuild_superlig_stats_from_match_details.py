#!/usr/bin/env python3
import datetime as dt
import html
import re
import sqlite3
import unicodedata

DB_PATH = "/Users/aliozkan/RefereeRank/data/tff_referees_matches_full.db"


def normalize_name(s: str) -> str:
    if not s:
        return ""
    s = s.upper().replace("İ", "İ")
    rep = {
        "I": "I",
        "İ": "I",
        "Ş": "S",
        "Ğ": "G",
        "Ü": "U",
        "Ö": "O",
        "Ç": "C",
    }
    s = "".join(rep.get(ch, ch) for ch in s)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = re.sub(r"[^A-Z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def extract_counts(raw_html: str):
    page = raw_html or ""
    yellow_direct = len(re.findall(r'<img[^>]+(?:alt="Sarı Kart"|icon\.sarikart)', page, flags=re.I))
    red_direct = len(re.findall(r'<img[^>]+(?:alt="Kırmızı Kart"|icon\.kirmizikart)', page, flags=re.I))
    second_yellow_red = len(re.findall(r'<img[^>]+(?:alt="Çift Sarı Kart"|icon\.sarikirmizikart)', page, flags=re.I))
    yellow_total = yellow_direct + second_yellow_red
    goal_entries = re.findall(r'lblGol"[^>]*>(.*?)</a>', page, flags=re.I)
    penalty_goals = 0
    for g in goal_entries:
        txt = html.unescape(re.sub(r"<[^>]+>", " ", g))
        if "(P)" in txt:
            penalty_goals += 1
    return yellow_total, red_direct, second_yellow_red, penalty_goals


def parse_iso_date(date_value: str) -> str:
    s = (date_value or "").strip()
    # e.g. 1.03.2026 - 20:00
    m = re.match(r"^(\d{1,2})\.(\d{1,2})\.(\d{4})", s)
    if not m:
        return ""
    d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    try:
        return dt.date(y, mo, d).isoformat()
    except ValueError:
        return ""


def extract_main_referee(hakemler: str) -> str:
    s = (hakemler or "").strip()
    if not s:
        return ""
    m = re.search(r"([^|]+?)\s*\(Hakem\)", s, flags=re.I)
    if m:
        return m.group(1).strip()
    first = s.split("|")[0]
    return re.sub(r"\([^)]*\)", "", first).strip()


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


def main():
    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=60000;")
    ensure_schema(conn)

    refs = conn.execute("SELECT hakem_id, name FROM referees").fetchall()
    ref_exact = {str(name or "").strip().upper(): str(hid) for hid, name in refs}
    ref_norm = {normalize_name(str(name or "")): str(hid) for hid, name in refs}

    rows = conn.execute(
        """
        WITH md AS (
          SELECT
            mac_id,
            MAX(CASE WHEN key='Tarih' THEN value END) AS match_date,
            MAX(CASE WHEN key='Organizasyon' THEN value END) AS organization,
            MAX(CASE WHEN key='Ev Sahibi' THEN value END) AS home_team,
            MAX(CASE WHEN key='Misafir' THEN value END) AS away_team,
            MAX(CASE WHEN key='Skor' THEN value END) AS score,
            MAX(CASE WHEN key='Hakemler' THEN value END) AS hakemler
          FROM match_details
          GROUP BY mac_id
        )
        SELECT m.mac_id, m.detail_url, m.raw_html, md.match_date, md.organization, md.home_team, md.away_team, md.score, md.hakemler
        FROM matches m
        JOIN md ON md.mac_id = m.mac_id
        WHERE md.organization LIKE 'Trendyol Süper Lig%'
        """
    ).fetchall()

    upserted = 0
    skipped = 0
    unresolved_ref = 0
    for mac_id, detail_url, raw_html, match_date, org, home_team, away_team, score, hakemler in rows:
        iso = parse_iso_date(match_date or "")
        if not iso:
            skipped += 1
            continue
        ref_name = extract_main_referee(hakemler or "")
        hid = ""
        if ref_name:
            hid = ref_exact.get(ref_name.upper(), "")
            if not hid:
                hid = ref_norm.get(normalize_name(ref_name), "")
        if not hid:
            unresolved_ref += 1
        yellow, red, syr, pen = extract_counts(raw_html or "")
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
                hid,
                ref_name,
                match_date or "",
                iso,
                org or "",
                home_team or "",
                away_team or "",
                score or "",
                yellow,
                red,
                syr,
                pen,
                detail_url or f"https://www.tff.org/Default.aspx?pageID=29&macId={mac_id}",
                dt.datetime.utcnow().isoformat(),
            ),
        )
        upserted += 1

    conn.commit()
    print(f"[ok] rows={len(rows)} upserted={upserted} skipped_no_date={skipped} unresolved_ref={unresolved_ref}")
    sample = conn.execute(
        """
        SELECT mac_id, referee_name, match_date, home_team, away_team, score, yellow_cards, red_cards, second_yellow_red_cards
        FROM superlig_hakem_match_stats
        ORDER BY match_date_iso DESC, mac_id DESC
        LIMIT 12
        """
    ).fetchall()
    for r in sample:
        print("|".join(str(x or "") for x in r))
    conn.close()


if __name__ == "__main__":
    main()

