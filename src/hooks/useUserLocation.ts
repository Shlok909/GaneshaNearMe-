"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isValidCoordinates } from "@/lib/geo";
import { DEFAULT_MAP_CENTER } from "@/lib/map-config";
import type { Coordinates } from "@/lib/types";

export type LocationStatus =
  "idle" | "requesting" | "active" | "denied" | "unavailable" | "error";
export type UserLocation = Coordinates & { accuracy: number };
export type LocationState = {
  status: LocationStatus;
  position: UserLocation | null;
  message: string;
};
const INITIAL: LocationState = { status: "idle", position: null, message: "" };
const PRECISE_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 30000,
  timeout: 15000,
};
const APPROXIMATE_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 30000,
  timeout: 20000,
};
const RESPONSE_GRACE_MS = 5000;

export function useUserLocation() {
  const [location, setLocation] = useState<LocationState>(INITIAL);
  const watch = useRef<number | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const lastPosition = useRef<UserLocation | null>(null);

  const clearDeadline = useCallback(() => {
    if (deadline.current !== null) clearTimeout(deadline.current);
    deadline.current = null;
  }, []);
  const clearWatch = useCallback(() => {
    generation.current += 1;
    clearDeadline();
    if (watch.current !== null && typeof navigator !== "undefined")
      navigator.geolocation?.clearWatch(watch.current);
    watch.current = null;
  }, [clearDeadline]);
  useEffect(() => clearWatch, [clearWatch]);

  const requestLocation = useCallback(() => {
    clearWatch();
    lastPosition.current = null;
    if (!window.isSecureContext || !navigator.geolocation) {
      setLocation({
        status: "unavailable",
        position: null,
        message:
          "Your browser cannot provide location here. Open this page over HTTPS or on localhost in Chrome, Edge or Safari.",
      });
      return;
    }

    function finish(status: LocationStatus, message: string) {
      clearWatch();
      lastPosition.current = null;
      setLocation({ status, position: null, message });
    }
    function startWatch(highAccuracy: boolean) {
      clearWatch();
      const token = generation.current;
      const options = highAccuracy ? PRECISE_OPTIONS : APPROXIMATE_OPTIONS;
      setLocation({
        status: "requesting",
        position: null,
        message: highAccuracy
          ? "Finding your location… Allow location access if your browser asks."
          : "Trying your device’s approximate location…",
      });
      // A browser's own timeout may exclude time spent waiting for permission.
      // Bound the UI wait as well, and discard callbacks after cancel/retry.
      deadline.current = setTimeout(
        () => {
          if (token !== generation.current) return;
          finish(
            "error",
            "Your browser has not returned a location. Check location permissions, then try again.",
          );
        },
        (options.timeout ?? 15000) + RESPONSE_GRACE_MS,
      );
      try {
        const id = navigator.geolocation.watchPosition(
          (result) => {
            if (token !== generation.current) return;
            const position = {
              lat: result.coords.latitude,
              lng: result.coords.longitude,
              accuracy: result.coords.accuracy,
            };
            if (
              !isValidCoordinates(position) ||
              !Number.isFinite(position.accuracy) ||
              position.accuracy < 0
            ) {
              finish(
                "error",
                "We couldn’t read a valid location. Please try again.",
              );
              return;
            }
            clearDeadline();
            lastPosition.current = position;
            const accuracy =
              position.accuracy < 1000
                ? Math.max(1, Math.round(position.accuracy)) + " m"
                : (position.accuracy / 1000).toFixed(1) + " km";
            setLocation({
              status: "active",
              position,
              message:
                "Your location is shown in blue. Accuracy: about " +
                accuracy +
                ".",
            });
          },
          (error) => {
            if (token !== generation.current) return;
            if (error.code === 1) {
              finish(
                "denied",
                "Location access is blocked. Allow location for this website and in your device settings, then try again.",
              );
              return;
            }
            // A temporary loss of a fix does not end a successful live watch.
            if (lastPosition.current) {
              setLocation({
                status: "active",
                position: lastPosition.current,
                message:
                  "Showing your last known location while your device reconnects.",
              });
              return;
            }
            // Some laptops cannot supply a high-accuracy fix. Try the browser's
            // standard location provider once; never substitute demo or IP data.
            if (highAccuracy && (error.code === 2 || error.code === 3)) {
              startWatch(false);
              return;
            }
            finish(
              error.code === 2 ? "unavailable" : "error",
              error.code === 3
                ? "Finding your location took too long. Check location permissions or try this page in your regular browser."
                : "Your device could not provide a location. Check location services or try this page in your regular browser.",
            );
          },
          options,
        );
        // Handles synchronous callbacks and fallback transitions in test hosts.
        if (token === generation.current) watch.current = id;
        else navigator.geolocation.clearWatch(id);
      } catch {
        finish(
          "error",
          "Location could not be started. Check your browser’s location permission and try again.",
        );
      }
    }
    startWatch(true);
  }, [clearWatch, clearDeadline]);

  const stopLocation = useCallback(() => {
    clearWatch();
    lastPosition.current = null;
    setLocation(INITIAL);
  }, [clearWatch]);
  const useDemoLocation = useCallback(() => {
    if (process.env.NODE_ENV !== "development") return;
    clearWatch();
    lastPosition.current = null;
    setLocation({
      status: "active",
      position: { ...DEFAULT_MAP_CENTER, accuracy: 20 },
      message: "Using Demo Nagpur Location.",
    });
  }, [clearWatch]);
  return { ...location, requestLocation, stopLocation, useDemoLocation };
}
