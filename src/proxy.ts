import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/home/:path*",
    "/add/:path*",
    "/saved/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
