import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.argv[2] ?? "http://localhost:3037";
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge", headless: true });
const reports = [];
try {
  for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, colorScheme: scheme, reducedMotion: "reduce" });
    const page = await context.newPage();
    const data = await (await context.request.get(new URL("/api/notices?category=web", base).href)).json();
    assert(data.notices?.length > 0, "Live notices required for accessibility check");
    for (const route of ["/", `/notices/${data.notices[0].id}`, "/profile", "/saved", "/coverage"]) {
      const response = await page.goto(new URL(route, base).href, { waitUntil: "networkidle" });
      assert(response?.ok());
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      reports.push({ scheme, route, violations: result.violations.map(item => ({ id: item.id, impact: item.impact, description: item.description, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) });
    }
    await context.close();
  }
} finally { await browser.close(); }
await mkdir(".cache", { recursive: true });
await writeFile(".cache/accessibility-report.json", JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
assert(reports.every(report => report.violations.length === 0), "Accessibility violations found");
