// One live server-side provider request with fixed Nagpur points; no user GPS.
// Reports only route metrics and provider status, never the key or raw errors.
process.loadEnvFile(".env.local");
const key = process.env.GOOGLE_ROUTES_API_KEY?.trim();
if (!key) throw new Error("Configure GOOGLE_ROUTES_API_KEY first.");
try {
  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.polyline.geoJsonLinestring,routes.distanceMeters,routes.duration",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: 21.1458, longitude: 79.0882 } } },
      destination: { location: { latLng: { latitude: 21.1393, longitude: 79.0607 } } },
      travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE", polylineEncoding: "GEO_JSON_LINESTRING",
    }),
  });
  if (!response.ok) {
    console.log(JSON.stringify({ ok: false, status: response.status, message: "Check the server Routes key, its API/IP restrictions and quota in Google Cloud." }));
    process.exitCode = 1;
  } else {
    const { routes } = await response.json();
    const route = routes?.[0];
    const points = route?.polyline?.geoJsonLinestring?.coordinates?.length || 0;
    console.log(JSON.stringify({ ok: points >= 2, points, distanceMeters: route?.distanceMeters, duration: route?.duration }));
    if (points < 2) process.exitCode = 1;
  }
} catch {
  console.log(JSON.stringify({ ok: false, message: "The server Routes request failed or timed out." }));
  process.exitCode = 1;
}
