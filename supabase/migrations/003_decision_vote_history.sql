-- Cloud-first decision vote history
CREATE TABLE IF NOT EXISTS decision_vote_history (
  id BIGSERIAL PRIMARY KEY,
  incident_id TEXT NOT NULL,
  vote_user_key TEXT NOT NULL,
  match_id TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  minute_label TEXT NOT NULL,
  event_title TEXT NOT NULL,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 10),
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (incident_id, vote_user_key)
);

CREATE INDEX IF NOT EXISTS idx_decision_vote_history_user_key
  ON decision_vote_history (vote_user_key, voted_at DESC);

ALTER TABLE decision_vote_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Decision vote history readable by everyone" ON decision_vote_history;
CREATE POLICY "Decision vote history readable by everyone"
  ON decision_vote_history
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Decision vote history insert by everyone" ON decision_vote_history;
CREATE POLICY "Decision vote history insert by everyone"
  ON decision_vote_history
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (score BETWEEN 0 AND 10 AND length(vote_user_key) > 0);

DROP POLICY IF EXISTS "Decision vote history update by everyone" ON decision_vote_history;
CREATE POLICY "Decision vote history update by everyone"
  ON decision_vote_history
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (score BETWEEN 0 AND 10 AND length(vote_user_key) > 0);

-- shared helper
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS decision_vote_history_updated_at ON decision_vote_history;
CREATE TRIGGER decision_vote_history_updated_at
  BEFORE UPDATE ON decision_vote_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

