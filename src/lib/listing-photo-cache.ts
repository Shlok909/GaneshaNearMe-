type SignedPhotos = Map<string, string>;
type Entry = { expiresAt: number; urls?: SignedPhotos; pending?: Promise<SignedPhotos> };

// Owned by one mounted account provider, never shared between users or persisted.
export function createListingPhotoCache(sign: (paths: string[]) => Promise<SignedPhotos>) {
  const entries = new Map<string, Entry>();
  return {
    clear: () => entries.clear(),
    resolve(paths: string[], force = false): Promise<SignedPhotos> {
      const key = JSON.stringify(paths);
      const existing = entries.get(key);
      if (existing?.pending) return existing.pending;
      if (!force && existing?.urls && existing.expiresAt > Date.now()) return Promise.resolve(existing.urls);
      // Bound retained URLs when browsing a large number of listings.
      if (entries.size >= 100) entries.delete(entries.keys().next().value!);
      const entry: Entry = { expiresAt: 0 };
      entries.set(key, entry);
      let timeout: ReturnType<typeof setTimeout>;
      entry.pending = Promise.race([
        sign([...paths]),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Photo loading timed out")), 15_000);
        }),
      ]).then(urls => {
        entry.urls = urls;
        // URLs are issued for five minutes; stop reusing them a minute early.
        entry.expiresAt = Date.now() + 240_000;
        return urls;
      }).catch(error => {
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      }).finally(() => { clearTimeout(timeout); entry.pending = undefined; });
      return entry.pending;
    },
  };
}
