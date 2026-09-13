import "server-only";
import { getVerifiedUser } from "@/lib/auth/session";
import { parseDrivingRoute } from "@/lib/driving-route";
import { isValidCoordinates } from "@/lib/geo";
import type { Coordinates } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", "Vary": "Cookie, Origin" },
  });
}

export async function POST(request: Request) {
  // Cookie authentication alone must not let another site spend route quota.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return json({ error: "Request origin is not allowed." }, 403);
  }
  if (!await getVerifiedUser()) return json({ error: "Sign in to load a route." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return json({ error: "Send route coordinates as JSON." }, 415);
  }

  let body: unknown;
  try {
    // Coordinates need only a small JSON body. Enforce the limit while reading,
    // including requests that omit or misreport Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Route coordinates are required." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) {
        await reader.cancel();
        return json({ error: "Route request is too large." }, 413);
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return json({ error: "Invalid route request." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      !("origin" in body) || !("destination" in body) ||
      Object.keys(body).some(key => key !== "origin" && key !== "destination") ||
      !isValidCoordinates(body.origin) || !isValidCoordinates(body.destination)) {
    return json({ error: "Valid origin and destination coordinates are required." }, 400);
  }

  // No public-key fallback: a missing server secret must fail closed.
  const key = process.env.GOOGLE_ROUTES_API_KEY?.trim();
  if (!key) return json({ error: "Routes are not configured yet." }, 503);
  try {
    const client = await createClient();
    const { data: retryAfter, error } = await client.rpc("consume_route_request");
    if (error || typeof retryAfter !== "number" || !Number.isFinite(retryAfter) || retryAfter < 0) {
      return json({ error: "Routes are temporarily unavailable. Please retry." }, 503);
    }
    if (retryAfter > 0) {
      const response = json({ error: "Too many route requests. Please wait before trying again." }, 429);
      response.headers.set("Retry-After", String(Math.ceil(retryAfter)));
      return response;
    }
  } catch {
    return json({ error: "Routes are temporarily unavailable. Please retry." }, 503);
  }
  const waypoint = (point: Coordinates) => ({ location: { latLng: { latitude: point.lat, longitude: point.lng } } });
  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.polyline.geoJsonLinestring,routes.distanceMeters,routes.duration,routes.warnings",
      },
      // Fixed endpoint and basic driving options: clients cannot forward URLs,
      // headers, waypoints, or more expensive routing features through us.
      body: JSON.stringify({
        origin: waypoint(body.origin), destination: waypoint(body.destination),
        travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE",
        polylineEncoding: "GEO_JSON_LINESTRING",
      }),
    });
    if (!response.ok) {
      return json({ error: "The route could not be loaded. Please try again later." }, response.status === 429 ? 429 : 502);
    }
    return json({ route: parseDrivingRoute(await response.json()) });
  } catch {
    // Never forward provider errors, key values, or coordinates to logs/clients.
    return json({ error: "The route could not be loaded. Please retry." }, 502);
  }
}
