#!/usr/bin/env python3
import argparse
import datetime as dt
import html
import os
import re
import sqlite3
import sys
import time
import urllib.parse
import urllib.request
import http.cookiejar
import zipfile
import xml.etree.ElementTree as ET
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

BASE = "https://www.tff.org/"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
_thread_local = threading.local()


def strip_tags(s: str) -> str:
    s = re.sub(r"<script[\s\S]*?</script>", " ", s, flags=re.I)
    s = re.sub(r"<style[\s\S]*?</style>", " ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    s = s.replace("\xa0", " ")
    return re.sub(r"\s+", " ", s).strip()


def parse_xlsx_referees(xlsx_path: str):
    ns = {
        "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
        "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    }

    with zipfile.ZipFile(xlsx_path) as zf:
        wb = ET.fromstring(zf.read("xl/workbook.xml"))
        sheets = [
            (
                s.attrib.get("name"),
                s.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"),
            )
            for s in wb.find("m:sheets", ns)
        ]
        if not sheets:
            return []

        rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        rid_to_target = {r.attrib["Id"]: r.attrib["Target"] for r in rels}
        _, rid = sheets[0]
        target = rid_to_target[rid]
        if not target.startswith("xl/"):
            target = "xl/" + target

        shared = []
        if "xl/sharedStrings.xml" in zf.namelist():
            sst = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in sst.findall("m:si", ns):
                parts = [t.text or "" for t in si.findall(".//m:t", ns)]
                shared.append("".join(parts))

        sheet_xml = ET.fromstring(zf.read(target))

        hmap = {}
        hyperlinks = sheet_xml.find("m:hyperlinks", ns)
        if hyperlinks is not None:
            for hl in hyperlinks.findall("m:hyperlink", ns):
                ref = hl.attrib.get("ref")
                hrid = hl.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
                if ref and hrid:
                    hmap[ref] = hrid

        rel_path = "/".join(target.split("/")[:-1]) + "/_rels/" + target.split("/")[-1] + ".rels"
        rid_to_url = {}
        if rel_path in zf.namelist():
            srels = ET.fromstring(zf.read(rel_path))
            for rel in srels:
                rid_to_url[rel.attrib["Id"]] = rel.attrib.get("Target", "")

        rows = {}
        for row in sheet_xml.findall(".//m:sheetData/m:row", ns):
            rnum = int(row.attrib["r"])
            row_map = {}
            for c in row.findall("m:c", ns):
                ref = c.attrib.get("r", "")
                t = c.attrib.get("t")
                v = c.find("m:v", ns)
                is_node = c.find("m:is", ns)
                value = ""
                if t == "s" and v is not None and v.text is not None:
                    idx = int(v.text)
                    value = shared[idx] if idx < len(shared) else ""
                elif t == "inlineStr" and is_node is not None:
                    value = "".join(x.text or "" for x in is_node.findall(".//m:t", ns))
                elif v is not None and v.text is not None:
                    value = v.text
                row_map[ref] = value.strip()
            rows[rnum] = row_map

        referees = []
        for rnum, row_map in sorted(rows.items()):
            name = row_map.get(f"B{rnum}", "").strip()
            klasman = row_map.get(f"C{rnum}", "").strip()
            city = row_map.get(f"D{rnum}", "").strip()
            if not name or name.lower().startswith("ad - soyad"):
                continue
            rid = hmap.get(f"B{rnum}")
            url = rid_to_url.get(rid, "") if rid else ""
            if not url:
                continue
            m = re.search(r"[?&]hakemID=(\d+)", url)
            hakem_id = m.group(1) if m else ""
            referees.append(
                {
                    "hakem_id": hakem_id,
                    "name": name,
                    "klasman": klasman,
                    "city": city,
                    "url": url if url.startswith("http") else urllib.parse.urljoin(BASE, url.lstrip("/")),
                }
            )

        return referees


class TFFClient:
    def __init__(self, sleep_sec: float = 0.03):
        cj = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
        self.sleep_sec = sleep_sec

    def fetch(self, url: str, data: Optional[dict] = None) -> str:
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "keep-alive",
        }
        payload = None
        if data is not None:
            payload = urllib.parse.urlencode(data).encode("utf-8")
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        req = urllib.request.Request(url=url, data=payload, headers=headers)
        with self.opener.open(req, timeout=40) as resp:
            raw = resp.read()
            ctype = resp.headers.get_content_charset() or "windows-1254"
        time.sleep(self.sleep_sec)
        return raw.decode(ctype, errors="replace")


def get_thread_client() -> TFFClient:
    client = getattr(_thread_local, "client", None)
    if client is None:
        client = TFFClient(sleep_sec=0.0)
        _thread_local.client = client
    return client


def fetch_match_payload(mac_id: int):
    client = get_thread_client()
    url = f"https://www.tff.org/Default.aspx?pageID=29&macId={mac_id}"
    page_html = client.fetch(url)
    details = parse_match_details(page_html)
    return mac_id, page_html, details


HIDDEN_RE = re.compile(
    r'<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"', re.I
)


def parse_hidden_fields(page_html: str) -> dict:
    fields = {}
    for k, v in HIDDEN_RE.findall(page_html):
        fields[html.unescape(k)] = html.unescape(v)
    return fields


def parse_referee_meta(page_html: str) -> dict:
    meta = {}
    pairs = {
        "name": r'id="ctl00_MPane_m_72_402_ctnr_m_72_402_dtlHakemBilgi_Label1"[^>]*>([^<]*)<',
        "license_no": r'id="ctl00_MPane_m_72_402_ctnr_m_72_402_dtlHakemBilgi_Label3"[^>]*>([^<]*)<',
        "class": r'id="ctl00_MPane_m_72_402_ctnr_m_72_402_dtlHakemBilgi_Label4"[^>]*>([^<]*)<',
        "region": r'id="ctl00_MPane_m_72_402_ctnr_m_72_402_dtlHakemBilgi_Label6"[^>]*>([^<]*)<',
    }
    for k, pat in pairs.items():
        m = re.search(pat, page_html, flags=re.I)
        if m:
            meta[k] = strip_tags(m.group(1))
    return meta


def parse_match_rows(page_html: str):
    rows = []
    for tr in re.findall(r'<tr class="Grid(?:Alt)?Row_TFF_Contents">([\s\S]*?)</tr>', page_html, flags=re.I):
        mac_id = None
        score = ""
        mscore = re.search(r'lnkSkor"[^>]*href="([^"]*macId=(\d+)[^"]*)"[^>]*>(.*?)</a>', tr, flags=re.I)
        if mscore:
            mac_id = int(mscore.group(2))
            score = strip_tags(mscore.group(3))

        mhome = re.search(r'lnkEvSahibi"[^>]*>(.*?)</a>', tr, flags=re.I)
        maway = re.search(r'lnkMisafir"[^>]*>(.*?)</a>', tr, flags=re.I)
        home = strip_tags(mhome.group(1)) if mhome else ""
        away = strip_tags(maway.group(1)) if maway else ""

        tds = re.findall(r'<td[^>]*>([\s\S]*?)</td>', tr, flags=re.I)
        td_txt = [strip_tags(x) for x in tds]
        if not home and len(td_txt) > 0:
            home = td_txt[0]
        if not away and len(td_txt) > 2:
            away = td_txt[2]

        match_date = td_txt[3] if len(td_txt) > 3 else ""
        role = td_txt[4] if len(td_txt) > 4 else ""
        organization = td_txt[5] if len(td_txt) > 5 else ""

        rows.append(
            {
                "mac_id": mac_id,
                "home_team": home,
                "away_team": away,
                "score": score,
                "match_date": match_date,
                "role": role,
                "organization": organization,
                "row_html": tr,
            }
        )
    return rows


def parse_pager_targets(page_html: str):
    targets = []
    for segment in re.findall(r"Sayfalar:[\s\S]*?</td>", page_html, flags=re.I):
        decoded = html.unescape(segment)
        for target in re.findall(r"__doPostBack\('([^']+)'\s*,\s*''\)", decoded):
            if "$grdSonuc$ctl01$ctl03$ctl01$" in target:
                targets.append(target)
    out = []
    seen = set()
    for t in targets:
        if t not in seen:
            out.append(t)
            seen.add(t)
    return out


def parse_next_page_target(page_html: str):
    decoded = html.unescape(page_html)
    m = re.search(
        r'<a[^>]*title="Next page"[^>]*href="javascript:__doPostBack\(\'([^\']+)\'\s*,\s*\'\'\)"',
        decoded,
        flags=re.I,
    )
    if m:
        return m.group(1)
    return None


def parse_total_count(page_html: str):
    m = re.search(r"Toplam\s+(\d+)\s+kayıt\s+bulundu", page_html, flags=re.I)
    return int(m.group(1)) if m else None


def parse_match_details(page_html: str):
    details = {}

    title_match = re.search(r"<title>([\s\S]*?)</title>", page_html, flags=re.I)
    if title_match:
        details["title"] = strip_tags(title_match.group(1))

    def one(pat: str):
        m = re.search(pat, page_html, flags=re.I)
        return strip_tags(m.group(1)) if m else ""

    details["Ev Sahibi"] = one(r'lnkTakim1"[^>]*>(.*?)</a>')
    details["Misafir"] = one(r'lnkTakim2"[^>]*>(.*?)</a>')
    s1 = one(r'lblTakim1Skor"[^>]*>(.*?)</span>')
    s2 = one(r'dtMacBilgisi_Label12"[^>]*>(.*?)</span>')
    if s1 or s2:
        details["Skor"] = f"{s1}-{s2}".strip("-")
    details["Organizasyon"] = one(r'lblOrganizasyonAdi"[^>]*>(.*?)</span>')
    details["Maç Kodu"] = one(r'lblKod"[^>]*>(.*?)</span>')
    details["Stadyum"] = one(r'lnkStad"[^>]*>(.*?)</a>')
    details["Tarih"] = one(r'lblTarih"[^>]*>(.*?)</span>')

    hakemler = [strip_tags(x) for x in re.findall(r'lnkHakem"[^>]*>(.*?)</a>', page_html, flags=re.I)]
    if hakemler:
        details["Hakemler"] = " | ".join(hakemler)

    gozlemciler = [strip_tags(x) for x in re.findall(r'lnkgoz"[^>]*>(.*?)</span>', page_html, flags=re.I)]
    if gozlemciler:
        details["Gözlemciler"] = " | ".join(gozlemciler)

    temsilciler = [strip_tags(x) for x in re.findall(r'lnkTem"[^>]*>(.*?)</span>', page_html, flags=re.I)]
    if temsilciler:
        details["Temsilciler"] = " | ".join(temsilciler)

    goller = [strip_tags(x) for x in re.findall(r'lblGol"[^>]*>(.*?)</a>', page_html, flags=re.I)]
    if goller:
        details["Goller"] = " | ".join(goller)

    kartlar = [strip_tags(x) for x in re.findall(r'lblKart"[^>]*>(.*?)</a>', page_html, flags=re.I)]
    if kartlar:
        details["Kartlar"] = " | ".join(kartlar)

    girenler = [strip_tags(x) for x in re.findall(r'lblGiren"[^>]*>(.*?)</a>', page_html, flags=re.I)]
    if girenler:
        details["Oyuna Girenler"] = " | ".join(girenler)

    cikanlar = [strip_tags(x) for x in re.findall(r'lblCikan"[^>]*>(.*?)</a>', page_html, flags=re.I)]
    if cikanlar:
        details["Oyundan Çıkanlar"] = " | ".join(cikanlar)

    # Remove empty values
    details = {k: v for k, v in details.items() if v}

    return details


def init_db(path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA busy_timeout=60000;")

    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS referees (
            hakem_id TEXT PRIMARY KEY,
            name TEXT,
            klasman TEXT,
            city TEXT,
            url TEXT,
            license_no TEXT,
            class_from_page TEXT,
            region TEXT,
            raw_html TEXT,
            scraped_at TEXT
        );

        CREATE TABLE IF NOT EXISTS matches (
            mac_id INTEGER PRIMARY KEY,
            detail_url TEXT,
            title TEXT,
            raw_html TEXT,
            scraped_at TEXT
        );

        CREATE TABLE IF NOT EXISTS referee_matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hakem_id TEXT,
            mac_id INTEGER,
            home_team TEXT,
            away_team TEXT,
            score TEXT,
            match_date TEXT,
            role TEXT,
            organization TEXT,
            source_page_url TEXT,
            row_html TEXT,
            scraped_at TEXT,
            UNIQUE(hakem_id, mac_id, role, match_date)
        );

        CREATE TABLE IF NOT EXISTS match_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mac_id INTEGER,
            key TEXT,
            value TEXT,
            UNIQUE(mac_id, key, value)
        );
        """
    )
    return conn


def upsert_referee(conn: sqlite3.Connection, ref: dict, meta: dict, raw_html: str):
    conn.execute(
        """
        INSERT INTO referees
            (hakem_id, name, klasman, city, url, license_no, class_from_page, region, raw_html, scraped_at)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(hakem_id) DO UPDATE SET
            name=excluded.name,
            klasman=excluded.klasman,
            city=excluded.city,
            url=excluded.url,
            license_no=excluded.license_no,
            class_from_page=excluded.class_from_page,
            region=excluded.region,
            raw_html=excluded.raw_html,
            scraped_at=excluded.scraped_at
        """,
        (
            ref.get("hakem_id"),
            meta.get("name") or ref.get("name"),
            ref.get("klasman"),
            ref.get("city"),
            ref.get("url"),
            meta.get("license_no", ""),
            meta.get("class", ""),
            meta.get("region", ""),
            raw_html,
            dt.datetime.utcnow().isoformat(),
        ),
    )


def insert_referee_match(conn: sqlite3.Connection, hakem_id: str, ref_url: str, row: dict):
    conn.execute(
        """
        INSERT OR IGNORE INTO referee_matches
        (hakem_id, mac_id, home_team, away_team, score, match_date, role, organization, source_page_url, row_html, scraped_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            hakem_id,
            row["mac_id"],
            row["home_team"],
            row["away_team"],
            row["score"],
            row["match_date"],
            row["role"],
            row["organization"],
            ref_url,
            row["row_html"],
            dt.datetime.utcnow().isoformat(),
        ),
    )


