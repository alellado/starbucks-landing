import Link from "next/link";

interface TournamentCardProps {
  tournament: {
    tournament_id: string;
    name: string;
    description: string;
    status: string;
    start_date: string;
    end_date: string;
    participants?: number;
  };
}

export function TournamentCard({ tournament }: TournamentCardProps) {
  const normalizedStatus = tournament.status.toLowerCase();
  const isOpen = normalizedStatus === "open";
  const statusLabel = isOpen ? "Abierto" : tournament.status;

  return (
    <article className="card">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-heading text-3xl tracking-wide text-ink">{tournament.name}</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase text-white ${
            isOpen ? "bg-emerald-600" : "bg-ink"
          }`}
        >
          {statusLabel}
        </span>
      </div>
      <p className="text-sm text-slate-600">{tournament.description}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
        <span>{new Date(tournament.end_date).toLocaleDateString()}</span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{tournament.participants ?? 0} players</span>
        <Link
          href={`/tournaments/${tournament.tournament_id}`}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-ink"
        >
          Entar
        </Link>
      </div>
    </article>
  );
}
