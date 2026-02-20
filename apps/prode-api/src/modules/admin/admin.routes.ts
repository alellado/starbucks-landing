import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  adminBulkCreateMatches,
  adminCreateTournament,
  adminListUsers,
  adminResetTournament,
  adminSetMatchResult,
  adminUpdateTournamentStatus,
  adminUpdateUserRole
} from "./admin.controller.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(["admin"]));
adminRouter.post("/tournaments", adminCreateTournament);
adminRouter.patch("/tournaments/:tournamentId", adminUpdateTournamentStatus);
adminRouter.post("/tournaments/:tournamentId/reset", adminResetTournament);
adminRouter.post("/matches/bulk", adminBulkCreateMatches);
adminRouter.patch("/matches/:matchId/result", adminSetMatchResult);
adminRouter.get("/users", adminListUsers);
adminRouter.patch("/users/:userId/role", adminUpdateUserRole);
