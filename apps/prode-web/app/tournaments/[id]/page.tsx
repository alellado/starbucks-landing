"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PredictionForm } from "../../../components/prediction-form";
import { apiFetch } from "../../../lib/api";
import { getTeamFlag } from "../../../lib/team-flags";

interface Match {
  match_id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  stage: string;
  city: string | null;
  venue: string | null;
  status: string;
  result_home: number | null;
  result_away: number | null;
}

interface MatchDayGroup {
  key: string;
  label: string;
  matches: Match[];
}

function formatCountdown(ms: number): string {
  if (ms <= 0) {
    return "Prediction closed";
  }

  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `Closes in ${days}d ${hours}h`;
  }

  return `Closes in ${hours}h ${minutes}m`;
}

function formatDayLabel(dateIso: string): string {
  const formatted = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(dateIso));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getLocalDayKey(dateIso: string): string {
  const date = new Date(dateIso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params.id;
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");
  const [nowTs, setNowTs] = useState(Date.now());

  useEffect(() => {
    void (async () => {
      try {
        await apiFetch<{ joined: boolean }>(`/tournaments/${tournamentId}/join`, { method: "POST" });
        const response = await apiFetch<{ matches: Match[] }>(`/tournaments/${tournamentId}/matches`);
        setMatches(response.matches);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load matches");
      }
    })();
  }, [tournamentId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const stageOptions = useMemo(
    () => Array.from(new Set(matches.map((match) => match.stage))).sort((a, b) => a.localeCompare(b)),
    [matches]
  );

  const filteredMatches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return matches.filter((match) => {
      const stageOk = selectedStage === "all" || match.stage === selectedStage;
      const searchOk =
        normalizedSearch.length === 0 ||
        match.home_team.toLowerCase().includes(normalizedSearch) ||
        match.away_team.toLowerCase().includes(normalizedSearch);
      return stageOk && searchOk;
    });
  }, [matches, search, selectedStage]);

  const matchesByDay = useMemo<MatchDayGroup[]>(() => {
    const groups = new Map<string, MatchDayGroup>();

    for (const match of filteredMatches) {
      const dayKey = getLocalDayKey(match.match_date);
      const existing = groups.get(dayKey);
      if (existing) {
        existing.matches.push(match);
      } else {
        groups.set(dayKey, {
          key: dayKey,
          label: formatDayLabel(match.match_date),
          matches: [match]
        });
      }
    }

    return Array.from(groups.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredMatches]);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="section-title">Matches</h1>
        <Link
          href={`/tournaments/${tournamentId}/leaderboard`}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Leaderboard
        </Link>
      </div>
      <div className="card mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          placeholder="Search by team..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={selectedStage}
          onChange={(event) => setSelectedStage(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All stages</option>
          {stageOptions.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      <div className="space-y-6">
        {matchesByDay.map((dayGroup) => (
          <section key={dayGroup.key} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-2xl font-bold capitalize text-ink">{dayGroup.label}</h3>
              <span className="text-sm font-semibold text-slate-500">{dayGroup.matches.length} partidos</span>
            </div>

            {dayGroup.matches.map((match) => (
              <article key={match.match_id} className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{match.stage}</p>
                  <h2 className="text-lg font-bold text-ink">
                    {getTeamFlag(match.home_team)} {match.home_team} vs {getTeamFlag(match.away_team)} {match.away_team}
                  </h2>
                  <p className="text-sm text-slate-500">{new Date(match.match_date).toLocaleString()}</p>
                  {match.city || match.venue ? (
                    <p className="text-xs font-medium text-slate-500">
                      {[match.city, match.venue].filter(Boolean).join(" - ")}
                    </p>
                  ) : null}
                  {match.status === "scheduled" ? (
                    <p className="text-xs font-semibold text-slate-500">
                      {formatCountdown(new Date(match.match_date).getTime() - nowTs)}
                    </p>
                  ) : null}
                </div>
                {match.status === "finished" ? (
                  <p className="text-lg font-bold text-turf">
                    Final {match.result_home} - {match.result_away}
                  </p>
                ) : (
                  <PredictionForm
                    matchId={match.match_id}
                    disabled={new Date(match.match_date).getTime() <= nowTs || match.status !== "scheduled"}
                    disabledReason={
                      new Date(match.match_date).getTime() <= nowTs ? "Prediction closed" : "Predictions unavailable"
                    }
                  />
                )}
              </article>
            ))}
          </section>
        ))}
        {matchesByDay.length === 0 ? (
          <article className="card">
            <p className="text-sm text-slate-600">No matches found for current filters.</p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
