"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useListingPhotoCache } from "@/components/ListingPhotoProvider";
import type { PhotoKind, PhotoPaths } from "@/lib/types";

export type PhotoPreview = { name: string; url: string };
type PhotoState = Record<PhotoKind, PhotoPreview[]> & {
  key: string; status: "loading" | "ready" | "missing" | "error";
};
export function useListingPhotos(paths?: PhotoPaths) {
  const cache = useListingPhotoCache();
  const key = JSON.stringify(paths ?? { ganapati: [], decoration: [] });
  const [revision, setRevision] = useState(0);
  const requestKey = `${revision}:${key}`;
  const [state, setState] = useState<PhotoState>({ key: "", status: "missing", ganapati: [], decoration: [] });
  const lastRecovery = useRef(0);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  const onError = useCallback(() => {
    // Recover an expired URL once; repeated failures show a placeholder instead of a request loop.
    if (Date.now() - lastRecovery.current > 30_000) { lastRecovery.current = Date.now(); retry(); }
    else setState(current => ({ ...current, status: "error", ganapati: [], decoration: [] }));
  }, [retry]);
  useEffect(() => {
    const groups: PhotoPaths = JSON.parse(key);
    const all = [...groups.ganapati, ...groups.decoration];
    if (!all.length) return;
    let active = true;
    async function sign(force = false) {
      try {
        const urls = await cache.resolve(all, force);
        const previews = (kind: PhotoKind) => groups[kind].map((path, index) => ({
          name: (kind === "ganapati" ? "Ganapati" : "Decoration") + " photo " + (index + 1),
          url: urls.get(path)!,
        }));
        if (active) setState({ key: requestKey, status: "ready", ganapati: previews("ganapati"), decoration: previews("decoration") });
      } catch { if (active) setState({ key: requestKey, status: "error", ganapati: [], decoration: [] }); }
    }
    void sign(revision > 0);
    const refresh = () => { void sign(); };
    const interval = window.setInterval(refresh, 240_000);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [key, revision, requestKey, cache]);
  const empty = !paths || (!paths.ganapati.length && !paths.decoration.length);
  return { ...(empty ? { key, status: "missing" as const, ganapati: [], decoration: [] }
    : state.key === requestKey ? state : { key, status: "loading" as const, ganapati: [], decoration: [] }), retry, onError };
}
