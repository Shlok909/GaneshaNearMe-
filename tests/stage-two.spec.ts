import {
  test,
  expect,
  readyMap,
  installGeoHarness,
  emitLocation,
} from "./helpers";

test("location is opt-in, moves the blue dot, keeps every listing, and cleans up", async ({
  page,
}) => {
  await installGeoHarness(page);
  await page.goto("/home");
  await readyMap(page);
  expect(await page.evaluate(() => window.__testGeo.calls)).toBe(0);
  await expect(page.getByLabel("Nearby radius")).toHaveCount(0);
  await expect(page.locator(".modak-map-marker")).toHaveCount(7);
  await page
    .getByRole("button", { name: "Use My Location", exact: true })
    .first()
    .click();
  expect(await page.evaluate(() => window.__testGeo.calls)).toBe(1);
  expect(await page.evaluate(() => window.__testGeo.options)).toMatchObject({
    enableHighAccuracy: true,
    maximumAge: 30000,
    timeout: 15000,
  });
  await emitLocation(page);
  await expect(
    page.getByRole("img", { name: "Your live location" }),
  ).toBeVisible();
  await expect(page.locator(".modak-map-marker")).toHaveCount(7);
  const search = page.getByLabel("Search an area or Ganapati");
  await search.fill("Dharampeth");
  await page.getByRole("option").first().getByRole("button").click();
  await expect(page.getByRole("dialog")).toContainText(
    "Test Dharampeth Cha Raja",
  );
  await expect(page.locator("#marker-local-fixture-dharampeth")).toHaveCount(1);
  await expect(page.getByRole("dialog")).toContainText(/km away/);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("button", { name: "Fit listed Ganapatis" }).click();
  const canvas = page.locator(".test-map-surface");
  await canvas.focus();
  await canvas.press("ArrowRight");
  await page.waitForTimeout(500);
  const staticMarker = page.locator("#marker-local-fixture-sitabuldi");
  const staticBefore = await staticMarker.getAttribute("style");
  const blueBefore = await page
    .locator(".map-user-marker")
    .locator("..")
    .getAttribute("style");
  await emitLocation(page, 21.1468, 79.0892);
  await expect(
    page.locator(".map-user-marker").locator(".."),
  ).not.toHaveAttribute("style", blueBefore!);
  await expect(staticMarker).toHaveAttribute("style", staticBefore!);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "21.1468",
  );
  await page.getByRole("link", { name: "Saved", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__testGeo.cleared))
    .toContain(1);
  await page.getByRole("link", { name: "Explore", exact: true }).click();
  await readyMap(page);
  await expect(
    page.getByRole("img", { name: "Your live location" }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.__testGeo.calls)).toBe(1);
});

test("denied permission and timeout remain usable without repeated prompts or distance limits", async ({
  page,
}) => {
  await installGeoHarness(page);
  await page.goto("/home");
  await readyMap(page);
  await page
    .getByRole("button", { name: "Use My Location", exact: true })
    .first()
    .click();
  await page.evaluate(() =>
    window.__testGeo.failure?.({
      code: 1,
      message: "denied",
    } as GeolocationPositionError),
  );
  await expect(
    page.getByText(
      "Location access is blocked. Allow location for this website and in your device settings, then try again.",
    ),
  ).toBeVisible();
  await expect(page.locator(".modak-map-marker")).toHaveCount(7);
  expect(await page.evaluate(() => window.__testGeo.calls)).toBe(1);
  await page.getByRole("button", { name: "Try Again", exact: true }).click();
  await page.evaluate(() =>
    window.__testGeo.failure?.({
      code: 3,
      message: "timeout",
    } as GeolocationPositionError),
  );
  await expect(
    page.getByText("Trying your device’s approximate location…"),
  ).toBeVisible();
  expect(
    await page.evaluate(() => window.__testGeo.options?.enableHighAccuracy),
  ).toBe(false);
  await page.evaluate(() =>
    window.__testGeo.failure?.({
      code: 3,
      message: "timeout",
    } as GeolocationPositionError),
  );
  await expect(
    page.getByText(/Finding your location took too long/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try Again", exact: true }).click();
  await emitLocation(page, 19.076, 72.8777);
  await expect(page.locator(".modak-map-marker")).toHaveCount(7);
  await page.getByRole("button", { name: "Stop using my location" }).click();
  await expect(page.getByLabel("Nearby radius")).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "Your live location" }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "19.076",
  );
});

