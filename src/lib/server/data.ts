import type { QueryResultRow } from "pg";
import { CATEGORIES, PREFECTURES, type CategoryId, type CollectionStats, type Notice, type NoticeSummary, type SearchFilters, type SearchResult, type SyncRun } from "../domain";
import { getPool } from "./db";

export const PAGE_SIZE = 20;
export function normalizeFilters(input: Partial<SearchFilters>): SearchFilters {
  const category = CATEGORIES.some(item => item.id === input.category) ? input.category as CategoryId : "all";
  const page = typeof input.page === "number" && Number.isFinite(input.page) ? Math.min(1000, Math.max(1, Math.floor(input.page))) : 1;
  return {
    q: typeof input.q === "string" ? input.q.trim().slice(0, 200) : "",
    category,
    prefecture: typeof input.prefecture === "string" && PREFECTURES.includes(input.prefecture) ? input.prefecture : "",
    sort: input.sort === "oldest" ? "oldest" : "newest",
    documentsOnly: input.documentsOnly === true,
    page,
  };
}
export function buildSearchWhere(filters: SearchFilters): { sql: string; values: unknown[] } {
  const values: unknown[] = [];
  const clauses: string[] = [];
  const add = (value: unknown) => { values.push(value); return `$${values.length}`; };
  for (const token of filters.q.split(/[\s\u3000]+/).filter(Boolean).slice(0, 8)) {
    const literal = token.replace(/[\\%_]/g, match => `\\${match}`);
    clauses.push(`search_text ILIKE ${add(`%${literal}%`)} ESCAPE '\\'`);
  }
  if (filters.category !== "all") clauses.push(`${add(filters.category)} = ANY(categories)`);
  if (filters.prefecture) clauses.push(`prefecture = ${add(filters.prefecture)}`);
  if (filters.documentsOnly) clauses.push("has_documents = true");
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", values };
}
interface NoticeRow extends QueryResultRow { data: Notice; first_collected_at: Date; last_collected_at: Date }
function hydrateNotice(row: NoticeRow): Notice {
  return { ...row.data, firstCollectedAt: row.first_collected_at.toISOString(), lastCollectedAt: row.last_collected_at.toISOString() };
}
function summary(row: QueryResultRow): NoticeSummary {
  return { ...row.data, excerpt: row.excerpt || "公告本文の記載はありません。", firstCollectedAt: new Date(row.first_collected_at).toISOString(), lastCollectedAt: new Date(row.last_collected_at).toISOString() } as NoticeSummary;
}
const SUMMARY_COLUMNS = "data - 'description' - 'sourceKey' AS data, left(data->>'description', 180) AS excerpt, first_collected_at, last_collected_at";

