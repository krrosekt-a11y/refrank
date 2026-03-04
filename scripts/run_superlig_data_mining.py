#!/usr/bin/env python3
import csv
import datetime as dt
import math
import os
import re
import sqlite3
from collections import defaultdict

DB_PATH = "/Users/aliozkan/RefereeRank/data/tff_referees_matches_full.db"
OUT_DIR = "/Users/aliozkan/RefereeRank/data_mining"
REPORT_MD = os.path.join(OUT_DIR, "superlig_data_mining_report.md")


def ensure_tables(conn: sqlite3.Connection):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS superlig_match_team_cards (
            mac_id INTEGER PRIMARY KEY,
            home_team TEXT,
            away_team TEXT,
            home_yellow_direct INTEGER,
            home_red_direct INTEGER,
            home_second_yellow_red INTEGER,
            home_yellow_total INTEGER,
            away_yellow_direct INTEGER,
            away_red_direct INTEGER,
            away_second_yellow_red INTEGER,
            away_yellow_total INTEGER,
            scraped_at TEXT
        )
        """
    )


def parse_team_cards(raw_html: str):
    page = raw_html or ""

    def extract(prefix: str):
        # Card images have ids like ...grdTakim1_rptKartlar_ctl01_k
        img_srcs = re.findall(
            rf'id="[^"]*{prefix}_rptKartlar[^"]*_k"[^>]*src="([^"]+)"',
            page,
            flags=re.I,
        )
        y = r = sy = 0
        for src in img_srcs:
            s = src.lower()
            if "icon.sarikirmizikart" in s:
                sy += 1
            elif "icon.kirmizikart" in s:
                r += 1
            elif "icon.sarikart" in s:
                y += 1
        return {
            "yellow_direct": y,
            "red_direct": r,
            "second_yellow_red": sy,
            "yellow_total": y + sy,
        }

    return extract("grdTakim1"), extract("grdTakim2")


def build_team_card_table(conn: sqlite3.Connection):
    rows = conn.execute(
        """
        SELECT s.mac_id, s.home_team, s.away_team, m.raw_html
        FROM superlig_hakem_match_stats s
        JOIN matches m ON m.mac_id = s.mac_id
        """
    ).fetchall()

    updated = 0
    for mac_id, home_team, away_team, raw_html in rows:
        h, a = parse_team_cards(raw_html or "")
        conn.execute(
            """
            INSERT OR REPLACE INTO superlig_match_team_cards (
                mac_id, home_team, away_team,
                home_yellow_direct, home_red_direct, home_second_yellow_red, home_yellow_total,
                away_yellow_direct, away_red_direct, away_second_yellow_red, away_yellow_total,
                scraped_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                mac_id,
                home_team,
                away_team,
                h["yellow_direct"],
                h["red_direct"],
                h["second_yellow_red"],
                h["yellow_total"],
                a["yellow_direct"],
                a["red_direct"],
                a["second_yellow_red"],
                a["yellow_total"],
                dt.datetime.utcnow().isoformat(),
            ),
        )
        updated += 1

    conn.commit()
    return updated


def safe_div(a, b):
    return a / b if b else 0.0


def zscores(values):
    if not values:
        return []
    mean = sum(values) / len(values)
    var = sum((x - mean) ** 2 for x in values) / len(values)
    std = math.sqrt(var)
    if std == 0:
        return [0.0 for _ in values]
    return [(x - mean) / std for x in values]


