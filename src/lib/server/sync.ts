import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type { SyncRun } from "../domain";
import { getPool } from "./db";
import { saveNotices, saveSyncRun } from "./data";
import { buildApiUrl, collectionPlan, fetchApi } from "./kkj";

export class SyncInProgressError extends Error {
  constructor() { super("別の収集処理が実行中です。"); }
}

export async function syncData(): Promise<SyncRun> {
  const pool = getPool();
  const owner = randomUUID();
  const lease = await pool.query(`INSERT INTO sync_leases (name, owner, expires_at)
    VALUES ('kkj-daily', $1, now() + interval '10 minutes')
    ON CONFLICT (name) DO UPDATE SET owner = EXCLUDED.owner, expires_at = EXCLUDED.expires_at
    WHERE sync_leases.expires_at < now() RETURNING owner`, [owner]);
  if (!lease.rowCount) throw new SyncInProgressError();
  const run: SyncRun = {
    id: owner, startedAt: new Date().toISOString(), finishedAt: null, status: "running",
    fetched: 0, saved: 0, requestCount: 0, truncated: false, errors: [], queries: [],
  };
  const savedIds = new Set<string>();
  const deadline = Date.now() + 240_000;
  try {
    // A killed function cannot clean up, so mark old runs failed once their ten-minute lease has expired.
    await pool.query(`UPDATE sync_runs SET status = 'failed', finished_at = now(),
      data = data || jsonb_build_object('status','failed','finishedAt',now(),'errors',jsonb_build_array('収集処理が中断されました。保存済み案件は維持しています。'))
      WHERE status = 'running' AND started_at < now() - interval '10 minutes'`);
    await saveSyncRun(run);
    const plan = collectionPlan();
    for (const query of plan) {
      if (Date.now() > deadline) { run.errors.push("今回の実行時間上限に達したため、残りの収集を見送りました。"); break; }
      if (run.requestCount > 0) await delay(1100);
      run.requestCount++;
      try {
        const result = await fetchApi(query);
        run.fetched += result.returned;
        run.truncated ||= result.hits > result.returned;
        run.queries.push({ label: query.label, query: buildApiUrl(query).searchParams.toString(), hits: result.hits, returned: result.returned, from: query.from, to: query.to });
        if (result.skipped) run.errors.push(`${query.label}：必須情報のない${result.skipped}件を除外しました。`);
        await saveNotices(result.notices);
        for (const notice of result.notices) savedIds.add(notice.id);
        run.saved = savedIds.size;
      } catch {
        run.errors.push(`${query.label}：取得または保存を完了できませんでした。既存の案件は維持しています。`);
      }
      await saveSyncRun(run);
    }
    run.finishedAt = new Date().toISOString();
    run.status = run.errors.length || run.truncated ? (run.saved ? "partial" : "failed") : "success";
    await saveSyncRun(run);
    return run;
  } catch {
    run.status = run.saved ? "partial" : "failed";
    run.finishedAt = new Date().toISOString();
    run.errors.push("収集処理を完了できませんでした。保存済み案件は維持しています。");
    await saveSyncRun(run).catch(() => undefined);
    throw new Error("収集処理を完了できませんでした。");
  } finally {
    await pool.query("DELETE FROM sync_leases WHERE name = 'kkj-daily' AND owner = $1", [owner]).catch(() => undefined);
  }
}
