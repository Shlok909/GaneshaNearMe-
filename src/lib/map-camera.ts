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
  map.fitBounds(bounds, { top: 65, right: 65, bottom: 90, left: 65 });
}
export function zoomMap(map: google.maps.Map | null, delta: number) {
  if (map) map.setZoom((map.getZoom() ?? 12) + delta);
}
