"use client";

import { useEffect, useState } from "react";
import { Bookmark, Info, RefreshCw } from "lucide-react";
import { NoticeSummary } from "@/lib/domain";
import { useBrowserData } from "./browser-store";
import { NoticeList } from "./notice-list";
import { EmptyState } from "./ui";

export function SavedNotices() {
  const { savedIds } = useBrowserData();
  const key = savedIds.join(",");
  const [result, setResult] = useState<{ key: string; notices: NoticeSummary[]; error: boolean }>({ key: "", notices: [], error: false });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/notices?ids=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("read_failed"); return response.json(); })
      .then((body) => { if (!Array.isArray(body.notices)) throw new Error("invalid_response"); setResult({ key, notices: body.notices, error: false }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ key, notices: [], error: true }); });
    return () => controller.abort();
  }, [key, retry]);
  const ready = result.key === key;
  const notices = result.notices.filter((notice) => savedIds.includes(notice.id));
  return <>
    <div className="saved-info"><Bookmark size={18} strokeWidth={1.6} aria-hidden="true" /><p>気になった案件を、あとでもう一度。保存内容はこのブラウザーだけで利用できます。</p><strong>{savedIds.length}<small>件保存</small></strong></div>
    {!savedIds.length ? <div className="paper-section"><EmptyState title="気になる案件を保存しましょう" description="案件のしおりマークを押すと、ここに一覧で表示されます。原典の確認や比較にお役立てください。" href="/" /></div> : !ready ? <div className="loading-panel" role="status"><span className="loading-spinner" />保存した案件を読み込んでいます…</div> : result.error ? <div className="data-unavailable" role="alert"><h2>保存した案件を取得できませんでした</h2><p>保存した案件のIDはこのブラウザーに残っています。</p><button className="button button-primary" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={16} aria-hidden="true" />もう一度読み込む</button></div> : <><NoticeList notices={notices} />{notices.length < savedIds.length && <p className="scope-note"><Info size={16} aria-hidden="true" />保存した案件のうち{savedIds.length - notices.length}件は現在取得できません。保存したIDは保持しています。</p>}</>}
  </>;
}
