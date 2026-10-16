import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, CheckCircle2, CircleAlert, Clock3, Database, FileSearch, Globe2, Info, Landmark, Link2 } from "lucide-react";
import { PREFECTURES, SOURCE_URL } from "@/lib/domain";
import { getStats } from "@/lib/server/repository";
import { DataUnavailable, ExternalLink, PageHeading } from "@/components/ui";
import { collectionIsStale, countLabel, dateLabel } from "@/components/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "収集状況とデータについて" };
const statuses = { running: "収集中", success: "正常に完了", partial: "一部を取得", failed: "取得に失敗" };

function queryDescription(query: string) {
  const params = new URLSearchParams(query);
  const keyword = params.get("Project_Name") ?? params.get("Query");
  if (keyword) return `キーワード：${keyword.replaceAll(" OR ", "・")}`;
  const codes = params.get("LG_Code");
  if (codes) return codes.split(",").map((code) => PREFECTURES[Number(code) - 1] ?? code).join("・");
  return "キーワード指定なし";
}

export default async function CoveragePage() {
  const stats = await getStats().catch(() => null);
  const run = stats?.latestRun;
  const ranges = run?.queries ?? [];
  const from = ranges.map((item) => item.from).sort()[0];
  const to = ranges.map((item) => item.to).sort().at(-1);
  return <><PageHeading eyebrow="DATA & COVERAGE" title="収集状況" description="どこから、いつ、どこまで取得できたかを確認できます。" />
    {!stats ? <DataUnavailable /> : <>
      <div className="coverage-banner"><span className="coverage-banner-icon"><Globe2 size={24} strokeWidth={1.4} aria-hidden="true" /></span><div><h2>すべての官公庁案件を網羅していません。</h2><p>官公需情報ポータルの公式APIで取得できた案件を、検索・保存できるよう整理しています。</p></div></div>
      {collectionIsStale(stats.latestSuccessfulRun?.finishedAt) && <div className="inline-warning"><CircleAlert size={17} aria-hidden="true" /><p>最終収集から48時間以上が経過しています。情報の更新が遅れています。最新の内容は公式公告をご確認ください。</p></div>}<div className="coverage-grid"><section className="paper-section coverage-status"><div className="section-heading"><h2><Activity size={18} aria-hidden="true" />最新の収集</h2><span className={`run-badge run-${run?.status ?? "none"}`}>{run ? statuses[run.status] : "まだ実行していません"}</span></div><dl className="status-facts"><div><dt>収集開始</dt><dd>{dateLabel(run?.startedAt, true)}</dd></div><div><dt>収集完了</dt><dd>{run?.status === "running" ? "収集中" : dateLabel(run?.finishedAt, true)}</dd></div><div><dt>直近の保存完了</dt><dd>{dateLabel(stats.latestSuccessfulRun?.finishedAt, true)}</dd></div><div><dt>検索した期間</dt><dd>{from && to ? `${dateLabel(from)} – ${dateLabel(to)}` : "未取得"}</dd></div></dl><div className="sync-metrics"><div><strong>{countLabel(run?.fetched ?? 0)}<small>件</small></strong><span>取得件数</span></div><div><strong>{countLabel(run?.saved ?? 0)}<small>件</small></strong><span>保存処理件数</span></div><div><strong>{countLabel(stats.total)}<small>件</small></strong><span>蓄積した案件</span></div></div>{run?.truncated && <div className="inline-warning"><CircleAlert size={17} aria-hidden="true" /><p>取得上限に達した検索があります。対象期間内でも、一部の案件を取得できていません。</p></div>}{run?.errors.length ? <div className="sync-errors"><h3>収集時に確認された問題</h3><ul>{run.errors.map((error, index) => <li key={index}>{error}</li>)}</ul></div> : run && <p className="sync-success"><CheckCircle2 size={15} aria-hidden="true" />{run.status === "running" ? "収集処理を実行しています。完了後に結果を確認してください。" : "この収集処理で記録されたエラーはありません。"}</p>}</section>
      <section className="paper-section source-detail"><span className="source-detail-icon"><Landmark size={25} strokeWidth={1.4} aria-hidden="true" /></span><p className="eyebrow">OFFICIAL DATA SOURCE</p><h2>官公需情報ポータルサイト</h2><p>中小企業庁が提供する検索APIを利用しています。取得した公告本文を正規化し、業務分類や確認事項の候補を付けています。</p><ExternalLink href={SOURCE_URL}>データ提供元を見る</ExternalLink><div className="source-links"><ExternalLink href="https://www.kkj.go.jp/doc/ja/api_guide.pdf">公式API仕様書</ExternalLink><ExternalLink href="https://www.kkj.go.jp/s/?tc=1">提供元の利用規約</ExternalLink></div></section></div>
      <section className="paper-section"><div className="section-heading"><h2><FileSearch size={18} aria-hidden="true" />取得対象と結果</h2><span className="subtle-badge">最新の収集処理</span></div><p className="section-description">重点分野のキーワードと全般の検索で取得しています。重複する案件はまとめて保存するため、検索ごとの件数の合計と蓄積件数は一致しません。</p>{ranges.length ? <div className="table-scroll"><table className="collection-table"><thead><tr><th scope="col">検索対象</th><th scope="col">対象期間</th><th scope="col" className="number">APIの該当件数</th><th scope="col" className="number">取得件数</th><th scope="col">確認</th></tr></thead><tbody>{ranges.map((query, index) => <tr key={index}><th scope="row">{query.label.startsWith("地域収集") ? "地域の公告" : query.label}<small>{queryDescription(query.query)}</small></th><td>{dateLabel(query.from)}<span className="date-range-dash">–</span>{dateLabel(query.to)}</td><td className="number">{countLabel(query.hits)}</td><td className="number">{countLabel(query.returned)}</td><td>{query.hits > query.returned ? <span className="table-status partial">一部取得</span> : <span className="table-status">取得済み</span>}</td></tr>)}</tbody></table></div> : <p className="no-evidence">収集記録はまだありません。</p>}</section>
      <section className="coverage-notes"><h2>安心して使うために、知っておきたいこと。</h2><div><article><span><Database size={20} strokeWidth={1.5} aria-hidden="true" /></span><h3>収集できる範囲には限りがあります</h3><p>APIに掲載されない機関や案件、取得期間外の案件は検索できません。対象に含まれる機関でも、すべての公告を取得できるとは限りません。</p></article><article><span><Clock3 size={20} strokeWidth={1.5} aria-hidden="true" /></span><h3>受付状況は原典で確認</h3><p>収集後の変更や中止、訂正公告がすぐに反映されない場合があります。掲載日や入札開始日だけから、現在の募集状況は判断しません。</p></article><article><span><Link2 size={20} strokeWidth={1.5} aria-hidden="true" /></span><h3>抽出した条件は確認の手がかりです</h3><p>業務分類や参加条件・期限の抜粋には誤りや抜けがありえます。資格やリモート対応の可否を保証せず、最終確認は公式公告・仕様書で行います。</p></article></div></section>
      <p className="scope-note"><Info size={16} aria-hidden="true" />公開検索・案件詳細は無料で利用できます。<Link href="/">案件を探す<ArrowRight size={14} aria-hidden="true" /></Link></p>
    </>}
  </>;
}

