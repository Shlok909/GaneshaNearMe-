import { readStorage, storageKeys, writeStorage } from "./demo-storage";
import type { DemoUser } from "./types";

export const defaultDemoUser: DemoUser = {
  name: "Guest",
  email: "",
};

// Supabase Auth will replace this adapter. Never persist passwords in demo storage.
export function signInDemo(user: DemoUser = defaultDemoUser) {
  const savedUser = writeStorage(storageKeys.user, JSON.stringify(user));
  const savedFlag = writeStorage(storageKeys.loggedIn, "true");
  return savedUser && savedFlag;
}

export function signOutDemo() {
  writeStorage(storageKeys.loggedIn, null);
  writeStorage(storageKeys.user, null);
}

export function getUserSnapshot() {
  return readStorage(storageKeys.user);
}

export function parseDemoUser(raw: string | null): DemoUser {
  try {
    const user: unknown = JSON.parse(raw ?? "null");
    if (
      user &&
      typeof user === "object" &&
      "name" in user &&
      "email" in user &&
      typeof user.name === "string" &&
      typeof user.email === "string"
    )
      return { name: user.name, email: user.email };
  } catch {
    /* A malformed demo record falls back to the default profile. */
  }
  return defaultDemoUser;
}
