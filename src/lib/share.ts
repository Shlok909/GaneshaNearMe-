// Browser-only service seam. Stage 1 links reopen a fixture in the discovery UI.
export function pandalUrl(id: string) {
  return `${window.location.origin}/home?pandal=${encodeURIComponent(id)}`;
}

export async function sharePandal(
  id: string,
  name: string,
): Promise<"shared" | "copied" | "cancelled"> {
  const url = pandalUrl(id);
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: name,
        text: `Discover ${name} on GaneshaNearMe.`,
        url,
      });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError")
        return "cancelled";
    }
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return "copied";
    } catch {
      /* Try a local copy fallback for browsers without clipboard permission. */
    }
  }
  const activeElement = document.activeElement;
  const field = document.createElement("textarea");
  field.value = url;
  field.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.appendChild(field);
  field.select();
  try {
    if (!document.execCommand("copy")) throw new Error("Copy unavailable");
    return "copied";
  } finally {
    field.remove();
    if (activeElement instanceof HTMLElement) activeElement.focus();
  }
}
