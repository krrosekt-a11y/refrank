#!/usr/bin/env python3
import argparse
import csv
import json
import random
import re
import subprocess
import time
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Tuple
from urllib.parse import urlencode, urljoin, urlparse
from bs4 import BeautifulSoup

BASE_URL = "https://www.transfermarkt.com"
DEFAULT_LEAGUE_URL = f"{BASE_URL}/super-lig/schiedsrichter/wettbewerb/TR1"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/123.0.0.0 Safari/537.36"
)
DATE_RE = re.compile(r"\b\d{2}/\d{2}/\d{4}\b")


@dataclass
class Referee:
    referee_id: str
    name: str
    city: str
    profile_url: str
    debut_date: str
    season_appearances: str
    season_yellow: str
    season_second_yellow: str
    season_red: str
    season_penalties: str
    source_page: str


class TMClient:
    def __init__(self, delay_min: float = 0.25, delay_max: float = 0.65, timeout: int = 30):
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
            "Referer": BASE_URL,
        }
        self.delay_min = delay_min
        self.delay_max = delay_max
        self.timeout = timeout

    def get(self, url: str) -> str:
        last_err = None
        for i in range(3):
            try:
                cmd = [
                    "curl",
                    "-sL",
                    url,
                    "-H",
                    f"User-Agent: {self.headers['User-Agent']}",
                    "-H",
                    f"Accept-Language: {self.headers['Accept-Language']}",
                    "-H",
                    f"Referer: {self.headers['Referer']}",
                    "--max-time",
                    str(self.timeout),
                ]
                proc = subprocess.run(cmd, check=True, capture_output=True)
                body = proc.stdout
                if not body:
                    raise RuntimeError("empty response body")
                time.sleep(random.uniform(self.delay_min, self.delay_max))
                return body.decode("utf-8", errors="replace")
            except Exception as err:
                last_err = err
                time.sleep((i + 1) * 0.8)
        raise RuntimeError(f"GET failed for {url}: {last_err}")


def soup_of(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "lxml")


def text_clean(s: str) -> str:
    return " ".join((s or "").split())


def normalize_href(href: str) -> str:
    return urljoin(BASE_URL, href)


def parse_pagination_urls(soup: BeautifulSoup, page_url: str) -> List[str]:
    urls = {page_url}
    for a in soup.select("a.tm-pagination__link"):
        href = a.get("href")
        if not href:
            continue
        full = normalize_href(href)
        urls.add(full)
    return sorted(urls)


def parse_referees_from_list_page(soup: BeautifulSoup, page_url: str) -> List[Referee]:
    referees: List[Referee] = []
    for tr in soup.select("table.items tbody tr"):
        name_a = tr.select_one('td.hauptlink a[href*="/profil/schiedsrichter/"]')
        if not name_a:
            continue

        href = name_a.get("href", "")
        m = re.search(r"/schiedsrichter/(\d+)", href)
        if not m:
            continue

        tds = tr.find_all("td", recursive=False)
        if len(tds) < 7:
            continue

        city_text = ""
        for t in tr.select("td table.inline-table tr"):
            txt = text_clean(t.get_text(" "))
            if txt and txt != text_clean(name_a.get_text(" ")):
                city_text = txt

        debut_a = tds[1].find("a")
        debut = text_clean(debut_a.get_text(" ")) if debut_a else text_clean(tds[1].get_text(" "))

        referees.append(
            Referee(
                referee_id=m.group(1),
                name=text_clean(name_a.get_text(" ")),
                city=city_text,
                profile_url=normalize_href(href),
                debut_date=debut,
                season_appearances=text_clean(tds[2].get_text(" ")),
                season_yellow=text_clean(tds[3].get_text(" ")),
                season_second_yellow=text_clean(tds[4].get_text(" ")),
                season_red=text_clean(tds[5].get_text(" ")),
                season_penalties=text_clean(tds[6].get_text(" ")),
                source_page=page_url,
            )
        )
    return referees


def get_all_referees(client: TMClient, league_url: str) -> List[Referee]:
    first_html = client.get(league_url)
    first_soup = soup_of(first_html)
    pages = parse_pagination_urls(first_soup, league_url)

    all_refs: Dict[str, Referee] = {}
    for page_url in pages:
        html = first_html if page_url == league_url else client.get(page_url)
        soup = first_soup if page_url == league_url else soup_of(html)
        for ref in parse_referees_from_list_page(soup, page_url):
            all_refs.setdefault(ref.referee_id, ref)

    return sorted(all_refs.values(), key=lambda r: r.name.lower())


def profile_path_parts(profile_url: str) -> Tuple[str, str]:
    parsed = urlparse(profile_url)
    path = parsed.path.strip("/")
    parts = path.split("/")
    if len(parts) < 4:
        raise ValueError(f"Unexpected profile url path: {profile_url}")
    slug = parts[0]
    ref_id = parts[-1]
    return slug, ref_id


def parse_seasons_from_profile(soup: BeautifulSoup) -> List[str]:
    seasons: List[str] = []
    sel = soup.select_one('select[name="saison_id"]')
    if not sel:
        return seasons
    for opt in sel.find_all("option"):
        v = (opt.get("value") or "").strip()
        if v:
            seasons.append(v)
    return sorted(set(seasons), reverse=True)


