import type { Locator, Page } from "@playwright/test";
import { emptyTest as test, expect, fillSubmission, readyMap } from "./helpers";
import {
  ganapatiPhoto,
  secondGanapatiPhoto,
  decorationPhoto,
  secondDecorationPhoto,
} from "./fixtures/photos";

async function expectPhoto(
  page: Page,
  image: Locator,
  file: typeof ganapatiPhoto,
) {
  await expect(image).toHaveAttribute("src", /^blob:/);
  await expect
    .poll(() =>
      image.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0,
      ),
    )
    .toBe(true);
  const bytes = await page.evaluate(
    async (url) =>
      Array.from(new Uint8Array(await (await fetch(url!)).arrayBuffer())),
    await image.getAttribute("src"),
  );
  expect(Buffer.from(bytes)).toEqual(file.buffer);
}
async function submitPhotos(page: Page, name = "Photo Test Mandal") {
  await fillSubmission(page, name);
  await page.getByRole("button", { name: "Remove ganapati.png" }).click();
  await page.getByRole("button", { name: "Remove decoration.png" }).click();
  await page
    .locator('input[name="ganapati-photos"]')
    .setInputFiles([ganapatiPhoto, secondGanapatiPhoto]);
  await page
    .locator('input[name="decoration-photos"]')
    .setInputFiles([
      decorationPhoto,
      secondDecorationPhoto,
      { ...decorationPhoto, name: "decoration-third.png" },
    ]);
  await page.getByRole("button", { name: "Submit Ganapati" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Your Ganapati submission has been approved.",
    }),
  ).toBeVisible();
  const record = await page.evaluate(
    () => JSON.parse(localStorage.getItem("gnm_demo_submissions")!)[0],
  );
  await page.goto(`/home?pandal=${record.id}`);
  await readyMap(page);
  return record;
}

test("uploaded photo bytes stay in their Ganapati and decoration groups after reload and in Saved and Admin", async ({
  page,
}, testInfo) => {
  const record = await submitPhotos(page);
  expect(record.photoSetId).toMatch(/^photos-/);
  expect(record.ganapatiImages.names).toEqual([
    ganapatiPhoto.name,
    secondGanapatiPhoto.name,
  ]);
  expect(record.decorationImages.count).toBe(3);
  const sheet = page.getByRole("dialog");
  await expectPhoto(page, sheet.locator(".preview-hero img"), ganapatiPhoto);
  await expect(
    sheet
      .getByRole("region", { name: "Ganapati photos", exact: true })
      .getByRole("button"),
  ).toHaveCount(2);
  await expect(
    sheet
      .getByRole("region", { name: "Decoration photos", exact: true })
      .getByRole("button"),
  ).toHaveCount(3);
  await sheet
    .getByRole("button", { name: "View Ganapati photo 2", exact: true })
    .click();
  await expectPhoto(
    page,
    sheet.locator(".preview-hero img"),
    secondGanapatiPhoto,
  );
  await sheet
    .getByRole("button", { name: "View Decoration photo 1", exact: true })
    .click();
  await expectPhoto(page, sheet.locator(".preview-hero img"), decorationPhoto);
  await sheet
    .getByRole("button", { name: "View Decoration photo 2", exact: true })
    .click();
  await expectPhoto(
    page,
    sheet.locator(".preview-hero img"),
    secondDecorationPhoto,
  );
  await page.screenshot({
    path: testInfo.outputPath("grouped-photos.png"),
    fullPage: true,
  });
  await page.reload();
  await expectPhoto(page, sheet.locator(".preview-hero img"), ganapatiPhoto);
  await sheet
    .getByRole("button", { name: "View Decoration photo 1", exact: true })
    .click();
  await expectPhoto(page, sheet.locator(".preview-hero img"), decorationPhoto);
  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("link", { name: "Saved", exact: true }).click();
  await expect(page).toHaveURL(/\/saved$/);
  await page.reload();
  await expectPhoto(
    page,
    page.locator(".pandal-card-image img"),
    ganapatiPhoto,
  );
  await page.goto("/admin");
  await page.getByRole("button", { name: /^Approved/ }).click();
  await expectPhoto(
    page,
    page.locator(".request-photos img").first(),
    ganapatiPhoto,
  );
  await expectPhoto(
    page,
    page.locator(".request-photos img").last(),
    decorationPhoto,
  );
  await page.getByRole("button", { name: "Review Photo Test Mandal" }).click();
  await sheet
    .getByRole("button", { name: "View Decoration photo 1", exact: true })
    .click();
  await expectPhoto(
    page,
    sheet.locator(".review-photo-hero img"),
    decorationPhoto,
  );
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(
    /blob:|data:image|base64/,
  );
});

