import type { PoolClient, QueryResultRow } from "pg";
import { query } from "../../db/pool.js";
import type { UserRole } from "../../types.js";

export interface AdminUserRow extends QueryResultRow {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export async function listUsers(): Promise<AdminUserRow[]> {
  const result = await query<AdminUserRow>(
    `SELECT user_id, name, email, role, is_active, created_at
     FROM users
     ORDER BY created_at DESC`
  );

  return result.rows;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  await query(
    `UPDATE users
     SET role = $2, updated_at = NOW()
     WHERE user_id = $1`,
    [userId, role]
  );
}

export async function writeAudit(params: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  client?: PoolClient;
}): Promise<void> {
  const executor = params.client ?? { query };
  await executor.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_json, after_json)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [
      params.actorUserId,
      params.action,
      params.entityType,
      params.entityId ?? null,
      JSON.stringify(params.beforeJson ?? null),
      JSON.stringify(params.afterJson ?? null)
    ]
  );
}

export async function resetTournamentState(params: {
  tournamentId: string;
  mode: "results_only" | "full";
  clearParticipants: boolean;
  client: PoolClient;
}): Promise<{
  mode: "results_only" | "full";
  predictionsDeleted: number;
  predictionPointsReset: number;
  matchesReset: number;
  participantsDeleted: number;
}> {
  const { client, tournamentId, mode, clearParticipants } = params;
  let predictionsDeleted = 0;
  let predictionPointsReset = 0;

  if (mode === "full") {
    const deletePredictions = await client.query(
      `DELETE FROM predictions
       WHERE tournament_id = $1`,
      [tournamentId]
    );
    predictionsDeleted = deletePredictions.rowCount;
  } else {
    const resetPredictionPoints = await client.query(
      `UPDATE predictions
       SET points_awarded = 0,
           updated_at = NOW()
       WHERE tournament_id = $1
         AND points_awarded <> 0`,
      [tournamentId]
    );
    predictionPointsReset = resetPredictionPoints.rowCount;
  }

  const resetMatches = await client.query(
    `UPDATE matches
     SET result_home = NULL,
         result_away = NULL,
         status = 'scheduled',
         updated_at = NOW()
     WHERE tournament_id = $1
       AND (status <> 'scheduled' OR result_home IS NOT NULL OR result_away IS NOT NULL)`,
    [tournamentId]
  );

  let participantsDeleted = 0;
  if (mode === "full" && clearParticipants) {
    const deleteParticipants = await client.query(
      `DELETE FROM tournament_participants
       WHERE tournament_id = $1`,
      [tournamentId]
    );
    participantsDeleted = deleteParticipants.rowCount;
  }

  return {
    mode,
    predictionsDeleted,
    predictionPointsReset,
    matchesReset: resetMatches.rowCount,
    participantsDeleted
  };
}
