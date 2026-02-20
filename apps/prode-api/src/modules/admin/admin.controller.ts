import type { Request, Response } from "express";
import { z } from "zod";
import { withTransaction } from "../../db/pool.js";
import { HttpError } from "../../middleware/error.js";
import { recomputeMatchScores } from "../../services/scoring.service.js";
import { createMatchesBulk, getMatchById, setMatchResult } from "../matches/matches.repository.js";
import {
  createTournament,
  getTournamentById,
  updateTournamentStatus
} from "../tournaments/tournaments.repository.js";
import { listUsers, resetTournamentState, updateUserRole, writeAudit } from "./admin.repository.js";

const createTournamentSchema = z.object({
  name: z.string().min(3).max(180),
  description: z.string().min(10),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(["draft", "open", "in_progress", "completed", "archived"]).default("draft"),
  scoringExact: z.number().int().min(1).max(10).default(3),
  scoringWinner: z.number().int().min(0).max(5).default(1),
  scoringWrong: z.number().int().min(0).max(3).default(0)
});

const updateTournamentStatusSchema = z.object({
  status: z.enum(["draft", "open", "in_progress", "completed", "archived"])
});

const tournamentParamsSchema = z.object({
  tournamentId: z.string().uuid()
});

const bulkMatchesSchema = z.object({
  matches: z
    .array(
      z.object({
        tournamentId: z.string().uuid(),
        homeTeam: z.string().min(1).max(120),
        awayTeam: z.string().min(1).max(120),
        matchDate: z.string().datetime(),
        stage: z.string().min(1).max(80),
        city: z.string().min(1).max(120).optional(),
        venue: z.string().min(1).max(160).optional(),
        status: z.enum(["scheduled", "in_progress", "finished", "postponed", "cancelled"]).default("scheduled")
      })
    )
    .min(1)
    .max(300)
});

const resultParamsSchema = z.object({
  matchId: z.string().uuid()
});

const resultBodySchema = z.object({
  resultHome: z.number().int().min(0).max(30),
  resultAway: z.number().int().min(0).max(30),
  status: z.enum(["finished", "cancelled", "postponed"]).default("finished")
});

const userParamsSchema = z.object({
  userId: z.string().uuid()
});

const updateRoleSchema = z.object({
  role: z.enum(["user", "admin"])
});

const resetTournamentSchema = z.object({
  mode: z.enum(["results_only", "full"]).default("full"),
  clearParticipants: z.boolean().default(false)
});

export async function adminCreateTournament(req: Request, res: Response): Promise<void> {
  const authUser = req.authUser;
  if (!authUser) {
    throw new HttpError(401, "Authentication required");
  }

  const payload = createTournamentSchema.parse(req.body);
  const tournament = await createTournament({
    name: payload.name,
    description: payload.description,
    startDate: payload.startDate,
    endDate: payload.endDate,
    status: payload.status,
    createdBy: authUser.userId,
    scoringExact: payload.scoringExact,
    scoringWinner: payload.scoringWinner,
    scoringWrong: payload.scoringWrong
  });

  await writeAudit({
    actorUserId: authUser.userId,
    action: "tournament.create",
    entityType: "tournament",
    entityId: tournament.tournament_id,
    afterJson: tournament
  });

  res.status(201).json({ tournament });
}

export async function adminUpdateTournamentStatus(req: Request, res: Response): Promise<void> {
  const authUser = req.authUser;
  if (!authUser) {
    throw new HttpError(401, "Authentication required");
  }

  const params = tournamentParamsSchema.parse(req.params);
  const payload = updateTournamentStatusSchema.parse(req.body);

  const before = await getTournamentById(params.tournamentId);
  if (!before) {
    throw new HttpError(404, "Tournament not found");
  }

  await updateTournamentStatus(params.tournamentId, payload.status);
  const after = await getTournamentById(params.tournamentId);

  await writeAudit({
    actorUserId: authUser.userId,
    action: "tournament.status.update",
    entityType: "tournament",
    entityId: params.tournamentId,
    beforeJson: before,
    afterJson: after
  });

  res.status(200).json({ tournament: after });
}

export async function adminBulkCreateMatches(req: Request, res: Response): Promise<void> {
  const authUser = req.authUser;
  if (!authUser) {
    throw new HttpError(401, "Authentication required");
  }

  const payload = bulkMatchesSchema.parse(req.body);

  const summary = await withTransaction(async (client) => {
    const count = await createMatchesBulk(payload.matches, client);
    await writeAudit({
      actorUserId: authUser.userId,
      action: "matches.bulk.create",
      entityType: "match",
      afterJson: count,
      client
    });
    return count;
  });

  res.status(201).json(summary);
}

export async function adminSetMatchResult(req: Request, res: Response): Promise<void> {
  const authUser = req.authUser;
  if (!authUser) {
    throw new HttpError(401, "Authentication required");
  }

  const params = resultParamsSchema.parse(req.params);
  const payload = resultBodySchema.parse(req.body);

  const before = await getMatchById(params.matchId);
  if (!before) {
    throw new HttpError(404, "Match not found");
  }

  const recalculated = await withTransaction(async (client) => {
    await setMatchResult(params.matchId, payload.resultHome, payload.resultAway, payload.status, client);
    const pointsUpdated = await recomputeMatchScores(params.matchId, client);
    const after = await getMatchById(params.matchId);

    await writeAudit({
      actorUserId: authUser.userId,
      action: "match.result.update",
      entityType: "match",
      entityId: params.matchId,
      beforeJson: before,
      afterJson: after,
      client
    });

    return pointsUpdated;
  });

  const match = await getMatchById(params.matchId);

  res.status(200).json({ match, predictionsUpdated: recalculated });
}

export async function adminListUsers(_req: Request, res: Response): Promise<void> {
  const users = await listUsers();
  res.status(200).json({ users });
}

export async function adminUpdateUserRole(req: Request, res: Response): Promise<void> {
  const authUser = req.authUser;
  if (!authUser) {
    throw new HttpError(401, "Authentication required");
  }

  const params = userParamsSchema.parse(req.params);
  const payload = updateRoleSchema.parse(req.body);

  await updateUserRole(params.userId, payload.role);
  await writeAudit({
    actorUserId: authUser.userId,
    action: "user.role.update",
    entityType: "user",
    entityId: params.userId,
    afterJson: { role: payload.role }
  });

  res.status(200).json({ updated: true });
}

export async function adminResetTournament(req: Request, res: Response): Promise<void> {
  const authUser = req.authUser;
  if (!authUser) {
    throw new HttpError(401, "Authentication required");
  }

  const params = tournamentParamsSchema.parse(req.params);
  const payload = resetTournamentSchema.parse(req.body ?? {});

  const before = await getTournamentById(params.tournamentId);
  if (!before) {
    throw new HttpError(404, "Tournament not found");
  }

  const summary = await withTransaction(async (client) => {
    const resetSummary = await resetTournamentState({
      tournamentId: params.tournamentId,
      mode: payload.mode,
      clearParticipants: payload.clearParticipants,
      client
    });

    await writeAudit({
      actorUserId: authUser.userId,
      action: "tournament.reset",
      entityType: "tournament",
      entityId: params.tournamentId,
      beforeJson: before,
      afterJson: resetSummary,
      client
    });

    return resetSummary;
  });

  res.status(200).json({
    tournamentId: params.tournamentId,
    ...summary
  });
}