test("approximate browser fallback recovers and temporary signal loss retains the blue marker", async ({
  page,
}) => {
  await installGeoHarness(page);
  await page.goto("/home");
  await readyMap(page);
  await page
    .getByRole("button", { name: "Use My Location", exact: true })
    .first()
    .click();
  await page.evaluate(() =>
    window.__testGeo.failure?.({
      code: 2,
      message: "No precise fix",
    } as GeolocationPositionError),
  );
  expect(await page.evaluate(() => window.__testGeo.calls)).toBe(2);
  expect(await page.evaluate(() => window.__testGeo.cleared)).toContain(1);
  expect(await page.evaluate(() => window.__testGeo.options)).toMatchObject({
    enableHighAccuracy: false,
    timeout: 20000,
  });
  await emitLocation(page);
  await expect(
    page.getByRole("img", { name: "Your live location" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your location is shown in blue. Accuracy: about 15 m."),
  ).toBeVisible();
  await page.evaluate(() =>
    window.__testGeo.failure?.({
      code: 3,
      message: "Lost signal",
    } as GeolocationPositionError),
  );
  await expect(
    page.getByText(
      "Showing your last known location while your device reconnects.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Your live location" }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.__testGeo.cleared)).not.toContain(2);
  await emitLocation(page, 21.1468, 79.0892);
  await expect(
    page.getByText("Your location is shown in blue. Accuracy: about 15 m."),
  ).toBeVisible();
  await page.evaluate(() =>
    window.__testGeo.failure?.({
      code: 1,
      message: "Permission revoked",
    } as GeolocationPositionError),
  );
  await expect(
    page.getByRole("img", { name: "Your live location" }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.__testGeo.cleared)).toContain(2);
});

test("silent location requests time out and cancel ignores late device callbacks", async ({
  page,
}) => {
  await installGeoHarness(page);
  await page.goto("/home");
  await readyMap(page);
  await page.clock.install();
  await page
    .getByRole("button", { name: "Use My Location", exact: true })
    .first()
    .click();
  await page.clock.runFor(20001);
  await expect(
    page.getByText(
      "Your browser has not returned a location. Check location permissions, then try again.",
    ),
  ).toBeVisible();
  expect(await page.evaluate(() => window.__testGeo.calls)).toBe(1);
  expect(await page.evaluate(() => window.__testGeo.cleared)).toContain(1);
  await emitLocation(page);
  await expect(
    page.getByRole("img", { name: "Your live location" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Try Again", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await emitLocation(page);
  await expect(
    page.getByRole("img", { name: "Your live location" }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.__testGeo.cleared)).toContain(2);
  await page.clock.runFor(30000);
  await expect(page.locator(".location-feedback")).toHaveCount(0);
});

test("My Location returns from list view and distant listings never disappear", async ({
  page,
}) => {
  await installGeoHarness(page);
  await page.goto("/home");
  await readyMap(page);
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await page
    .getByRole("button", { name: "Use My Location", exact: true })
    .first()
    .click();
  await emitLocation(page, 19.076, 72.8777);
  await expect(
    page.getByRole("button", { name: "Map view", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const blue = page.getByRole("img", { name: "Your live location" });
  await expect(blue).toBeVisible();
  await expect(page.locator(".map-empty")).toHaveCount(0);
  await expect(page.getByLabel("Nearby radius")).toHaveCount(0);
  await expect(page.locator(".modak-map-marker")).toHaveCount(7);
  await expect(
    page.getByRole("button", { name: "Fit listed Ganapatis" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Fit listed Ganapatis" }).click();
  await page.getByRole("button", { name: "My Location", exact: true }).click();
  const marker = await blue.boundingBox();
  const map = await page.locator(".google-map-host").boundingBox();
  expect(
    Math.abs(marker!.x + marker!.width / 2 - (map!.x + map!.width / 2)),
  ).toBeLessThan(3);
  expect(
    Math.abs(marker!.y + marker!.height / 2 - (map!.y + map!.height / 2)),
  ).toBeLessThan(3);
});

test("unsupported geolocation and map failure offer useful fallbacks and retry", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined,
    }),
  );
  await page.addInitScript(() => {
    window.__testMaps.failLoads = 1;
  });
  await page.goto("/home");
  await expect(page.getByText("Map could not be loaded.")).toBeVisible();
  await page.getByRole("button", { name: "Try Again", exact: true }).click();
  await readyMap(page);
  await expect(page.locator(".modak-map-marker")).toHaveCount(7);
  await page
    .getByRole("button", { name: "Use My Location", exact: true })
    .first()
    .click();
  await expect(
    page.getByText(/Your browser cannot provide location here/),
  ).toBeVisible();
  await page.getByLabel("Search an area or Ganapati").fill("no such locality");
  await expect(page.locator(".search-no-results")).toHaveText(
    "No listed Ganapati found for this search.",
  );
});

test("marker selection, directions, clipboard/native share and unsave preserve privacy", async ({
  page,
  baseURL,
}) => {
  await installGeoHarness(page);
  await page.goto("/home");
  await readyMap(page);
  await page.getByRole("button", { name: "Fit listed Ganapatis" }).click();
  await page.locator("#marker-local-fixture-dharampeth").click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText("Test Dharampeth Cha Raja");
  await sheet.getByText("Ganapati information", { exact: true }).click();
  const directions = new URL(
    (await sheet
      .getByRole("link", { name: "Get Directions" })
      .getAttribute("href"))!,
  );
  expect(directions.origin + directions.pathname).toBe(
    "https://www.google.com/maps/dir/",
  );
  expect(directions.searchParams.get("destination")).toBe("21.1393,79.0607");
  expect(directions.searchParams.has("origin")).toBe(false);
  await expect(
    sheet.getByRole("link", { name: "Get Directions" }),
  ).toHaveAttribute("target", "_blank");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.copied = text;
        },
      },
    }),
  );
  await sheet
    .getByRole("button", { name: "Share Location", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.dataset.copied),
  ).toBe(`${baseURL}/home?pandal=local-fixture-dharampeth`);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        document.documentElement.dataset.shared = JSON.stringify(data);
      },
    }),
  );
  await page.getByRole("button", { name: "Link copied" }).click();
  expect(
    await page.evaluate(() => document.documentElement.dataset.shared),
  ).toContain("Test Dharampeth Cha Raja");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    document.execCommand = () => false;
  });
  await sheet
    .getByRole("button", { name: "Share Location", exact: true })
    .click();
  const fallback = page.getByRole("dialog", {
    name: "Share this Ganapati",
    exact: true,
  });
  await expect(fallback.getByLabel("Location link")).toHaveValue(
    `${baseURL}/home?pandal=local-fixture-dharampeth`,
  );
  await page.keyboard.press("Escape");
  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await sheet.getByRole("button", { name: "Saved", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("gnm_saved_pandals")),
  ).toBeNull();
});

