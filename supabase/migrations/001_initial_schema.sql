-- Referee Intelligence Engine - Initial Schema
-- Run this in Supabase SQL Editor or via Supabase CLI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ LEAGUES ============
CREATE TABLE leagues (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ REFEREES ============
CREATE TABLE referees (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ MATCHES ============
CREATE TABLE matches (
  id BIGINT PRIMARY KEY,
  league_id BIGINT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  referee_id BIGINT NOT NULL REFERENCES referees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_team_id BIGINT,
  away_team_id BIGINT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_league_id ON matches(league_id);
CREATE INDEX idx_matches_referee_id ON matches(referee_id);
CREATE INDEX idx_matches_date ON matches(date DESC);

-- ============ REFEREE_MATCH_STATS ============
CREATE TABLE referee_match_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
  referee_id BIGINT NOT NULL REFERENCES referees(id) ON DELETE CASCADE,
  league_id BIGINT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  yellow_cards INT NOT NULL DEFAULT 0,
  red_cards INT NOT NULL DEFAULT 0,
  penalties INT NOT NULL DEFAULT 0,
  fouls INT NOT NULL DEFAULT 0,
  var_interventions INT NOT NULL DEFAULT 0,
  home_yellow_cards INT DEFAULT 0,
  away_yellow_cards INT DEFAULT 0,
  home_red_cards INT DEFAULT 0,
  away_red_cards INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_referee_match_stats_match_id ON referee_match_stats(match_id);
CREATE INDEX idx_referee_match_stats_referee_id ON referee_match_stats(referee_id);
CREATE INDEX idx_referee_match_stats_league_id ON referee_match_stats(league_id);

-- ============ REFEREE_SCORES (computed) ============
CREATE TABLE referee_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referee_id BIGINT NOT NULL REFERENCES referees(id) ON DELETE CASCADE,
  league_id BIGINT REFERENCES leagues(id) ON DELETE SET NULL,
  total_matches INT NOT NULL DEFAULT 0,
  cas_raw DECIMAL(10,4) NOT NULL DEFAULT 0,
  pes_raw DECIMAL(10,4) NOT NULL DEFAULT 0,
  hbs_raw DECIMAL(10,4) NOT NULL DEFAULT 0,
  vrs_raw DECIMAL(10,4) NOT NULL DEFAULT 0,
  cas_norm DECIMAL(5,2) NOT NULL DEFAULT 0,
  pes_norm DECIMAL(5,2) NOT NULL DEFAULT 0,
  hbs_norm DECIMAL(5,2) NOT NULL DEFAULT 0,
  vrs_norm DECIMAL(5,2) NOT NULL DEFAULT 0,
  consistency_factor DECIMAL(5,2) NOT NULL DEFAULT 0,
  referee_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referee_id, league_id)
);

CREATE INDEX idx_referee_scores_referee_id ON referee_scores(referee_id);
CREATE INDEX idx_referee_scores_league_id ON referee_scores(league_id);
CREATE INDEX idx_referee_scores_score ON referee_scores(referee_score DESC);

-- ============ USERS (Supabase Auth handles auth.users; this is profile/subscription link) ============
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ SUBSCRIPTIONS ============
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);

-- ============ ROW LEVEL SECURITY ============
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE referees ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE referee_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE referee_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Public read for leagues, referees, matches, referee_match_stats, referee_scores (for dashboard)
-- Only authenticated can read; match preview / full details may require Pro
CREATE POLICY "Leagues are viewable by authenticated" ON leagues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Referees are viewable by authenticated" ON referees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Matches are viewable by authenticated" ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Referee match stats viewable by authenticated" ON referee_match_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Referee scores viewable by authenticated" ON referee_scores FOR SELECT TO authenticated USING (true);

-- Service role / backend can do everything (ingestion, cron)
CREATE POLICY "Service role full access leagues" ON leagues FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access referees" ON referees FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access matches" ON matches FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access referee_match_stats" ON referee_match_stats FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access referee_scores" ON referee_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users: own row only
CREATE POLICY "Users can read own row" ON users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own row" ON users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own row" ON users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Subscriptions: own only
CREATE POLICY "Users can read own subscriptions" ON subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ FUNCTIONS ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leagues_updated_at BEFORE UPDATE ON leagues FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER referees_updated_at BEFORE UPDATE ON referees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER referee_match_stats_updated_at BEFORE UPDATE ON referee_match_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
