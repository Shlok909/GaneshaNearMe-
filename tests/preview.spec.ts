import { emptyTest as test, expect, fillSubmission, readyMap, installGeoHarness } from "./helpers";
import { ganapatiPhoto, decorationPhoto } from "./fixtures/photos";

const service = "http://127.0.0.1:54329";
const name = "Shiv Parvati Ganesh Utsav Mandal";
test.beforeEach(async ({ page }) => {
  await installGeoHarness(page);
  await fillSubmission(page, name);
  await page.getByRole("button", { name: "Remove ganapati.png", exact: true }).click();
  await page.getByRole("button", { name: "Remove decoration.png", exact: true }).click();
  await page.locator('input[name="ganapati-photos"]').setInputFiles(ganapatiPhoto);
  await page.locator('input[name="decoration-photos"]').setInputFiles(decorationPhoto);
  await page.getByRole("button", { name: "Submit Ganapati" }).click();
  await expect(page.getByRole("heading", { name: "Your Ganapati submission has been approved." })).toBeVisible();
  await page.goto("/home");
  await readyMap(page);
});

test("Modak immediately shows the logo skeleton, then the Ganapati photo, without server navigation", async ({ page }, testInfo) => {
  let releaseSign!: () => void;
  let releaseImage!: () => void;
  const signGate = new Promise<void>(resolve => { releaseSign = resolve; });
  const imageGate = new Promise<void>(resolve => { releaseImage = resolve; });
  await page.route("**/storage/v1/object/sign/pandal-images", async route => { await signGate; await route.continue(); });
  await page.route("**/storage/v1/object/sign/pandal-images/**", async route => { await imageGate; await route.continue(); });
  const navigations: string[] = [];
  page.on("request", request => { if (request.headers()["rsc"] === "1") navigations.push(request.url()); });
  const start = Date.now();
  try {
    await page.locator(".modak-map-marker").click();
    const dialog = page.getByRole("dialog", { name, exact: true });
    await expect(dialog).toBeVisible({ timeout: 1000 });
    await expect(dialog.locator(".preview-photo-skeleton")).toContainText("Loading Ganapati photo");
    await expect(dialog.locator(".preview-photo-skeleton img")).toHaveAttribute("src", "/logoofapp.png");
    await testInfo.attach("marker-to-popup.json", { body: JSON.stringify({ elapsedMs: Date.now() - start, serverNavigations: navigations.length }), contentType: "application/json" });
    expect(navigations).toEqual([]);
    expect(await page.evaluate(() => window.__testGeo.calls)).toBe(0);
    releaseSign();
    await expect(dialog.locator(".preview-main-photo")).toHaveAttribute("src", /\/ganapati\//);
    await expect(dialog.locator(".preview-photo-skeleton")).toBeVisible();
    await expect(dialog.locator(".preview-hero")).toHaveAttribute("aria-busy", "true");
    releaseImage();
    await expect(dialog.locator(".preview-photo-skeleton")).toHaveCount(0);
    await expect(dialog.locator(".preview-main-photo")).toHaveCSS("opacity", "1");
    await expect(dialog.locator(".preview-main-photo")).toHaveAttribute("fetchpriority", "high");
    await expect(dialog.getByRole("button", { name: "Show route on map" })).toBeInViewport();
  } finally { releaseSign(); releaseImage(); }
});

test("compact photo card and chevron accordion fit small screens with actions always available", async ({ page }, testInfo) => {
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 620 });
    await page.locator(".modak-map-marker").click();
    const dialog = page.getByRole("dialog", { name, exact: true });
    await expect(dialog.locator(".preview-main-photo")).toHaveCSS("opacity", "1");
    const information = dialog.locator(".preview-information");
    const summary = information.locator("summary");
    await expect(information).not.toHaveAttribute("open", "");
    await expect(summary.locator("svg")).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(10);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width - 10);
    expect(box!.height).toBeLessThanOrEqual(580);
    expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await expect(dialog.getByRole("button", { name: "Show route on map" })).toBeInViewport();
    await expect(dialog.getByRole("button", { name: "Share Location", exact: true })).toBeInViewport();
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(information).toHaveAttribute("open", "");
    await expect(information.getByText("Theme & decoration", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Show route on map" })).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(information).not.toHaveAttribute("open", "");
    if (width === 390) await page.screenshot({ path: testInfo.outputPath("compact-preview.png") });
    await dialog.getByRole("button", { name: "Close details" }).click();
    await expect(dialog).toHaveCount(0);
  }
});

