import { getToken } from "./auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100/api/v1";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers ?? {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({ error: "Request failed" }))) as {
      error?: string;
    };
    throw new Error(errorBody.error ?? "Request failed");
  }

  return (await response.json()) as T;
}
