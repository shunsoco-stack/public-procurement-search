import { describe, expect, it } from "vitest";
import { buildSearchWhere, normalizeFilters } from "./data";

describe("database search input", () => {
  it("bounds offsets and accepts only known filters", () => {
    expect(normalizeFilters({ page: Infinity, category: "invalid" as never, prefecture: "any", sort: "random" as never })).toMatchObject({ page: 1, category: "all", prefecture: "", sort: "newest" });
    expect(normalizeFilters({ page: -3 }).page).toBe(1);
    expect(normalizeFilters({ page: 999999999 }).page).toBe(1000);
    expect(normalizeFilters({ q: "x".repeat(500) }).q).toHaveLength(200);
  });
  it("parameterizes untrusted text and treats SQL wildcard characters as literal search input", () => {
    const filters = normalizeFilters({ q: "x' OR 1=1;-- 100%_\\", category: "web", prefecture: "東京都", documentsOnly: true });
    const built = buildSearchWhere(filters);
    expect(built.sql).not.toContain("1=1");
    expect(built.sql).not.toContain("東京都");
    expect(built.values).toContain("%100\\%\\_\\\\%");
    expect(built.values).toContain("web");
    expect(built.values).toContain("東京都");
    expect(built.sql).toContain("has_documents = true");
  });
});
