import { describe, expect, it } from "vitest";
import { API_COUNT, buildApiUrl, collectionPlan, parseApiXml } from "./kkj";

const example = `<Results><Version>1.0</Version><SearchResults><SearchHits>12</SearchHits><SearchResult>
  <Key><![CDATA[dGVzdC1rZXk=]]></Key><ProjectName>Webサイト改修 &amp; 保守</ProjectName>
  <ExternalDocumentURI><![CDATA[https://example.go.jp/notice.pdf]]></ExternalDocumentURI>
  <OrganizationName>試験機関</OrganizationName><Date>2026-10-15T19:05:50+09:00</Date>
  <CftIssueDate>2026-10-15T00:00:00+09:00</CftIssueDate>
  <TenderSubmissionDeadline>2026-11-02T10:00:00+09:00</TenderSubmissionDeadline>
  <ProjectDescription><![CDATA[<p>ホームページの改修を行う。</p><script>alert(1)</script>]]></ProjectDescription>
  <Attachments><Attachment><Name>仕様書</Name><Uri>https://example.go.jp/spec.pdf</Uri></Attachment>
  <Attachment><Name>不正リンク</Name><Uri>javascript:alert(1)</Uri></Attachment></Attachments>
</SearchResult></SearchResults></Results>`;

describe("official API normalization", () => {
  it("keeps source timestamps, stable identifiers, safe attachments, and distinct tender start semantics", () => {
    const result = parseApiXml(example, "2026-10-17T00:00:00.000Z");
    expect(result).toMatchObject({ hits: 12, returned: 1, skipped: 0 });
    const notice = result.notices[0];
    expect(notice.id).toMatch(/^[a-f0-9]{32}$/);
    expect(parseApiXml(example).notices[0].id).toBe(notice.id);
    expect(notice.apiRetrievedAt).toBe("2026-10-15T10:05:50.000Z");
    expect(notice.firstCollectedAt).toBe("2026-10-17T00:00:00.000Z");
    expect(notice.tenderStartAt).toBe("2026-11-02T01:00:00.000Z");
    expect(notice.evidence.some(item => item.kind === "deadline")).toBe(false);
    expect(notice.attachments).toEqual([{ name: "仕様書", url: "https://example.go.jp/spec.pdf" }]);
    expect(notice.title).toBe("Webサイト改修 & 保守");
    expect(notice.description).toBe("ホームページの改修を行う。");
    expect(notice.categories).toContain("web");
    expect(notice.qualification).toBeNull();
  });
  it("rejects external entities, malformed XML, and API errors", () => {
    expect(() => parseApiXml('<!DOCTYPE Results [<!ENTITY x SYSTEM "file:///etc/passwd">]><Results/>')).toThrow();
    expect(() => parseApiXml("<Results><SearchResults></Results>")).toThrow();
    expect(() => parseApiXml("<Results><Error>internal error</Error></Results>")).toThrow();
    expect(() => parseApiXml("<Results><SearchResults><SearchHits>bad</SearchHits></SearchResults></Results>")).toThrow();
  });
  it("accepts an empty result without inventing notices and drops entries lacking source keys", () => {
    expect(parseApiXml("<Results><SearchResults><SearchHits>0</SearchHits></SearchResults></Results>").notices).toEqual([]);
    const result = parseApiXml(example.replace("<Key><![CDATA[dGVzdC1rZXk=]]></Key>", ""));
    expect(result.notices).toEqual([]);
    expect(result.skipped).toBe(1);
  });
});

describe("bounded collection plans", () => {
  it("requires an actual API search field and fixes Count to 300", () => {
    const range = { label: "試験", from: "2026-10-01", to: "2026-10-17" };
    expect(() => buildApiUrl(range)).toThrow();
    expect(() => buildApiUrl({ ...range, prefectureCodes: "48" })).toThrow();
    expect(() => buildApiUrl({ ...range, projectName: "システム", from: "2026-11-01" })).toThrow();
    const url = buildApiUrl({ ...range, projectName: "システム OR API" });
    expect(url.hostname).toBe("www.kkj.go.jp");
    expect(url.searchParams.get("Count")).toBe(String(API_COUNT));
    expect(url.searchParams.get("Project_Name")).toBe("システム OR API");
    expect(url.searchParams.has("Tender_Submission_Deadline")).toBe(false);
  });
  it("limits daily requests to six and rotates general-category collection across all 47 prefectures", () => {
    const codes = new Set<string>();
    for (let day = 0; day < 4; day++) {
      const plans = collectionPlan(new Date(Date.UTC(2026, 9, 17 + day)));
      expect(plans).toHaveLength(6);
      expect(plans.filter(plan => plan.projectName)).toHaveLength(5);
      for (const plan of plans) {
        expect(() => buildApiUrl(plan)).not.toThrow();
        plan.prefectureCodes?.split(",").forEach(code => codes.add(code));
      }
    }
    expect(codes.size).toBe(47);
    expect(collectionPlan(new Date("2026-10-16T15:01:00Z"))[0].to).toBe("2026-10-17");
  });
});
