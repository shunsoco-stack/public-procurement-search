import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, CalendarDays, Check, FileText, Info, MapPin, ShieldCheck } from "lucide-react";
import { CATEGORIES, EvidenceKind } from "@/lib/domain";
import { getNotice } from "@/lib/server/repository";
import { BackToSearch, DataUnavailable, ExternalLink } from "@/components/ui";
import { dateLabel } from "@/components/format";
import { SaveButton } from "@/components/save-button";
import { RelatedSkills } from "@/components/related-skills";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "案件詳細" };
const groups: { kind: EvidenceKind; title: string; description: string }[] = [
  { kind: "deadline", title: "提出・参加の期限", description: "説明会や申請など、別の期限が含まれる場合があります。" },
  { kind: "qualification", title: "参加資格・条件", description: "区分・等級・年度・地域要件などは原典で確認してください。" },
  { kind: "budget", title: "価格・予算", description: "金額の対象範囲や税込・税抜の扱いを原典で確認してください。" },
  { kind: "workplace", title: "履行場所・作業方法", description: "発注機関の所在地とは異なります。現地対応の要否を原典で確認してください。" }
];

export default async function NoticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await getNotice(id).then((notice) => ({ ok: true as const, notice })).catch(() => ({ ok: false as const, notice: null }));
  if (!response.ok) return <><BackToSearch /><DataUnavailable /></>;
  if (!response.notice) notFound();
  const notice = response.notice;
  return <>
    <BackToSearch />
    <div className="detail-heading"><div className="notice-topline">{notice.categories.map((category) => <span key={category} className={`category-tag category-${category}`}>{CATEGORIES.find((item) => item.id === category)?.label}</span>)}<span className="detail-label">案件詳細</span></div><h1>{notice.title}</h1><div className="detail-heading-meta"><span><Building2 size={16} aria-hidden="true" />{notice.organization}</span><span><MapPin size={16} aria-hidden="true" />掲載地域：{notice.prefecture ?? "未取得"}{notice.city ? ` ${notice.city}` : ""}</span></div><div className="detail-actions"><SaveButton id={notice.id} title={notice.title} full /><ExternalLink href={notice.sourceUrl} className="button button-primary">公式公告を確認</ExternalLink></div></div>
    <nav className="detail-tabs" aria-label="案件詳細の目次"><a href="#overview">公告の内容</a><a href="#requirements">確認したい条件</a><a href="#documents">資料・仕様書<span>{notice.attachments.length}</span></a></nav>
    <div className="detail-layout"><div className="detail-primary">
      <section className="paper-section" id="overview"><div className="section-heading"><h2>公告の内容</h2><span className="subtle-badge">公式APIから取得</span></div><dl className="notice-facts"><div><dt>公示日・データ取得日</dt><dd>{dateLabel(notice.publishedAt ?? notice.apiRetrievedAt)}</dd></div><div><dt>調達方法</dt><dd>{notice.procurementType || "未取得"}</dd></div><div><dt>調達区分</dt><dd>{notice.procurementCategory || "未取得"}</dd></div><div><dt>APIの履行場所欄</dt><dd>{notice.location || "未取得"}</dd></div></dl><div className="announcement-text">{notice.description || "APIから本文を取得できませんでした。公式公告・仕様書をご確認ください。"}</div></section>
      <section className="paper-section evidence-section" id="requirements"><div className="section-heading"><h2>確認したい条件</h2><span className="subtle-badge">本文からの候補</span></div><p className="section-description">公告本文やAPIの欄から、確認の手がかりとなる記載を抜粋しています。抽出結果は確定情報ではありません。</p>{groups.map(({ kind, title, description }) => {
        const evidence = notice.evidence.filter((item) => item.kind === kind);
        return <div className="evidence-group" key={kind}><h3>{title}<span>{evidence.length ? `${evidence.length}件の候補` : "要確認"}</span></h3><p className="evidence-description">{description}</p>{evidence.length ? evidence.map((item, index) => <div className="evidence-item" key={`${kind}-${index}`}><span className="evidence-label">{item.label}</span>{item.date && <span className="date-candidate"><CalendarDays size={14} aria-hidden="true" />日付候補：{dateLabel(item.date)}</span>}<blockquote>{item.text}</blockquote></div>) : <p className="no-evidence">自動抽出できる記載はありません。原典の確認が必要です。</p>}</div>;
      })}</section>
      <section className="paper-section" id="documents"><div className="section-heading"><h2>資料・仕様書</h2><span className="subtle-badge">{notice.attachments.length}件</span></div><p className="section-description">提供元の資料に移動します。資料の閲覧条件や最新の差し替えは、公式公告もご確認ください。</p>{notice.attachments.length ? <ul className="attachment-list">{notice.attachments.map((attachment, index) => <li key={`${attachment.url}-${index}`}><span className="file-icon"><FileText size={20} strokeWidth={1.5} aria-hidden="true" /></span><div><ExternalLink href={attachment.url}>{attachment.name || `資料 ${index + 1}`}</ExternalLink><span>提供元の資料を開く</span></div></li>)}</ul> : <div className="no-documents"><FileText size={23} aria-hidden="true" /><p>APIから資料リンクを取得できませんでした。<br />公式公告に資料が掲載されている場合があります。</p><ExternalLink href={notice.sourceUrl}>公式公告で確認</ExternalLink></div>}</section>
    </div><aside className="detail-aside"><RelatedSkills notice={notice} /><section className="detail-side-card"><h2><ShieldCheck size={18} aria-hidden="true" />応募前に確認すること</h2><ul className="checklist">{["仕様書と成果物・業務の範囲", "参加資格の区分・等級・有効期間", "申請・質問・提出それぞれの期限", "履行場所と現地作業の有無", "最新の訂正公告・受付状況"].map((text) => <li key={text}><Check size={14} aria-hidden="true" />{text}</li>)}</ul><p className="small muted">本サービス上では応募や入札はできません。手続きは公式の案内に従ってください。</p><ExternalLink href={notice.sourceUrl} className="button button-primary">公式公告へ進む</ExternalLink></section><section className="detail-side-card data-provenance"><h2><Info size={17} aria-hidden="true" />この情報について</h2><dl><dt>API側のデータ取得日時</dt><dd>{dateLabel(notice.apiRetrievedAt, true)}</dd><dt>初回収集</dt><dd>{dateLabel(notice.firstCollectedAt, true)}</dd><dt>最終収集</dt><dd>{dateLabel(notice.lastCollectedAt, true)}</dd>{notice.tenderStartAt && <><dt>入札開始日（APIの値）</dt><dd>{dateLabel(notice.tenderStartAt)}</dd></>}{notice.openingAt && <><dt>開札日（APIの値）</dt><dd>{dateLabel(notice.openingAt)}</dd></>}{notice.deliveryAt && <><dt>納入日（APIの値）</dt><dd>{dateLabel(notice.deliveryAt)}</dd></>}</dl><p className="small muted">入札開始日は応募締切ではありません。掲載されていても受付中とは限りません。</p><Link href="/coverage" className="text-link">データの収集範囲<ArrowRight size={14} aria-hidden="true" /></Link></section></aside></div>
  </>;
}

