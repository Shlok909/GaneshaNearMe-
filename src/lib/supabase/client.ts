"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export function createClient() {
  const { url, key } = requireSupabaseConfig();
  // @supabase/ssr owns the browser singleton and cookie persistence.
  return createBrowserClient<Database>(url, key);
}
