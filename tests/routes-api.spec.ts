import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test, anonymousTest, expect } from "./helpers";

const coordinates = { origin: { lat: 21.1458, lng: 79.0882 }, destination: { lat: 21.1393, lng: 79.0607 } };

test("route limits return retry guidance and fail closed if quota storage is unavailable", async ({ context, request, baseURL }) => {
  await request.post("http://127.0.0.1:54329/__test/settings", { data: { faults: { routeRetryAfter: 30 } } });
  const limited = await context.request.post("/api/routes", { data: coordinates, headers: { Origin: baseURL! } });
  expect(limited.status()).toBe(429);
  expect(limited.headers()["retry-after"]).toBe("30");
  await request.post("http://127.0.0.1:54329/__test/settings", { data: { faults: { routeLimit: true } } });
  expect((await context.request.post("/api/routes", { data: coordinates, headers: { Origin: baseURL! } })).status()).toBe(503);
});

anonymousTest("routes endpoint rejects unauthenticated requests", async ({ request, baseURL }) => {
  const response = await request.post("/api/routes", { data: coordinates, headers: { Origin: baseURL! } });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("routes endpoint checks origin, body size, format and coordinates", async ({ context, baseURL }) => {
  const request = context.request;
  expect((await request.post("/api/routes", { data: coordinates })).status()).toBe(403);
  expect((await request.post("/api/routes", { data: coordinates, headers: { Origin: "https://other-site.example" } })).status()).toBe(403);
  const headers = { Origin: baseURL!, "Content-Type": "application/json" };
  expect((await request.post("/api/routes", { data: "{", headers })).status()).toBe(400);
  expect((await request.post("/api/routes", { data: " ".repeat(2050), headers })).status()).toBe(413);
  expect((await request.post("/api/routes", { data: "text", headers: { Origin: baseURL!, "Content-Type": "text/plain" } })).status()).toBe(415);
  for (const data of [null, {}, { ...coordinates, origin: { lat: 91, lng: 79 } }, { ...coordinates, destination: { lat: "21", lng: 79 } }, { ...coordinates, travelMode: "TWO_WHEELER" }, { ...coordinates, url: "https://other-site.example" }]) {
    expect((await request.post("/api/routes", { data: JSON.stringify(data), headers })).status()).toBe(400);
  }
});

test("authenticated routes use the server key and return only the display data", async ({ context, baseURL }) => {
  const response = await context.request.post("/api/routes", { data: coordinates, headers: { Origin: baseURL! } });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({ route: {
    path: [coordinates.origin, { lat: coordinates.origin.lat, lng: coordinates.destination.lng }, coordinates.destination],
    distanceMeters: 3400, durationMillis: 480000, warnings: ["Test road advisory"],
  } });
  expect(await response.text()).not.toContain("routes_server_test_only_never_public");
});

test("provider errors, exhausted quota, empty and malformed paths never leak secrets", async ({ context, baseURL }) => {
  for (const [latitude, status] of [[90, 502], [89, 200], [88, 502], [87, 429]]) {
    const response = await context.request.post("/api/routes", {
      data: { ...coordinates, origin: { lat: latitude, lng: 79 } }, headers: { Origin: baseURL! },
    });
    expect(response.status()).toBe(status);
    expect(await response.text()).not.toContain("routes_server_test_only_never_public");
    expect(response.headers()["cache-control"]).toContain("no-store");
    if (latitude === 89) expect(await response.json()).toEqual({ route: null });
  }
});

test("the production browser bundle contains no Routes key or direct provider endpoint", async () => {
  async function checkDirectory(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await checkDirectory(path);
      else if (entry.name.endsWith(".js")) {
        const source = await readFile(path, "utf8");
        expect(source.includes("routes_server_test_only_never_public"), entry.name).toBe(false);
        expect(source.includes("NEXT_PUBLIC_GOOGLE_ROUTES_API_KEY"), entry.name).toBe(false);
        expect(source.includes("https://routes.googleapis.com/directions/v2:computeRoutes"), entry.name).toBe(false);
      }
    }
  }
  await checkDirectory(".next-e2e/static");
});