def write_csv(path, headers, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        w.writerows(rows)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA busy_timeout=60000;")

    ensure_tables(conn)
    updated = build_team_card_table(conn)

    # 1) Referee profile
    ref_rows = conn.execute(
        """
        SELECT
          referee_name,
          COUNT(*) AS matches,
          SUM(yellow_cards) AS yellow,
          SUM(red_cards) AS red,
          SUM(second_yellow_red_cards) AS second_yellow_red,
          SUM(penalty_goals) AS penalties
        FROM superlig_hakem_match_stats
        GROUP BY referee_name
        HAVING COUNT(*) >= 5
        ORDER BY matches DESC, referee_name ASC
        """
    ).fetchall()

    ref_profile = []
    for name, m, y, r, syr, p in ref_rows:
        y = y or 0
        r = r or 0
        syr = syr or 0
        p = p or 0
        severity = y + 2 * (r + syr)
        ref_profile.append(
            [
                name,
                m,
                y,
                r,
                syr,
                p,
                round(safe_div(y, m), 3),
                round(safe_div(r + syr, m), 3),
                round(safe_div(p, m), 3),
                round(safe_div(severity, m), 3),
            ]
        )

    ref_profile_sorted_severity = sorted(ref_profile, key=lambda x: x[-1], reverse=True)
    ref_profile_sorted_pen = sorted(ref_profile, key=lambda x: x[-2], reverse=True)

    write_csv(
        os.path.join(OUT_DIR, "referee_card_profile.csv"),
        [
            "referee_name",
            "matches",
            "yellow_total",
            "red_direct",
            "second_yellow_red",
            "penalty_goals",
            "yellow_per_match",
            "red_events_per_match",
            "penalty_per_match",
            "severity_per_match",
        ],
        ref_profile,
    )

    # 2) Trend & deviation
    yearly = conn.execute(
        """
        SELECT substr(match_date_iso,1,4) AS y,
               COUNT(*) AS matches,
               SUM(yellow_cards) AS yellow,
               SUM(red_cards) AS red,
               SUM(second_yellow_red_cards) AS syr,
               SUM(penalty_goals) AS penalties
        FROM superlig_hakem_match_stats
        GROUP BY y
        ORDER BY y
        """
    ).fetchall()

    monthly = conn.execute(
        """
        SELECT substr(match_date_iso,1,7) AS ym,
               COUNT(*) AS matches,
               SUM(yellow_cards) AS yellow,
               SUM(red_cards) AS red,
               SUM(second_yellow_red_cards) AS syr,
               SUM(penalty_goals) AS penalties
        FROM superlig_hakem_match_stats
        GROUP BY ym
        ORDER BY ym
        """
    ).fetchall()

    write_csv(
        os.path.join(OUT_DIR, "trend_yearly.csv"),
        ["year", "matches", "yellow_total", "red_direct", "second_yellow_red", "penalty_goals"],
        yearly,
    )
    write_csv(
        os.path.join(OUT_DIR, "trend_monthly.csv"),
        ["year_month", "matches", "yellow_total", "red_direct", "second_yellow_red", "penalty_goals"],
        monthly,
    )

    # 3) Risk score model (heuristic)
    # Team received-card intensity (home+away).
    team_rows = conn.execute(
        """
        SELECT team_name,
               COUNT(*) AS matches,
               SUM(yellow_total + 2*(red_direct + second_yellow_red)) AS severity_points
        FROM (
          SELECT home_team AS team_name, home_yellow_total AS yellow_total, home_red_direct AS red_direct, home_second_yellow_red AS second_yellow_red
          FROM superlig_match_team_cards
          UNION ALL
          SELECT away_team AS team_name, away_yellow_total AS yellow_total, away_red_direct AS red_direct, away_second_yellow_red AS second_yellow_red
          FROM superlig_match_team_cards
        ) t
        GROUP BY team_name
        HAVING COUNT(*) >= 5
        """
    ).fetchall()
    team_sev_pm = {name: safe_div(points, m) for name, m, points in team_rows}

    ref_sev_pm = {r[0]: r[-1] for r in ref_profile}
    ref_pen_pm = {r[0]: r[-2] for r in ref_profile}

    # z-score bases
    ref_sev_vals = list(ref_sev_pm.values())
    ref_pen_vals = list(ref_pen_pm.values())
    team_vals = list(team_sev_pm.values())
    ref_sev_z = {k: v for k, v in zip(ref_sev_pm.keys(), zscores(ref_sev_vals))}
    ref_pen_z = {k: v for k, v in zip(ref_pen_pm.keys(), zscores(ref_pen_vals))}
    team_z = {k: v for k, v in zip(team_sev_pm.keys(), zscores(team_vals))}

    match_rows = conn.execute(
        """
        SELECT mac_id, match_date_iso, referee_name, home_team, away_team, score, organization
        FROM superlig_hakem_match_stats
        """
    ).fetchall()

    risk_rows = []
    for mac_id, d, refn, home, away, score, org in match_rows:
        z_ref = ref_sev_z.get(refn, 0.0)
        z_pen = ref_pen_z.get(refn, 0.0)
        z_team = (team_z.get(home, 0.0) + team_z.get(away, 0.0)) / 2.0

        # Weighted heuristic score
        z_total = 0.5 * z_ref + 0.3 * z_team + 0.2 * z_pen
        score100 = max(0.0, min(100.0, 50.0 + 12.0 * z_total))
        risk_rows.append([mac_id, d, refn, home, away, score, org, round(score100, 2)])

    risk_rows_sorted = sorted(risk_rows, key=lambda x: x[-1], reverse=True)
    write_csv(
        os.path.join(OUT_DIR, "match_risk_scores.csv"),
        ["mac_id", "match_date_iso", "referee_name", "home_team", "away_team", "score", "organization", "risk_score_0_100"],
        risk_rows,
    )

    # Extra A: which referee gives most cards to which teams
    # Cards shown to a team = that team's received cards in the match.
    ref_team_rows = conn.execute(
        """
        WITH expanded AS (
          SELECT s.referee_name,
                 c.home_team AS team,
                 (c.home_yellow_total + c.home_red_direct + c.home_second_yellow_red) AS cards_to_team
          FROM superlig_hakem_match_stats s
          JOIN superlig_match_team_cards c ON c.mac_id = s.mac_id
          UNION ALL
          SELECT s.referee_name,
                 c.away_team AS team,
                 (c.away_yellow_total + c.away_red_direct + c.away_second_yellow_red) AS cards_to_team
          FROM superlig_hakem_match_stats s
          JOIN superlig_match_team_cards c ON c.mac_id = s.mac_id
        )
        SELECT referee_name, team,
               COUNT(*) AS matches,
               SUM(cards_to_team) AS total_cards,
               ROUND(1.0*SUM(cards_to_team)/COUNT(*),3) AS cards_per_match
        FROM expanded
        GROUP BY referee_name, team
        HAVING COUNT(*) >= 2
        ORDER BY total_cards DESC, cards_per_match DESC
        """
    ).fetchall()

    write_csv(
        os.path.join(OUT_DIR, "referee_to_team_cards.csv"),
        ["referee_name", "team", "matches", "total_cards", "cards_per_match"],
        ref_team_rows,
    )

    # Extra B: home vs away tendency by referee
    home_away_rows = conn.execute(
        """
        SELECT referee_name,
               COUNT(*) AS matches,
               ROUND(AVG(c.home_yellow_total + c.home_red_direct + c.home_second_yellow_red),3) AS avg_home_cards,
               ROUND(AVG(c.away_yellow_total + c.away_red_direct + c.away_second_yellow_red),3) AS avg_away_cards,
               ROUND(AVG(c.home_yellow_total + c.home_red_direct + c.home_second_yellow_red) -
                     AVG(c.away_yellow_total + c.away_red_direct + c.away_second_yellow_red),3) AS home_minus_away
        FROM superlig_hakem_match_stats s
        JOIN superlig_match_team_cards c ON c.mac_id = s.mac_id
        GROUP BY referee_name
        HAVING COUNT(*) >= 5
        ORDER BY home_minus_away DESC
        """
    ).fetchall()

    write_csv(
        os.path.join(OUT_DIR, "referee_home_away_tendency.csv"),
        ["referee_name", "matches", "avg_home_cards", "avg_away_cards", "home_minus_away"],
        home_away_rows,
    )

    # Build markdown report
    with open(REPORT_MD, "w", encoding="utf-8") as f:
        f.write("# Süper Lig Data Mining Raporu\n\n")
        f.write(f"- Üretim zamanı: {dt.datetime.now().isoformat(timespec='seconds')}\n")
        f.write(f"- İşlenen maç sayısı: {len(match_rows)}\n")
        f.write(f"- Takım kart tablosu güncellenen kayıt: {updated}\n\n")

        f.write("## 1) Hakem Kart Profili\n\n")
        f.write("### En yüksek severity (maç başına)\n")
        for r in ref_profile_sorted_severity[:10]:
            f.write(f"- {r[0]}: severity/m {r[-1]}, sarı/m {r[6]}, kırmızı_event/m {r[7]}, penaltı/m {r[8]}\n")
        f.write("\n### En yüksek penaltı eğilimi\n")
        for r in ref_profile_sorted_pen[:10]:
            f.write(f"- {r[0]}: penaltı/m {r[8]}, maç {r[1]}\n")

        f.write("\n## 2) Trend ve Sapma\n\n")
        f.write("### Yıllık özet\n")
        for y, m, yc, rc, syc, p in yearly:
            sev_pm = round(safe_div((yc or 0) + 2 * ((rc or 0) + (syc or 0)), m), 3)
            f.write(f"- {y}: maç {m}, sarı {yc}, kırmızı {rc}, sarıdan-kırmızı {syc}, penaltı {p}, severity/m {sev_pm}\n")

        f.write("\n## 3) Maç Risk Skoru (0-100)\n\n")
        f.write("Ağırlıklar: hakem severity z=%50, takımların kart yoğunluğu z=%30, hakem penaltı eğilimi z=%20.\n\n")
        f.write("### En yüksek riskli 15 maç\n")
        for r in risk_rows_sorted[:15]:
            f.write(f"- {r[1]} | {r[3]} - {r[4]} | {r[2]} | risk {r[-1]}\n")

        f.write("\n## 4) Hangi Hakem Hangi Takıma En Çok Kart Gösteriyor\n\n")
        for rr in ref_team_rows[:20]:
            f.write(f"- {rr[0]} -> {rr[1]}: toplam kart {rr[3]} ({rr[2]} maç, {rr[4]}/maç)\n")

        f.write("\n## 5) Ev Sahibi mi Deplasman mı Daha Çok Kart Görüyor\n\n")
        f.write("### Ev sahibine daha çok kart gösteren hakemler (top 10)\n")
        for rr in home_away_rows[:10]:
            f.write(f"- {rr[0]}: ev {rr[2]}, depl {rr[3]}, fark {rr[4]}\n")

        f.write("\n### Deplasman takımına daha çok kart gösteren hakemler (top 10)\n")
        for rr in sorted(home_away_rows, key=lambda x: x[4])[:10]:
            f.write(f"- {rr[0]}: ev {rr[2]}, depl {rr[3]}, fark {rr[4]}\n")

        f.write("\n## Çıktı Dosyaları\n")
        f.write("- referee_card_profile.csv\n")
        f.write("- trend_yearly.csv\n")
        f.write("- trend_monthly.csv\n")
        f.write("- match_risk_scores.csv\n")
        f.write("- referee_to_team_cards.csv\n")
        f.write("- referee_home_away_tendency.csv\n")

    print(f"[done] report: {REPORT_MD}")
    print(f"[done] out_dir: {OUT_DIR}")


if __name__ == "__main__":
    main()
