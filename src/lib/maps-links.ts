import { isValidCoordinates } from "./geo";
import type { Coordinates } from "./types";

const numericPair = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
function parsePair(text: string): Coordinates | null {
  const match = text.match(numericPair);
  if (!match) return null;
  const point = { lat: Number(match[1]), lng: Number(match[2]) };
  return isValidCoordinates(point) ? point : null;
}

// Pure parsing only. Never fetch/expand links or guess coordinates from an address.
export function parseCoordinates(text: string): Coordinates | null {
  const value = text.trim();
  const pair = parsePair(value);
  if (pair) return pair;
  if (value.startsWith("@")) {
    const match = value.match(
      /^@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:,|$)/,
    );
    return match ? parsePair(`${match[1]},${match[2]}`) : null;
  }
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (!/^(?:www\.|maps\.)?google\.(?:com|co\.in|co\.uk)$/.test(url.hostname))
      return null;
    for (const key of ["query", "q"]) {
      if (url.searchParams.has(key))
        return parsePair(url.searchParams.get(key) ?? "");
    }
    const path = decodeURIComponent(url.pathname);
    const match = path.match(
      /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:,|\/|$)/,
    );
    return match ? parsePair(`${match[1]},${match[2]}`) : null;
  } catch {
    return null;
  }
}

export function createGoogleMapsDirectionsUrl({
  origin,
  destination,
  travelMode,
}: {
  origin?: Coordinates;
  destination: Coordinates;
  travelMode?: "driving" | "walking";
}) {
  if (
    !isValidCoordinates(destination) ||
    (origin && !isValidCoordinates(origin))
  )
    throw new Error("Invalid directions coordinates");
  const params = new URLSearchParams({
    api: "1",
    destination: `${destination.lat},${destination.lng}`,
  });
  if (origin) params.set("origin", `${origin.lat},${origin.lng}`);
  if (travelMode) params.set("travelmode", travelMode);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
