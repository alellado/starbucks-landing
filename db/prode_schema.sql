CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tournament_status') THEN
    CREATE TYPE tournament_status AS ENUM ('draft', 'open', 'in_progress', 'completed', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_status') THEN
    CREATE TYPE match_status AS ENUM ('scheduled', 'in_progress', 'finished', 'postponed', 'cancelled');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  role user_role NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tournaments (
  tournament_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status tournament_status NOT NULL DEFAULT 'draft',
  scoring_exact SMALLINT NOT NULL DEFAULT 3,
  scoring_winner SMALLINT NOT NULL DEFAULT 1,
  scoring_wrong SMALLINT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tournaments_dates_chk CHECK (end_date > start_date)
);

CREATE TABLE IF NOT EXISTS tournament_participants (
  tournament_id UUID NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS matches (
  match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
  home_team VARCHAR(120) NOT NULL,
  away_team VARCHAR(120) NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  stage VARCHAR(80) NOT NULL,
  city VARCHAR(120),
  venue VARCHAR(160),
  result_home SMALLINT,
  result_away SMALLINT,
  status match_status NOT NULL DEFAULT 'scheduled',
  source_external_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT matches_teams_chk CHECK (home_team <> away_team),
  CONSTRAINT matches_result_chk CHECK (
    (result_home IS NULL AND result_away IS NULL)
    OR
    (result_home IS NOT NULL AND result_away IS NOT NULL AND result_home >= 0 AND result_away >= 0)
  )
);

CREATE TABLE IF NOT EXISTS predictions (
  prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  predicted_home SMALLINT NOT NULL,
  predicted_away SMALLINT NOT NULL,
  points_awarded SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, match_id),
  CONSTRAINT predictions_scores_chk CHECK (predicted_home >= 0 AND predicted_away >= 0)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(user_id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments (status, start_date);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_date ON matches (tournament_id, match_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_matches_natural_key ON matches (tournament_id, home_team, away_team, match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches (status);
CREATE INDEX IF NOT EXISTS idx_predictions_tournament_user ON predictions (tournament_id, user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions (match_id);

CREATE OR REPLACE FUNCTION calc_prediction_points(
  predicted_home_in INT,
  predicted_away_in INT,
  result_home_in INT,
  result_away_in INT,
  scoring_exact_in INT,
  scoring_winner_in INT,
  scoring_wrong_in INT
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  predicted_diff INT;
  result_diff INT;
BEGIN
  IF predicted_home_in = result_home_in AND predicted_away_in = result_away_in THEN
    RETURN scoring_exact_in;
  END IF;

  predicted_diff := predicted_home_in - predicted_away_in;
  result_diff := result_home_in - result_away_in;

  IF (predicted_diff > 0 AND result_diff > 0)
     OR (predicted_diff < 0 AND result_diff < 0)
     OR (predicted_diff = 0 AND result_diff = 0) THEN
    RETURN scoring_winner_in;
  END IF;

  RETURN scoring_wrong_in;
END;
$$;

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.tournament_id,
  p.user_id,
  COALESCE(SUM(p.points_awarded), 0) AS total_points,
  COUNT(*) FILTER (
    WHERE m.status = 'finished'
      AND p.predicted_home = m.result_home
      AND p.predicted_away = m.result_away
  ) AS exact_hits,
  COUNT(*) FILTER (
    WHERE m.status = 'finished'
      AND (
        (p.predicted_home - p.predicted_away > 0 AND m.result_home - m.result_away > 0)
        OR (p.predicted_home - p.predicted_away < 0 AND m.result_home - m.result_away < 0)
        OR (p.predicted_home - p.predicted_away = 0 AND m.result_home - m.result_away = 0)
      )
  ) AS winner_hits,
  RANK() OVER (
    PARTITION BY p.tournament_id
    ORDER BY COALESCE(SUM(p.points_awarded), 0) DESC,
             COUNT(*) FILTER (
               WHERE m.status = 'finished'
                 AND p.predicted_home = m.result_home
                 AND p.predicted_away = m.result_away
             ) DESC,
             MIN(p.submitted_at) ASC
  ) AS position
FROM predictions p
JOIN matches m ON m.match_id = p.match_id
GROUP BY p.tournament_id, p.user_id;
