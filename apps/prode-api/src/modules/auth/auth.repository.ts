import type { QueryResultRow } from "pg";
import { query } from "../../db/pool.js";

export interface UserRecord extends QueryResultRow {
  user_id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar: string | null;
  role: "user" | "admin";
  created_at: string;
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const result = await query<UserRecord>(
    `SELECT user_id, name, email, password_hash, avatar, role, created_at
     FROM users
     WHERE email = $1 AND is_active = TRUE`,
    [email.toLowerCase()]
  );

  return result.rows[0] ?? null;
}

export async function findUserById(userId: string): Promise<UserRecord | null> {
  const result = await query<UserRecord>(
    `SELECT user_id, name, email, password_hash, avatar, role, created_at
     FROM users
     WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function createUser(params: {
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
}): Promise<UserRecord> {
  const result = await query<UserRecord>(
    `INSERT INTO users (name, email, password_hash, avatar)
     VALUES ($1, $2, $3, $4)
     RETURNING user_id, name, email, password_hash, avatar, role, created_at`,
    [params.name, params.email.toLowerCase(), params.passwordHash, params.avatar ?? null]
  );

  return result.rows[0];
}

export async function touchLastLogin(userId: string): Promise<void> {
  await query(
    `UPDATE users
     SET last_login_at = NOW(), updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );
}
