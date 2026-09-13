import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export async function createClient() {
  const { url, key } = requireSupabaseConfig();
  const cookieStore = await cookies();
  // A new client for each request. Never share another visitor's cookies.
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies. Proxy performs refresh
          // before rendering; Actions and Route Handlers can write them here.
        }
      },
    },
  });
}
