import type { Request, Response } from "express";
import { z } from "zod";
import { getLeaderboard } from "./leaderboard.repository.js";

const paramsSchema = z.object({
  tournamentId: z.string().uuid()
});

export async function getTournamentLeaderboard(req: Request, res: Response): Promise<void> {
  const params = paramsSchema.parse(req.params);
  const leaderboard = await getLeaderboard(params.tournamentId);

  res.status(200).json({ leaderboard });
}
