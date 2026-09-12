export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key?.startsWith("sb_publishable_")) return null;
  try {
    const parsed = new URL(url);
    if (
      !["https:", "http:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    )
      return null;
    if (
      parsed.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(parsed.hostname)
    )
      return null;
    // The SDK takes the project origin, not its /rest/v1 Data API endpoint.
    if (!["/", "/rest/v1", "/rest/v1/"].includes(parsed.pathname)) return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}

export const AUTH_CONFIG_MESSAGE =
  "Authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart the app.";

export function requireSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config) throw new Error(AUTH_CONFIG_MESSAGE);
  return config;
}
