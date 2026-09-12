export function createUserLocationElement() {
  const element = document.createElement("div");
  element.className = "map-user-marker";
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", "Your live location");
  const ring = document.createElement("span");
  ring.className = "location-ring";
  const dot = document.createElement("span");
  dot.className = "location-dot";
  element.append(ring, dot);
  return element;
}
