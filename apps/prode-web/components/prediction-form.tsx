"use client";

import { useState } from "react";
import { apiFetch } from "../lib/api";

interface PredictionFormProps {
  matchId: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function PredictionForm({ matchId, disabled = false, disabledReason = "" }: PredictionFormProps) {
  const [predictedHome, setPredictedHome] = useState(0);
  const [predictedAway, setPredictedAway] = useState(0);
  const [status, setStatus] = useState<string>("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (disabled) {
      return;
    }
    setStatus("Saving...");

    try {
      await apiFetch<{ prediction: unknown }>("/predictions", {
        method: "POST",
        body: JSON.stringify({ matchId, predictedHome, predictedAway })
      });
      setStatus("Saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={20}
        value={predictedHome}
        onChange={(event) => setPredictedHome(Number(event.target.value))}
        disabled={disabled}
        className="w-16 rounded-lg border border-slate-300 px-2 py-1"
      />
      <span className="font-bold">-</span>
      <input
        type="number"
        min={0}
        max={20}
        value={predictedAway}
        onChange={(event) => setPredictedAway(Number(event.target.value))}
        disabled={disabled}
        className="w-16 rounded-lg border border-slate-300 px-2 py-1"
      />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-lg bg-turf px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Save
      </button>
      <span className="text-xs text-slate-500">{disabled ? disabledReason || "Locked" : status}</span>
    </form>
  );
}
