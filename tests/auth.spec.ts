import { anonymousTest, test, expect } from "./helpers";

const service = "http://127.0.0.1:54329";

anonymousTest(
  "all protected pages reject anonymous cookies and legacy flags; invalid callback stays friendly",
  async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem("gnm_demo_logged_in", "true"),
    );
    for (const path of ["/home", "/add", "/saved", "/profile", "/admin"]) {
      await page.goto(path);
      await expect(page).toHaveURL(
        new RegExp(`/auth\\?next=${encodeURIComponent(path)}$`),
      );
      await expect(
        page.getByRole("heading", { name: "Welcome to the celebration." }),
      ).toBeVisible();
    }
    await page.goto(
      "/auth/confirm?type=email&token_hash=invalid-do-not-display&next=https://example.com",
    );
    await expect(page).toHaveURL(/\/auth\/error$/);
    await expect(
      page.getByRole("heading", { name: "Authentication problem" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      "invalid-do-not-display",
    );
    await page.getByRole("link", { name: "Back to Login" }).click();
    await expect(page).toHaveURL(/\/auth$/);
  },
);

anonymousTest(
  "wrong login fails, safe return succeeds, reload and new tab keep the session",
  async ({ page, context }) => {
    await page.goto("/saved");
    await page
      .getByLabel("Email", { exact: true })
      .fill("explorer@example.com");
    await page
      .getByLabel("Password", { exact: true })
      .fill("incorrect-password");
    await page
      .getByRole("button", { name: "Login", exact: true })
      .last()
      .click();
    await expect(
      page.getByText("Email or password is incorrect."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/auth\?next=/);
    await page.getByLabel("Password", { exact: true }).fill("festival123");
    await page
      .getByRole("button", { name: "Login", exact: true })
      .last()
      .click();
    await expect(page).toHaveURL(/\/saved$/);
    await page.reload();
    await expect(page).toHaveURL(/\/saved$/);
    const second = await context.newPage();
    await second.goto("/profile");
    await expect(
      second.getByRole("heading", { name: "Test Explorer" }),
    ).toBeVisible();
    await second.goto("/auth");
    await expect(second).toHaveURL(/\/home$/);
    await second.close();
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(
      /festival123|access_token|refresh_token/,
    );
  },
);

anonymousTest(
  "signup with confirmation off returns a session and rejects an external next URL",
  async ({ page, request }) => {
    await request.post(`${service}/__test/settings`, {
      data: { confirmEmail: false },
    });
    await page.goto("/auth?next=https://example.com");
    await page.getByRole("button", { name: "Sign Up", exact: true }).click();
    await page
      .getByLabel("Full Name", { exact: true })
      .fill("  New Explorer  ");
    await page.getByLabel("Email", { exact: true }).fill("new@example.com");
    await page.getByLabel("Password", { exact: true }).fill("festival123");
    await page
      .getByLabel("Confirm Password", { exact: true })
      .fill("festival123");
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.goto("/profile");
    await expect(
      page.getByRole("heading", { name: "New Explorer", exact: true }),
    ).toBeVisible();
    const state = await (await request.get(`${service}/__test/state`)).json();
    expect(
      state.users.find(
        (user: { email: string }) => user.email === "new@example.com",
      ).user_metadata.full_name,
    ).toBe("New Explorer");
  },
);

test("profile updates real Auth metadata and header, logout clears cookies and rejects back navigation", async ({
  page,
  context,
  request,
}) => {
  await page.goto("/profile");
  for (const width of [360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(page.getByText("September 2026", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Your profile" })).toHaveText(
    "TE",
  );
  await page.getByLabel("Full Name", { exact: true }).fill("  Meera Joshi  ");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(
    page.getByText("Profile updated", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Your profile" })).toHaveText(
    "MJ",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Meera Joshi", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Full Name", { exact: true })).toHaveValue(
    "Meera Joshi",
  );
  const state = await (await request.get(`${service}/__test/state`)).json();
  expect(state.users[0].user_metadata.full_name).toBe("Meera Joshi");
  await page.goto("/saved");
  await page.goto("/profile");
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page).toHaveURL(/\/auth$/);
  expect(
    (await context.cookies()).filter((cookie) =>
      cookie.name.includes("auth-token"),
    ),
  ).toHaveLength(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/auth(?:\?|$)/);
  await page.goto("/home");
  await expect(page).toHaveURL(/\/auth\?next=/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome to the celebration." }),
  ).toBeVisible();
});

test("server proxy refreshes an expired token and returns the new cookies with private cache headers", async ({
  context,
  request,
  baseURL,
}) => {
  const session = await (
    await request.post(`${service}/__test/expired-session`)
  ).json();
  const cookie = (await context.cookies()).find((entry) =>
    entry.name.endsWith("auth-token"),
  )!;
  await context.addCookies([
    {
      name: cookie.name,
      value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
      url: baseURL!,
    },
  ]);
  const response = await context.request.get(`${baseURL}/profile`, {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["set-cookie"]).toContain(cookie.name);
  const state = await (await request.get(`${service}/__test/state`)).json();
  expect(state.refreshCount).toBe(1);
  expect(
    (await context.cookies()).find((entry) => entry.name === cookie.name)
      ?.value,
  ).not.toBe(cookie.value);
});

test("a forged JWT is rejected before protected content renders", async ({
  context,
  baseURL,
}) => {
  const cookie = (await context.cookies()).find((entry) =>
    entry.name.endsWith("auth-token"),
  )!;
  const session = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  const parts = session.access_token.split(".");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  payload.sub = "forged-user";
  parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
  session.access_token = parts.join(".");
  await context.addCookies([
    {
      name: cookie.name,
      value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
      url: baseURL!,
    },
  ]);
  const response = await context.request.get(`${baseURL}/admin`, {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain("/auth?");
  expect(await response.text()).not.toContain("GnM Admin");
});

anonymousTest(
  "auth is usable at phone and desktop widths with clear validation and no overflow",
  async ({ page }) => {
    for (const width of [360, 390, 430, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/auth");
      await page.getByRole("button", { name: "Sign Up", exact: true }).click();
      await page.getByRole("button", { name: "Create Account" }).click();
      await expect(
        page.getByText("Please enter your full name."),
      ).toBeVisible();
      await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  },
);
