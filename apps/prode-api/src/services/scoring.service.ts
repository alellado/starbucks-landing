import type { PoolClient, QueryResultRow } from "pg";

export function calculatePredictionPoints(params: {
  predictedHome: number;
  predictedAway: number;
  resultHome: number;
  resultAway: number;
  exactPoints: number;
  winnerPoints: number;
  wrongPoints: number;
}): number {
  const {
    predictedHome,
    predictedAway,
    resultHome,
    resultAway,
    exactPoints,
    winnerPoints,
    wrongPoints
  } = params;

  if (predictedHome === resultHome && predictedAway === resultAway) {
    return exactPoints;
  }

  const predictedDiff = predictedHome - predictedAway;
  const resultDiff = resultHome - resultAway;

  const sameOutcome =
    (predictedDiff > 0 && resultDiff > 0) ||
    (predictedDiff < 0 && resultDiff < 0) ||
    (predictedDiff === 0 && resultDiff === 0);

  return sameOutcome ? winnerPoints : wrongPoints;
}

interface PredictionForScoring extends QueryResultRow {
  prediction_id: string;
  predicted_home: number;
  predicted_away: number;
  result_home: number;
  result_away: number;
  scoring_exact: number;
  scoring_winner: number;
  scoring_wrong: number;
}

export async function recomputeMatchScores(matchId: string, client: PoolClient): Promise<number> {
  const rows = await client.query<PredictionForScoring>(
    `SELECT
       p.prediction_id,
       p.predicted_home,
       p.predicted_away,
       m.result_home,
       m.result_away,
       t.scoring_exact,
       t.scoring_winner,
       t.scoring_wrong
     FROM predictions p
     JOIN matches m ON m.match_id = p.match_id
     JOIN tournaments t ON t.tournament_id = p.tournament_id
     WHERE p.match_id = $1
       AND m.status = 'finished'
       AND m.result_home IS NOT NULL
       AND m.result_away IS NOT NULL`,
    [matchId]
  );

  for (const row of rows.rows) {
    const points = calculatePredictionPoints({
      predictedHome: row.predicted_home,
      predictedAway: row.predicted_away,
      resultHome: row.result_home,
      resultAway: row.result_away,
      exactPoints: row.scoring_exact,
      winnerPoints: row.scoring_winner,
      wrongPoints: row.scoring_wrong
    });

    await client.query(
      `UPDATE predictions
       SET points_awarded = $2,
           updated_at = NOW()
       WHERE prediction_id = $1`,
      [row.prediction_id, points]
    );
  }

  return rows.rowCount;
}