def upsert_match(conn: sqlite3.Connection, mac_id: int, html_page: str, details: dict):
    detail_url = f"https://www.tff.org/Default.aspx?pageID=29&macId={mac_id}"
    conn.execute(
        """
        INSERT INTO matches (mac_id, detail_url, title, raw_html, scraped_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(mac_id) DO UPDATE SET
            detail_url=excluded.detail_url,
            title=excluded.title,
            raw_html=excluded.raw_html,
            scraped_at=excluded.scraped_at
        """,
        (
            mac_id,
            detail_url,
            details.get("title", ""),
            html_page,
            dt.datetime.utcnow().isoformat(),
        ),
    )

    for k, v in details.items():
        if k == "title":
            continue
        conn.execute(
            "INSERT OR IGNORE INTO match_details (mac_id, key, value) VALUES (?, ?, ?)",
            (mac_id, k, v),
        )


def collect_referee_matches(client: TFFClient, ref_url: str):
    first = client.fetch(ref_url)
    meta = parse_referee_meta(first)

    rows = []
    seen_match_rows = set()

    def add_rows(page_html: str):
        added = 0
        for r in parse_match_rows(page_html):
            key = (r["mac_id"], r["match_date"], r["role"], r["organization"])
            if key in seen_match_rows:
                continue
            seen_match_rows.add(key)
            rows.append(r)
            added += 1
        return added

    add_rows(first)

    current_html = first
    hop = 0
    while hop < 2000:
        target = parse_next_page_target(current_html)
        if not target:
            break

        hidden = parse_hidden_fields(current_html)
        form = dict(hidden)
        form["__EVENTTARGET"] = target
        form["__EVENTARGUMENT"] = ""

        try:
            page_html = client.fetch(ref_url, data=form)
        except Exception:
            continue

        if page_html == current_html:
            break

        current_html = page_html
        added = add_rows(page_html)
        if added == 0 and not parse_next_page_target(page_html):
            break

        hop += 1

    return first, meta, rows, parse_total_count(first)


