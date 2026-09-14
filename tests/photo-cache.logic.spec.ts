import { test, expect } from "@playwright/test";
import { createListingPhotoCache } from "../src/lib/listing-photo-cache";

test("photo URLs share concurrent work, expire early and stay within one account cache", async () => {
  let calls = 0;
  const sign = async (paths: string[]) => { calls++; return new Map(paths.map(path => [path, `signed-${calls}`])); };
  const cache = createListingPhotoCache(sign);
  const [a, b] = await Promise.all([cache.resolve(["ganapati", "decoration"]), cache.resolve(["ganapati", "decoration"])]);
  expect(a).toBe(b);
  expect(calls).toBe(1);
  await cache.resolve(["ganapati", "decoration"]);
  expect(calls).toBe(1);
  await cache.resolve(["ganapati", "decoration"], true);
  expect(calls).toBe(2);
  const realNow = Date.now;
  const now = Date.now();
  try {
    Date.now = () => now + 241_000;
    await cache.resolve(["ganapati", "decoration"]);
    expect(calls).toBe(3);
  } finally { Date.now = realNow; }
  const otherAccount = createListingPhotoCache(sign);
  await otherAccount.resolve(["ganapati", "decoration"]);
  expect(calls).toBe(4);
  cache.clear();
  await cache.resolve(["ganapati", "decoration"]);
  expect(calls).toBe(5);
});

test("failed signing can be retried and clearing does not retain a late response", async () => {
  let fail = true;
  const cache = createListingPhotoCache(async () => {
    if (fail) throw new Error("Unavailable");
    return new Map([["photo", "signed"]]);
  });
  await expect(cache.resolve(["photo"])).rejects.toThrow("Unavailable");
  fail = false;
  expect((await cache.resolve(["photo"])).get("photo")).toBe("signed");
  let calls = 0;
  let release!: (value: Map<string, string>) => void;
  const pending = new Promise<Map<string, string>>(resolve => { release = resolve; });
  const delayed = createListingPhotoCache(async () => { calls++; return pending; });
  const first = delayed.resolve(["photo"]);
  delayed.clear();
  release(new Map([["photo", "old"]]));
  await first;
  await delayed.resolve(["photo"]);
  expect(calls).toBe(2);
});
