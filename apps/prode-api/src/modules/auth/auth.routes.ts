import { Router } from "express";
import { login, logout, me, register } from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", requireAuth, logout);
authRouter.get("/me", requireAuth, me);
