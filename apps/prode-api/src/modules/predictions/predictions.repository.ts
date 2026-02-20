import type { QueryResultRow } from "pg";
import { query } from "../../db/pool.js";

export interface PredictionRecord extends QueryResultRow {
  prediction_id: string;
  tournament_id: string;
  user_id: string;
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  points_awarded: number;
  created_at: string;
  updated_at: string;
}

export interface UserPredictionRow extends QueryResultRow {
  prediction_id: string;
  match_id: string;
  tournament_id: string;
  predicted_home: number;
  predicted_away: number;
  points_awarded: number;
  home_team: string;
  away_team: string;
  match_date: string;
  stage: string;
  status: string;
  result_home: number | null;
  result_away: number | null;
}

export async function upsertPrediction(params: {
  tournamentId: string;
  userId: string;
  matchId: string;
  predictedHome: number;
  predictedAway: number;
}): Promise<PredictionRecord> {
  const result = await query<PredictionRecord>(
    `INSERT INTO predictions (tournament_id, user_id, match_id, predicted_home, predicted_away)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, match_id)
     DO UPDATE
       SET predicted_home = EXCLUDED.predicted_home,
           predicted_away = EXCLUDED.predicted_away,
           updated_at = NOW(),
           submitted_at = NOW()
     RETURNING prediction_id, tournament_id, user_id, match_id,
               predicted_home, predicted_away, points_awarded, created_at, updated_at`,
    [params.tournamentId, params.userId, params.matchId, params.predictedHome, params.predictedAway]
  );

  return result.rows[0];
}

export async function listPredictionsByUser(userId: string, tournamentId?: string): Promise<UserPredictionRow[]> {
  const values: unknown[] = [userId];
  let where = "WHERE p.user_id = $1";

  if (tournamentId) {
    values.push(tournamentId);
    where += ` AND p.tournament_id = $${values.length}`;
  }

  const result = await query<UserPredictionRow>(
    `SELECT
      p.prediction_id,
      p.match_id,
      p.tournament_id,
      p.predicted_home,
      p.predicted_away,
      p.points_awarded,
      m.home_team,
      m.away_team,
      m.match_date,
      m.stage,
      m.status,
      m.result_home,
      m.result_away
     FROM predictions p
     JOIN matches m ON m.match_id = p.match_id
     ${where}
     ORDER BY m.match_date ASC`,
    values
  );

  return result.rows;
}
