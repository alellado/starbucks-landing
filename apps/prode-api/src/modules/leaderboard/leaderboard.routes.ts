import { Router } from "express";
import { getTournamentLeaderboard } from "./leaderboard.controller.js";

export const leaderboardRouter = Router({ mergeParams: true });

leaderboardRouter.get("/", getTournamentLeaderboard);
