import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const schemaFile = path.join(repoRoot, "db", "prode_schema.sql");
const migrationsDir = path.join(repoRoot, "db", "migrations");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log("Connected to database");

  const schemaSql = await fs.readFile(schemaFile, "utf8");
  await client.query(schemaSql);
  console.log("Applied schema: db/prode_schema.sql");

  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of migrationFiles) {
    const fullPath = path.join(migrationsDir, file);
    const sql = await fs.readFile(fullPath, "utf8");
    await client.query(sql);
    console.log(`Applied migration: db/migrations/${file}`);
  }
}

run()
  .then(async () => {
    await client.end();
    console.log("Done");
  })
  .catch(async (error) => {
    console.error("Migration failed:", error.message);
    await client.end().catch(() => {});
    process.exit(1);
  });
