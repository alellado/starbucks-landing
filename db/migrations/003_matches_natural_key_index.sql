CREATE INDEX IF NOT EXISTS idx_matches_natural_key
  ON matches (tournament_id, home_team, away_team, match_date);
