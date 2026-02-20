import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthenticatedUser } from "../types.js";

interface JwtPayload {
  sub?: string;
  email: string;
  role: "user" | "admin";
}

export function signToken(user: AuthenticatedUser): string {
  const payload: JwtPayload = {
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    subject: user.userId
  });
}

export function verifyToken(token: string): AuthenticatedUser {
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  if (!decoded.sub) {
    throw new Error("Token subject is missing");
  }

  return {
    userId: decoded.sub,
    email: decoded.email,
    role: decoded.role
  };
}
