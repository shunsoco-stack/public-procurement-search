import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Database, FileSearch, RefreshCw } from "lucide-react";
import { safeUrl } from "./format";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action}</div>;
}

export function ExternalLink({ href, children, className = "text-link" }: { href: string | null | undefined; children: React.ReactNode; className?: string }) {
  const url = safeUrl(href);
  return url ? <a href={url} target="_blank" rel="noopener noreferrer" className={className}>{children}<ArrowUpRight size={15} aria-hidden="true" /><span className="sr-only">（新しいタブで開く）</span></a> : <span className="muted">リンク未取得</span>;
}

export function EmptyState({ title, description, href, linkLabel }: { title: string; description: string; href?: string; linkLabel?: string }) {
  return <div className="empty-state"><span className="empty-icon"><FileSearch size={30} strokeWidth={1.4} aria-hidden="true" /></span><h2>{title}</h2><p>{description}</p>{href && <Link className="button button-primary" href={href}>{linkLabel ?? "案件を探す"}</Link>}</div>;
}

export function DataUnavailable() {
  return <div className="data-unavailable" role="alert"><Database size={26} strokeWidth={1.5} aria-hidden="true" /><h2>案件データを読み込めませんでした</h2><p>現在、保存先に接続できません。時間をおいて、もう一度お試しください。</p><a className="button button-primary" href=""><RefreshCw size={16} aria-hidden="true" />再読み込み</a></div>;
}

export function BackToSearch() { return <Link className="back-link" href="/"><ArrowLeft size={16} aria-hidden="true" />案件一覧へ戻る</Link>; }
