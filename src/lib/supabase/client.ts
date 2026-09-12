"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseConfig } from "./config";

export function createClient() {
  const { url, key } = requireSupabaseConfig();
  // @supabase/ssr owns the browser singleton and cookie persistence.
  return createBrowserClient(url, key);
}
