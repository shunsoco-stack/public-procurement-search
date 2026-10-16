// Recompute only derived metadata when the deterministic analysis rules change.
// Source data and collection timestamps are preserved.
import { analyzeNotice } from "../src/lib/analysis";
import type { Notice } from "../src/lib/domain";
import { closePool, getPool } from "../src/lib/server/db";
import { saveNotices } from "../src/lib/server/data";

async function main() { try {
  const rows = await getPool().query<{ data: Notice }>("SELECT data FROM notices ORDER BY id");
  const changed: Notice[] = [];
  for (const { data } of rows.rows) {
    const analysis = analyzeNotice(data);
    const fingerprint = (value: Pick<Notice, "categories" | "matchedKeywords" | "evidence">) => JSON.stringify([
      value.categories, value.matchedKeywords, value.evidence.map(item => [item.kind, item.label, item.text, item.date])
    ]);
    if (fingerprint(data) !== fingerprint(analysis)) changed.push({ ...data, ...analysis });
  }
  const apply = process.argv.includes("--apply");
  if (apply) await saveNotices(changed);
  console.log(JSON.stringify({ examined: rows.rowCount, changed: changed.length, applied: apply, sourceDataAndCollectionTimesPreserved: true }));
} catch {
  console.error("分類の再計算を完了できませんでした。接続設定を確認してください。");
  process.exitCode = 1;
} finally { await closePool(); } }
void main();
