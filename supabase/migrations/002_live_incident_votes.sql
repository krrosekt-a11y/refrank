-- Live incident community voting
CREATE TABLE IF NOT EXISTS live_incident_votes (
  id BIGSERIAL PRIMARY KEY,
  incident_id TEXT NOT NULL,
  vote_user_key TEXT NOT NULL,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (incident_id, vote_user_key)
);

CREATE INDEX IF NOT EXISTS idx_live_incident_votes_incident_id
  ON live_incident_votes (incident_id);

ALTER TABLE live_incident_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Live incident votes readable by everyone" ON live_incident_votes;
CREATE POLICY "Live incident votes readable by everyone"
  ON live_incident_votes
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Live incident votes insert by everyone" ON live_incident_votes;
CREATE POLICY "Live incident votes insert by everyone"
  ON live_incident_votes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (score BETWEEN 0 AND 10 AND length(vote_user_key) > 0);

DROP POLICY IF EXISTS "Live incident votes update by everyone" ON live_incident_votes;
CREATE POLICY "Live incident votes update by everyone"
  ON live_incident_votes
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (score BETWEEN 0 AND 10 AND length(vote_user_key) > 0);

-- Ensure helper exists in fresh projects where 001 migration is not applied
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS live_incident_votes_updated_at ON live_incident_votes;
CREATE TRIGGER live_incident_votes_updated_at
  BEFORE UPDATE ON live_incident_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE VIEW live_incident_vote_stats AS
SELECT
  incident_id,
  COUNT(*)::INTEGER AS total_votes,
  ROUND(AVG(score)::numeric, 2) AS avg_score
FROM live_incident_votes
GROUP BY incident_id;
