import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { checkDbHealth } from "./db/pool.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((value) => value.trim()) }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

app.get("/health", async (_req, res) => {
  const dbOk = await checkDbHealth();
  res.status(dbOk ? 200 : 503).json({ ok: dbOk });
});

app.use("/api/v1", apiRouter);

app.use(notFound);
app.use(errorHandler);
