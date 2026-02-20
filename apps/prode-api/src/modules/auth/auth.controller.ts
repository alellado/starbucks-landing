import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../../middleware/error.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { signToken } from "../../utils/jwt.js";
import { createUser, findUserByEmail, findUserById, touchLastLogin } from "./auth.repository.js";

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  avatar: z.string().url().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

export async function register(req: Request, res: Response): Promise<void> {
  const payload = registerSchema.parse(req.body);

  const existing = await findUserByEmail(payload.email);
  if (existing) {
    throw new HttpError(409, "Email already in use");
  }

  const passwordHash = await hashPassword(payload.password);
  const user = await createUser({
    name: payload.name,
    email: payload.email,
    passwordHash,
    avatar: payload.avatar
  });

  const token = signToken({ userId: user.user_id, email: user.email, role: user.role });

  res.status(201).json({
    token,
    user: {
      userId: user.user_id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.created_at
    }
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const payload = loginSchema.parse(req.body);

  const user = await findUserByEmail(payload.email);
  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const isPasswordValid = await verifyPassword(payload.password, user.password_hash);
  if (!isPasswordValid) {
    throw new HttpError(401, "Invalid credentials");
  }

  await touchLastLogin(user.user_id);

  const token = signToken({ userId: user.user_id, email: user.email, role: user.role });

  res.status(200).json({
    token,
    user: {
      userId: user.user_id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.created_at
    }
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  const authUser = req.authUser;
  if (!authUser) {
    throw new HttpError(401, "Authentication required");
  }

  const user = await findUserById(authUser.userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  res.status(200).json({
    user: {
      userId: user.user_id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.created_at
    }
  });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: "Logged out" });
}
