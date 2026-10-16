import { createHash } from "node:crypto";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { analyzeNotice, cleanText, safeUrl } from "../analysis";
import type { Notice } from "../domain";

export const API_URL = "https://www.kkj.go.jp/api/";
export const API_COUNT = 300;
export const MAX_XML_BYTES = 25 * 1024 * 1024;
export interface CollectionQuery {
  label: string;
  projectName?: string;
  query?: string;
  prefectureCodes?: string;
  from: string;
  to: string;
}
export interface ApiResult { notices: Notice[]; hits: number; returned: number; skipped: number }
type XmlRecord = Record<string, unknown>;

function record(value: unknown): XmlRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as XmlRecord : {};
}
function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
function optionalText(value: unknown): string | null {
  return cleanText(text(value)) || null;
}
function timestamp(value: unknown): string | null {
  const candidate = text(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(candidate)) return null;
  return Number.isNaN(Date.parse(candidate)) ? null : new Date(candidate).toISOString();
}

export function buildApiUrl(input: CollectionQuery): URL {
  if (!input.projectName?.trim() && !input.query?.trim() && !input.prefectureCodes?.trim()) {
    throw new Error("収集条件がありません。");
  }
  if (![input.from, input.to].every(value => /^\d{4}-\d{2}-\d{2}$/.test(value)) || input.from > input.to) {
    throw new Error("収集期間が不正です。");
  }
  if (input.prefectureCodes && !/^(?:0[1-9]|[1-3]\d|4[0-7])(?:,(?:0[1-9]|[1-3]\d|4[0-7]))*$/.test(input.prefectureCodes)) {
    throw new Error("都道府県コードが不正です。");
  }
  const url = new URL(API_URL);
  if (input.projectName?.trim()) url.searchParams.set("Project_Name", input.projectName.trim());
  if (input.query?.trim()) url.searchParams.set("Query", input.query.trim());
  if (input.prefectureCodes) url.searchParams.set("LG_Code", input.prefectureCodes);
  url.searchParams.set("Count", String(API_COUNT));
  url.searchParams.set("CFT_Issue_Date", `${input.from}/${input.to}`);
  return url;
}

export function parseApiXml(xml: string, collectedAt = new Date().toISOString()): ApiResult {
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_BYTES || /<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) {
    throw new Error("安全に読み取れないAPI応答です。");
  }
  if (XMLValidator.validate(xml) !== true) throw new Error("APIのXML形式が不正です。");
  const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: false, processEntities: true });
  const root = record(record(parser.parse(xml)).Results);
  if (!Object.keys(root).length) throw new Error("APIの応答形式が不正です。");
  if (root.Error !== undefined) throw new Error("公式APIが検索を完了できませんでした。");
  const results = record(root.SearchResults);
  const hitsText = text(results.SearchHits).trim();
  if (!/^\d+$/.test(hitsText)) throw new Error("APIの件数が不正です。");
  const hits = Number(hitsText);
  const entries = results.SearchResult === undefined ? [] : Array.isArray(results.SearchResult) ? results.SearchResult : [results.SearchResult];
  if (entries.length > API_COUNT) throw new Error("APIの返却上限を超えています。");
  const notices: Notice[] = [];
  for (const entry of entries) {
    const raw = record(entry);
    const sourceKey = text(raw.Key).trim();
    const title = cleanText(text(raw.ProjectName));
    if (!sourceKey || !title || sourceKey.length > 2048) continue;
    const attachmentValue = record(raw.Attachments).Attachment;
    const attachmentList = attachmentValue === undefined ? [] : Array.isArray(attachmentValue) ? attachmentValue : [attachmentValue];
    const attachments = attachmentList.map(item => {
      const attachment = record(item);
      const url = safeUrl(text(attachment.Uri));
      return url ? { name: cleanText(text(attachment.Name)) || "添付資料", url } : null;
    }).filter((item): item is { name: string; url: string } => item !== null);
    const description = cleanText(text(raw.ProjectDescription));
    const qualification = optionalText(raw.Certification);
    const location = optionalText(raw.Location);
    const analysis = analyzeNotice({ title, description, qualification, location });
    notices.push({
      id: createHash("sha256").update(sourceKey).digest("hex").slice(0, 32), sourceKey,
      title, organization: cleanText(text(raw.OrganizationName)) || "機関名の記載なし",
      prefecture: optionalText(raw.PrefectureName), city: optionalText(raw.CityName),
      sourceUrl: safeUrl(text(raw.ExternalDocumentURI)),
      apiRetrievedAt: timestamp(raw.Date), publishedAt: timestamp(raw.CftIssueDate),
      firstCollectedAt: collectedAt, lastCollectedAt: collectedAt, description, attachments,
      procurementType: optionalText(raw.ProcedureType), procurementCategory: optionalText(raw.Category),
      qualification, location,
      // The official specification calls this field the tender START date. Never use as an application deadline.
      tenderStartAt: timestamp(raw.TenderSubmissionDeadline),
      openingAt: timestamp(raw.OpeningTendersEvent), deliveryAt: timestamp(raw.PeriodEndTime),
      ...analysis,
    });
  }
  return { notices, hits, returned: entries.length, skipped: entries.length - notices.length };
}

export async function fetchApi(input: CollectionQuery): Promise<ApiResult> {
  const response = await fetch(buildApiUrl(input), {
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000),
    headers: { Accept: "application/xml, text/xml", "User-Agent": "PublicProcurementSearch/1.0 (+https://public-procurement-search.vercel.app/coverage)" },
  });
  if (!response.ok) throw new Error("公式APIから取得できませんでした。");
  if (Number(response.headers.get("content-length")) > MAX_XML_BYTES) throw new Error("API応答が上限を超えています。");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("API応答が空です。");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_XML_BYTES) throw new Error("API応答が上限を超えています。");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => undefined); }
  return parseApiXml(Buffer.concat(chunks).toString("utf8"));
}

export function collectionPlan(now = new Date()): CollectionQuery[] {
  const jstDay = Math.floor((now.getTime() + 9 * 60 * 60 * 1000) / 86_400_000);
  const day = (offset: number) => new Date((jstDay - offset) * 86_400_000).toISOString().slice(0, 10);
  const to = day(0);
  const themes = [
    ["IT・システム", "システム OR プログラム OR API"],
    ["Web制作", "ホームページ OR ウェブサイト OR Webサイト OR WordPress OR CMS OR アクセシビリティ"],
    ["業務効率化", "Excel OR エクセル OR CSV OR データ移行 OR データクレンジング OR RPA OR 自動化"],
    ["AI関連", "AI OR 人工知能 OR 生成AI OR チャットボット OR データ分析"],
    ["開発・テスト等", "ソフトウェア OR アプリケーション OR 動作検証 OR PDF処理 OR テスト"],
  ];
  const plans: CollectionQuery[] = themes.map(([label, projectName]) => ({ label, projectName, from: day(30), to }));
  // A rotating group collects every business category, including work outside the five themes.
  // 14 prefectures per day means every prefecture is visited within four daily runs.
  const codes = Array.from({ length: 14 }, (_, index) => String(((jstDay * 14 + index) % 47) + 1).padStart(2, "0"));
  plans.push({ label: `地域収集 ${codes.join("・")}`, prefectureCodes: codes.join(","), from: day(14), to });
  return plans;
}
