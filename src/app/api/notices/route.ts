import { getSavedNotices, getSearchResults } from "@/lib/server/data";
import type { SearchFilters } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    if (params.has("ids")) return Response.json({ notices: await getSavedNotices((params.get("ids") || "").split(",")) }, { headers: { "Cache-Control": "no-store" } });
    const result = await getSearchResults({
      q: params.get("q") || "", category: (params.get("category") || "all") as SearchFilters["category"],
      prefecture: params.get("prefecture") || "", sort: (params.get("sort") || "newest") as SearchFilters["sort"],
      documentsOnly: ["1", "true"].includes(params.get("documentsOnly") || ""), page: Number(params.get("page") || "1"),
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "案件を読み込めませんでした。時間をおいて再度お試しください。" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
