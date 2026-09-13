import { isValidCoordinates } from "./geo";
import type { Coordinates } from "./types";

export type DrivingRoute = {
  path: Coordinates[];
  distanceMeters?: number;
  durationMillis?: number;
  warnings: string[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

// Return only the path and display fields, never arbitrary provider metadata.
export function parseDrivingRoute(payload: unknown): DrivingRoute | null {
  const routes = record(payload).routes;
  if (routes === undefined || (Array.isArray(routes) && routes.length === 0)) return null;
  if (!Array.isArray(routes)) throw new Error("Invalid routes response.");
  const route = record(routes[0]);
  const geometry = record(record(route.polyline).geoJsonLinestring);
  if (geometry.type !== "LineString" || !Array.isArray(geometry.coordinates)) throw new Error("Invalid route path.");
  const path = geometry.coordinates.map(pair => {
    if (!Array.isArray(pair)) throw new Error("Invalid route point.");
    const point = { lng: pair[0], lat: pair[1] };
    if (!isValidCoordinates(point)) throw new Error("Invalid route point.");
    return point;
  });
  if (path.length < 2) throw new Error("Incomplete route path.");
  const seconds = typeof route.duration === "string" && /^\d+(?:\.\d+)?s$/.test(route.duration) ? Number(route.duration.slice(0, -1)) : NaN;
  const millis = seconds * 1000;
  return {
    path,
    distanceMeters: typeof route.distanceMeters === "number" && Number.isFinite(route.distanceMeters) && route.distanceMeters >= 0 ? route.distanceMeters : undefined,
    durationMillis: Number.isFinite(millis) ? millis : undefined,
    warnings: Array.isArray(route.warnings) ? route.warnings.filter((warning): warning is string => typeof warning === "string") : [],
  };
}
