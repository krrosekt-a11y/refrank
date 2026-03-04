-- Cloud sync for user app state (favorites + match votes)

CREATE TABLE IF NOT EXISTS favorite_referees (
  id BIGSERIAL PRIMARY KEY,
  vote_user_key TEXT NOT NULL,
  referee_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vote_user_key, referee_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_referees_user_key
  ON favorite_referees (vote_user_key, created_at DESC);

ALTER TABLE favorite_referees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Favorite referees readable by everyone" ON favorite_referees;
CREATE POLICY "Favorite referees readable by everyone"
  ON favorite_referees
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Favorite referees insert by everyone" ON favorite_referees;
CREATE POLICY "Favorite referees insert by everyone"
  ON favorite_referees
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (length(vote_user_key) > 0 AND length(referee_id) > 0);

DROP POLICY IF EXISTS "Favorite referees update by everyone" ON favorite_referees;
CREATE POLICY "Favorite referees update by everyone"
  ON favorite_referees
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (length(vote_user_key) > 0 AND length(referee_id) > 0);

DROP POLICY IF EXISTS "Favorite referees delete by everyone" ON favorite_referees;
CREATE POLICY "Favorite referees delete by everyone"
  ON favorite_referees
  FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS match_vote_history (
  id BIGSERIAL PRIMARY KEY,
  vote_user_key TEXT NOT NULL,
  match_id TEXT NOT NULL,
  referee_id TEXT NOT NULL,
  overall NUMERIC(4,2) NOT NULL,
  average NUMERIC(4,2) NOT NULL,
  match_control NUMERIC(4,2) NOT NULL,
  card_decisions NUMERIC(4,2) NOT NULL,
  penalty_decisions NUMERIC(4,2) NOT NULL,
  game_flow NUMERIC(4,2) NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  home_team TEXT,
  away_team TEXT,
  referee_name TEXT,
  referee_photo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vote_user_key, match_id, referee_id)
);

CREATE INDEX IF NOT EXISTS idx_match_vote_history_user_key
  ON match_vote_history (vote_user_key, submitted_at DESC);

ALTER TABLE match_vote_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match vote history readable by everyone" ON match_vote_history;
CREATE POLICY "Match vote history readable by everyone"
  ON match_vote_history
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Match vote history insert by everyone" ON match_vote_history;
CREATE POLICY "Match vote history insert by everyone"
  ON match_vote_history
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (length(vote_user_key) > 0);

DROP POLICY IF EXISTS "Match vote history update by everyone" ON match_vote_history;
CREATE POLICY "Match vote history update by everyone"
  ON match_vote_history
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (length(vote_user_key) > 0);

-- shared helper
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS favorite_referees_updated_at ON favorite_referees;
CREATE TRIGGER favorite_referees_updated_at
  BEFORE UPDATE ON favorite_referees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS match_vote_history_updated_at ON match_vote_history;
CREATE TRIGGER match_vote_history_updated_at
  BEFORE UPDATE ON match_vote_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