test("legacy listings can receive photos without duplication, and replacing one group preserves the other across tabs", async ({
  page,
  context,
}) => {
  await fillSubmission(page, "Existing Local Mandal");
  await page.getByRole("button", { name: "Remove ganapati.png" }).click();
  await page.getByRole("button", { name: "Remove decoration.png" }).click();
  await page.getByRole("button", { name: "Submit Ganapati" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Your Ganapati submission has been approved.",
    }),
  ).toBeVisible();
  const prior = await page.evaluate(
    () => JSON.parse(localStorage.getItem("gnm_demo_submissions")!)[0],
  );
  await page.goto(`/home?pandal=${prior.id}`);
  await readyMap(page);
  await page.getByRole("button", { name: "Add or update photos" }).click();
  let editor = page.getByRole("form", { name: "Update listing photos" });
  await editor
    .getByLabel("Ganapati Photos", { exact: true })
    .setInputFiles(ganapatiPhoto);
  await editor
    .getByLabel("Decoration Photos", { exact: true })
    .setInputFiles(decorationPhoto);
  await editor.getByRole("button", { name: "Save photos" }).click();
  await expectPhoto(page, page.locator(".preview-hero img"), ganapatiPhoto);

  const admin = await context.newPage();
  await admin.goto("/admin");
  await admin.getByRole("button", { name: /^Approved/ }).click();
  await admin
    .getByRole("button", { name: "Review Existing Local Mandal" })
    .click();
  await admin.getByRole("button", { name: "Add or update photos" }).click();
  editor = admin.getByRole("form", { name: "Update listing photos" });
  await editor
    .getByLabel("Ganapati Photos", { exact: true })
    .setInputFiles(secondGanapatiPhoto);
  await editor.getByRole("button", { name: "Save photos" }).click();
  await expectPhoto(
    page,
    page.locator(".preview-hero img"),
    secondGanapatiPhoto,
  );
  await admin.close();
  await page.reload();
  await expectPhoto(
    page,
    page.locator(".preview-hero img"),
    secondGanapatiPhoto,
  );
  await page
    .getByRole("button", { name: "View Decoration photo 1", exact: true })
    .click();
  await expectPhoto(page, page.locator(".preview-hero img"), decorationPhoto);
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("gnm_demo_submissions")!),
  );
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({
    id: prior.id,
    verificationStatus: prior.verificationStatus,
    category: prior.category,
    coordinates: prior.coordinates,
    submittedAt: prior.submittedAt,
  });
});

test("photo storage failure retains selected files and prevents false publication until retry succeeds", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (
      ...args: Parameters<IDBFactory["open"]>
    ) {
      if (document.documentElement.dataset.blockPhotos === "true")
        throw new DOMException("Blocked for test", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await fillSubmission(page, "Retry Photo Mandal");
  await page.evaluate(() => {
    document.documentElement.dataset.blockPhotos = "true";
  });
  await page.getByRole("button", { name: "Submit Ganapati" }).click();
  await expect(page.locator(".photo-save-error")).toContainText(
    "Photos couldn’t be saved in this browser",
  );
  await expect(page.getByLabel("Mandal Name")).toHaveValue(
    "Retry Photo Mandal",
  );
  await expect(
    page.getByRole("button", { name: "Remove ganapati.png" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("gnm_demo_submissions")),
  ).toBeNull();
  await page.evaluate(() => {
    document.documentElement.dataset.blockPhotos = "false";
  });
  await page.getByRole("button", { name: "Submit Ganapati" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Your Ganapati submission has been approved.",
    }),
  ).toBeVisible();
});

test("a decoration-only upload never becomes the Ganapati cover", async ({
  page,
}) => {
  await fillSubmission(page, "Decoration Only Mandal");
  await page.getByRole("button", { name: "Remove ganapati.png" }).click();
  await page.getByRole("button", { name: "Remove decoration.png" }).click();
  await page
    .locator('input[name="decoration-photos"]')
    .setInputFiles(decorationPhoto);
  await page.getByRole("button", { name: "Submit Ganapati" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Your Ganapati submission has been approved.",
    }),
  ).toBeVisible();
  const id = await page.evaluate(
    () => JSON.parse(localStorage.getItem("gnm_demo_submissions")!)[0].id,
  );
  await page.goto(`/home?pandal=${id}`);
  await page
    .getByRole("button", { name: "View Decoration photo 1", exact: true })
    .waitFor();
  await expect(page.locator(".preview-hero img")).toHaveAttribute(
    "src",
    "/illustrations/pandal.svg",
  );
  await page
    .getByRole("button", { name: "View Decoration photo 1", exact: true })
    .click();
  await expectPhoto(page, page.locator(".preview-hero img"), decorationPhoto);
});
