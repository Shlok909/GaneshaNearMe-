import { test, expect, readyMap, installGeoHarness, emitLocation } from "./helpers";

test("About credits fit on narrow phones, close with Escape and restore focus", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 620 });
  await page.goto("/home");
  await readyMap(page);
  const trigger = page.getByRole("button", { name: "About GaneshaNearMe" });
  await expect(trigger).toBeInViewport();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "About GaneshaNearMe" });
  await expect(dialog).toBeVisible();
  for (const text of ["Founder & CEO", "Shlok Sane", "Co-Founder & CFO", "Vijay Bhoyar", "Technical Help", "Mahesh Raut"]) {
    await expect(dialog.getByText(text, { exact: true })).toBeVisible();
  }
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  await page.screenshot({ path: testInfo.outputPath("about-mobile.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Close About" }).click();
  await expect(trigger).toBeFocused();
  await expect(page.locator(".real-map")).toBeVisible();
});

test("mobile controls remain readable and do not overlap during location tracking", async ({ page }) => {
  await installGeoHarness(page);
  for (const width of [320, 390, 413]) {
    await page.setViewportSize({ width, height: 620 });
    await page.goto("/home");
    await readyMap(page);
    await page.getByRole("button", { name: "Use My Location", exact: true }).first().click();
    await emitLocation(page);
    const buttons = page.locator(".discovery-controls button").filter({ visible: true });
    const boxes = await buttons.evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return { label: node.getAttribute("aria-label") || node.textContent, x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    }));
    for (let i = 0; i < boxes.length; i++) {
      expect(boxes[i].height, `${width}: ${boxes[i].label} touch height`).toBeGreaterThanOrEqual(44);
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const overlap = Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1;
        expect(overlap, `${width}: ${a.label} overlaps ${b.label}`).toBe(false);
      }
    }
    expect(await page.getByRole("combobox").evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("pages include browser security headers while preserving geolocation", async ({ page }) => {
  const response = await page.goto("/home");
  const headers = response!.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["permissions-policy"]).toContain("geolocation=(self)");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
