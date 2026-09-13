// Live, disposable test identities must be provisioned separately. Never uses a service key.
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 30000 });
process.loadEnvFile(".env.local");
const fixturePath = "verification-artifacts/part2-test-identities.json";
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const clients = fixture.users.map(() => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }));
const report = process.argv.includes("--ui-only") ? JSON.parse(await readFile("verification-artifacts/part2-live-report.json", "utf8")) : { checks: [], browserErrors: [] };
const pass = name => { report.checks.push(name); console.log("PASS: " + name); };
const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5V8AAAAASUVORK5CYII=", "base64");
let browser;
try {
  for (let i = 0; i < clients.length; i++) {
    const { error } = await clients[i].auth.signInWithPassword({ email: fixture.users[i].email, password: fixture.users[i].password });
    assert.equal(error, null, "Live test login failed");
  }
  const [a, b] = clients;
  if (process.argv.includes("--cleanup")) {
    const paths = fixture.paths || [];
    if (paths.length) {
      const { error } = await a.storage.from("pandal-images").remove(paths);
      assert.equal(error, null, "Storage cleanup failed");
      const { data, error: listError } = await a.storage.from("pandal-images").list(`${fixture.users[0].id}/${fixture.submissionId}/ganapati`);
      assert.equal(listError, null); assert.equal(data.length, 0);
    }
    pass("Temporary Storage objects deleted through the Storage API");
  } else {
    const hiddenSchema = await a.schema("private").rpc("is_admin");
    assert.equal(hiddenSchema.error?.code, "PGRST106");
    pass("Private helper schema is not exposed by the Data API");
    if (!process.argv.includes("--ui-only")) {
    pass("Two real Auth sessions issued with publishable-key clients");
    const { data: profiles, error: profileError } = await a.from("profiles").select("id,full_name");
    assert.equal(profileError, null); assert.equal(profiles.length, 1); assert.equal(profiles[0].id, fixture.users[0].id);
    pass("Live profile ownership and signup trigger");
    fixture.submissionId = randomUUID(); fixture.paths = ["ganapati", "pandal"].map(kind => `${fixture.users[0].id}/${fixture.submissionId}/${kind}/${randomUUID()}.png`);
    await writeFile(fixturePath, JSON.stringify(fixture));
    const { error: draftError } = await a.from("pandal_submissions").insert({ id: fixture.submissionId, submitted_by: fixture.users[0].id, mandal_name: "Temporary GnM Integration Check", area: "Nagpur", latitude: 21.1458, longitude: 79.0882, submitter_name: "Test Organizer", submitter_role: "organizer", contact_phone: "+91 98765 43210", public_access: true });
    assert.equal(draftError, null);
    const incomplete = await a.rpc("finalize_pandal_submission", { p_submission_id: fixture.submissionId });
    assert.equal(incomplete.error?.code, "22023");
    pass("Incomplete real submission remains a draft");
    for (const path of fixture.paths) {
      const { error } = await a.storage.from("pandal-images").upload(path, bytes, { contentType: "image/png", upsert: false }); assert.equal(error, null);
    }
    pass("Actual image bytes uploaded into both private Storage folders");
    const pending = await b.storage.from("pandal-images").createSignedUrls(fixture.paths, 60);
    assert.ok(pending.error || pending.data.every(item => item.error));
    pass("User B cannot sign User A’s pending image paths");
    const first = await a.rpc("finalize_pandal_submission", { p_submission_id: fixture.submissionId });
    assert.equal(first.error, null); assert.equal(first.data[0].published, true);
    const second = await a.rpc("finalize_pandal_submission", { p_submission_id: fixture.submissionId });
    assert.equal(second.error, null); assert.deepEqual(second.data, first.data);
    pass("Real upload metadata finalizes and publishes exactly once");
    const signed = await b.storage.from("pandal-images").createSignedUrls(fixture.paths, 60);
    assert.equal(signed.error, null);
    for (const file of signed.data) {
      assert.ok(file.signedUrl); assert.equal(file.error, null);
      const response = await fetch(file.signedUrl); assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    }
    pass("Approved private-bucket images sign and download with identical bytes for User B");
    const { data: hidden, error: hiddenError } = await b.from("pandal_submissions").select("contact_phone").eq("id", fixture.submissionId);
    assert.equal(hiddenError, null); assert.equal(hidden.length, 0);
    const { data: nearby, error: nearbyError } = await b.rpc("nearby_pandals", { p_latitude: 21.1458, p_longitude: 79.0882, p_radius_km: 5 });
    assert.equal(nearbyError, null); assert.ok(nearby.some(p => p.id === fixture.submissionId && p.distance_meters < 1));
    pass("Live Data API hides contact and returns canonical PostGIS distances");
    const saved = await b.from("saved_pandals").insert({ user_id: fixture.users[1].id, pandal_id: fixture.submissionId }); assert.equal(saved.error, null);
    assert.equal((await a.from("saved_pandals").select("*")).data.length, 0);
    pass("Live saved Ganapatis are account-specific");
    }
    browser = await chromium.launch({ channel: "chrome" });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("pageerror", error => report.browserErrors.push(error.message));
    page.on("console", message => { if (message.type() === "error") report.browserErrors.push(message.text().replace(/AIza[\w-]+/g, "[redacted]")); });
    await page.goto("http://localhost:3000/auth");
    await page.getByLabel("Email", { exact: true }).fill(fixture.users[1].email);
    await page.getByLabel("Password", { exact: true }).fill(fixture.users[1].password);
    await page.getByRole("button", { name: "Login", exact: true }).last().click();
    await expect(page).toHaveURL(/\/home$/, { timeout: 30000 });
    await page.goto("http://localhost:3000/home?pandal=" + fixture.submissionId);
    await expect(page.locator(".preview-hero img")).toHaveAttribute("src", /\/storage\/v1\/object\/sign\//, { timeout: 30000 });
    await expect.poll(() => page.locator(".preview-hero img").evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await page.getByRole("button", { name: "View Decoration photo 1" }).click();
    await expect(page.locator(".preview-hero img")).toHaveAttribute("src", /\/pandal\//);
    await page.screenshot({ path: "verification-artifacts/part2-live-photos.png", fullPage: true });
    await page.goto("http://localhost:3000/saved");
    await expect(page.getByRole("heading", { name: "Temporary GnM Integration Check", exact: true })).toBeVisible();
    await page.goto("http://localhost:3000/admin");
    await expect(page.getByRole("heading", { name: "Administrator access required" })).toBeVisible();
    assert.deepEqual(report.browserErrors, []);
    pass("Real app login, Home photos, Saved and admin denial without browser errors");
  }
} finally {
  if (browser) await browser.close();
  for (const client of clients) await client.auth.signOut();
  await writeFile(process.argv.includes("--cleanup") ? "verification-artifacts/part2-live-cleanup-report.json" : "verification-artifacts/part2-live-report.json", JSON.stringify(report, null, 2));
}
