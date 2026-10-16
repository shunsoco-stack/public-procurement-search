import Link from "next/link";
import { ArrowUpRight, Building2, Database, FileText, Info, RefreshCw } from "lucide-react";
import { CATEGORIES, CategoryId } from "@/lib/domain";
import { getSearchResults } from "@/lib/server/repository";
import { SearchControls } from "@/components/search-controls";
import { NoticeList } from "@/components/notice-list";
import { Pagination } from "@/components/pagination";
import { DataUnavailable, EmptyState, PageHeading } from "@/components/ui";
import { collectionIsStale, countLabel, dateLabel } from "@/components/format";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const result = await getSearchResults({
    q: value("q").slice(0, 160), category: CATEGORIES.some((c) => c.id === value("category")) ? value("category") as CategoryId : "all",
    prefecture: value("prefecture"), documentsOnly: ["1", "true"].includes(value("documentsOnly")),
    sort: value("sort") === "oldest" ? "oldest" : "newest", page: Math.max(1, Number.parseInt(value("page"), 10) || 1)
  }).catch(() => null);
  const latestQueries = result?.stats.latestSuccessfulRun?.queries ?? [];
  const periodFrom = latestQueries.map((query) => query.from).sort()[0];
  const periodTo = latestQueries.map((query) => query.to).sort().at(-1);
  return <>
    <PageHeading eyebrow="DISCOVER OPPORTUNITIES" title="案件を探す" description="公的な仕事を、あなたのスキルから見つけましょう。" action={<Link className="quiet-link" href="/coverage">収集状況を見る<ArrowUpRight size={15} aria-hidden="true" /></Link>} />
    {!result ? <DataUnavailable /> : <>
      <div className="collection-metrics"><div><span className="metric-icon"><Database size={18} strokeWidth={1.6} aria-hidden="true" /></span><span><strong>{countLabel(result.stats.total)}<small>件</small></strong><span className="metric-label">収集済みの案件</span></span></div><div><span className="metric-icon"><Building2 size={18} strokeWidth={1.6} aria-hidden="true" /></span><span><strong>{countLabel(result.stats.organizations)}<small>機関</small></strong><span className="metric-label">掲載元の機関</span></span></div><div><span className="metric-icon"><FileText size={18} strokeWidth={1.6} aria-hidden="true" /></span><span><strong>{countLabel(result.stats.withDocuments)}<small>件</small></strong><span className="metric-label">資料リンクあり</span></span></div><div className="metric-update"><RefreshCw size={14} aria-hidden="true" /><span>最終収集<strong>{dateLabel(result.stats.latestSuccessfulRun?.finishedAt, true)}</strong></span></div></div>
      <div className="collection-period"><span className="mobile-collection-time">最終収集 {dateLabel(result.stats.latestSuccessfulRun?.finishedAt, true)}</span><span>直近の収集対象期間：{periodFrom && periodTo ? `${dateLabel(periodFrom)} – ${dateLabel(periodTo)}` : "未取得"}</span><Link href="/coverage">取得範囲と不足を見る</Link></div>
      {collectionIsStale(result.stats.latestSuccessfulRun?.finishedAt) && <div className="inline-warning"><Info size={17} aria-hidden="true" /><p>最終収集から48時間以上が経過しています。情報の更新が遅れているため、最新の公告は提供元でもご確認ください。</p></div>}
      <SearchControls key={JSON.stringify(result.filters)} filters={result.filters} stats={result.stats} />
      <section className="results-section" aria-label="検索結果"><div className="results-heading"><h2>検索結果<span>{countLabel(result.total)}<small>件</small></span></h2><span>{result.total > 0 ? `${countLabel((result.page - 1) * result.pageSize + 1)}–${countLabel(Math.min(result.page * result.pageSize, result.total))}件を表示` : "条件を変更して検索できます"}</span></div>
        {result.notices.length > 0 ? <NoticeList notices={result.notices} /> : <EmptyState title={result.total > 0 ? "このページに案件はありません" : "条件に合う案件がありません"} description="キーワードを短くするか、業務分類・地域の条件を広げてお試しください。" href="/" linkLabel="すべての案件を見る" />}
        <Pagination filters={result.filters} total={result.total} pageSize={result.pageSize} />
      </section>
      <div className="scope-note"><Info size={16} aria-hidden="true" /><p>公式APIで取得できた案件を掲載しています。全国の全案件を網羅していません。掲載情報だけでは、参加可否や現在の受付状況は判断できません。<Link href="/coverage">収集範囲を確認</Link></p></div>
    </>}
  </>;
}
