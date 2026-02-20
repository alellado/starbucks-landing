import type { PoolClient, QueryResultRow } from "pg";
import { query } from "../../db/pool.js";

export interface TournamentRecord extends QueryResultRow {
  tournament_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: "draft" | "open" | "in_progress" | "completed" | "archived";
  scoring_exact: number;
  scoring_winner: number;
  scoring_wrong: number;
  created_at: string;
}

export interface TournamentListRecord extends TournamentRecord {
  participants: number;
}

export async function listTournaments(status?: string): Promise<TournamentListRecord[]> {
  const values: unknown[] = [];
  let where = "";
  if (status) {
    values.push(status);
    where = "WHERE t.status = $1";
  }

  const result = await query<TournamentListRecord>(
    `SELECT
       t.tournament_id,
       t.name,
       t.description,
       t.start_date,
       t.end_date,
       t.status,
       t.scoring_exact,
       t.scoring_winner,
       t.scoring_wrong,
       t.created_at,
       COUNT(tp.user_id)::int AS participants
     FROM tournaments t
     LEFT JOIN tournament_participants tp ON tp.tournament_id = t.tournament_id
     ${where}
     GROUP BY t.tournament_id
     ORDER BY t.start_date ASC`,
    values
  );

  return result.rows;
}

export async function getTournamentById(tournamentId: string): Promise<TournamentRecord | null> {
  const result = await query<TournamentRecord>(
    `SELECT tournament_id, name, description, start_date, end_date, status,
            scoring_exact, scoring_winner, scoring_wrong, created_at
     FROM tournaments
     WHERE tournament_id = $1`,
    [tournamentId]
  );

  return result.rows[0] ?? null;
}

export async function joinTournament(params: {
  tournamentId: string;
  userId: string;
  client?: PoolClient;
}): Promise<void> {
  const executor = params.client ?? { query };
  await executor.query(
    `INSERT INTO tournament_participants (tournament_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (tournament_id, user_id) DO NOTHING`,
    [params.tournamentId, params.userId]
  );
}

export async function isParticipant(tournamentId: string, userId: string): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM tournament_participants
       WHERE tournament_id = $1 AND user_id = $2
     ) AS exists`,
    [tournamentId, userId]
  );

  return result.rows[0]?.exists ?? false;
}

export async function createTournament(params: {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "draft" | "open" | "in_progress" | "completed" | "archived";
  createdBy: string;
  scoringExact: number;
  scoringWinner: number;
  scoringWrong: number;
}): Promise<TournamentRecord> {
  const result = await query<TournamentRecord>(
    `INSERT INTO tournaments (
      name, description, start_date, end_date, status,
      scoring_exact, scoring_winner, scoring_wrong, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING tournament_id, name, description, start_date, end_date, status,
      scoring_exact, scoring_winner, scoring_wrong, created_at`,
    [
      params.name,
      params.description,
      params.startDate,
      params.endDate,
      params.status,
      params.scoringExact,
      params.scoringWinner,
      params.scoringWrong,
      params.createdBy
    ]
  );

  return result.rows[0];
}

export async function updateTournamentStatus(
  tournamentId: string,
  status: "draft" | "open" | "in_progress" | "completed" | "archived"
): Promise<void> {
  await query(
    `UPDATE tournaments
     SET status = $2, updated_at = NOW()
     WHERE tournament_id = $1`,
    [tournamentId, status]
  );
}
