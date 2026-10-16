"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowUpRight, Bookmark, CircleHelp, Landmark, Search, SlidersHorizontal } from "lucide-react";
import { SOURCE_URL } from "@/lib/domain";
import { useBrowserData } from "./browser-store";

const navigation = [
  { href: "/", label: "案件を探す", icon: Search },
  { href: "/saved", label: "保存した案件", icon: Bookmark },
  { href: "/profile", label: "自分の条件", icon: SlidersHorizontal },
  { href: "/coverage", label: "収集状況", icon: Activity }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { savedIds } = useBrowserData();
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">本文へ移動</a>
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="官公庁案件検索 トップ">
        <span className="brand-mark"><Landmark size={23} strokeWidth={1.6} aria-hidden="true" /></span>
        <span><strong>官公庁案件検索</strong><small>PUBLIC PROCUREMENT</small></span>
      </Link>
      <div className="sidebar-label">ワークスペース</div>
      <nav aria-label="メインナビゲーション" className="main-navigation">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" || pathname.startsWith("/notices/") : pathname === href;
          return <Link key={href} href={href} className={`nav-item ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
            <Icon size={19} strokeWidth={1.7} aria-hidden="true" /><span>{label}</span>
            {href === "/saved" && savedIds.length > 0 && <span className="nav-count">{savedIds.length}</span>}
          </Link>;
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="source-card"><span className="source-card-label"><span className="status-dot" />公式APIを利用</span><p>中小企業庁<br />官公需情報ポータル</p><a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">データ提供元を見る<ArrowUpRight size={14} aria-hidden="true" /></a></div>
        <Link className="sidebar-help" href="/coverage"><CircleHelp size={16} aria-hidden="true" /><span>収集範囲について</span></Link>
        <p className="sidebar-note">全国のすべての案件を<br />網羅するものではありません。</p>
      </div>
    </aside>
    <div className="workspace">
      <header className="workspace-toolbar"><span className="toolbar-title">小さな事業の、次の機会へ。</span><span className="toolbar-source"><span className="status-dot" />公式データをもとに掲載</span></header>
      <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      <footer className="workspace-footer"><span>官公庁案件検索</span><p>出典：<a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">官公需情報ポータルサイト</a> 検索API　｜　最終的な内容・参加条件は公式公告でご確認ください。</p></footer>
    </div>
  </div>;
}
