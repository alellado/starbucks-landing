import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../../middleware/error.js";
import { getTournamentById, isParticipant, joinTournament, listTournaments } from "./tournaments.repository.js";
import { listMatchesByTournament } from "../matches/matches.repository.js";

const listQuerySchema = z.object({
  status: z.enum(["draft", "open", "in_progress", "completed", "archived"]).optional()
});

const paramsSchema = z.object({
  tournamentId: z.string().uuid()
});

export async function getTournaments(req: Request, res: Response): Promise<void> {
  const queryParams = listQuerySchema.parse(req.query);
  const tournaments = await listTournaments(queryParams.status);

  res.status(200).json({ tournaments });
}

export async function getTournament(req: Request, res: Response): Promise<void> {
  const params = paramsSchema.parse(req.params);
  const tournament = await getTournamentById(params.tournamentId);

  if (!tournament) {
    throw new HttpError(404, "Tournament not found");
  }

  res.status(200).json({ tournament });
}

export async function join(req: Request, res: Response): Promise<void> {
  const params = paramsSchema.parse(req.params);
  const authUser = req.authUser;

  if (!authUser) {
    throw new HttpError(401, "Authentication required");
  }

  const tournament = await getTournamentById(params.tournamentId);
  if (!tournament) {
    throw new HttpError(404, "Tournament not found");
  }

  if (!["open", "in_progress"].includes(tournament.status)) {
    throw new HttpError(400, "Tournament is not open for joining");
  }

  await joinTournament({ tournamentId: params.tournamentId, userId: authUser.userId });
  const joined = await isParticipant(params.tournamentId, authUser.userId);

  res.status(200).json({ joined });
}

export async function getTournamentMatches(req: Request, res: Response): Promise<void> {
  const params = paramsSchema.parse(req.params);
  const matches = await listMatchesByTournament(params.tournamentId);

  res.status(200).json({ matches });
}
