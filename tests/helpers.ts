import { test as base, expect, type Page } from "@playwright/test";

import { pandals } from "./fixtures/pandals";
import type { Submission } from "../src/lib/types";
import { createServerClient } from "@supabase/ssr";

const fixtureSubmissions: Submission[] = pandals.map((pandal) => ({
  id: pandal.id,
  mandalName: pandal.name,
  locationText: pandal.area,
  coordinates: pandal.coordinates,
  submitterName: "Test Organizer",
  submitterRole: "Organizer",
  contact: "+919876543210",
  publicAccess: true,
  ganapatiImages: { names: ["test.png"], count: 1 },
  decorationImages: { names: ["test-decoration.png"], count: 1 },
  score: 11,
  verificationStatus: "approved",
  category: pandal.category ?? "community",
  submittedAt: "2026-09-12T12:00:00.000Z",
}));

import { installGoogleMapsDouble } from "./google-maps-double";

export const test = base.extend<{
  browserErrors: string[];
  seedListings: boolean;
  authenticated: boolean;
  authSession: void;
}>({
  seedListings: [true, { option: true }],
  authenticated: [true, { option: true }],
  authSession: [
    async ({ context, request, authenticated, baseURL }, use) => {
      await request.post("http://127.0.0.1:54329/__test/reset");
      if (authenticated) {
        const client = createServerClient(
          "http://127.0.0.1:54329",
          "sb_publishable_test_only",
          {
            cookies: {
              getAll: async () =>
                (await context.cookies()).map(({ name, value }) => ({
                  name,
                  value,
                })),
              setAll: async (cookies) => {
                await context.addCookies(
                  cookies.map(({ name, value, options }) => ({
                    name,
                    value,
                    url: baseURL!,
                    sameSite: "Lax" as const,
                    ...(options.maxAge
                      ? {
                          expires:
                            Math.floor(Date.now() / 1000) + options.maxAge,
                        }
                      : {}),
                  })),
                );
              },
            },
          },
        );
        const { error } = await client.auth.signInWithPassword({
          email: "explorer@example.com",
          password: "festival123",
        });
        expect(error).toBeNull();
      }
      await use();
    },
    { auto: true },
  ],
  browserErrors: [
    async ({ page, context, seedListings }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await context.addInitScript(installGoogleMapsDouble);
      // Only isolated test contexts receive records. Never overwrite user submissions
      // created later in a test, including after reload or a route navigation.
      if (seedListings)
        await page.addInitScript((records) => {
          if (localStorage.getItem("gnm_demo_submissions") === null) {
            localStorage.setItem(
              "gnm_demo_submissions",
              JSON.stringify(records),
            );
          }
        }, fixtureSubmissions);
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: undefined,
        });
      });
      await use(errors);
      expect(
        errors,
        "No browser exceptions, hydration, React or Maps integration errors",
      ).toEqual([]);
    },
    { auto: true },
  ],
});
export const emptyTest = test.extend({ seedListings: false });
export const anonymousTest = test.extend({ authenticated: false });
export { expect };

export const photo = {
  name: "ganapati.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5V8AAAAASUVORK5CYII=",
    "base64",
  ),
};
export async function readyMap(page: Page) {
  await expect(page.locator('[data-map-status="ready"]').first()).toBeVisible();
}
export async function fillSubmission(page: Page, name: string) {
  await page.goto("/add");
  await page.getByLabel("Mandal Name").fill(name);
  await page
    .getByLabel("Exact Location", { exact: true })
    .fill("21.1458,79.0882");
  await page.getByLabel("Your Name").fill("Meera Joshi");
  await page.getByRole("radio", { name: "Volunteer", exact: true }).check();
  await page.getByLabel("Organizer / Mandal Contact").fill("+91 98765 43210");
  await page.getByRole("radio", { name: "Yes, everyone is welcome" }).check();
  await page.locator('input[name="ganapati-photos"]').setInputFiles(photo);
  await page
    .locator('input[name="decoration-photos"]')
    .setInputFiles({ ...photo, name: "decoration.png" });
}

type GeoHarness = {
  calls: number;
  cleared: number[];
  options?: PositionOptions;
  success?: PositionCallback;
  failure?: PositionErrorCallback;
};
declare global {
  interface Window {
    __testGeo: GeoHarness;
    __testMaps: {
      mapsCreated: number;
      markersCreated: number;
      markersRemoved: number;
      failLoads: number;
      imports: string[];
    };
  }
}
export async function installGeoHarness(page: Page) {
  await page.addInitScript(() => {
    window.__testGeo = { calls: 0, cleared: [] };
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        watchPosition(
          success: PositionCallback,
          failure: PositionErrorCallback,
          options: PositionOptions,
        ) {
          const state = window.__testGeo;
          state.success = success;
          state.failure = failure;
          state.options = options;
          return ++state.calls;
        },
        clearWatch(id: number) {
          window.__testGeo.cleared.push(id);
        },
      },
    });
  });
}
export async function emitLocation(page: Page, lat = 21.1458, lng = 79.0882) {
  await page.evaluate(
    ({ lat, lng }) => {
      window.__testGeo.success?.({
        coords: {
          latitude: lat,
          longitude: lng,
          accuracy: 15,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    },
    { lat, lng },
  );
}

export async function fillManualSubmission(page: Page, name: string) {
  await page.goto("/add");
  await page.getByLabel("Mandal Name").fill(name);
  await page
    .getByLabel("Exact Location", { exact: true })
    .fill("21.1458,79.0882");
  await page.getByRole("radio", { name: "Yes, everyone is welcome" }).check();
}
