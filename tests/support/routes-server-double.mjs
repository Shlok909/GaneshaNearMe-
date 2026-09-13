// Loaded only by the isolated production test server; no real Google quota used.
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (!url.startsWith("https://routes.googleapis.com/")) return originalFetch(input, init);
  if (url !== "https://routes.googleapis.com/directions/v2:computeRoutes") throw new Error("Unexpected Routes endpoint");
  const headers = new Headers(init.headers);
  const key = headers.get("X-Goog-Api-Key");
  if (key !== "routes_server_test_only_never_public") throw new Error("Unexpected Routes key");
  const body = JSON.parse(init.body);
  if (init.method !== "POST" || !init.signal ||
      headers.get("X-Goog-FieldMask") !== "routes.polyline.geoJsonLinestring,routes.distanceMeters,routes.duration,routes.warnings" ||
      body.travelMode !== "DRIVE" || body.routingPreference !== "TRAFFIC_UNAWARE" ||
      body.polylineEncoding !== "GEO_JSON_LINESTRING" || body.intermediates) throw new Error("Unexpected Routes options");
  const start = body.origin.location.latLng;
  const end = body.destination.location.latLng;
  if (start.latitude === 90) return Response.json({ error: { message: `Private provider failure ${key}` } }, { status: 403 });
  if (start.latitude === 89) return Response.json({ routes: [] });
  if (start.latitude === 88) return Response.json({ routes: [{ polyline: { geoJsonLinestring: { type: "LineString", coordinates: [[200, 100]] } } }] });
  if (start.latitude === 87) return Response.json({ error: { message: `Quota ${key}` } }, { status: 429 });
  return Response.json({
    debug: key,
    routes: [{
      debug: key,
      polyline: { geoJsonLinestring: { type: "LineString", coordinates: [
        [start.longitude, start.latitude], [end.longitude, start.latitude], [end.longitude, end.latitude],
      ] } },
      distanceMeters: 3400, duration: "480s", warnings: ["Test road advisory"],
    }],
  });
};
