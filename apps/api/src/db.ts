import { Pool, type PoolClient, type QueryResult } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export type DBClient = PoolClient;

export async function query<T = unknown>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(fn: (client: DBClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await fn(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

