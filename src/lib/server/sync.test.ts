import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notice } from "../domain";

const mocks = vi.hoisted(() => ({ query: vi.fn(), saveNotices: vi.fn(), saveSyncRun: vi.fn(), fetchApi: vi.fn() }));
vi.mock("./db", () => ({ getPool: () => ({ query: mocks.query }) }));
vi.mock("./data", () => ({ saveNotices: mocks.saveNotices, saveSyncRun: mocks.saveSyncRun }));
vi.mock("node:timers/promises", () => ({ setTimeout: () => Promise.resolve() }));
vi.mock("./kkj", () => ({
  collectionPlan: () => [
    { label: "テーマ", projectName: "システム", from: "2026-10-01", to: "2026-10-17" },
    { label: "地域", prefectureCodes: "13", from: "2026-10-01", to: "2026-10-17" },
  ],
  buildApiUrl: () => new URL("https://www.kkj.go.jp/api/?Count=300"),
  fetchApi: mocks.fetchApi,
}));
import { syncData, SyncInProgressError } from "./sync";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue({ rowCount: 1, rows: [] });
  mocks.saveNotices.mockResolvedValue(1);
  mocks.saveSyncRun.mockResolvedValue(undefined);
});

describe("collection safety and completeness", () => {
  it("does not make API requests when another run holds the database lease", async () => {
    mocks.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(syncData()).rejects.toBeInstanceOf(SyncInProgressError);
    expect(mocks.fetchApi).not.toHaveBeenCalled();
    expect(mocks.saveNotices).not.toHaveBeenCalled();
  });
  it("keeps stored records untouched after upstream failures and releases its lease", async () => {
    mocks.fetchApi.mockRejectedValue(new Error("private-upstream-error"));
    const result = await syncData();
    expect(result.status).toBe("failed");
    expect(result.saved).toBe(0);
    expect(result.requestCount).toBe(2);
    expect(result.errors).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain("private-upstream-error");
    expect(mocks.saveNotices).not.toHaveBeenCalled();
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).startsWith("DELETE FROM sync_leases"))).toBe(true);
    expect(mocks.query.mock.calls.some(([sql]) => /DELETE FROM notices|TRUNCATE/i.test(String(sql)))).toBe(false);
  });
  it("reports capped results as partial and counts unique stored identifiers across themes", async () => {
    const notice = { id: "a".repeat(32) } as Notice;
    mocks.fetchApi.mockResolvedValue({ hits: 500, returned: 1, skipped: 0, notices: [notice] });
    const result = await syncData();
    expect(result).toMatchObject({ status: "partial", saved: 1, fetched: 2, requestCount: 2, truncated: true });
    expect(result.queries).toHaveLength(2);
    expect(mocks.saveNotices).toHaveBeenCalledTimes(2);
    expect(result.finishedAt).not.toBeNull();
  });
});
