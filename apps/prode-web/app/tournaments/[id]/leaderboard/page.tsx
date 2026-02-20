"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LeaderboardTable } from "../../../../components/leaderboard-table";
import { apiFetch } from "../../../../lib/api";

interface LeaderboardRow {
  user_id: string;
  name: string;
  total_points: number;
  position: number;
  exact_hits: number;
  winner_hits: number;
}

export default function LeaderboardPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params.id;
  const [entries, setEntries] = useState<LeaderboardRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await apiFetch<{ leaderboard: LeaderboardRow[] }>(
          `/tournaments/${tournamentId}/leaderboard`
        );
        setEntries(response.leaderboard);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load leaderboard");
      }
    })();
  }, [tournamentId]);

  return (
    <section>
      <h1 className="section-title">Leaderboard</h1>
      {error ? <p className="mb-4 mt-4 text-sm text-red-600">{error}</p> : null}
      <div className="mt-5">
        <LeaderboardTable entries={entries} />
      </div>
    </section>
  );
}