test("location picker selects and changes points; URL parsing never expands short links", async ({
  page,
}, testInfo) => {
  await installGeoHarness(page);
  const externalLinks: string[] = [];
  page.on("request", (request) => {
    if (/google\.|goo\.gl/.test(request.url()))
      externalLinks.push(request.url());
  });
  await page.goto("/add");
  await page
    .getByRole("button", { name: "Choose Exact Location on Map", exact: true })
    .click();
  const picker = page.getByRole("dialog");
  await readyMap(page);
  await expect(
    picker.getByRole("button", { name: "Use this location" }),
  ).toBeDisabled();
  await picker
    .locator(".test-map-surface")
    .click({ position: { x: 130, y: 100 } });
  await expect(picker.locator(".selected-coordinates")).toContainText(
    "Selected location:",
  );
  await page.waitForTimeout(300);
  const first = await picker.locator(".selected-coordinates").textContent();
  await picker
    .locator(".test-map-surface")
    .click({ position: { x: 170, y: 150 } });
  await expect(picker.locator(".selected-coordinates")).not.toHaveText(first!);
  await page.screenshot({
    path: testInfo.outputPath("location-picker.png"),
    fullPage: true,
  });
  await picker.getByRole("button", { name: "Use this location" }).click();
  await expect(picker).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Change Exact Location on Map" }),
  ).toBeFocused();
  const text = page.getByLabel("Exact Location", { exact: true });
  await text.fill("https://www.google.com/maps/@21.123456,79.098765,16z");
  await expect(
    page.locator(".coordinate-field .selected-coordinates"),
  ).toContainText("21.123456, 79.098765");
  await text.fill("https://maps.app.goo.gl/no-expansion");
  await expect(
    page.getByText(
      "We couldn't detect exact coordinates from this link. Please choose the location on the map.",
    ),
  ).toBeVisible();
  await expect(
    page.locator(".coordinate-field .selected-coordinates"),
  ).toHaveCount(0);
  expect(externalLinks).toEqual([]);
  await page
    .getByRole("button", { name: "Choose Exact Location on Map", exact: true })
    .click();
  await readyMap(page);
  await picker.getByRole("button", { name: "Use My Current Location" }).click();
  await emitLocation(page, 21.15, 79.09);
  await expect(picker.locator(".selected-coordinates")).toContainText(
    "21.150000, 79.090000",
  );
  await picker.getByRole("button", { name: "Use this location" }).click();
  expect(await page.evaluate(() => window.__testGeo.cleared)).toContain(1);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    '"lat":21.15,',
  );
});

