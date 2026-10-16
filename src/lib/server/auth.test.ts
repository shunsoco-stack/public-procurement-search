import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "./auth";

describe("cron authorization", () => {
  const secret = "a-test-secret-with-more-than-16-characters";
  it("requires an explicit long secret and an exact bearer token", () => {
    expect(isCronAuthorized(`Bearer ${secret}`, secret)).toBe(true);
    expect(isCronAuthorized(`Bearer ${secret}a`, secret)).toBe(false);
    expect(isCronAuthorized(`Bearer ${secret.slice(1)}a`, secret)).toBe(false);
    expect(isCronAuthorized(null, secret)).toBe(false);
    expect(isCronAuthorized("Bearer undefined", undefined)).toBe(false);
    expect(isCronAuthorized("Bearer short", "short")).toBe(false);
  });
});
