import { test, expect, readyMap, installGeoHarness, emitLocation } from "./helpers";

const firstMarker = "#marker-local-fixture-dharampeth";
const secondMarker = "#marker-local-fixture-sitabuldi";

test.beforeEach(async ({ page }) => {
  await installGeoHarness(page);
  await page.goto("/home");
  await readyMap(page);
  await page.getByRole("button", { name: "Fit listed Ganapatis" }).click();
});

test("Modak tap requests location, draws Google's blue path, and preserves details", async ({ page }, testInfo) => {
  expect(await page.evaluate(() => window.__testGeo.calls)).toBe(0);
  expect(await page.evaluate(() => window.__testMaps.imports)).not.toContain("routes");
  await page.locator(firstMarker).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const card = page.getByRole("region", { name: "Route to selected Ganapati" });
  await expect(card).toContainText("Finding your location");
  expect(await page.evaluate(() => window.__testGeo.calls)).toBe(1);
  expect(await page.evaluate(() => window.__testMaps.routeRequests)).toHaveLength(0);
  await emitLocation(page);
  await expect(card).toContainText("Driving route · 3.4 km · 8 min");
  await expect(page.locator(".real-map")).toBeInViewport({ ratio: 0.9 });
  await expect(page.locator(".test-route-polyline polyline")).toHaveAttribute("stroke", "#2563eb");
  expect(await page.evaluate(() => window.__testMaps.routeRequests[0])).toMatchObject({
    origin: { lat: 21.1458, lng: 79.0882 }, destination: { lat: 21.1393, lng: 79.0607 }, travelMode: "DRIVE",
  });
  const paths = await page.evaluate(() => window.__testMaps.polylines.filter(line => !!line.map).map(line => line.options.path));
  expect(paths).toHaveLength(1);
  expect(paths[0]).toHaveLength(3);
  const fitted = await page.evaluate(() => window.__testMaps.maps[0].fittedPoints);
  expect(fitted).toContainEqual({ lat: 21.1458, lng: 79.0882 });
  expect(fitted).toContainEqual({ lat: 21.1393, lng: 79.0607 });
  await page.getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("dialog")).toContainText("Test Dharampeth Cha Raja");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "View details" })).toBeFocused();
  await expect(page.locator(".test-route-polyline")).toHaveCount(1);
  const external = new URL((await card.getByRole("link", { name: "Open in Google Maps" }).getAttribute("href"))!);
  expect(external.searchParams.get("origin")).toBe("21.1458,79.0882");
  expect(external.searchParams.get("travelmode")).toBe("driving");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator(".real-map").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("blue-route.png"), fullPage: true });
  await page.getByRole("button", { name: "Clear route" }).click();
  await expect(page.locator(".test-route-polyline")).toHaveCount(0);
  await expect(card).toHaveCount(0);
  expect(await page.evaluate(() => window.__testMaps.polylines.every(line => !line.map))).toBe(true);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("21.1458");
});

test("latest selection wins and clearing ignores pending route responses", async ({ page }) => {
  await page.getByRole("button", { name: "Use My Location", exact: true }).first().click();
  await emitLocation(page);
  await page.getByRole("button", { name: "Fit listed Ganapatis" }).click();
  await page.evaluate(() => window.__testMaps.routeResponses.push({ delay: 1500 }, {}));
  await page.locator(firstMarker).click();
  await expect.poll(() => page.evaluate(() => window.__testMaps.routeRequests.length)).toBe(1);
  // Keyboard activation also works when the previous selection moved the camera.
  await page.locator(secondMarker).dispatchEvent("gmp-click");
  await expect(page.locator(".ganapati-route-card")).toContainText("Test Sitabuldi Ganesh Mandal");
  await expect(page.locator(".test-route-polyline")).toHaveCount(1);
  await page.waitForTimeout(1600);
  expect(await page.evaluate(() => window.__testMaps.polylines.filter(line => !!line.map).length)).toBe(1);
  const points = await page.evaluate(() => window.__testMaps.polylines.find(line => !!line.map)?.options.path);
  const requests = await page.evaluate(() => window.__testMaps.routeRequests);
  expect(points?.at(-1)).toEqual(requests[1].destination);
  await page.evaluate(() => window.__testMaps.routeResponses.push({ delay: 1000 }));
  await page.getByRole("button", { name: "Update route" }).click();
  await expect.poll(() => page.evaluate(() => window.__testMaps.routeRequests.length)).toBe(3);
  await page.getByRole("button", { name: "Clear route" }).click();
  await page.waitForTimeout(1100);
  await expect(page.locator(".test-route-polyline")).toHaveCount(0);
});

