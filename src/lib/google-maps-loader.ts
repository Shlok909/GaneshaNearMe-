"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { GOOGLE_MAPS_API_KEY, HAS_GOOGLE_MAPS_CONFIG } from "./map-config";

export type GoogleMapsLibraries = {
  Map: typeof google.maps.Map;
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
};
let libraries: Promise<GoogleMapsLibraries> | null = null;
let configured = false;
const authListeners = new Set<() => void>();

export function subscribeMapsAuthFailure(listener: () => void) {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

// Only the maps and marker libraries of Maps JavaScript API are requested.
// A shared promise prevents duplicate SDK loads across Home and the lazy picker.
export function loadGoogleMaps(): Promise<GoogleMapsLibraries> {
  if (!HAS_GOOGLE_MAPS_CONFIG)
    return Promise.reject(new Error("Google Maps configuration is missing."));
  if (!configured) {
    configured = true;
    (window as Window & { gm_authFailure?: () => void }).gm_authFailure = () =>
      authListeners.forEach((listener) => listener());
    if (!window.google?.maps?.importLibrary)
      setOptions({
        key: GOOGLE_MAPS_API_KEY,
        v: "weekly",
        authReferrerPolicy: "origin",
      });
  }
  if (!libraries) {
    libraries = Promise.all([importLibrary("maps"), importLibrary("marker")])
      .then(([maps, marker]) => ({
        Map: maps.Map,
        AdvancedMarkerElement: marker.AdvancedMarkerElement,
      }))
      .catch(() => {
        libraries = null;
        throw new Error("Map could not be loaded.");
      });
  }
  return libraries;
}
