import type { QueryResultRow } from "pg";
import { query } from "../../db/pool.js";

export interface LeaderboardRow extends QueryResultRow {
  tournament_id: string;
  user_id: string;
  total_points: number;
  exact_hits: number;
  winner_hits: number;
  position: number;
  name: string;
  avatar: string | null;
}

export async function getLeaderboard(tournamentId: string): Promise<LeaderboardRow[]> {
  const result = await query<LeaderboardRow>(
    `SELECT
       l.tournament_id,
       l.user_id,
       l.total_points,
       l.exact_hits,
       l.winner_hits,
       l.position,
       u.name,
       u.avatar
     FROM leaderboard l
     JOIN users u ON u.user_id = l.user_id
     WHERE l.tournament_id = $1
     ORDER BY l.position ASC, u.name ASC`,
    [tournamentId]
  );

  return result.rows;
}
