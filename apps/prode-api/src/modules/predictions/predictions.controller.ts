import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../../middleware/error.js";
import { getMatchById } from "../matches/matches.repository.js";
import { isParticipant } from "../tournaments/tournaments.repository.js";
import { listPredictionsByUser, upsertPrediction } from "./predictions.repository.js";

const createPredictionSchema = z.object({
  matchId: z.string().uuid(),
  predictedHome: z.number().int().min(0).max(20),
  predictedAway: z.number().int().min(0).max(20)
});

const myPredictionsQuerySchema = z.object({
  tournamentId: z.string().uuid().optional()
});

export async function createOrUpdatePrediction(req: Request, res: Response): Promise<void> {
  const authUser = req.authUser;
  if (!authUser) {
    throw new HttpError(401, "Authentication required");
  }

  const payload = createPredictionSchema.parse(req.body);
  const match = await getMatchById(payload.matchId);

  if (!match) {
    throw new HttpError(404, "Match not found");
  }

  const isUserParticipant = await isParticipant(match.tournament_id, authUser.userId);
  if (!isUserParticipant) {
    throw new HttpError(403, "Join tournament before predicting");
  }

  const now = new Date();
  if (new Date(match.match_date).getTime() <= now.getTime()) {
    throw new HttpError(400, "Prediction window is closed for this match");
  }

  if (match.status !== "scheduled") {
    throw new HttpError(400, "Predictions are blocked for this match status");
  }

  const prediction = await upsertPrediction({
    tournamentId: match.tournament_id,
    userId: authUser.userId,
    matchId: payload.matchId,
    predictedHome: payload.predictedHome,
    predictedAway: payload.predictedAway
  });

  res.status(200).json({ prediction });
}

export async function getMyPredictions(req: Request, res: Response): Promise<void> {
  const authUser = req.authUser;
  if (!authUser) {
    throw new HttpError(401, "Authentication required");
  }

  const queryParams = myPredictionsQuerySchema.parse(req.query);
  const predictions = await listPredictionsByUser(authUser.userId, queryParams.tournamentId);

  res.status(200).json({ predictions });
}
