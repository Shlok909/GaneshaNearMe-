import type { Coordinates, Pandal } from "./types";

export function focusPandal(map: google.maps.Map, pandal: Pandal) {
  map.moveCamera({ center: pandal.coordinates, zoom: 15 });
}
export function focusUserLocation(map: google.maps.Map, point: Coordinates) {
  map.moveCamera({ center: { lat: point.lat, lng: point.lng }, zoom: 14 });
}
export function fitVisiblePandals(map: google.maps.Map, pandals: Pandal[]) {
  if (!pandals.length) return;
  if (pandals.length === 1) {
    focusPandal(map, pandals[0]);
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  pandals.forEach((pandal) => bounds.extend(pandal.coordinates));
  map.fitBounds(bounds, discoveryMapPadding(map));
}
export function zoomMap(map: google.maps.Map | null, delta: number) {
  if (map) map.setZoom((map.getZoom() ?? 12) + delta);
}

// Keep fitted markers and route endpoints clear of Home's floating controls.
export function discoveryMapPadding(map: google.maps.Map): google.maps.Padding {
  const host = map.getDiv();
  const home = host.closest(".map-first-discovery");
  if (!home) return { top: 65, right: 65, bottom: 90, left: 65 };
  const controls = home.querySelector(".discovery-controls");
  const route = home.querySelector(".ganapati-route-card");
  if (host.clientWidth >= 800) return {
    top: 45, right: 75, bottom: 60,
    left: Math.max(controls?.clientWidth ?? 0, route?.clientWidth ?? 0) + 30,
  };
  return {
    top: Math.min((controls?.clientHeight ?? 100) + 28, host.clientHeight * 0.38),
    right: 72,
    bottom: route ? Math.min(route.clientHeight + 48, host.clientHeight * 0.38) : 65,
    left: 42,
  };
}
