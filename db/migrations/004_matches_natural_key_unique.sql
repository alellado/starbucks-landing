DROP INDEX IF EXISTS idx_matches_natural_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_matches_natural_key
  ON matches (tournament_id, home_team, away_team, match_date);
