"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

interface TournamentOption {
  tournament_id: string;
  name: string;
  status: string;
}

type ResetMode = "results_only" | "full";

export default function AdminPage() {
  const [matchId, setMatchId] = useState("");
  const [resultHome, setResultHome] = useState(0);
  const [resultAway, setResultAway] = useState(0);
  const [resultStatus, setResultStatus] = useState("");

  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [tournamentId, setTournamentId] = useState("");
  const [resetMode, setResetMode] = useState<ResetMode>("full");
  const [clearParticipants, setClearParticipants] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetStatus, setResetStatus] = useState("");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await apiFetch<{ tournaments: TournamentOption[] }>("/tournaments");
        setTournaments(response.tournaments);
        if (response.tournaments.length > 0) {
          setTournamentId(response.tournaments[0].tournament_id);
        }
      } catch (error) {
        setResetStatus(error instanceof Error ? error.message : "Unable to load tournaments");
      }
    })();
  }, []);

  async function onSaveResult(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setResultStatus("Updating...");

    try {
      const response = await apiFetch<{ predictionsUpdated: number }>(`/admin/matches/${matchId}/result`, {
        method: "PATCH",
        body: JSON.stringify({ resultHome, resultAway, status: "finished" })
      });
      setResultStatus(`Saved. Re-scored ${response.predictionsUpdated} predictions.`);
    } catch (error) {
      setResultStatus(error instanceof Error ? error.message : "Failed");
    }
  }

  async function onConfirmReset(): Promise<void> {
    if (!tournamentId || confirmText.trim() !== "RESET") {
      return;
    }

    setResetStatus("Resetting tournament...");

    try {
      const response = await apiFetch<{
        tournamentId: string;
        mode: ResetMode;
        predictionsDeleted: number;
        predictionPointsReset: number;
        matchesReset: number;
        participantsDeleted: number;
      }>(`/admin/tournaments/${tournamentId}/reset`, {
        method: "POST",
        body: JSON.stringify({
          mode: resetMode,
          clearParticipants: resetMode === "full" ? clearParticipants : false
        })
      });

      setResetStatus(
        `Done (${response.mode}). Predictions deleted: ${response.predictionsDeleted}, points reset: ${response.predictionPointsReset}, matches reset: ${response.matchesReset}, participants deleted: ${response.participantsDeleted}.`
      );
      setIsResetModalOpen(false);
      setConfirmText("");
      setAcknowledged(false);
      setClearParticipants(false);
      setResetMode("full");
    } catch (error) {
      setResetStatus(error instanceof Error ? error.message : "Failed");
    }
  }

  const selectedTournamentName = tournaments.find((item) => item.tournament_id === tournamentId)?.name ?? "Selected tournament";

  return (
    <>
      <section className="grid gap-6 md:grid-cols-2">
        <article className="card">
          <h1 className="section-title">Admin Panel</h1>
          <p className="mt-3 text-sm text-slate-600">Manage results, reset tournament state, and keep leaderboard data consistent.</p>
        </article>

        <article className="card">
          <h2 className="font-heading text-3xl tracking-wide text-ink">Load Match Result</h2>
          <form onSubmit={onSaveResult} className="mt-4 space-y-3">
            <input
              required
              value={matchId}
              onChange={(event) => setMatchId(event.target.value)}
              placeholder="match UUID"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={0}
                max={30}
                value={resultHome}
                onChange={(event) => setResultHome(Number(event.target.value))}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
              <input
                type="number"
                min={0}
                max={30}
                value={resultAway}
                onChange={(event) => setResultAway(Number(event.target.value))}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">
              Save Result
            </button>
            <p className="text-xs text-slate-500">{resultStatus}</p>
          </form>
        </article>

        <article className="card md:col-span-2">
          <h2 className="font-heading text-3xl tracking-wide text-ink">Reset Tournament</h2>
          <p className="mt-2 text-sm text-slate-600">
            Choose reset mode, confirm impact, then open the confirmation modal to execute.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Tournament
              <select
                value={tournamentId}
                onChange={(event) => setTournamentId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {tournaments.map((tournament) => (
                  <option key={tournament.tournament_id} value={tournament.tournament_id}>
                    {tournament.name} ({tournament.status})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Reset Mode
              <select
                value={resetMode}
                onChange={(event) => setResetMode(event.target.value as ResetMode)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="full">Full reset (delete predictions + reset results)</option>
                <option value="results_only">Results only (keep predictions, reset points/results)</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
              <input
                type="checkbox"
                checked={clearParticipants}
                disabled={resetMode !== "full"}
                onChange={(event) => setClearParticipants(event.target.checked)}
                className="h-4 w-4"
              />
              Also remove all participants (available only in full reset)
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="h-4 w-4"
              />
              I understand this operation changes tournament data immediately.
            </label>

            <button
              type="button"
              disabled={!tournamentId || !acknowledged}
              onClick={() => {
                setConfirmText("");
                setIsResetModalOpen(true);
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-red-300 md:col-span-2"
            >
              Open Reset Confirmation
            </button>
            <p className="text-xs text-slate-500 md:col-span-2">{resetStatus}</p>
          </div>
        </article>
      </section>

      {isResetModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="font-heading text-3xl tracking-wide text-ink">Confirm Tournament Reset</h3>
            <p className="mt-2 text-sm text-slate-600">
              Tournament: <span className="font-semibold text-slate-900">{selectedTournamentName}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Mode: <span className="font-semibold text-slate-900">{resetMode === "full" ? "Full reset" : "Results only"}</span>
            </p>
            {resetMode === "full" && clearParticipants ? (
              <p className="mt-1 text-sm font-semibold text-red-700">Participants will also be removed.</p>
            ) : null}

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Type <span className="text-red-600">RESET</span> to confirm
              <input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder="RESET"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmText.trim() !== "RESET"}
                onClick={() => {
                  void onConfirmReset();
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-red-300"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
