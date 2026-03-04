export type League = {
  id: number;
  name: string;
  country: string | null;
  logo_url: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Referee = {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
};

export type Match = {
  id: number;
  league_id: number;
  referee_id: number;
  date: string;
  home_team: string;
  away_team: string;
  home_team_id?: number;
  away_team_id?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export type RefereeMatchStat = {
  id: string;
  match_id: number;
  referee_id: number;
  league_id: number;
  yellow_cards: number;
  red_cards: number;
  penalties: number;
  fouls: number;
  var_interventions: number;
  home_yellow_cards?: number;
  away_yellow_cards?: number;
  home_red_cards?: number;
  away_red_cards?: number;
  created_at?: string;
  updated_at?: string;
};

export type RefereeScore = {
  id: string;
  referee_id: number;
  league_id: number | null;
  total_matches: number;
  cas_raw: number;
  pes_raw: number;
  hbs_raw: number;
  vrs_raw: number;
  cas_norm: number;
  pes_norm: number;
  hbs_norm: number;
  vrs_norm: number;
  consistency_factor: number;
  referee_score: number;
  calculated_at: string;
};

export type SubscriptionTier = "free" | "pro";
export type SubscriptionStatus = "active" | "canceled" | "inactive" | "past_due";

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  stripe_customer_id: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at?: string;
  updated_at?: string;
};

// API-Football response shapes (simplified)
export type ApiFootballFixture = {
  fixture: { id: number; date: string; status: { short: string } };
  league: { id: number; name: string; country: string };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  referee?: string;
};

export type ApiFootballFixtureStats = {
  team: { id: number; name: string };
  statistics: Array<{ type: string; value: number | string | null }>;
};
