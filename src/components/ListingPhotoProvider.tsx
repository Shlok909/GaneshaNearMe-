"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createListingPhotoCache } from "@/lib/listing-photo-cache";

const Context = createContext<ReturnType<typeof createListingPhotoCache> | null>(null);

export function ListingPhotoProvider({ children }: { children: React.ReactNode }) {
  const [cache] = useState(() => createListingPhotoCache(async paths => {
    const { data, error } = await createClient().storage.from("pandal-images").createSignedUrls(paths, 300);
    if (error || !data || data.some(item => item.error || !item.path || !item.signedUrl)) {
      throw new Error("Photos unavailable");
    }
    return new Map(data.map(item => [item.path!, item.signedUrl!]));
  }));
  useEffect(() => {
    const { data: { subscription } } = createClient().auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") cache.clear();
    });
    return () => { subscription.unsubscribe(); cache.clear(); };
  }, [cache]);
  return <Context.Provider value={cache}>{children}</Context.Provider>;
}

export function useListingPhotoCache() {
  const cache = useContext(Context);
  if (!cache) throw new Error("ListingPhotoProvider is required");
  return cache;
}
