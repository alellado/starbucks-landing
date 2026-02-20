import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../../middleware/error.js";
import { getMatchById } from "./matches.repository.js";

const matchParamsSchema = z.object({
  matchId: z.string().uuid()
});

export async function getMatch(req: Request, res: Response): Promise<void> {
  const params = matchParamsSchema.parse(req.params);
  const match = await getMatchById(params.matchId);

  if (!match) {
    throw new HttpError(404, "Match not found");
  }

  res.status(200).json({ match });
}
