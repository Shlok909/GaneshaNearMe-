"use client";

import { useEffect, useState } from "react";
import { readPhotoSet, type PhotoKind } from "@/lib/local-photos";

export type PhotoPreview = { name: string; url: string };
type PhotoState = Record<PhotoKind, PhotoPreview[]> & {
  id?: string;
  status: "loading" | "ready" | "missing" | "error";
};

export function useListingPhotos(id?: string) {
  const [state, setState] = useState<PhotoState>({
    status: "missing",
    ganapati: [],
    decoration: [],
  });
  useEffect(() => {
    if (!id) return;
    let disposed = false;
    const urls: string[] = [];
    readPhotoSet(id)
      .then((photos) => {
        if (disposed) return;
        const previews = (kind: PhotoKind) =>
          (photos?.[kind] ?? []).map((photo) => {
            const url = URL.createObjectURL(photo.blob);
            urls.push(url);
            return { name: photo.name, url };
          });
        setState({
          id,
          status: photos ? "ready" : "missing",
          ganapati: previews("ganapati"),
          decoration: previews("decoration"),
        });
      })
      .catch(() => {
        if (!disposed)
          setState({ id, status: "error", ganapati: [], decoration: [] });
      });
    return () => {
      disposed = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [id]);
  // Never render a URL from the previous listing while the new set loads.
  return state.id === id
    ? state
    : {
        id,
        status: id ? ("loading" as const) : ("missing" as const),
        ganapati: [],
        decoration: [],
      };
}
