// Imported exclusively by server components, Route Handlers, and local administration scripts.
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

const globals = globalThis as typeof globalThis & { procurementPool?: Pool };
export function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("データベースが設定されていません。");
  if (!globals.procurementPool) {
    const connection = new URL(process.env.DATABASE_URL);
    connection.searchParams.set("sslmode", "verify-full");
    const pool = new Pool({
      connectionString: connection.href,
      max: 4, idleTimeoutMillis: 5_000, connectionTimeoutMillis: 15_000,
      statement_timeout: 20_000, query_timeout: 25_000,
    });
    pool.on("error", () => { /* Request handlers return sanitized errors; never log credentials. */ });
    attachDatabasePool(pool);
    globals.procurementPool = pool;
  }
  return globals.procurementPool;
}

export async function closePool(): Promise<void> {
  if (globals.procurementPool) {
    await globals.procurementPool.end();
    delete globals.procurementPool;
  }
}
