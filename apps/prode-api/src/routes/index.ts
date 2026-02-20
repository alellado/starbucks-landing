import { Router } from "express";
import { adminRouter } from "../modules/admin/admin.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { matchesRouter } from "../modules/matches/matches.routes.js";
import { predictionsRouter } from "../modules/predictions/predictions.routes.js";
import { tournamentsRouter } from "../modules/tournaments/tournaments.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/tournaments", tournamentsRouter);
apiRouter.use("/matches", matchesRouter);
apiRouter.use("/predictions", predictionsRouter);
apiRouter.use("/admin", adminRouter);
