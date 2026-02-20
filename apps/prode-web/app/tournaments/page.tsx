"use client";

import { useEffect, useState } from "react";
import { TournamentCard } from "../../components/tournament-card";
import { apiFetch } from "../../lib/api";

interface Tournament {
  tournament_id: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  participants: number;
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await apiFetch<{ tournaments: Tournament[] }>("/tournaments");
        setTournaments(response.tournaments);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load tournaments");
      }
    })();
  }, []);

  return (
    <section>
      <h1 className="section-title">Torneos</h1>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {tournaments.map((tournament) => (
          <TournamentCard key={tournament.tournament_id} tournament={tournament} />
        ))}
      </div>
    </section>
  );
}
