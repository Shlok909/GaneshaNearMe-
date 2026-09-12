const protectedPaths = ["/home", "/add", "/saved", "/profile", "/admin"];

export function isProtectedPath(path: string) {
  return protectedPaths.some(
    (base) => path === base || path.startsWith(`${base}/`),
  );
}

export function safeNextPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\s#]/.test(value)
  )
    return "/home";
  try {
    const url = new URL(value, "https://gnm.invalid");
    if (
      url.origin !== "https://gnm.invalid" ||
      !protectedPaths.includes(url.pathname)
    )
      return "/home";
    const pandal = url.searchParams.get("pandal");
    // Preserve shared listing links without forwarding arbitrary query data.
    return url.pathname === "/home" &&
      pandal &&
      /^[a-zA-Z0-9_-]{1,160}$/.test(pandal)
      ? `/home?pandal=${encodeURIComponent(pandal)}`
      : url.pathname;
  } catch {
    return "/home";
  }
}

export function confirmationUrl() {
  const url = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  );
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Invalid site URL");
  return new URL("/auth/confirm", url.origin).toString();
}
