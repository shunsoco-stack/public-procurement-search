import { getStats } from "@/lib/server/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const stats = await getStats();
    return Response.json({ status: stats.total ? "ok" : "empty", dataCount: stats.total, lastSync: stats.latestRun?.finishedAt ?? null, lastSyncStatus: stats.latestRun?.status ?? null, source: "官公需情報ポータルサイト検索API" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable", error: "データベースの状態を確認できませんでした。" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
