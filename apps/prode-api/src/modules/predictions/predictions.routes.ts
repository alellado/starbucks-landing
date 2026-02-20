import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { createOrUpdatePrediction, getMyPredictions } from "./predictions.controller.js";

export const predictionsRouter = Router();

predictionsRouter.post("/", requireAuth, createOrUpdatePrediction);
predictionsRouter.get("/me", requireAuth, getMyPredictions);
