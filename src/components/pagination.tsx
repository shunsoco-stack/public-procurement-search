import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SearchFilters } from "@/lib/domain";

function pageHref(filters: SearchFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.prefecture) params.set("prefecture", filters.prefecture);
  if (filters.documentsOnly) params.set("documentsOnly", "1");
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  return params.size ? `/?${params}` : "/";
}

export function Pagination({ filters, total, pageSize }: { filters: SearchFilters; total: number; pageSize: number }) {
  const pages = Math.ceil(total / pageSize);
  if (pages < 2) return null;
  const page = filters.page;
  const visible = Array.from(new Set([1, ...Array.from({ length: 5 }, (_, index) => page - 2 + index).filter((n) => n > 1 && n < pages), pages]));
  return <nav className="pagination" aria-label="検索結果のページ"><p>{page.toLocaleString("ja-JP")} / {pages.toLocaleString("ja-JP")} ページ</p><div>{page > 1 ? <Link className="page-button" href={pageHref(filters, page - 1)} aria-label="前のページ"><ChevronLeft size={17} /></Link> : <span className="page-button disabled"><ChevronLeft size={17} aria-hidden="true" /></span>}{visible.map((number, index) => <span className="page-number-wrap" key={number}>{index > 0 && number - visible[index - 1] > 1 && <span className="page-ellipsis">…</span>}<Link className={`page-button ${page === number ? "current" : ""}`} href={pageHref(filters, number)} aria-label={`${number}ページ目`} aria-current={page === number ? "page" : undefined}>{number}</Link></span>)}{page < pages ? <Link className="page-button" href={pageHref(filters, page + 1)} aria-label="次のページ"><ChevronRight size={17} /></Link> : <span className="page-button disabled"><ChevronRight size={17} aria-hidden="true" /></span>}</div></nav>;
}
