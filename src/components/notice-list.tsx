"use client";

import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, FileText, MapPin } from "lucide-react";
import { CATEGORIES, NoticeSummary } from "@/lib/domain";
import { getRelatedSkills } from "@/lib/analysis";
import { useBrowserData } from "./browser-store";
import { dateLabel } from "./format";
import { SaveButton } from "./save-button";

export function NoticeList({ notices }: { notices: NoticeSummary[] }) {
  const { profile } = useBrowserData();
  return <div className="notice-list">{notices.map((notice) => {
    const related = getRelatedSkills(notice, profile.skills);
    const category = CATEGORIES.find((item) => item.id === notice.categories[0]);
    return <article className="notice-row" key={notice.id}>
      <div className="notice-main"><div className="notice-topline"><span className={`category-tag category-${category?.id ?? "other"}`}>{category?.label ?? "その他"}</span><span className="notice-org"><Building2 size={13} aria-hidden="true" />{notice.organization}</span></div>
        <h2><Link href={`/notices/${encodeURIComponent(notice.id)}`}>{notice.title}</Link></h2>
        <p className="notice-excerpt">{notice.excerpt || "本文は案件詳細でご確認ください。"}</p>
        <div className="notice-meta"><span><MapPin size={14} aria-hidden="true" />{notice.prefecture ?? "掲載地域未取得"}{notice.city ? ` ${notice.city}` : ""}</span><span><CalendarDays size={14} aria-hidden="true" />公示日・データ取得日 {dateLabel(notice.publishedAt ?? notice.apiRetrievedAt)}</span>{notice.attachments.length > 0 && <span><FileText size={14} aria-hidden="true" />資料 {notice.attachments.length}件</span>}{related.length > 0 && <span className="related-label">自分のスキルと関連 {related.length}件</span>}</div>
      </div>
      <div className="notice-actions"><SaveButton id={notice.id} title={notice.title} /><Link href={`/notices/${encodeURIComponent(notice.id)}`} className="notice-open" aria-label={`${notice.title}の詳細を見る`}><ArrowRight size={19} strokeWidth={1.5} aria-hidden="true" /></Link></div>
    </article>;
  })}</div>;
}
