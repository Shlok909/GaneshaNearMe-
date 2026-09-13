import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();
const errors = [];
const warnings = [];
let sdkLoads = 0;
const redact = (text) => text.replace(/AIza[\w-]+/g, "[redacted browser key]");
page.on("pageerror", (error) => errors.push(redact(error.message)));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(redact(message.text()));
  if (message.type() === "warning") warnings.push(redact(message.text()));
});
page.on("request", (request) => {
  if (request.url().startsWith("https://maps.googleapis.com/maps/api/js?"))
    sdkLoads++;
});
try {
  const target = process.argv[2] || "http://localhost:3002/home";
  if (!process.env.GNM_TEST_EMAIL || !process.env.GNM_TEST_PASSWORD) {
    throw new Error("Set GNM_TEST_EMAIL and GNM_TEST_PASSWORD to a confirmed test account for this signed-in Maps check.");
  }
  await page.goto(new URL("/auth", target).href);
  await page.getByLabel("Email", { exact: true }).fill(process.env.GNM_TEST_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(process.env.GNM_TEST_PASSWORD);
  await page.getByRole("button", { name: "Login", exact: true }).last().click();
  await expect(page).toHaveURL(/\/home$/);
  // This check reads an existing published listing; it never seeds the live database.
  await page.goto(target);
  await page.locator('[data-map-status="ready"]').waitFor({ timeout: 45000 });
  await page.locator(".modak-map-marker").first().waitFor();
  await page.getByRole("button", { name: "Fit listed Ganapatis" }).click();
  await page.waitForTimeout(1200);
  await expect(
    page.getByRole("link", {
      name: "Open this area in Google Maps (opens a new window)",
    }),
  ).toBeInViewport();
  await expect(
    page.getByRole("link", { name: "Terms (opens in new tab)", exact: true }),
  ).toBeInViewport();
  const attributionVisible = await page
    .getByRole("link", { name: "Terms (opens in new tab)", exact: true })
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2,
        ),
      );
    });
  expect(
    attributionVisible,
    "Google attribution must not be covered by the map or navigation",
  ).toBe(true);
  await mkdir("verification-artifacts", { recursive: true });
  await page.screenshot({
    path: "verification-artifacts/google-map-mobile.png",
    fullPage: true,
  });
  const count = await page.locator(".modak-map-marker").count();
  await page.locator("gmp-advanced-marker").first().click();
  await page.getByRole("button", { name: "View details", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page
    .getByRole("link", { name: "Share your Ganapati", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Choose Exact Location on Map", exact: true })
    .click();
  await page.locator('[data-map-status="ready"]').waitFor({ timeout: 25000 });
  await page.getByRole("button", { name: "Choose map center" }).click();
  await page.screenshot({
    path: "verification-artifacts/google-map-picker.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Use this location" }).click();
  const report = {
    realGoogleMap: true,
    modakMarkers: count,
    attributionVisible,
    sdkLoads,
    pickerConfirmed: await page
      .locator(".coordinate-field .selected-coordinates")
      .textContent(),
    errors,
    warnings,
  };
  await writeFile(
    "verification-artifacts/google-map-live-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (count < 1 || sdkLoads !== 1 || errors.length) process.exitCode = 1;
} catch (error) {
  console.log(
    JSON.stringify(
      {
        failure: redact(error.message),
        body: await page.locator("body").innerText(),
        sdkLoads,
        errors,
        warnings,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
