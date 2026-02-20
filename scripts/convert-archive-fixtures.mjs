#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function getArg(name, shortName) {
  const idx = process.argv.findIndex((arg) => arg === `--${name}` || (shortName && arg === `-${shortName}`));
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function csvParseLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    const n = line[i + 1];

    if (inQuotes) {
      if (c === '"' && n === '"') {
        cur += '"';
        i += 1;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }

    if (c === ',') {
      out.push(cur.trim());
      cur = "";
      continue;
    }

    cur += c;
  }

  out.push(cur.trim());
  return out;
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const headers = csvParseLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line, idx) => {
    const values = csvParseLine(line);
    const row = { __line: idx + 2 };
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

function toIsoOffset(value, lineNo) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2}:\d{2})([+-]\d{2})$/);
  if (match) {
    const withOffset = `${match[1]}T${match[2]}${match[3]}:00`;
    const ts = Date.parse(withOffset);
    if (Number.isNaN(ts)) {
      throw new Error(`kickoff_at invalido en linea ${lineNo}: ${value}`);
    }
    return new Date(ts).toISOString();
  }

  const alreadyIso = value.replace(" ", "T");
  const t = Date.parse(alreadyIso);
  if (Number.isNaN(t)) {
    throw new Error(`kickoff_at invalido en linea ${lineNo}: ${value}`);
  }

  // Keep UTC output for consistency when offset format is unusual.
  return new Date(t).toISOString();
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

function parseSidesFromLabel(label) {
  if (!label || !label.includes(" vs ")) {
    return [null, null];
  }
  const parts = label.split(" vs ");
  if (parts.length !== 2) {
    return [null, null];
  }
  return [parts[0].trim(), parts[1].trim()];
}

async function main() {
  const baseDir = getArg("base", "b") ?? "/Users/alellado/Desktop/archive";
  const outFile = getArg("out", "o") ?? "db/seeds/worldcup2026-from-archive.csv";

  const teamsCsv = await readFile(path.join(baseDir, "teams.csv"), "utf8");
  const stagesCsv = await readFile(path.join(baseDir, "tournament_stages.csv"), "utf8");
  const citiesCsv = await readFile(path.join(baseDir, "host_cities.csv"), "utf8");
  const matchesCsv = await readFile(path.join(baseDir, "matches.csv"), "utf8");

  const teams = parseCsv(teamsCsv);
  const stages = parseCsv(stagesCsv);
  const cities = parseCsv(citiesCsv);
  const matches = parseCsv(matchesCsv);

  const teamById = new Map(teams.map((r) => [r.id, r.team_name]));
  const stageById = new Map(stages.map((r) => [r.id, r.stage_name]));
  const cityById = new Map(cities.map((r) => [r.id, { city: r.city_name, venue: r.venue_name }]));

  const outRows = matches.map((m) => {
    const [labelHome, labelAway] = parseSidesFromLabel(m.match_label);
    const home = teamById.get(m.home_team_id) ?? labelHome;
    const away = teamById.get(m.away_team_id) ?? labelAway;
    const stage = stageById.get(m.stage_id) ?? m.match_label ?? "Group Stage";
    const cityInfo = cityById.get(m.city_id) ?? { city: "", venue: "" };

    if (!home || !away) {
      throw new Error(`No se pudo resolver home/away en linea ${m.__line}`);
    }

    const matchDate = toIsoOffset(m.kickoff_at, m.__line);

    return {
      home_team: home,
      away_team: away,
      match_date: matchDate,
      stage,
      city: cityInfo.city || "",
      venue: cityInfo.venue || "",
      status: "scheduled"
    };
  });

  const header = ["home_team", "away_team", "match_date", "stage", "city", "venue", "status"];
  const csvOut = [
    header.join(","),
    ...outRows.map((r) => header.map((h) => csvEscape(r[h])).join(","))
  ].join("\n");

  const outPath = path.resolve(process.cwd(), outFile);
  await writeFile(outPath, `${csvOut}\n`, "utf8");

  console.log(`Generated: ${outPath}`);
  console.log(`Rows: ${outRows.length}`);
  console.log("Sample:", outRows[0]);
}

main().catch((error) => {
  console.error(`Conversion failed: ${error.message}`);
  process.exit(1);
});
