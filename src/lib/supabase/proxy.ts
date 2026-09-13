import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";
import { isProtectedPath, safeNextPath } from "../auth/redirects";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getSupabaseConfig();
  let authenticated = false;
  if (config) {
    const supabase = createServerClient<Database>(config.url, config.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          const previousCookies = response.cookies.getAll();
          response = NextResponse.next({ request });
          previousCookies.forEach((cookie) => response.cookies.set(cookie));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    });
    try {
      const { data, error } = await supabase.auth.getClaims();
      authenticated = !error && Boolean(data?.claims.sub);
    } catch {
      // Network failures or invalid cookies fail closed without exposing tokens.
    }
  }
  if (!authenticated && isProtectedPath(request.nextUrl.pathname)) {
    const url = new URL("/auth", request.url);
    url.searchParams.set(
      "next",
      safeNextPath(request.nextUrl.pathname + request.nextUrl.search),
    );
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response = redirect;
  }
  // Authenticated HTML, RSC responses and cookie refreshes must never be shared.
  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}
