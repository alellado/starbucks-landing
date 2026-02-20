"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setToken } from "../../lib/auth";
import { apiFetch } from "../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");

    try {
      const response = await apiFetch<{ token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });
      setToken(response.token);
      router.push("/tournaments");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Register failed");
    }
  }

  return (
    <section className="mx-auto max-w-md card">
      <h1 className="section-title">Register</h1>
      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <input
          required
          placeholder="Full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
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
          minLength={8}
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" className="w-full rounded-lg bg-turf px-4 py-2 font-semibold text-white">
          Create account
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Already registered? <Link href="/login" className="font-semibold text-ink">Login</Link>
      </p>
    </section>
  );
}
