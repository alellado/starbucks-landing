interface LeaderboardEntry {
  user_id: string;
  name: string;
  total_points: number;
  position: number;
  exact_hits: number;
  winner_hits: number;
}

export function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="py-3 pr-3">Pos</th>
            <th className="py-3 pr-3">Player</th>
            <th className="py-3 pr-3">Points</th>
            <th className="py-3 pr-3">Exact</th>
            <th className="py-3">Winner</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.user_id} className="border-b border-slate-100">
              <td className="py-3 pr-3 font-bold text-ink">#{entry.position}</td>
              <td className="py-3 pr-3 font-semibold">{entry.name}</td>
              <td className="py-3 pr-3">{entry.total_points}</td>
              <td className="py-3 pr-3">{entry.exact_hits}</td>
              <td className="py-3">{entry.winner_hits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