export async function getStats(): Promise<CollectionStats> {
  const pool = getPool();
  const [aggregated, runs] = await Promise.all([
    pool.query(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE has_documents)::int AS with_documents,
      count(DISTINCT organization)::int AS organizations,
      count(*) FILTER (WHERE 'it' = ANY(categories))::int AS it,
      count(*) FILTER (WHERE 'web' = ANY(categories))::int AS web,
      count(*) FILTER (WHERE 'automation' = ANY(categories))::int AS automation,
      count(*) FILTER (WHERE 'ai' = ANY(categories))::int AS ai,
      count(*) FILTER (WHERE 'other' = ANY(categories))::int AS other,
      coalesce(array_agg(DISTINCT prefecture ORDER BY prefecture) FILTER (WHERE prefecture IS NOT NULL), ARRAY[]::text[]) AS prefectures
      FROM notices`),
    pool.query<{ data: SyncRun }>(`SELECT data FROM sync_runs WHERE id IN (
      (SELECT id FROM sync_runs ORDER BY started_at DESC LIMIT 1),
      (SELECT id FROM sync_runs WHERE status IN ('success', 'partial') ORDER BY started_at DESC LIMIT 1)
    ) ORDER BY started_at DESC`),
  ]);
  const row = aggregated.rows[0];
  return {
    total: row.total, withDocuments: row.with_documents, organizations: row.organizations,
    categories: { it: row.it, web: row.web, automation: row.automation, ai: row.ai, other: row.other },
    prefectures: row.prefectures,
    latestRun: runs.rows[0]?.data ?? null,
    latestSuccessfulRun: runs.rows.find(item => ["success", "partial"].includes(item.data.status))?.data ?? null,
  };
}

export async function getSearchResults(input: Partial<SearchFilters> = {}): Promise<SearchResult> {
  const filters = normalizeFilters(input);
  const where = buildSearchWhere(filters);
  const pool = getPool();
  const count = await pool.query<{ total: number }>(`SELECT count(*)::int AS total FROM notices ${where.sql}`, where.values);
  const total = count.rows[0].total;
  const page = Math.min(filters.page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
  filters.page = page;
  const values = [...where.values, PAGE_SIZE, (page - 1) * PAGE_SIZE];
  const order = filters.sort === "oldest" ? "ASC" : "DESC";
  const [rows, stats] = await Promise.all([
    pool.query(`SELECT ${SUMMARY_COLUMNS} FROM notices ${where.sql}
      ORDER BY published_at ${order} NULLS LAST, id ASC LIMIT $${values.length - 1} OFFSET $${values.length}`, values),
    getStats(),
  ]);
  return { notices: rows.rows.map(summary), total, page, pageSize: PAGE_SIZE, filters, stats };
}

export async function getNotice(id: string): Promise<Notice | null> {
  if (!/^[a-f0-9]{32}$/.test(id)) return null;
  const result = await getPool().query<NoticeRow>("SELECT data, first_collected_at, last_collected_at FROM notices WHERE id = $1", [id]);
  return result.rows[0] ? hydrateNotice(result.rows[0]) : null;
}

export async function getSavedNotices(ids: string[]): Promise<NoticeSummary[]> {
  const validIds = [...new Set(ids.filter(id => /^[a-f0-9]{32}$/.test(id)))].slice(0, 200);
  if (!validIds.length) return [];
  const result = await getPool().query(`SELECT id, ${SUMMARY_COLUMNS} FROM notices WHERE id = ANY($1::text[])`, [validIds]);
  const items = new Map(result.rows.map(row => [String(row.id), summary(row)]));
  return validIds.flatMap(id => items.has(id) ? [items.get(id)!] : []);
}

export async function saveNotices(notices: Notice[]): Promise<number> {
  const unique = [...new Map(notices.map(notice => [notice.id, notice])).values()];
  for (let offset = 0; offset < unique.length; offset += 40) {
    const batch = unique.slice(offset, offset + 40);
    const values: unknown[] = [];
    const rows = batch.map(notice => {
      const data = [notice.id, notice.sourceKey, notice.title, notice.organization, notice.prefecture, notice.categories,
        [notice.title, notice.organization, notice.description, notice.qualification, notice.location].filter(Boolean).join("\n"),
        notice.publishedAt, notice.apiRetrievedAt, notice.firstCollectedAt, notice.lastCollectedAt,
        notice.attachments.length > 0 || notice.sourceUrl?.toLowerCase().endsWith(".pdf") === true, JSON.stringify(notice)];
      const placeholders = data.map(value => { values.push(value); return `$${values.length}`; });
      return `(${placeholders.join(",")})`;
    });
    if (batch.length) await getPool().query(`INSERT INTO notices
      (id, source_key, title, organization, prefecture, categories, search_text, published_at, api_retrieved_at,
       first_collected_at, last_collected_at, has_documents, data)
      VALUES ${rows.join(",")}
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, organization = EXCLUDED.organization,
        prefecture = EXCLUDED.prefecture, categories = EXCLUDED.categories, search_text = EXCLUDED.search_text,
        published_at = EXCLUDED.published_at, api_retrieved_at = EXCLUDED.api_retrieved_at,
        last_collected_at = EXCLUDED.last_collected_at, has_documents = EXCLUDED.has_documents,
        data = EXCLUDED.data || jsonb_build_object('firstCollectedAt', notices.first_collected_at)`, values);
  }
  return unique.length;
}

export async function saveSyncRun(run: SyncRun): Promise<void> {
  await getPool().query(`INSERT INTO sync_runs (id, started_at, finished_at, status, data) VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (id) DO UPDATE SET finished_at = EXCLUDED.finished_at, status = EXCLUDED.status, data = EXCLUDED.data`,
  [run.id, run.startedAt, run.finishedAt, run.status, JSON.stringify(run)]);
}
