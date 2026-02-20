import type { PoolClient, QueryResultRow } from "pg";
import { query } from "../../db/pool.js";

export interface MatchRecord extends QueryResultRow {
  match_id: string;
  tournament_id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  stage: string;
  city: string | null;
  venue: string | null;
  result_home: number | null;
  result_away: number | null;
  status: "scheduled" | "in_progress" | "finished" | "postponed" | "cancelled";
}

export async function listMatchesByTournament(tournamentId: string): Promise<MatchRecord[]> {
  const result = await query<MatchRecord>(
    `SELECT match_id, tournament_id, home_team, away_team, match_date, stage, city, venue,
            result_home, result_away, status
     FROM matches
     WHERE tournament_id = $1
     ORDER BY match_date ASC`,
    [tournamentId]
  );

  return result.rows;
}

export async function getMatchById(matchId: string): Promise<MatchRecord | null> {
  const result = await query<MatchRecord>(
    `SELECT match_id, tournament_id, home_team, away_team, match_date, stage, city, venue,
            result_home, result_away, status
     FROM matches
     WHERE match_id = $1`,
    [matchId]
  );

  return result.rows[0] ?? null;
}

export async function createMatchesBulk(
  items: Array<{
    tournamentId: string;
    homeTeam: string;
    awayTeam: string;
    matchDate: string;
    stage: string;
    city?: string;
    venue?: string;
    status: "scheduled" | "in_progress" | "finished" | "postponed" | "cancelled";
  }>,
  client?: PoolClient
): Promise<{ inserted: number; updated: number }> {
  if (!items.length) {
    return { inserted: 0, updated: 0 };
  }

  const executor = client ?? { query };
  let inserted = 0;
  let updated = 0;

  for (const item of items) {
    const result = await executor.query<{ inserted_match_id: string | null; updated_match_id: string | null }>(
      `WITH existing AS (
         SELECT match_id, status
         FROM matches
         WHERE tournament_id = $1
           AND home_team = $2
           AND away_team = $3
           AND match_date = $4::timestamptz
         ORDER BY created_at ASC, match_id ASC
         LIMIT 1
       ),
       updated_row AS (
         UPDATE matches m
         SET
           stage = $5,
           city = $6,
           venue = $7,
           status = CASE
             WHEN m.status = 'finished'::match_status AND $8 = 'scheduled' THEN m.status
             ELSE $8::match_status
           END,
           updated_at = NOW()
         WHERE m.match_id = (SELECT match_id FROM existing)
         RETURNING m.match_id
       ),
       inserted_row AS (
         INSERT INTO matches (tournament_id, home_team, away_team, match_date, stage, city, venue, status)
         SELECT $1, $2, $3, $4::timestamptz, $5, $6, $7, $8::match_status
         WHERE NOT EXISTS (SELECT 1 FROM existing)
         RETURNING match_id
       )
       SELECT
         (SELECT match_id FROM inserted_row) AS inserted_match_id,
         (SELECT match_id FROM updated_row) AS updated_match_id`,
      [
        item.tournamentId,
        item.homeTeam,
        item.awayTeam,
        item.matchDate,
        item.stage,
        item.city ?? null,
        item.venue ?? null,
        item.status
      ]
    );

    const row = result.rows[0];
    if (row?.inserted_match_id) {
      inserted += 1;
    } else if (row?.updated_match_id) {
      updated += 1;
    }
  }

  return { inserted, updated };
}

export async function setMatchResult(
  matchId: string,
  resultHome: number,
  resultAway: number,
  status: "finished" | "cancelled" | "postponed",
  client?: PoolClient
): Promise<void> {
  const executor = client ?? { query };
  await executor.query(
    `UPDATE matches
     SET result_home = $2,
         result_away = $3,
         status = $4,
         updated_at = NOW()
     WHERE match_id = $1`,
    [matchId, resultHome, resultAway, status]
  );
}
