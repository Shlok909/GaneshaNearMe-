"use client";

import { isValidCoordinates } from "./geo";
import type { DrivingRoute } from "./driving-route";
import type { Coordinates } from "./types";
export type { DrivingRoute } from "./driving-route";

export class RouteRequestError extends Error {}

// Only coordinates go to our authenticated endpoint. The Routes key stays on
// the server; the browser never calls Google's billable web service directly.
export async function computeDrivingRoute(origin: Coordinates, destination: Coordinates, signal: AbortSignal): Promise<DrivingRoute | null> {
  if (!isValidCoordinates(origin) || !isValidCoordinates(destination)) throw new Error("Invalid route coordinates.");
  const response = await fetch("/api/routes", {
    method: "POST",
    signal,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ origin, destination }),
  });
  if (response.status === 429) throw new RouteRequestError("Route limit reached. Please try again later or open directions in Google Maps.");
  if (response.status === 401) throw new RouteRequestError("Your session has ended. Please sign in again to load a route.");
  if (!response.ok) throw new Error("Google Routes request failed.");
  const { route }: { route: DrivingRoute | null } = await response.json();
  if (route === null) return null;
  if (!route || !Array.isArray(route.path) || route.path.length < 2 || !route.path.every(isValidCoordinates)) throw new Error("Invalid route path.");
  return route;
}
