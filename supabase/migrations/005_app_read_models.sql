-- App read models for cloud deployment (Netlify / non-local runtime)

CREATE TABLE IF NOT EXISTS app_referees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL DEFAULT 35,
  country TEXT NOT NULL DEFAULT 'Türkiye',
  flag TEXT NOT NULL DEFAULT '🇹🇷',
  photo TEXT NOT NULL DEFAULT '',
  matches INTEGER NOT NULL DEFAULT 0,
  yellow_cards_per_match REAL NOT NULL DEFAULT 0,
  red_cards_per_match REAL NOT NULL DEFAULT 0,
  fouls_per_match REAL NOT NULL DEFAULT 0,
  accuracy REAL NOT NULL DEFAULT 0,
  career_score REAL NOT NULL DEFAULT 0,
  total_ratings INTEGER NOT NULL DEFAULT 0,
  badges JSONB NOT NULL DEFAULT '[]'::jsonb,
  bio TEXT NOT NULL DEFAULT '',
  league TEXT NOT NULL DEFAULT 'Süper Lig',
  penalties INTEGER NOT NULL DEFAULT 0,
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  city TEXT NOT NULL DEFAULT '',
  second_yellow_red_cards INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_matches (
  id BIGINT PRIMARY KEY,
  referee_id TEXT,
  referee_name TEXT,
  match_date_iso TEXT,
  date TEXT,
  league TEXT,
  home_team TEXT,
  away_team TEXT,
  score TEXT,
  penalty_goals INTEGER NOT NULL DEFAULT 0,
  week_number INTEGER,
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  second_yellow_red_cards INTEGER NOT NULL DEFAULT 0,
  home_yellow_cards INTEGER NOT NULL DEFAULT 0,
  away_yellow_cards INTEGER NOT NULL DEFAULT 0,
  home_second_yellow_red_cards INTEGER NOT NULL DEFAULT 0,
  away_second_yellow_red_cards INTEGER NOT NULL DEFAULT 0,
  home_red_cards INTEGER NOT NULL DEFAULT 0,
  away_red_cards INTEGER NOT NULL DEFAULT 0,
  home_fouls INTEGER,
  away_fouls INTEGER,
  total_fouls INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_matches_referee_id ON app_matches(referee_id);
CREATE INDEX IF NOT EXISTS idx_app_matches_match_date_iso ON app_matches(match_date_iso DESC);

CREATE TABLE IF NOT EXISTS app_upcoming_fixtures (
  fixture_id BIGINT PRIMARY KEY,
  date TEXT NOT NULL,
  referee TEXT NOT NULL DEFAULT '',
  referee_is_estimated BOOLEAN NOT NULL DEFAULT FALSE,
  referee_confidence REAL NOT NULL DEFAULT 0,
  league_id BIGINT NOT NULL DEFAULT 0,
  league_name TEXT NOT NULL DEFAULT '',
  round TEXT NOT NULL DEFAULT '',
  home_team TEXT NOT NULL DEFAULT '',
  away_team TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_upcoming_fixtures_date ON app_upcoming_fixtures(date ASC);

CREATE TABLE IF NOT EXISTS app_match_events (
  fixture_id BIGINT NOT NULL,
  event_id TEXT NOT NULL,
  minute INTEGER NOT NULL DEFAULT 0,
  extra_minute INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT '',
  team TEXT NOT NULL DEFAULT '',
  player TEXT NOT NULL DEFAULT '',
  related_player TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  home_team TEXT NOT NULL DEFAULT '',
  away_team TEXT NOT NULL DEFAULT '',
  match_date TEXT NOT NULL DEFAULT '',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (fixture_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_app_match_events_fixture_id ON app_match_events(fixture_id);
CREATE INDEX IF NOT EXISTS idx_app_match_events_match_lookup ON app_match_events(home_team, away_team, match_date);

CREATE TABLE IF NOT EXISTS app_sportmonks_week_fixtures (
  week_number INTEGER NOT NULL,
  fixture_id BIGINT NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  league_name TEXT NOT NULL DEFAULT '',
  round TEXT NOT NULL DEFAULT '',
  home_team TEXT NOT NULL DEFAULT '',
  away_team TEXT NOT NULL DEFAULT '',
  referee TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  score TEXT NOT NULL DEFAULT '',
  venue TEXT NOT NULL DEFAULT '',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (week_number, fixture_id)
);

CREATE INDEX IF NOT EXISTS idx_app_sportmonks_week_fixtures_week ON app_sportmonks_week_fixtures(week_number, date ASC);

CREATE TABLE IF NOT EXISTS app_live_now_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  fixture_id BIGINT,
  date TEXT,
  league_name TEXT,
  round TEXT,
  home_team TEXT,
  away_team TEXT,
  status TEXT,
  minute INTEGER NOT NULL DEFAULT 0,
  score TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_referees ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_upcoming_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_sportmonks_week_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_live_now_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App referees readable by everyone" ON app_referees;
CREATE POLICY "App referees readable by everyone"
  ON app_referees FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "App matches readable by everyone" ON app_matches;
CREATE POLICY "App matches readable by everyone"
  ON app_matches FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "App upcoming fixtures readable by everyone" ON app_upcoming_fixtures;
CREATE POLICY "App upcoming fixtures readable by everyone"
  ON app_upcoming_fixtures FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "App match events readable by everyone" ON app_match_events;
CREATE POLICY "App match events readable by everyone"
  ON app_match_events FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "App week fixtures readable by everyone" ON app_sportmonks_week_fixtures;
CREATE POLICY "App week fixtures readable by everyone"
  ON app_sportmonks_week_fixtures FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "App live now readable by everyone" ON app_live_now_cache;
CREATE POLICY "App live now readable by everyone"
  ON app_live_now_cache FOR SELECT TO anon, authenticated USING (true);
