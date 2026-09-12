import { test, expect } from "@playwright/test";
import { safeNextPath } from "../src/lib/auth/redirects";
import { validateName } from "../src/lib/auth/validation";

test("safe next blocks external, encoded and malformed paths while retaining listing links", () => {
  for (const path of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2f%2fevil.test",
    "/auth",
    "/home/../../auth",
    "/saved#token",
    "/saved\n",
  ])
    expect(safeNextPath(path)).toBe("/home");
  expect(safeNextPath("/saved")).toBe("/saved");
  expect(safeNextPath("/home?pandal=local-123")).toBe("/home?pandal=local-123");
  expect(safeNextPath("/profile?token=secret")).toBe("/profile");
});
test("profile validation trims, limits name length and rejects control characters", () => {
  expect(validateName("   ")).toBeTruthy();
  expect(validateName("A".repeat(81))).toBeTruthy();
  expect(validateName("Meera\nJoshi")).toBeTruthy();
  expect(validateName("  मीरा जोशी  ")).toBeUndefined();
});
