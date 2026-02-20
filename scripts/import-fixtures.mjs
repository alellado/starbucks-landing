#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_API_BASE = "http://localhost:4100/api/v1";
const MAX_BULK_SIZE = 300;

function getArg(name, shortName) {
  const idx = process.argv.findIndex((arg) => arg === `--${name}` || (shortName && arg === `-${shortName}`));
  if (idx === -1) {
    return null;
  }
  return process.argv[idx + 1] ?? null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (char === '\n') {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char === '\r') {
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  return rows.slice(1).filter((r) => r.some((v) => v !== "")).map((values, index) => {
    const out = {};
    headers.forEach((header, i) => {
      out[header] = (values[i] ?? "").trim();
    });
    out.__line = index + 2;
    return out;
  });
}

function assertDate(value, line) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new Error(`Fecha invalida en linea ${line}: ${value}`);
  }
}

async function requestJson(url, init = {}) {
  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`No se pudo conectar con API (${url}): ${reason}`);
  }
  const raw = await response.text();
  let json = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    json = { error: raw.slice(0, 200) };
  }

  if (!response.ok) {
    const message = json?.error ?? `HTTP ${response.status}`;
    throw new Error(`${message} (${url})`);
  }

  return json;
}

async function login(apiBase, email, password) {
  const json = await requestJson(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  return json.token;
}

async function resolveTournamentId(apiBase, token, explicitId, explicitName) {
  if (explicitId) {
    return explicitId;
  }

  const json = await requestJson(`${apiBase}/tournaments`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const tournaments = json.tournaments ?? [];

  if (explicitName) {
    const found = tournaments.find((t) => t.name === explicitName);
    if (!found) {
      throw new Error(`No existe torneo con name='${explicitName}'`);
    }
    return found.tournament_id;
  }

  const open = tournaments.filter((t) => t.status === "open" || t.status === "in_progress");
  if (open.length === 1) {
    return open[0].tournament_id;
  }

  if (open.length === 0) {
    throw new Error("No hay torneos open/in_progress. Pasa --tournament-id");
  }

  throw new Error("Hay multiples torneos open/in_progress. Pasa --tournament-id");
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  const apiBase = process.env.API_BASE ?? DEFAULT_API_BASE;
  const email = process.env.ADMIN_EMAIL ?? getArg("email", "e");
  const password = process.env.ADMIN_PASSWORD ?? getArg("password", "p");
  const csvPathArg = getArg("file", "f") ?? process.env.CSV_FILE;
  const tournamentIdArg = getArg("tournament-id", "t") ?? process.env.TOURNAMENT_ID;
  const tournamentNameArg = getArg("tournament-name") ?? process.env.TOURNAMENT_NAME;
  const dryRun = hasFlag("dry-run");

  if (!csvPathArg) {
    throw new Error("Falta --file <ruta_csv> o env CSV_FILE");
  }
  if (!email || !password) {
    throw new Error("Faltan credenciales admin. Usa ADMIN_EMAIL y ADMIN_PASSWORD o --email/--password");
  }

  const csvPath = path.resolve(process.cwd(), csvPathArg);
  const csvContent = await readFile(csvPath, "utf8");
  const rawRows = parseCsv(csvContent);

  if (rawRows.length === 0) {
    throw new Error("CSV vacio");
  }

  const required = ["home_team", "away_team", "match_date", "stage"];
  const first = rawRows[0];
  for (const header of required) {
    if (!(header in first)) {
      throw new Error(`Falta columna requerida: ${header}`);
    }
  }

  const token = await login(apiBase, email, password);
  const tournamentId = await resolveTournamentId(apiBase, token, tournamentIdArg, tournamentNameArg);

  const matches = rawRows.map((row) => {
    assertDate(row.match_date, row.__line);

    return {
      tournamentId,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      matchDate: row.match_date,
      stage: row.stage,
      city: row.city || undefined,
      venue: row.venue || undefined,
      status: row.status || "scheduled"
    };
  });

  if (dryRun) {
    console.log(`[dry-run] API: ${apiBase}`);
    console.log(`[dry-run] tournamentId: ${tournamentId}`);
    console.log(`[dry-run] matches: ${matches.length}`);
    console.log(`[dry-run] first:`, matches[0]);
    return;
  }

  const chunks = chunk(matches, MAX_BULK_SIZE);
  let insertedTotal = 0;
  let updatedTotal = 0;

  for (let i = 0; i < chunks.length; i += 1) {
    const payload = { matches: chunks[i] };
    const json = await requestJson(`${apiBase}/admin/matches/bulk`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const inserted = Number(json.inserted ?? 0);
    const updated = Number(json.updated ?? 0);
    insertedTotal += inserted;
    updatedTotal += updated;
    console.log(`Batch ${i + 1}/${chunks.length}: inserted ${inserted}, updated ${updated}`);
  }

  console.log(
    `Done. Inserted total: ${insertedTotal}, updated total: ${updatedTotal} matches into tournament ${tournamentId}`
  );
}

main().catch((error) => {
  console.error(`Import failed: ${error.message}`);
  process.exit(1);
});
