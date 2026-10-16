"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownWideNarrow, Check, FileText, MapPin, Search, X } from "lucide-react";
import { CATEGORIES, PREFECTURES, CollectionStats, SearchFilters } from "@/lib/domain";

export function searchHref(filters: SearchFilters, changes: Partial<SearchFilters> = {}) {
  const value = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (value.q) params.set("q", value.q);
  if (value.category !== "all") params.set("category", value.category);
  if (value.prefecture) params.set("prefecture", value.prefecture);
  if (value.documentsOnly) params.set("documentsOnly", "1");
  if (value.sort === "oldest") params.set("sort", "oldest");
  if (value.page > 1) params.set("page", String(value.page));
  return params.size ? `/?${params.toString()}` : "/";
}

export function SearchControls({ filters, stats }: { filters: SearchFilters; stats: CollectionStats }) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [current, setCurrent] = useState(filters);
  const [pending, startTransition] = useTransition();
  function apply(changes: Partial<SearchFilters>) {
    const next = { ...current, q: q.trim(), page: 1, ...changes };
    setCurrent(next);
    startTransition(() => router.push(searchHref(next)));
  }
  const filtered = Boolean(current.q || current.category !== "all" || current.prefecture || current.documentsOnly || current.sort !== "newest");
  return <section className="search-panel" aria-label="案件の検索条件" aria-busy={pending}>
    <form className="search-form" onSubmit={(event) => { event.preventDefault(); apply({}); }} role="search">
      <label htmlFor="keyword" className="sr-only">キーワード</label><div className="search-input-wrap"><Search size={21} strokeWidth={1.6} aria-hidden="true" /><input id="keyword" name="q" type="search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="例：Webサイト、システム改修、データ加工" maxLength={160} /><kbd aria-hidden="true">検索</kbd></div><button className="button button-primary search-submit" type="submit" disabled={pending}>{pending ? "検索中…" : "案件を検索"}<Search size={17} aria-hidden="true" /></button>
    </form>
    <div className="category-options" role="group" aria-label="業務分類"><button type="button" className={`category-option ${current.category === "all" ? "selected" : ""}`} aria-pressed={current.category === "all"} onClick={() => apply({ category: "all" })}>すべて<span>{stats.total.toLocaleString("ja-JP")}</span></button>{CATEGORIES.map((category) => <button type="button" key={category.id} className={`category-option ${current.category === category.id ? "selected" : ""}`} aria-pressed={current.category === category.id} onClick={() => apply({ category: category.id })}>{category.label}<span>{stats.categories[category.id].toLocaleString("ja-JP")}</span></button>)}</div>
    <div className="filter-bar"><div className="select-wrap"><MapPin size={15} aria-hidden="true" /><label htmlFor="prefecture" className="sr-only">掲載情報の都道府県</label><select id="prefecture" value={current.prefecture} onChange={(event) => apply({ prefecture: event.target.value })}><option value="">すべての都道府県</option>{PREFECTURES.map((prefecture) => <option key={prefecture} value={prefecture}>{prefecture}</option>)}</select></div><label className={`document-filter ${current.documentsOnly ? "checked" : ""}`}><input type="checkbox" checked={current.documentsOnly} onChange={(event) => apply({ documentsOnly: event.target.checked })} /><span className="checkbox-visual">{current.documentsOnly && <Check size={11} strokeWidth={3} aria-hidden="true" />}</span><FileText size={15} aria-hidden="true" />資料がある案件</label><div className="select-wrap sort-select"><ArrowDownWideNarrow size={15} aria-hidden="true" /><label htmlFor="sort" className="sr-only">並び順</label><select id="sort" value={current.sort} onChange={(event) => apply({ sort: event.target.value === "oldest" ? "oldest" : "newest" })}><option value="newest">新しい順</option><option value="oldest">古い順</option></select></div>{filtered && <button className="filter-reset" type="button" onClick={() => { setQ(""); apply({ q: "", category: "all", prefecture: "", documentsOnly: false, sort: "newest" }); }}><X size={14} aria-hidden="true" />クリア</button>}</div>
    <p className="filter-note">地域は公告の掲載情報です。実際の履行場所や現地作業の有無とは異なる場合があります。</p>
  </section>;
}

