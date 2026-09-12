import { test, expect, readyMap } from "./helpers";

test("landing, demo login, map, saved deep links and logout remain working", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Discover Ganapatis around you." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "List Your Pandal" }),
  ).toHaveAttribute("href", "/auth");
  await page
    .getByRole("link", { name: "Explore Ganapatis", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill("explorer@example.com");
  await page.getByLabel("Password", { exact: true }).fill("festival123");
  await page.getByRole("button", { name: "Login", exact: true }).last().click();
  await expect(page).toHaveURL(/\/home$/);
  await readyMap(page);
  await expect(page.locator(".modak-map-marker")).toHaveCount(7);
  await expect(
    page.getByRole("link", { name: "Google", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search an area or Ganapati").fill("  pRaTaP nAgAr ");
  await page.getByLabel("Search an area or Ganapati").press("ArrowDown");
  await page.getByLabel("Search an area or Ganapati").press("Enter");
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText("Demo Pratap Nagar Ganesh Utsav Mandal");
  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    sheet.getByRole("button", { name: "Saved", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: testInfo.outputPath("pandal-details.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Saved", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Demo Pratap Nagar Ganesh Utsav Mandal",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View", exact: true }).click();
  await expect(page).toHaveURL(/pandal=demo-pratap-nagar/);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Your profile" }).click();
  await expect(page.getByText("explorer@example.com").first()).toBeVisible();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/auth$/);
  expect(
    await page.evaluate(() => localStorage.getItem("gnm_demo_user")),
  ).toBeNull();
});

test("signup validation and simulated Google entry remain working", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Sign Up", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("Meera Joshi");
  await page.getByLabel("Email", { exact: true }).fill("meera@example.com");
  await page.getByLabel("Password", { exact: true }).fill("festival123");
  await page.getByLabel("Confirm Password", { exact: true }).fill("different");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByText("Your passwords don’t match.")).toBeVisible();
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill("festival123");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "Meera Joshi" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Logout" }).click();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("gnm_demo_user") || "{}").name,
    ),
  ).toBe("Aarav Deshmukh");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "festival123",
  );
});
