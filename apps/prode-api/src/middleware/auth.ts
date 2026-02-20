import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedUser, UserRole } from "../types.js";
import { verifyToken } from "../utils/jwt.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.header("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    req.authUser = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!roles.includes(req.authUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}