test("responsive layouts keep map attribution and controls clear of navigation", async ({
  page,
}, testInfo) => {
  for (const width of [360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/auth",
      "/home",
      "/add",
      "/saved",
      "/profile",
      "/admin",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}px`,
      ).toBe(true);
      if (route === "/home") {
        await readyMap(page);
        await page.locator(".test-map-attribution").scrollIntoViewIfNeeded();
        const nav = await page
          .getByRole("navigation", { name: "Main navigation" })
          .boundingBox();
        const attribution = await page
          .locator(".test-map-attribution")
          .boundingBox();
        const controls = await page.locator(".real-map-controls").boundingBox();
        expect(
          attribution && nav && attribution.y + attribution.height <= nav.y,
        ).toBeTruthy();
        expect(
          controls && nav && controls.y + controls.height <= nav.y,
        ).toBeTruthy();
        if (width === 390)
          await page.screenshot({
            path: testInfo.outputPath("home-mobile.png"),
            fullPage: true,
          });
      }
    }
  }
});

test("browser geolocation permission works and no demo location control exists", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: 21.1458,
    longitude: 79.0882,
    accuracy: 20,
  });
  await page.goto("/home");
  await readyMap(page);
  await expect(
    page.getByRole("img", { name: "Your live location" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Use My Location", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("img", { name: "Your live location" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop using my location" }).click();
  const demo = page.getByRole("button", { name: "Use Demo Nagpur Location" });
  await expect(demo).toHaveCount(0);
});

test("search and list toggles keep all published listings on the same map and detach markers on exit", async ({
  page,
}) => {
  await page.goto("/home");
  await readyMap(page);
  await page.getByRole("button", { name: "List view" }).click();
  await page.getByRole("button", { name: "Map view" }).click();
  await expect(page.getByRole("button", { name: "Verified", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "All Ganapatis", exact: true })).toHaveCount(0);
  await page.getByLabel("Search an area or Ganapati").fill("Dharampeth");
  await expect(page.locator(".modak-map-marker")).toHaveCount(1);
  await page.getByLabel("Search an area or Ganapati").fill("");
  expect(await page.evaluate(() => window.__testMaps.mapsCreated)).toBe(1);
  expect(await page.evaluate(() => window.__testMaps.imports)).toEqual([
    "maps",
    "marker",
  ]);
  await expect(page.locator(".modak-map-marker")).toHaveCount(7);
  await page.getByRole("link", { name: "Saved", exact: true }).click();
  await expect(page.locator("gmp-advanced-marker")).toHaveCount(0);
  expect(
    await page.evaluate(() => window.__testMaps.markersRemoved),
  ).toBeGreaterThanOrEqual(7);
});
