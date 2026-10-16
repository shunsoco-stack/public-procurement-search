import { describe, expect, it } from "vitest";
import { analyzeNotice, classifyNotice, cleanText, extractEvidence, getRelatedSkills, safeUrl } from "./analysis";
import type { NoticeSummary } from "./domain";

describe("untrusted announcement data", () => {
  it("only allows ordinary http(s) links without embedded credentials", () => {
    for (const input of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "/relative", "https://user:password@example.org"]) expect(safeUrl(input)).toBeNull();
    expect(safeUrl(" https://www.kkj.go.jp/s/ ")).toBe("https://www.kkj.go.jp/s/");
  });
  it("removes executable markup and control characters while preserving readable paragraphs", () => {
    expect(cleanText('<p>件名</p><script>alert(1)</script><div>ＣＳＶ　加工\u0000</div>')).toBe("件名\n\nCSV 加工");
  });
});

describe("classification", () => {
  it("allows multiple relevant categories", () => {
    expect(classifyNotice("生成AIによるウェブサイト構築業務", "").categories).toEqual(["web", "ai"]);
  });
  it("does not classify a cleaning job as automation merely because a form uses Excel", () => {
    const result = classifyNotice("庁舎清掃業務", "申請書はExcel形式。CSV形式による実績一覧を提出。");
    expect(result.categories).toEqual(["other"]);
    expect(classifyNotice("ため池耐震診断業務委託(PDFファイル:154.9KB)", "公告書をPDFで公開します。").categories).toEqual(["other"]);
    expect(classifyNotice("PDFデータの変換・抽出業務委託", "").categories).toEqual(["automation"]);
  });
  it("treats unrelated ASCII words as words, not an AI service", () => {
    expect(classifyNotice("MAIL SERVERの賃貸借", "").categories).toEqual(["other"]);
    expect(classifyNotice("医療用PCRテストキットの購入", "").categories).toEqual(["other"]);
  });
});

describe("evidence candidates", () => {
  it("does not turn opening dates, API tender-start dates or delivery dates into application deadlines", () => {
    expect(extractEvidence("入札開始日 令和8年10月20日。開札日 令和8年10月21日。納入期限 令和9年3月31日。").filter(x => x.kind === "deadline")).toHaveLength(0);
    expect(extractEvidence("参加申込期限は別紙を参照。開札日 2026年10月20日。")[0].date).toBeNull();
    expect(extractEvidence("提出期限 別紙参照 開札日 2026年10月20日")[0].date).toBeNull();
    expect(extractEvidence("質問書の提出期限 2026年10月20日").filter(x => x.kind === "deadline")).toHaveLength(0);
  });
  it("only attaches an ISO date when a single explicit valid year/date follows a deadline label", () => {
    expect(extractEvidence("参加申込期限 令和8年10月20日 17時")[0].date).toBe("2026-10-20");
    expect(extractEvidence("提出期限 10月20日")[0].date).toBeNull();
    expect(extractEvidence("提出期限 令和8年2月30日")[0].date).toBeNull();
    expect(extractEvidence("参加申込期間 2026年10月1日から2026年10月20日")[0].date).toBeNull();
  });
  it("keeps alternative certification conditions and negations in their source excerpt", () => {
    const source = "プライバシーマークやISMS認証の取得、または自社で個人情報保護方針を公表する等の管理体制。リモート作業は認めない。";
    const result = extractEvidence(source);
    expect(result.find(x => x.kind === "qualification")?.text).toContain("または自社");
    expect(result.find(x => x.kind === "workplace")?.text).toContain("認めない");
    expect(result.every(x => x.date === null)).toBe(true);
  });
  it("missing conditions remain unknown and a waived briefing never means remote work", () => {
    expect(extractEvidence("現場説明会は実施しない。")).toEqual([]);
    expect(analyzeNotice({ title: "保守業務", description: "" }).evidence).toEqual([]);
  });
  it("does not confuse deposits and past contracts with a budget", () => {
    expect(extractEvidence("入札保証金100万円。前年度契約額500万円。").filter(x => x.kind === "budget")).toEqual([]);
  });
});

it("relates self-reported skills without producing an eligibility score", () => {
  const notice = { title: "ホームページ更新", matchedKeywords: ["CMS"], excerpt: "WordPressを利用" } as NoticeSummary;
  expect(getRelatedSkills(notice, ["Web制作", "WordPress", "RPA"])).toEqual(["Web制作", "WordPress"]);
});
