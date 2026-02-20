"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setToken } from "../../lib/auth";
import { apiFetch } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");

    try {
      const response = await apiFetch<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setToken(response.token);
      router.push("/tournaments");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Login failed");
    }
  }

  return (
    <section className="mx-auto max-w-md card">
      <h1 className="section-title">Login</h1>
      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" className="w-full rounded-lg bg-ink px-4 py-2 font-semibold text-white">
          Sign in
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        No account? <Link href="/register" className="font-semibold text-ink">Register</Link>
      </p>
    </section>
  );
}
