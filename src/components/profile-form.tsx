"use client";

import { useState } from "react";
import { Check, CheckCheck, LockKeyhole, Save, Sparkles } from "lucide-react";
import { Profile, SKILL_OPTIONS } from "@/lib/domain";
import { saveProfile, useBrowserData } from "./browser-store";

export function ProfileForm() {
  const stored = useBrowserData();
  const [draft, setDraft] = useState<Profile | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const profile = draft ?? stored.profile;
  function update(change: Partial<Profile>) { setDraft({ ...profile, ...change }); setStatus("idle"); }
  return <div className="profile-layout"><form className="profile-form" onSubmit={(event) => { event.preventDefault(); setStatus(saveProfile(profile) ? "saved" : "error"); }}>
    <section className="paper-section"><div className="section-title"><span className="section-number">01</span><div><h2>対応できるスキル</h2><p>案件に含まれる言葉との関連を確認できます。複数選択できます。</p></div><span className="selection-count">{profile.skills.length}件選択</span></div><div className="skill-grid" role="group" aria-label="対応できるスキル">{SKILL_OPTIONS.map((skill) => {
      const selected = profile.skills.includes(skill);
      return <button key={skill} type="button" aria-pressed={selected} className={`skill-option ${selected ? "selected" : ""}`} onClick={() => update({ skills: selected ? profile.skills.filter((value) => value !== skill) : [...profile.skills, skill] })}><span className="skill-check">{selected && <Check size={12} strokeWidth={2.5} aria-hidden="true" />}</span>{skill}</button>;
    })}</div></section>
    <section className="paper-section"><div className="section-title"><span className="section-number">02</span><div><h2><label htmlFor="qualification">資格・登録のメモ</label></h2><p>取得済みの資格や、登録している入札参加資格を記録しましょう。</p></div></div><textarea id="qualification" value={profile.qualification} onChange={(event) => update({ qualification: event.target.value })} maxLength={4000} rows={4} placeholder="例：全省庁統一資格の区分・等級・有効期間など" /><p className="field-note">自己申告のメモです。案件ごとの資格要件との自動照合は行いません。</p></section>
    <section className="paper-section"><div className="section-title"><span className="section-number">03</span><div><h2><label htmlFor="work-notes">仕事探しの条件メモ</label></h2><p>対応エリアや得意な仕事、確認したい条件を自由に。</p></div></div><textarea id="work-notes" value={profile.notes} onChange={(event) => update({ notes: event.target.value })} maxLength={4000} rows={4} placeholder="例：Webサイトの改修を中心に探したい。現地作業の有無を確認する。" /></section>
    <div className="profile-save-bar"><p className={status === "error" ? "form-error" : "save-status"} aria-live="polite">{status === "saved" ? <><CheckCheck size={17} aria-hidden="true" />このブラウザーに保存しました</> : status === "error" ? "保存できませんでした。ブラウザーの保存設定をご確認ください。" : <><LockKeyhole size={14} aria-hidden="true" />このブラウザーだけに保存されます</>}</p><button className="button button-primary" type="submit"><Save size={17} aria-hidden="true" />条件を保存</button></div>
  </form><aside className="profile-aside"><div className="guide-card"><span className="guide-icon"><Sparkles size={21} strokeWidth={1.5} aria-hidden="true" /></span><h2>探す前の、小さな準備。</h2><p>スキルを登録すると、検索結果と案件詳細に、関連する言葉が表示されます。</p><div className="guide-example"><span>案件内の関連キーワード</span><div><span className="keyword-tag">Web制作</span><span className="keyword-tag">CMS</span></div><small>表示例・案件データではありません</small></div><p className="guide-note">関連する言葉の一致は、参加資格や受注の可能性を保証するものではありません。</p></div><div className="privacy-note"><LockKeyhole size={18} aria-hidden="true" /><div><strong>自分のためのメモ</strong><p>条件と保存した案件は端末内に保存します。アカウント登録は不要です。ブラウザーのデータを削除すると消えます。</p></div></div></aside></div>;
}
