import { isCronAuthorized } from "@/lib/server/auth";
import { syncData, SyncInProgressError } from "@/lib/server/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "認証が必要です。" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const run = await syncData();
    return Response.json(run, { status: run.status === "failed" ? 502 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof SyncInProgressError ? "別の収集処理が実行中です。" : "収集処理を完了できませんでした。" }, { status: error instanceof SyncInProgressError ? 409 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