def run(xlsx_path: str, db_path: str, limit: Optional[int] = None):
    refs = parse_xlsx_referees(xlsx_path)
    if limit:
        refs = refs[:limit]

    print(f"[info] hakem sayısı: {len(refs)}")
    if not refs:
        return 1

    conn = init_db(db_path)
    client = TFFClient()

    all_match_ids = set()
    for (mid,) in conn.execute("SELECT DISTINCT mac_id FROM referee_matches WHERE mac_id IS NOT NULL"):
        all_match_ids.add(mid)

    for idx, ref in enumerate(refs, start=1):
        hakem_id = ref.get("hakem_id") or f"unknown-{idx}"
        ref["hakem_id"] = hakem_id
        existing_rows = conn.execute(
            "SELECT COUNT(*) FROM referee_matches WHERE hakem_id = ?",
            (hakem_id,),
        ).fetchone()[0]
        if existing_rows > 0:
            print(f"[ref {idx}/{len(refs)}] {ref.get('name')} (hakemID={hakem_id}) -> zaten var ({existing_rows} satır), atlandı")
            continue
        print(f"[ref {idx}/{len(refs)}] {ref.get('name')} (hakemID={hakem_id})")

        try:
            first_html, meta, matches, total = collect_referee_matches(client, ref["url"])
        except Exception as e:
            print(f"  [warn] hakem sayfası alınamadı: {e}")
            continue

        upsert_referee(conn, ref, meta, first_html)

        for m in matches:
            insert_referee_match(conn, hakem_id, ref["url"], m)
            if m["mac_id"] is not None:
                all_match_ids.add(m["mac_id"])

        conn.commit()
        print(f"  -> toplanan maç satırı: {len(matches)}; sayfa toplam kaydı: {total}")

    print(f"[info] tekil maç sayısı: {len(all_match_ids)}")

    existing_match_ids = {
        mid for (mid,) in conn.execute("SELECT mac_id FROM matches")
    }
    pending_match_ids = sorted(mid for mid in all_match_ids if mid not in existing_match_ids)
    print(f"[info] detay çekilecek maç sayısı: {len(pending_match_ids)} (mevcut: {len(existing_match_ids)})")

    if pending_match_ids:
        done = 0
        with ThreadPoolExecutor(max_workers=12) as pool:
            futures = {pool.submit(fetch_match_payload, mid): mid for mid in pending_match_ids}
            for i, fut in enumerate(as_completed(futures), start=1):
                mac_id = futures[fut]
                try:
                    _, page_html, details = fut.result()
                    upsert_match(conn, mac_id, page_html, details)
                    done += 1
                except Exception as e:
                    print(f"  [warn] maç {mac_id} alınamadı: {e}")
                    continue

                if i % 100 == 0:
                    conn.commit()
                    print(f"  [matches] {i}/{len(pending_match_ids)} işlendi")

        conn.commit()
    else:
        print("[info] tüm maç detayları zaten mevcut")

    # Backfill/refresh match_details from stored raw_html for rows with missing details.
    missing = list(
        conn.execute(
            """
            SELECT m.mac_id, m.raw_html
            FROM matches m
            LEFT JOIN (
                SELECT DISTINCT mac_id FROM match_details
            ) d ON d.mac_id = m.mac_id
            WHERE d.mac_id IS NULL
            """
        )
    )
    if missing:
        print(f"[info] match_details backfill: {len(missing)} maç")
        for i, (mac_id, raw_html) in enumerate(missing, start=1):
            details = parse_match_details(raw_html or "")
            for k, v in details.items():
                if k == "title":
                    continue
                conn.execute(
                    "INSERT OR IGNORE INTO match_details (mac_id, key, value) VALUES (?, ?, ?)",
                    (mac_id, k, v),
                )
            if i % 500 == 0:
                conn.commit()
        conn.commit()

    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM referees")
    rc = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM referee_matches")
    rmc = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM matches")
    mc = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM match_details")
    mdc = c.fetchone()[0]

    print("[done] veritabanı oluşturuldu")
    print(f"[done] referees={rc}, referee_matches={rmc}, matches={mc}, match_details={mdc}")
    print(f"[done] db={db_path}")

    conn.close()
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build TFF referee-match SQLite DB from an XLSX list")
    parser.add_argument("--xlsx", default="/Users/aliozkan/Desktop/Kitap1.xlsx")
    parser.add_argument("--db", default="/Users/aliozkan/RefereeRank/data/tff_referees_matches.db")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    sys.exit(run(args.xlsx, args.db, args.limit))
