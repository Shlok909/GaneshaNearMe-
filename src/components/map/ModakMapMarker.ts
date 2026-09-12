import type { Pandal } from "@/lib/types";

const namespace = "http://www.w3.org/2000/svg";
export function createModakElement(pandal: Pandal) {
  const element = document.createElement("div");
  element.className = "modak-map-marker";
  const icon = document.createElementNS(namespace, "svg");
  icon.setAttribute("viewBox", "0 0 48 48");
  icon.setAttribute("aria-hidden", "true");
  for (const [d, fill, stroke] of [
    [
      "M24 4C21 14 7 22 7 33c0 12 34 12 34 0C41 22 27 14 24 4Z",
      "currentColor",
      "none",
    ],
    ["M24 10c-7 12-9 18-9 29m9-29c7 12 9 18 9 29M24 11v30", "none", "#ffefd1"],
  ]) {
    const path = document.createElementNS(namespace, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", fill);
    path.setAttribute("stroke", stroke);
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    icon.appendChild(path);
  }
  const label = document.createElement("span");
  label.className = "map-marker-label";
  label.textContent = pandal.area;
  element.append(icon, label);
  return element;
}
