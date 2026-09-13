import type { Locator, Page } from "@playwright/test";
import { emptyTest as test, expect, fillSubmission, readyMap } from "./helpers";
import { ganapatiPhoto, decorationPhoto } from "./fixtures/photos";

const service = "http://127.0.0.1:54329";
async function expectPhoto(page: Page, image: Locator, file: typeof ganapatiPhoto) {
  await expect(image).toHaveAttribute("src", /\/storage\/v1\/object\/sign\/pandal-images\//);
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  const bytes = await page.evaluate(async url => Array.from(new Uint8Array(await (await fetch(url!)).arrayBuffer())), await image.getAttribute("src"));
  expect(Buffer.from(bytes)).toEqual(file.buffer);
}

test("uploaded bytes stay in the Ganapati and decoration groups after reload and saving", async ({ page, request }, testInfo) => {
  await fillSubmission(page, "Photo Test Mandal");
  await page.getByRole("button", { name: "Remove ganapati.png" }).click();
  await page.getByRole("button", { name: "Remove decoration.png" }).click();
  await page.locator('input[name="ganapati-photos"]').setInputFiles(ganapatiPhoto);
  await page.locator('input[name="decoration-photos"]').setInputFiles(decorationPhoto);
  await page.getByRole("button", { name: "Submit Ganapati" }).click();
  await expect(page.getByRole("heading", { name: "Your Ganapati submission has been approved." })).toBeVisible();
  const state = await (await request.get(service + "/__test/state")).json();
  expect(state.tables.pandal_submissions).toHaveLength(1);
  const record = state.tables.pandal_submissions[0];
  expect(record.status).toBe("approved");
  expect(record.verification_score).toBe(11);
  expect(record.ganapati_image_paths[0]).toContain("/ganapati/");
  expect(record.pandal_image_paths[0]).toContain("/pandal/");
  await page.goto("/home?pandal=" + record.id);
  await readyMap(page);
  const hero = page.locator(".preview-hero img");
  await expectPhoto(page, hero, ganapatiPhoto);
  await page.getByRole("button", { name: "View Decoration photo 1" }).click();
  await expectPhoto(page, hero, decorationPhoto);
  await page.reload();
  await expectPhoto(page, hero, ganapatiPhoto);
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("supabase-photos.png"), fullPage: true });
  await page.goto("/saved");
  await expectPhoto(page, page.locator(".pandal-card-image img"), ganapatiPhoto);
  expect(await page.evaluate(() => localStorage.getItem("gnm_demo_submissions"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("gnm_saved_pandals"))).toBeNull();
});

test("both image groups are required and a private approval is never published", async ({ page, request }) => {
  await fillSubmission(page, "Private Test Mandal");
  await page.getByRole("button", { name: "Remove decoration.png" }).click();
  await page.getByRole("radio", { name: "No, it’s a private celebration" }).check();
  await page.getByRole("button", { name: "Submit Ganapati" }).click();
  await expect(page.getByText("Upload 1–3 Pandal/Decoration photos.")).toBeVisible();
  expect((await (await request.get(service + "/__test/state")).json()).tables.pandal_submissions).toHaveLength(0);
  await page.locator('input[name="decoration-photos"]').setInputFiles(decorationPhoto);
  await page.getByRole("button", { name: "Submit Ganapati" }).click();
  await expect(page.getByRole("heading", { name: "Your Ganapati submission has been approved." })).toBeVisible();
  await expect(page.getByText("Your submission is approved. Private celebrations stay off the public map.")).toBeVisible();
  const state = await (await request.get(service + "/__test/state")).json();
  expect(state.tables.pandals).toHaveLength(0);
  expect(state.tables.pandal_submissions[0].verification_score).toBe(10);
  await page.goto("/profile");
  await page.getByText("My Submissions", { exact: false }).first().click();
  await expect(page.locator(".my-submissions-list")).toContainText("Private Test Mandal");
  await expect(page.locator(".my-submissions-list")).not.toContainText("score");
});

test.describe("recoverable upload failures", () => {
  test.use({ expectedHttpErrors: [503] });
  test("partial upload retries the same draft and preserves completed photos", async ({ page, request }) => {
    await request.post(service + "/__test/settings", { data: { faults: { upload: true, uploadGroup: "pandal" } } });
    await fillSubmission(page, "Retry Test Mandal");
    await page.getByRole("button", { name: "Submit Ganapati" }).click();
    await expect(page.locator(".photo-save-error")).toContainText("Your draft and completed uploads are saved");
    let state = await (await request.get(service + "/__test/state")).json();
    expect(state.tables.pandal_submissions).toHaveLength(1);
    const id = state.tables.pandal_submissions[0].id;
    expect(state.tables.pandal_submissions[0].status).toBe("draft");
    expect(state.tables.pandals).toHaveLength(0);
    expect(state.objects).toHaveLength(1);
    const path = state.objects[0].name;
    await expect(page.getByLabel("Mandal Name")).toBeDisabled();
    await request.post(service + "/__test/settings", { data: { faults: { upload: false } } });
    await page.getByRole("button", { name: "Retry submission" }).click();
    await expect(page.getByRole("heading", { name: "Your Ganapati submission has been approved." })).toBeVisible();
    state = await (await request.get(service + "/__test/state")).json();
    expect(state.tables.pandal_submissions).toHaveLength(1);
    expect(state.tables.pandal_submissions[0].id).toBe(id);
    expect(state.tables.pandals).toHaveLength(1);
    expect(state.objects).toHaveLength(2);
    expect(state.objects.map((object: { name: string }) => object.name)).toContain(path);
  });
});
