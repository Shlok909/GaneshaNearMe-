import {
  emptyTest as test,
  expect,
  readyMap,
  fillManualSubmission,
  installGeoHarness,
  emitLocation,
} from "./helpers";

test("a fresh browser has no seeded listings, uses the supplied logo, and keeps live location usable", async ({
  page,
}) => {
  await installGeoHarness(page);
  await page.goto("/home");
  await readyMap(page);
  await expect(page.locator(".brand img")).toHaveAttribute("src", /logoofapp/);
  await expect(page.locator(".brand svg")).toHaveCount(0);
  await expect(page.locator(".modak-map-marker")).toHaveCount(0);
  await expect(page.locator(".nearby-count")).toHaveText("0 listed");
  await expect(
    page
      .getByRole("heading", { name: "No Ganapatis added yet." })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use Demo Nagpur Location" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("gnm_demo_submissions")),
  ).toBeNull();
  await page
    .getByRole("button", { name: "Use My Location", exact: true })
    .first()
    .click();
  await emitLocation(page);
  await expect(
    page.getByRole("img", { name: "Your live location" }),
  ).toBeVisible();
  await expect(page.locator(".map-empty")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Add a Ganapati", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/add$/);
  await page.goto("/saved");
  await expect(
    page.getByRole("heading", { name: "No Ganapatis saved yet." }),
  ).toBeVisible();
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "Test Explorer", exact: true }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(page.locator(".request-card")).toHaveCount(0);
});

test("first-listing actions stay above fixed navigation on short mobile and tablet screens", async ({
  page,
}) => {
  for (const width of [360, 390, 680]) {
    await page.setViewportSize({ width, height: 622 });
    await page.goto("/home");
    await readyMap(page);
    const action = page
      .getByRole("link", { name: "Add a Ganapati", exact: true })
      .filter({ visible: true });
    const actionBox = await action.boundingBox();
    const navBox = await page
      .getByRole("navigation", { name: "Main navigation" })
      .boundingBox();
    expect(
      actionBox && navBox && actionBox.y + actionBox.height <= navBox.y,
      `Add action clear of navigation at ${width}px`,
    ).toBeTruthy();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("local submissions persist across reload, sync with admin in another tab, and can be saved", async ({
  page,
  context,
}) => {
  await fillManualSubmission(page, "My Local Ganapati");
  await page.getByRole("button", { name: "Submit Ganapati" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Your Ganapati has been submitted for review.",
    }),
  ).toBeVisible();
  await page.goto("/home");
  await readyMap(page);
  await expect(page.locator(".modak-map-marker")).toHaveCount(0);

  const admin = await context.newPage();
  await admin.goto("/admin");
  await expect(admin.locator(".request-card")).toHaveCount(1);
  await admin
    .getByRole("button", { name: "Approve My Local Ganapati as Community" })
    .click();
  await expect(page.locator(".modak-map-marker")).toHaveCount(1);
  await admin.close();
  await page.reload();
  await readyMap(page);
  await expect(page.locator(".modak-map-marker")).toHaveCount(1);
  await page.getByLabel("Search an area or Ganapati").fill("My Local");
  await page.getByRole("option").getByRole("button").click();
  await expect(page.getByRole("dialog")).toContainText("My Local Ganapati");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Saved", exact: true }).click();
  await expect(page).toHaveURL(/\/saved$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "My Local Ganapati", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("gnm_demo_submissions") || "[]"),
    ),
  ).toHaveLength(1);
});
