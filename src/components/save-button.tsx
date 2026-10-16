"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toggleSaved, useBrowserData } from "./browser-store";

export function SaveButton({ id, title, full = false }: { id: string; title: string; full?: boolean }) {
  const { savedIds } = useBrowserData();
  const [error, setError] = useState(false);
  const saved = savedIds.includes(id);
  const Icon = saved ? BookmarkCheck : Bookmark;
  return <span className={`save-control ${full ? "save-control-full" : ""}`}><button type="button" className={`${full ? "button button-secondary" : "icon-button"} save-button ${saved ? "is-saved" : ""}`} aria-pressed={saved} aria-label={`${title}を${saved ? "保存から外す" : "保存する"}`} title={saved ? "保存から外す" : "あとで確認するために保存"} onClick={() => setError(!toggleSaved(id))}><Icon size={19} strokeWidth={1.7} aria-hidden="true" />{full && (saved ? "保存済み" : "案件を保存")}</button>{error && <span className="save-error" role="alert">保存できませんでした。ブラウザーの保存設定、または保存上限200件をご確認ください。</span>}</span>;
}
