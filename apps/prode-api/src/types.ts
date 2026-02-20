export type UserRole = "user" | "admin";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
}
