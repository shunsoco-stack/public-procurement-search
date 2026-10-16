"use client";

import { RefreshCw } from "lucide-react";
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <div className="data-unavailable" role="alert"><h1>ページを読み込めませんでした</h1><p>時間をおいて、もう一度お試しください。</p><button className="button button-primary" onClick={() => retry()}><RefreshCw size={16} aria-hidden="true" />もう一度試す</button></div>;
}
