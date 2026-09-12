import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");
  let confirmed = false;
  try {
    const supabase = await createClient();
    if (tokenHash && (type === "email" || type === "signup")) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      confirmed = !error && Boolean(data.session);
    } else if (code && !tokenHash) {
      // Supports the default email template's PKCE redirect, in the same browser.
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      confirmed = !error && Boolean(data.session);
    }
  } catch {
    // Never include callback parameters or Auth payloads in an error response.
  }
  const response = NextResponse.redirect(
    new URL(confirmed ? "/home" : "/auth/error", request.url),
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
