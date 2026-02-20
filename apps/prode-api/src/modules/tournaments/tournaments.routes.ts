import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { getTournament, getTournamentMatches, getTournaments, join } from "./tournaments.controller.js";
import { getTournamentLeaderboard } from "../leaderboard/leaderboard.controller.js";

export const tournamentsRouter = Router();

tournamentsRouter.get("/", getTournaments);
tournamentsRouter.get("/:tournamentId", getTournament);
tournamentsRouter.get("/:tournamentId/matches", getTournamentMatches);
tournamentsRouter.get("/:tournamentId/leaderboard", getTournamentLeaderboard);
tournamentsRouter.post("/:tournamentId/join", requireAuth, join);
