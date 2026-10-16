import { syncData } from "../src/lib/server/sync";
import { closePool } from "../src/lib/server/db";

async function main() {
  try {
    const run = await syncData();
    console.log(JSON.stringify(run, null, 2));
    if (run.status === "failed") process.exitCode = 1;
  } catch { console.error("案件の収集を完了できませんでした。接続設定または実行中の処理を確認してください。"); process.exitCode = 1; }
  finally { await closePool(); }
}
void main();
