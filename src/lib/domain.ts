export const CATEGORIES = [
  { id: "it", label: "IT・システム", description: "開発・改修・保守・テスト" },
  { id: "web", label: "Web制作", description: "サイト制作・CMS・更新" },
  { id: "automation", label: "業務効率化", description: "Excel・データ加工・RPA" },
  { id: "ai", label: "AI関連", description: "生成AI・分析・導入支援" },
  { id: "other", label: "その他", description: "そのほかの公的な調達" }
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type EvidenceKind = "deadline" | "qualification" | "budget" | "workplace";
export interface Evidence { kind: EvidenceKind; label: string; text: string; date: string | null }
export interface Attachment { name: string; url: string }
export interface Notice {
  id: string; sourceKey: string; title: string; organization: string;
  prefecture: string | null; city: string | null; sourceUrl: string | null;
  apiRetrievedAt: string | null; publishedAt: string | null;
  firstCollectedAt: string; lastCollectedAt: string; description: string;
  attachments: Attachment[]; procurementType: string | null;
  procurementCategory: string | null; qualification: string | null;
  location: string | null; tenderStartAt: string | null;
  openingAt: string | null; deliveryAt: string | null;
  categories: CategoryId[]; matchedKeywords: string[]; evidence: Evidence[];
}
export type NoticeSummary = Omit<Notice, "description" | "sourceKey"> & { excerpt: string };
export interface SearchFilters {
  q: string; category: CategoryId | "all"; prefecture: string;
  sort: "newest" | "oldest"; documentsOnly: boolean; page: number;
}
export interface SyncRun {
  id: string; startedAt: string; finishedAt: string | null;
  status: "running" | "success" | "partial" | "failed";
  fetched: number; saved: number; requestCount: number;
  truncated: boolean; errors: string[];
  queries: { label: string; query: string; hits: number; returned: number; from: string; to: string }[];
}
export interface CollectionStats {
  total: number; withDocuments: number; organizations: number;
  categories: Record<CategoryId, number>; prefectures: string[];
  latestRun: SyncRun | null; latestSuccessfulRun: SyncRun | null;
}
export interface SearchResult { notices: NoticeSummary[]; total: number; page: number; pageSize: number; filters: SearchFilters; stats: CollectionStats }
export interface Profile { skills: string[]; qualification: string; notes: string }
export const SKILL_OPTIONS = ["Web制作", "WordPress", "CMS", "アクセシビリティ", "システム開発", "API", "テスト", "Excel", "CSV", "PDF", "データ移行", "RPA", "生成AI", "チャットボット", "データ分析"];
export const PREFECTURES = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];
export const SOURCE_URL = "https://www.kkj.go.jp/s/";
export const SITE_URL = "https://public-procurement-search.vercel.app";