test("permission denial does not invent an origin or repeatedly prompt; retry retains destination", async ({ page }) => {
  await page.locator(firstMarker).click();
  await page.evaluate(() => window.__testGeo.failure?.({ code: 1, message: "denied" } as GeolocationPositionError));
  await expect(page.getByText(/Location access is blocked/)).toBeVisible();
  await page.locator(firstMarker).dispatchEvent("gmp-click");
  expect(await page.evaluate(() => window.__testGeo.calls)).toBe(1);
  expect(await page.evaluate(() => window.__testMaps.routeRequests)).toHaveLength(0);
  await page.getByRole("button", { name: "Try Again", exact: true }).click();
  await emitLocation(page);
  await expect(page.locator(".test-route-polyline")).toHaveCount(1);
  await expect(page.locator(".ganapati-route-card")).toContainText("Test Dharampeth Cha Raja");
  await page.getByRole("button", { name: "Stop using my location" }).click();
  await expect(page.locator(".test-route-polyline")).toHaveCount(0);
  await expect(page.locator(".map-user-marker")).toHaveCount(0);
});

test("API failure and no route are truthful, recoverable states without a fake line", async ({ page }) => {
  await page.evaluate(() => window.__testMaps.routeResponses.push({ error: "PERMISSION_DENIED" }, { empty: true }, { warnings: ["Test route advisory"] }));
  await page.locator(firstMarker).click();
  await emitLocation(page);
  await expect(page.locator(".ganapati-route-card")).toContainText("The route could not be loaded");
  await expect(page.locator(".test-route-polyline")).toHaveCount(0);
  await page.getByRole("button", { name: "Retry route" }).click();
  await expect(page.locator(".ganapati-route-card")).toContainText("No driving route was found");
  await expect(page.locator(".test-route-polyline")).toHaveCount(0);
  await page.getByRole("button", { name: "Retry route" }).click();
  await expect(page.locator(".test-route-polyline")).toHaveCount(1);
  await expect(page.getByText("Test route advisory")).toBeVisible();
});

test("route refresh ignores GPS jitter, follows significant movement, and cleans up on exit", async ({ page }) => {
  await page.clock.install();
  await page.locator(firstMarker).click();
  await emitLocation(page);
  await expect(page.locator(".test-route-polyline")).toHaveCount(1);
  await emitLocation(page, 21.14581, 79.08821);
  await page.clock.runFor(30001);
  expect(await page.evaluate(() => window.__testMaps.routeRequests)).toHaveLength(1);
  await emitLocation(page, 21.15, 79.09);
  await page.clock.runFor(30001);
  await expect.poll(() => page.evaluate(() => window.__testMaps.routeRequests.length)).toBe(2);
  expect(await page.evaluate(() => window.__testMaps.routeRequests[1].origin)).toEqual({ lat: 21.15, lng: 79.09 });
  await expect.poll(() => page.evaluate(() => window.__testMaps.polylines.filter(line => !!line.map).length)).toBe(1);
  await page.getByRole("link", { name: "Saved", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__testMaps.polylines.every(line => !line.map))).toBe(true);
  await page.clock.runFor(60001);
  expect(await page.evaluate(() => window.__testMaps.routeRequests)).toHaveLength(2);
});

test("silent routing times out and late success cannot replace the error", async ({ page }) => {
  await page.clock.install();
  await page.evaluate(() => window.__testMaps.routeResponses.push({ delay: 40000 }));
  await page.locator(firstMarker).click();
  await emitLocation(page);
  await expect.poll(() => page.evaluate(() => window.__testMaps.routeRequests.length)).toBe(1);
  await page.clock.runFor(25001);
  await expect(page.locator(".ganapati-route-card")).toContainText("Finding a route took too long");
  await page.clock.runFor(16000);
  await expect(page.locator(".test-route-polyline")).toHaveCount(0);
  await page.getByRole("button", { name: "Retry route" }).click();
  await expect(page.locator(".test-route-polyline")).toHaveCount(1);
});

test("details can start a route and a selected destination survives search and list toggles", async ({ page }) => {
  await page.getByRole("button", { name: "Use My Location", exact: true }).first().click();
  await emitLocation(page);
  await page.getByLabel("Search an area or Ganapati").fill("Dharampeth");
  await page.getByRole("option").first().getByRole("button").click();
  await expect(page.getByRole("dialog")).toContainText("Test Dharampeth Cha Raja");
  await page.getByRole("button", { name: "Show route on map" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("listbox", { name: "Matching Ganapatis" })).toHaveCount(0);
  await expect(page.locator(".test-route-polyline")).toHaveCount(1);
  await expect(page.locator(firstMarker)).toHaveCount(1);
  await expect(page.getByLabel("Nearby radius")).toHaveCount(0);
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await page.getByRole("button", { name: "Map view", exact: true }).click();
  await expect(page.locator(".test-route-polyline")).toHaveCount(1);
  expect(await page.evaluate(() => window.__testMaps.routeRequests)).toHaveLength(1);
});
