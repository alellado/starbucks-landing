import { Router } from "express";
import { getMatch } from "./matches.controller.js";

export const matchesRouter = Router();

matchesRouter.get("/:matchId", getMatch);
