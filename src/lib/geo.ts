import type { Coordinates, Pandal } from "./types";

export const RADIUS_OPTIONS = [1, 3, 5, 10, "all"] as const;
export type NearbyRadius = (typeof RADIUS_OPTIONS)[number];

export function isValidCoordinates(value: unknown): value is Coordinates {
  if (
    !value ||
    typeof value !== "object" ||
    !("lat" in value) ||
    !("lng" in value)
  )
    return false;
  return (
    typeof value.lat === "number" &&
    typeof value.lng === "number" &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng) &&
    Math.abs(value.lat) <= 90 &&
    Math.abs(value.lng) <= 180
  );
}

export function calculateDistanceKm(a: Coordinates, b: Coordinates): number {
  if (!isValidCoordinates(a) || !isValidCoordinates(b)) return NaN;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const halfLat = Math.sin(radians(b.lat - a.lat) / 2);
  const halfLng = Math.sin(radians(b.lng - a.lng) / 2);
  const h =
    halfLat ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * halfLng ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function formatDistance(distanceKm?: number) {
  if (
    distanceKm === undefined ||
    !Number.isFinite(distanceKm) ||
    distanceKm < 0
  )
    return "";
  return distanceKm < 1
    ? `${Math.round(distanceKm * 1000)} m away`
    : `${distanceKm.toFixed(1)} km away`;
}

export function withDistances(
  pandals: Pandal[],
  origin: Coordinates | null,
): Pandal[] {
  if (!origin || !isValidCoordinates(origin)) return pandals;
  return pandals
    .map((pandal) => ({
      ...pandal,
      distanceKm: calculateDistanceKm(origin, pandal.coordinates),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function searchPandals(pandals: Pandal[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return pandals.filter((pandal) =>
    `${pandal.name} ${pandal.area}`.toLocaleLowerCase().includes(normalized),
  );
}

export function filterNearby(
  pandals: Pandal[],
  radius: NearbyRadius,
  hasLocation: boolean,
) {
  return !hasLocation || radius === "all"
    ? pandals
    : pandals.filter(
        (pandal) =>
          pandal.distanceKm !== undefined && pandal.distanceKm <= radius,
      );
}

export function includeSelected(pandals: Pandal[], selected: Pandal | null) {
  return selected && !pandals.some((pandal) => pandal.id === selected.id)
    ? [...pandals, selected]
    : pandals;
}
