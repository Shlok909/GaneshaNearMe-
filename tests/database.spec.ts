import { emptyTest as test, expect, fillSubmission, readyMap } from "./helpers";
import { installGoogleMapsDouble } from "./google-maps-double";
const service = "http://127.0.0.1:54329";

test("regular accounts are denied admin access and legacy browser data is ignored without deletion", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("link", { name: /GnM Admin/ })).toHaveCount(0);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Administrator access required" })).toBeVisible();
  await page.evaluate(() => { localStorage.setItem("gnm_demo_submissions", '[{"id":"old-local-user-data"}]'); localStorage.setItem("gnm_saved_pandals", '["old-local-user-data"]'); });
  await page.goto("/home"); await readyMap(page);
  await expect(page.locator(".modak-map-marker")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("gnm_demo_submissions"))).toContain("old-local-user-data");
});

test("saves persist in a second browser context for the same account", async ({ page, request, browser, context, baseURL }) => {
  await fillSubmission(page, "Cross Browser Ganapati");
  await page.getByRole("button", { name: "Submit Ganapati" }).click();
  await expect(page.getByRole("heading", { name: "Your Ganapati submission has been approved." })).toBeVisible();
  const id = (await (await request.get(service + "/__test/state")).json()).tables.pandals[0].id;
  await page.goto("/home?pandal=" + id);
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  const second = await browser.newContext();
  try {
    await second.addCookies(await context.cookies()); await second.addInitScript(installGoogleMapsDouble);
    const other = await second.newPage(); await other.goto(baseURL + "/saved");
    await expect(other.getByRole("heading", { name: "Cross Browser Ganapati", exact: true })).toBeVisible();
    expect(await other.evaluate(() => localStorage.getItem("gnm_saved_pandals"))).toBeNull();
    await other.getByRole("button", { name: "Remove Cross Browser Ganapati", exact: true }).click();
    await expect(other.getByRole("heading", { name: "No Ganapatis saved yet." })).toBeVisible();
    await page.reload(); await expect(page.getByRole("dialog").getByRole("button", { name: "Save", exact: true })).toBeVisible();
  } finally { await second.close(); }
});

test.describe("administration", () => {
  test.use({ admin: true });
  test("an admin role without the designated identity cannot open the panel", async ({ page, request }) => {
    await request.post(service + "/__test/settings", { data: { faults: { adminIdentity: true } } });
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Administrator access required" })).toBeVisible();
    await expect(page.getByText("Total Users", { exact: true })).toHaveCount(0);
  });
  test("duplicate review, community approval, featured promotion and rejection update the shared map", async ({ page, request }) => {
    for (let i = 0; i < 2; i++) {
      await fillSubmission(page, "Duplicate Test Mandal");
      await page.getByRole("button", { name: "Submit Ganapati" }).click();
      await expect(page.getByRole("heading", { name: i ? "Your Ganapati has been submitted for review." : "Your Ganapati submission has been approved." })).toBeVisible();
    }
    await page.goto("/admin");
    await expect(page.getByText("Total Users", { exact: true })).toBeVisible();
    await expect(page.locator(".request-card")).toHaveCount(1);
    await expect(page.locator(".request-card")).toContainText("Possible duplicate");
    await page.getByRole("button", { name: "Approve Duplicate Test Mandal as Community", exact: true }).click();
    await expect(page.locator(".request-card")).toHaveCount(0);
    await page.getByRole("button", { name: /Approved/ }).click();
    await expect(page.locator(".request-card")).toHaveCount(2);
    await page.getByRole("button", { name: "Approve Duplicate Test Mandal as Featured", exact: true }).first().click();
    await expect(page.locator(".request-card").filter({ hasText: "Featured Public Pandal" })).toHaveCount(1);
    await page.getByRole("button", { name: "Reject Duplicate Test Mandal", exact: true }).first().click();
    await expect(page.locator(".request-card")).toHaveCount(1);
    const state = await (await request.get(service + "/__test/state")).json();
    expect(state.tables.pandals).toHaveLength(1);
    await page.goto("/home"); await expect(page.locator(".modak-map-marker")).toHaveCount(1);
  });
});

test.describe("database failures", () => {
  test.use({ expectedHttpErrors: [503] });
  test("loading errors offer retry and never become a fake empty database", async ({ page, request }) => {
    await request.post(service + "/__test/settings", { data: { faults: { pandals: true } } });
    await page.goto("/home");
    await expect(page.getByText("Unable to load Ganapati listings right now.").filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No Ganapatis have been listed yet." })).toHaveCount(0);
    await request.post(service + "/__test/settings", { data: { faults: { pandals: false } } });
    await page.getByRole("button", { name: "Retry", exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { name: "No Ganapatis have been listed yet." }).filter({ visible: true })).toBeVisible();
  });
});