def build_season_url(profile_url: str, season: str) -> str:
    slug, ref_id = profile_path_parts(profile_url)
    base = f"{BASE_URL}/{slug}/profil/schiedsrichter/{ref_id}/plus/0"
    return f"{base}?{urlencode({'funktion': 1, 'saison_id': season, 'wettbewerb_id': ''})}"


def parse_match_rows_from_box(box) -> Iterable[dict]:
    title_el = box.select_one(".content-box-headline")
    competition = text_clean(title_el.get_text(" ")) if title_el else ""

    for tr in box.select("table tbody tr"):
        score_a = tr.select_one("a.ergebnis-link")
        if not score_a:
            continue

        href = score_a.get("href", "")
        m = re.search(r"/spielbericht/(\d+)", href)
        match_id = m.group(1) if m else (score_a.get("id") or "")

        tds = tr.find_all("td", recursive=False)
        texts = [text_clean(td.get_text(" ")) for td in tds]

        date_val = ""
        for txt in texts:
            if DATE_RE.search(txt):
                date_val = DATE_RE.search(txt).group(0)
                break

        home_team = text_clean(tds[3].get_text(" ")) if len(tds) > 3 else ""
        away_team = text_clean(tds[5].get_text(" ")) if len(tds) > 5 else ""
        matchday = text_clean(tds[0].get_text(" ")) if len(tds) > 0 else ""

        yield {
            "match_id": match_id,
            "date": date_val,
            "matchday": matchday,
            "competition": competition,
            "home_team": home_team,
            "away_team": away_team,
            "score": text_clean(score_a.get_text(" ")),
            "match_report_url": normalize_href(href),
            "yellow_cards": text_clean(tds[7].get_text(" ")) if len(tds) > 7 else "",
            "second_yellow_cards": text_clean(tds[8].get_text(" ")) if len(tds) > 8 else "",
            "red_cards": text_clean(tds[9].get_text(" ")) if len(tds) > 9 else "",
            "penalties": text_clean(tds[10].get_text(" ")) if len(tds) > 10 else "",
        }


def scrape_referee_matches(client: TMClient, ref: Referee, verbose: bool = False) -> List[dict]:
    profile_html = client.get(ref.profile_url)
    profile_soup = soup_of(profile_html)
    seasons = parse_seasons_from_profile(profile_soup)
    if verbose:
        print(f"[ref] {ref.name} ({ref.referee_id}) seasons={len(seasons)}")

    seen = set()
    matches: List[dict] = []

    for season in seasons:
        season_url = build_season_url(ref.profile_url, season)
        html = client.get(season_url)
        soup = soup_of(html)

        for box in soup.select("div.box"):
            if not box.select_one("a.ergebnis-link"):
                continue
            for row in parse_match_rows_from_box(box):
                key = (row["match_id"], row["competition"], row["date"], row["home_team"], row["away_team"])
                if key in seen:
                    continue
                seen.add(key)

                row["referee_id"] = ref.referee_id
                row["referee_name"] = ref.name
                row["season"] = season
                row["season_url"] = season_url
                matches.append(row)

    return matches


def write_json(path: str, rows: List[dict]):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)


def write_csv(path: str, rows: List[dict]):
    if not rows:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write("")
        return
    fields = list(rows[0].keys())
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description="Scrape Transfermarkt TR1 referees and all matches per referee")
    parser.add_argument("--league-url", default=DEFAULT_LEAGUE_URL)
    parser.add_argument("--out-dir", default="data")
    parser.add_argument("--delay-min", type=float, default=0.25)
    parser.add_argument("--delay-max", type=float, default=0.65)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    client = TMClient(delay_min=args.delay_min, delay_max=args.delay_max)

    refs = get_all_referees(client, args.league_url)
    print(f"[info] referees found: {len(refs)}")

    referee_rows = [
        {
            "referee_id": r.referee_id,
            "name": r.name,
            "city": r.city,
            "profile_url": r.profile_url,
            "debut_date": r.debut_date,
            "season_appearances": r.season_appearances,
            "season_yellow": r.season_yellow,
            "season_second_yellow": r.season_second_yellow,
            "season_red": r.season_red,
            "season_penalties": r.season_penalties,
            "source_page": r.source_page,
        }
        for r in refs
    ]

    all_matches: List[dict] = []
    for i, ref in enumerate(refs, start=1):
        if args.verbose:
            print(f"[progress] {i}/{len(refs)} {ref.name}")
        try:
            all_matches.extend(scrape_referee_matches(client, ref, verbose=args.verbose))
        except Exception as err:
            print(f"[warn] failed {ref.name} ({ref.referee_id}): {err}")

    # Stable ordering for easier downstream usage.
    all_matches.sort(key=lambda x: (x["referee_name"].lower(), x.get("date", ""), x.get("match_id", "")))

    refs_json = f"{args.out_dir}/transfermarkt_tr1_referees.json"
    refs_csv = f"{args.out_dir}/transfermarkt_tr1_referees.csv"
    matches_json = f"{args.out_dir}/transfermarkt_tr1_referee_matches.json"
    matches_csv = f"{args.out_dir}/transfermarkt_tr1_referee_matches.csv"

    write_json(refs_json, referee_rows)
    write_csv(refs_csv, referee_rows)
    write_json(matches_json, all_matches)
    write_csv(matches_csv, all_matches)

    print(f"[done] wrote: {refs_json}, {refs_csv}, {matches_json}, {matches_csv}")
    print(f"[done] counts: referees={len(referee_rows)} matches={len(all_matches)}")


if __name__ == "__main__":
    main()
