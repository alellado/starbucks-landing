"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearToken } from "../lib/auth";

export function TopNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (isHome) {
    return (
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#081a3a]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-white">
            <span className="text-lg">⚽</span>
            <span className="font-heading text-2xl tracking-wide">PRODE MUNDIAL</span>
          </Link>
          <nav className="hidden items-center gap-10 text-sm font-semibold text-slate-200 md:flex">
            <Link href="/" className="transition hover:text-cyan-300">
              Inicio
            </Link>
            <Link href="/tournaments" className="transition hover:text-cyan-300">
              Torneos
            </Link>
            <Link href="/tournaments" className="transition hover:text-cyan-300">
              Rankings
            </Link>
            <Link href="/admin" className="transition hover:text-cyan-300">
              Admin
            </Link>
          </nav>
          <Link
            href="/register"
            className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-2 text-sm font-bold text-slate-950"
          >
            Registrarme
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <span className="text-lg text-accent">🏆</span>
          <span className="font-heading text-3xl tracking-wide">PRODE 2026</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold text-slate-700">
          <Link href="/tournaments">Tournaments</Link>
          <Link href="/admin">Admin</Link>
          <button
            onClick={() => {
              clearToken();
              window.location.assign("/login");
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
