"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Notice } from "@/lib/domain";
import { getRelatedSkills } from "@/lib/analysis";
import { useBrowserData } from "./browser-store";

export function RelatedSkills({ notice }: { notice: Notice }) {
  const { profile } = useBrowserData();
  const skills = getRelatedSkills(notice, profile.skills);
  return <section className="detail-side-card"><h2><Sparkles size={17} aria-hidden="true" />自分の条件との関連</h2>{profile.skills.length ? <><p>{skills.length ? "登録したスキルに関連する言葉が見つかりました。" : "登録したスキルに関連する言葉は見つかりませんでした。"}</p>{skills.length > 0 && <div className="keyword-list">{skills.map((skill) => <span className="keyword-tag" key={skill}>{skill}</span>)}</div>}<p className="small muted">言葉の関連のみを表示しています。参加資格・業務範囲・受注可能性の判定ではありません。</p></> : <p>対応できるスキルを登録すると、この案件との関連キーワードを確認できます。</p>}<Link href="/profile" className="text-link">自分の条件を編集<ArrowRight size={14} aria-hidden="true" /></Link></section>;
}
