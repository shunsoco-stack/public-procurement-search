import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { Client } from "pg";

async function migrate() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED の設定が必要です。");
  const connection = new URL(connectionString);
  if (connection.hostname.includes("-pooler")) throw new Error("マイグレーションには直接接続URLを指定してください。");
  connection.searchParams.set("sslmode", "verify-full");
  const client = new Client({ connectionString: connection.href, connectionTimeoutMillis: 15_000, statement_timeout: 30_000 });
  try {
    await client.connect();
    await client.query("SELECT pg_advisory_lock(78324512)");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
    const directory = resolve(process.cwd(), "migrations");
    const files = (await readdir(directory)).filter(file => /^\d+_.+\.sql$/.test(file)).sort();
    for (const name of files) {
      const sql = await readFile(resolve(directory, name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const previous = await client.query("SELECT checksum FROM schema_migrations WHERE name=$1", [name]);
      if (previous.rows.length) {
        if (previous.rows[0].checksum !== checksum) throw new Error("適用済みの移行ファイルが変更されています。");
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1,$2)", [name, checksum]);
        await client.query("COMMIT");
        console.log(`適用済み: ${name}`);
      } catch { await client.query("ROLLBACK"); throw new Error("マイグレーションを適用できませんでした。"); }
    }
    console.log("データベースの移行が完了しました。");
  } finally { await client.end().catch(() => undefined); }
}
migrate().catch(() => { console.error("データベース移行に失敗しました。接続設定と移行ファイルを確認してください。"); process.exitCode = 1; });
