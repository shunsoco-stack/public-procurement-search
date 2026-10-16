import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv.find(value => /^https?:\/\//.test(value)) ?? "http://localhost:3037";
const capture = process.argv.includes("--screenshots");
const out = path.resolve("docs/screenshots");
if (capture) await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge", headless: true });
const issues = [];
const tests = [];
function watch(page) {
  page.on("pageerror", error => issues.push(error.message));
  page.on("console", message => { if (message.type() === "error") issues.push(message.text()); });
}
async function shot(page, name) { if (capture) await page.screenshot({ path: path.join(out, name), animations: "disabled" }); }
async function navigate(page, route) {
  const response = await page.goto(new URL(route, base).href, { waitUntil: "networkidle" });
  assert(response?.ok(), `Unexpected status on ${route}: ${response?.status()}`);
}
async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  assert(sizes.scroll <= sizes.width + 1, `Horizontal overflow: ${JSON.stringify(sizes)}`);
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, colorScheme: "light", reducedMotion: "reduce" });
  const page = await context.newPage(); watch(page);
  const health = await context.request.get(new URL("/api/health", base).href);
  assert.equal(health.status(), 200);
  const state = await health.json();
  assert(state.dataCount > 0, "No real collected notices available");
  assert.equal((await context.request.get(new URL("/api/cron/sync", base).href)).status(), 401, "Public users must not trigger collection");
  tests.push("real DB health and unauthorized collection rejection");

  await navigate(page, "/");
  await page.getByRole("heading", { name: "案件を探す", exact: true }).waitFor();
  assert(await page.locator(".notice-row").count() > 0);
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(".skip-link").evaluate(el => el === document.activeElement), true, "Keyboard skip link must be first");
  await noOverflow(page);
  await shot(page, "01-search-desktop.png");

  await page.getByRole("button", { name: /^Web制作/ }).click();
  await page.waitForURL(url => url.searchParams.get("category") === "web");
  await page.locator(".notice-row").first().waitFor();
  const filtered = await context.request.get(new URL("/api/notices?category=web&documentsOnly=1", base).href);
  assert.equal(filtered.status(), 200);
  const webData = await filtered.json();
  assert(webData.notices.length > 0, "No collected web notices with documents");
  assert(webData.notices.every(item => item.categories.includes("web")));
  await page.getByLabel("資料がある案件").check();
  await page.waitForURL(url => url.searchParams.get("documentsOnly") === "1");
  await page.locator(".notice-row").first().waitFor();
  await shot(page, "02-filtered-results.png");
  tests.push("classification and attachment filters with real records");

  const firstLink = page.locator(".notice-row h2 a").first();
  const title = await firstLink.innerText();
  const detailHref = await firstLink.getAttribute("href");
  await firstLink.click();
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
  const source = page.getByRole("link", { name: /^公式公告を確認/ });
  assert(/^https?:\/\//.test(await source.getAttribute("href")));
  await page.getByRole("button", { name: `${title}を保存する`, exact: true }).click();
  await page.getByRole("button", { name: `${title}を保存から外す`, exact: true }).waitFor();
  await noOverflow(page);
  await shot(page, "03-notice-detail.png");
  tests.push("search to actual detail, official source link, bookmark persistence");

  await navigate(page, "/saved");
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
  await navigate(page, "/profile");
  await page.getByRole("button", { name: "Web制作", exact: true }).click();
  await page.getByRole("button", { name: "WordPress", exact: true }).click();
  await page.getByLabel("資格・登録のメモ", { exact: true }).fill("資格の区分・有効期間を原典で照合する");
  await page.getByRole("button", { name: "条件を保存", exact: true }).click();
  await page.getByText("このブラウザーに保存しました", { exact: true }).waitFor();
  await shot(page, "04-profile-matching.png");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.getByRole("button", { name: "Web制作", exact: true }).getAttribute("aria-pressed"), "true");
  await navigate(page, detailHref);
  await page.locator(".detail-side-card").filter({ has: page.getByRole("heading", { name: "自分の条件との関連", exact: true }) }).getByText("Web制作", { exact: true }).waitFor();
  tests.push("local profile save, reload and related skill display");

  await navigate(page, "/?q=zzzz_no_such_notice_87423");
  await page.getByRole("heading", { name: "条件に合う案件がありません", exact: true }).waitFor();
  const missing = await context.request.get(new URL("/notices/00000000000000000000000000000000", base).href);
  // Next.js can send 200 for a streamed notFound response; verify the actual result instead.
  assert([200, 404].includes(missing.status()));
  assert((await missing.text()).includes("この案件は見つかりませんでした"));
  const missingData = await (await context.request.get(new URL("/api/notices?ids=00000000000000000000000000000000", base).href)).json();
  assert.deepEqual(missingData.notices, [], "Unknown IDs must not produce an invented notice");
  tests.push("empty search and missing notice handling");
} finally {
  await browser.close();
}

// Independent contexts also verify privacy isolation and responsive layouts.
const responsiveBrowser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge", headless: true });
try {
  for (const [name, width, height, colorScheme] of [["mobile",390,844,"light"],["tablet",820,1180,"light"],["dark",1440,1000,"dark"]]) {
    const context = await responsiveBrowser.newContext({ viewport: { width, height }, colorScheme, reducedMotion: "reduce", isMobile: name === "mobile", hasTouch: name === "mobile" });
    const page = await context.newPage(); watch(page);
    await navigate(page, "/");
    await page.getByRole("heading", { name: "案件を探す", exact: true }).waitFor();
    await noOverflow(page);
    if (name === "mobile") {
      await shot(page, "05-search-mobile.png");
      await navigate(page, "/saved");
      await page.getByRole("heading", { name: "気になる案件を保存しましょう", exact: true }).waitFor();
    }
    await context.close();
    tests.push(`${name} responsive layout and isolated browser storage`);
  }
} finally { await responsiveBrowser.close(); }
assert.deepEqual(issues, [], "Browser errors occurred");
await mkdir(".cache", { recursive: true });
const report = { base, checkedAt: new Date().toISOString(), tests, browserErrors: issues, screenshots: capture ? 5 : 0 };
await writeFile(".cache/e2e-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
