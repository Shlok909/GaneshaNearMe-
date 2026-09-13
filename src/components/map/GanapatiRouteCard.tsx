"use client";

import { Car, Navigation, X } from "lucide-react";
import type { Pandal } from "@/lib/types";
import type { useUserLocation } from "@/hooks/useUserLocation";
import type { useGanapatiRoute } from "@/hooks/useGanapatiRoute";
import { createGoogleMapsDirectionsUrl } from "@/lib/maps-links";

export function GanapatiRouteCard({ pandal, location, route, onDetails, onClose }: {
  pandal: Pandal;
  location: ReturnType<typeof useUserLocation>;
  route: ReturnType<typeof useGanapatiRoute>;
  onDetails: () => void;
  onClose: () => void;
}) {
  const distance = route.result?.route.distanceMeters;
  const duration = route.result?.route.durationMillis;
  const summary = [
    distance !== undefined && Number.isFinite(distance)
      ? distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km` : "",
    duration != null && Number.isFinite(duration)
      ? `${Math.max(1, Math.ceil(duration / 60_000))} min` : "",
  ].filter(Boolean).join(" · ");
  return (
    <section className="ganapati-route-card" aria-label="Route to selected Ganapati">
      <div className="route-card-heading">
        <span className="route-card-icon"><Navigation size={20} aria-hidden="true" /></span>
        <div>
          <p className="route-card-label">From your location</p>
          <h2>{pandal.name}</h2>
        </div>
        <button type="button" className="icon-button" aria-label="Clear route" onClick={onClose}><X size={19} /></button>
      </div>
      <p className="route-card-status" role="status">
        {!location.position
          ? location.status === "requesting" ? "Finding your location to draw the route…"
            : "Allow your current location to see the blue route to this Ganapati."
          : route.loading ? "Finding your driving route…"
            : route.error || <><Car size={16} aria-hidden="true" /> Driving route{summary && ` · ${summary}`} · Estimated without live traffic</>}
      </p>
      {route.result?.route.warnings?.map((warning, index) => <p className="route-card-warning" key={index}>{warning}</p>)}
      <div className="route-card-actions">
        <button id="route-details-button" type="button" className="button button-secondary button-small" onClick={onDetails}>View details</button>
        {location.position && <button type="button" className="text-link" disabled={route.loading} onClick={route.retry}>{route.error ? "Retry route" : "Update route"}</button>}
        <a className="text-link" href={createGoogleMapsDirectionsUrl({ destination: pandal.coordinates, origin: location.position ?? undefined, travelMode: "driving" })} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
      </div>
    </section>
  );
}