test("reopening photos and list cards reuses valid signing requests and preserves photo groups", async ({ page }) => {
  let signs = 0;
  page.on("request", request => { if (request.method() === "POST" && request.url().endsWith("/storage/v1/object/sign/pandal-images")) signs++; });
  await page.locator(".modak-map-marker").click();
  const hero = page.locator(".preview-main-photo");
  await expect(hero).toHaveAttribute("src", /\/ganapati\//);
  await expect(hero).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "View Decoration photo 1" }).click();
  await expect(hero).toHaveAttribute("src", /\/pandal\//);
  await page.getByRole("button", { name: "Close details" }).click();
  await page.locator(".modak-map-marker").click();
  await expect(hero).toHaveAttribute("src", /\/ganapati\//);
  await expect(hero).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "Close details" }).click();
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator(".pandal-card-image img")).toHaveAttribute("src", /\/ganapati\//);
  await page.getByRole("link", { name: "View", exact: true }).click();
  await expect(hero).toHaveCSS("opacity", "1");
  expect(signs).toBe(1);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("/object/sign/");
});

test.describe("slow or unavailable photo service", () => {
  test.use({ expectedHttpErrors: [503] });
  test("a failed photo request has a working retry without blocking details or routes", async ({ page, request }) => {
    await request.post(service + "/__test/settings", { data: { faults: { sign: true } } });
    await page.locator(".modak-map-marker").click();
    await expect(page.getByRole("alert")).toContainText("This photo could not be loaded.");
    await expect(page.locator(".preview-photo-skeleton")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Show route on map" })).toBeEnabled();
    await request.post(service + "/__test/settings", { data: { faults: { sign: false } } });
    await page.getByRole("button", { name: "Retry photo", exact: true }).click();
    await expect(page.locator(".preview-main-photo")).toHaveCSS("opacity", "1");
    await expect(page.locator(".preview-main-photo")).toHaveAttribute("src", /\/ganapati\//);
  });
});

test("a silent photo service times out with a retry instead of an endless skeleton", async ({ page }) => {
  await page.clock.install();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/storage/v1/object/sign/pandal-images", async route => { await gate; await route.continue(); });
  try {
    await page.locator(".modak-map-marker").click();
    await expect(page.locator(".preview-photo-skeleton")).toBeVisible();
    await page.clock.runFor(15_001);
    await expect(page.getByRole("alert")).toContainText("This photo could not be loaded.");
    await expect(page.locator(".preview-photo-skeleton")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Retry photo", exact: true })).toBeEnabled();
  } finally { release(); }
});

test("a shared link shows a loading shell that can be closed before listings arrive", async ({ page, request }) => {
  const state = await (await request.get(service + "/__test/state")).json();
  const id = state.tables.pandals[0].id;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/pandals?**", async route => { await gate; await route.continue(); });
  try {
    await page.goto("/home?pandal=" + id);
    await expect(page.getByRole("dialog", { name: "Loading Ganapati details" })).toBeVisible();
    await expect(page.locator(".preview-photo-skeleton img")).toHaveAttribute("src", "/logoofapp.png");
    await page.getByRole("button", { name: "Close details" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    release();
    await expect(page.locator(".modak-map-marker")).toHaveCount(1);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally { release(); }
});
