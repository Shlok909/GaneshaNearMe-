"use client";

import { useEffect, useRef, useState } from "react";
import { calculateDistanceKm } from "@/lib/geo";
import { computeDrivingRoute, RouteRequestError, type DrivingRoute } from "@/lib/google-routes";
import type { Coordinates, Pandal } from "@/lib/types";
import type { UserLocation } from "./useUserLocation";

export type GanapatiRoute = {
  route: DrivingRoute;
  origin: Coordinates;
  destination: Coordinates;
};

type RouteState = {
  key: string;
  result: GanapatiRoute | null;
  error: string;
};

export function useGanapatiRoute(
  destination: Pandal | null,
  position: UserLocation | null,
  requestVersion: number,
) {
  const latestPosition = useRef(position);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<RouteState>({ key: "", result: null, error: "" });
  const lat = destination?.coordinates.lat;
  const lng = destination?.coordinates.lng;
  const key = destination && position
    ? `${destination.id}:${lat}:${lng}:${requestVersion}:${revision}` : "";

  useEffect(() => { latestPosition.current = position; }, [position]);
  useEffect(() => {
    if (!key || lat === undefined || lng === undefined) return;
    let active = true;
    let sequence = 0;
    let pending = false;
    let canRefresh = false;
    let lastOrigin: Coordinates | null = null;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    async function compute() {
      const current = latestPosition.current;
      if (!current) return;
      const origin = { lat: current.lat, lng: current.lng };
      const token = ++sequence;
      pending = true;
      controller = new AbortController();
      lastOrigin = origin;
      // A deadline also invalidates a late provider response; retry stays available.
      deadline = setTimeout(() => {
        if (!active || sequence !== token) return;
        sequence++;
        controller?.abort();
        pending = false;
        canRefresh = false;
        setState({ key, result: null, error: "Finding a route took too long. Please retry." });
      }, 25_000);
      try {
        const route = await computeDrivingRoute(origin, { lat: lat!, lng: lng! }, controller.signal);
        if (!active || sequence !== token) return;
        if (!route?.path || route.path.length < 2) {
          setState({ key, result: null, error: "No driving route was found to this Ganapati. You can check other travel options in Google Maps." });
          canRefresh = false;
        } else {
          setState({ key, result: { route, origin, destination: { lat: lat!, lng: lng! } }, error: "" });
          canRefresh = true;
        }
      } catch (error) {
        if (!active || sequence !== token) return;
        setState({ key, result: null, error: error instanceof RouteRequestError ? error.message : "The route could not be loaded. Please retry or open directions in Google Maps." });
        canRefresh = false;
      } finally {
        if (active && sequence === token) {
          clearTimeout(deadline);
          pending = false;
        }
      }
    }

    void compute();
    // Live GPS can be noisy. Refresh only after meaningful movement, at most
    // once per 30 seconds; never store routes or the user's position.
    const interval = setInterval(() => {
      const current = latestPosition.current;
      if (canRefresh && !pending && current && lastOrigin &&
        calculateDistanceKm(lastOrigin, current) * 1000 >= Math.max(100, current.accuracy)) {
        void compute();
      }
    }, 30_000);
    return () => {
      active = false;
      controller?.abort();
      clearTimeout(deadline);
      clearInterval(interval);
    };
  }, [key, lat, lng]);

  return {
    result: key && state.key === key ? state.result : null,
    error: key && state.key === key ? state.error : "",
    loading: !!key && state.key !== key,
    retry: () => setRevision(value => value + 1),
  };
}
