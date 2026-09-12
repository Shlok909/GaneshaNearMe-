// Replace this adapter with backend persistence in a later stage.
// Browser APIs are called only by events or useSyncExternalStore on the client.
const CHANGE_EVENT = "gnm-storage-change";
const memory = new Map<string, string>();
const volatileKeys = new Set<string>();

export const storageKeys = {
  saved: "gnm_saved_pandals",
  submissions: "gnm_demo_submissions",
} as const;

export function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  if (volatileKeys.has(key)) return memory.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function writeStorage(key: string, value: string | null): boolean {
  if (typeof window === "undefined") return false;
  if (value === null) memory.delete(key);
  else memory.set(key, value);
  let persisted = true;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    volatileKeys.delete(key);
  } catch {
    persisted = false;
    volatileKeys.add(key);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return persisted;
}

export function subscribeStorage(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

export function parseSaved(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(value)
      ? [...new Set(value.filter((id): id is string => typeof id === "string"))]
      : [];
  } catch {
    return [];
  }
}
