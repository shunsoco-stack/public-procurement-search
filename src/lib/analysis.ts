import type { CategoryId, Evidence, EvidenceKind, Notice, NoticeSummary } from "./domain";

/** API/announcement strings are untrusted. Return text only; React still escapes it. */
export function cleanText(value: unknown): string {
  if (value == null) return "";
  return String(value).normalize("NFKC")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<\/?(?:p|div|br|li|tr|h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|#160);/gi, " ").replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 4000) return null;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

type Rule = { category: CategoryId; terms: [string, RegExp][]; body: RegExp };
const RULES: Rule[] = [
  { category: "it", terms: [
    ["システム", /システム/], ["プログラム", /プログラム/], ["ソフトウェア", /ソフトウェア/],
    ["API", /(?<![a-z])API(?![a-z])/i], ["テスト", /(?:システムテスト|ソフトウェアテスト|単体テスト|結合テスト|総合テスト|受入テスト|動作検証|ソフトウェア検証)/],
    ["アプリ", /(?:アプリケーション|アプリ(?:開発|構築|改修))/]
  ], body: /(?:システム|プログラム|ソフトウェア).{0,16}(?:開発|改修|保守|動作検証|テスト)/ },
  { category: "web", terms: [
    ["Web制作", /(?:ホームページ|ウェブサイト|Webサイト|ウェブページ|Webページ|LP制作)/i],
    ["WordPress", /word\s*press/i], ["CMS", /(?<![a-z])CMS(?![a-z])/i],
    ["アクセシビリティ", /アクセシビリティ/]
  ], body: /(?:ホームページ|ウェブサイト|Webサイト|CMS|WordPress).{0,18}(?:構築|制作|改修|更新|保守)/i },
  { category: "automation", terms: [
    ["Excel", /excel|エクセル/i], ["CSV", /(?<![a-z])CSV(?![a-z])/i],
    ["PDF", /(?<![a-z])PDF(?![a-z])/i], ["RPA", /(?<![a-z])RPA(?![a-z])/i],
    ["データ加工", /データ(?:クレンジング|整形|加工|移行|入力)/],
    ["業務自動化", /(?:業務自動化|業務効率化|自動化ツール)/]
  ], body: /(?:Excel|CSV|RPA|データ(?:移行|加工|クレンジング)|PDF処理).{0,15}(?:開発|導入|構築|整形|加工|自動化)/i },
  { category: "ai", terms: [
    ["生成AI", /生成\s*AI/i], ["AI", /(?<![a-z])AI(?![a-z])|人工知能/i],
    ["チャットボット", /チャットボット/], ["データ分析", /データ分析|文書分類|機械学習/]
  ], body: /(?:生成AI|人工知能|チャットボット|データ分析|機械学習).{0,18}(?:導入|構築|活用|支援|開発)/i }
];
const UNRELATED_TITLE = /(?:清掃|警備|植栽|除草|橋梁|舗装|道路工事|改修工事|空調設備|給食|医薬品|賃貸借|物品購入)/;

export function classifyNotice(title: string, description: string): { categories: CategoryId[]; matchedKeywords: string[] } {
  const heading = cleanText(title);
  const body = cleanText(description);
  const categories: CategoryId[] = [];
  const matchedKeywords = new Set<string>();
  for (const rule of RULES) {
    const titleMatches = rule.terms.filter(([, re]) => re.test(heading));
    const relevantBody = !UNRELATED_TITLE.test(heading) && rule.body.test(body);
    if (titleMatches.length || relevantBody) {
      categories.push(rule.category);
      const keywords = titleMatches.length ? titleMatches : rule.terms.filter(([, re]) => re.test(body));
      keywords.forEach(([term]) => matchedKeywords.add(term));
    }
  }
  return { categories: categories.length ? categories : ["other"], matchedKeywords: [...matchedKeywords] };
}

function explicitDate(text: string): string | null {
  const dates = [...text.matchAll(/(?:(20\d{2})[年/.-]|令和(元|\d{1,2})年)\s*(\d{1,2})[月/.-]\s*(\d{1,2})日?/g)];
  if (dates.length !== 1) return null;
  const match = dates[0];
  const year = match[1] ? Number(match[1]) : 2018 + (match[2] === "元" ? 1 : Number(match[2]));
  const month = Number(match[3]), day = Number(match[4]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/** Conservative excerpts, never a determination that someone may participate. */
export function extractEvidence(description: string, qualification?: string | null, location?: string | null): Evidence[] {
  const body = cleanText(description);
  const definitions: { kind: EvidenceKind; label: string; pattern: RegExp }[] = [
    { kind: "deadline", label: "提出・参加の期限に関する記載", pattern: /(?:参加申込|参加申請|提案書|入札書|見積書|参加表明|応募|企画提案)(?:書|等)?(?:の)?(?:提出|受付)?(?:の)?(?:期限|締切|期間)|(?:提出|受付)(?:期限|締切)/g },
    { kind: "qualification", label: "参加条件に関する記載", pattern: /参加資格|参加条件|全省庁統一資格|競争参加資格|入札参加資格|本店又は支店|本店または支店|業務の実績|ISMS|プライバシーマーク/g },
    { kind: "budget", label: "価格・上限額に関する記載", pattern: /(?:委託|提案|契約)?(?:上限額|上限金額)|予定価格|提案限度額/g },
    { kind: "workplace", label: "作業場所・実施方法に関する記載", pattern: /常駐|現地作業|訪問作業|リモート|テレワーク|オンラインで.{0,15}(?:業務|作業)/g }
  ];
  const results: Evidence[] = [];
  for (const { kind, label, pattern } of definitions) {
    let lastEnd = -1, count = 0;
    for (const match of body.matchAll(pattern)) {
      const index = match.index;
      if (index < lastEnd || count >= 3) continue;
      if (kind === "deadline" && /質問|閲覧|交付|説明会/.test(body.slice(Math.max(0, index - 16), index))) continue;
      const start = Math.max(0, index - 35);
      const end = Math.min(body.length, index + 220);
      const text = body.slice(start, end).trim();
      // Never borrow an opening/delivery/question date from the next sentence or heading.
      const afterLabel = body.slice(index + match[0].length, Math.min(end, index + 150))
        .split(/[。\n;；]|開札|入札開始|納入|質問|仕様書|説明会|公告|履行期間/, 1)[0];
      results.push({ kind, label, text, date: kind === "deadline" ? explicitDate(afterLabel) : null });
      lastEnd = end;
      count++;
    }
  }
  if (qualification?.trim()) results.push({ kind: "qualification", label: "APIの資格欄（制度・年度等は原典で確認）", text: cleanText(qualification), date: null });
  if (location?.trim()) results.push({ kind: "workplace", label: "APIの履行場所欄（作業方法は未確認）", text: cleanText(location), date: null });
  return results;
}

export function analyzeNotice(input: { title: string; description: string; qualification?: string | null; location?: string | null }) {
  return { ...classifyNotice(input.title, input.description), evidence: extractEvidence(input.description, input.qualification, input.location) };
}

export function getRelatedSkills(notice: Notice | NoticeSummary, skills: readonly string[]): string[] {
  const text = `${notice.title}\n${notice.matchedKeywords.join(" ")}\n${"description" in notice ? notice.description : notice.excerpt}`;
  const aliases: Record<string, RegExp> = {
    "Web制作": /ホームページ|ウェブサイト|Webサイト|Web制作/i,
    "システム開発": /システム|プログラム|ソフトウェア/,
    "データ移行": /データ(?:移行|加工)/,
    "生成AI": /生成\s*AI|人工知能|(?<![a-z])AI(?![a-z])/i
  };
  return [...new Set(skills)].filter((skill) => {
    const pattern = aliases[skill];
    return pattern ? pattern.test(text) : text.toLocaleLowerCase("ja").includes(skill.toLocaleLowerCase("ja"));
  });
}
