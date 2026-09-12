"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  GOOGLE_MAP_ID,
  HAS_GOOGLE_MAPS_CONFIG,
} from "@/lib/map-config";
import {
  loadGoogleMaps,
  subscribeMapsAuthFailure,
} from "@/lib/google-maps-loader";

export function useGoogleMap() {
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error" | "missing"
  >(HAS_GOOGLE_MAPS_CONFIG ? "loading" : "missing");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!container.current || !HAS_GOOGLE_MAPS_CONFIG) return;
    const host = container.current;
    let disposed = false;
    let authFailed = false;
    let instance: google.maps.Map | undefined;
    let resize: ResizeObserver | undefined;
    let visibility: IntersectionObserver | undefined;
    let visible = true;
    const listeners: google.maps.MapsEventListener[] = [];
    const pauseMotion = () =>
      host.style.setProperty(
        "--map-pulse-state",
        visible && !document.hidden ? "running" : "paused",
      );
    const timeout = window.setTimeout(() => {
      if (!disposed) setStatus("error");
    }, 25000);
    const unsubscribe = subscribeMapsAuthFailure(() => {
      authFailed = true;
      if (!disposed) setStatus("error");
    });
    loadGoogleMaps()
      .then(({ Map }) => {
        if (disposed || authFailed) return;
        instance = new Map(host, {
          center: DEFAULT_MAP_CENTER,
          zoom: DEFAULT_MAP_ZOOM,
          mapId: GOOGLE_MAP_ID,
          mapTypeId: "roadmap",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          cameraControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
          keyboardShortcuts: true,
          tilt: 0,
          heading: 0,
          minZoom: 3,
        });
        listeners.push(
          google.maps.event.addListenerOnce(instance, "idle", () => {
            if (disposed || authFailed || !instance) return;
            window.clearTimeout(timeout);
            const capabilities = instance.getMapCapabilities();
            if (!capabilities.isAdvancedMarkersAvailable) {
              setStatus("error");
              return;
            }
            setMap(instance);
            setStatus("ready");
          }),
        );
        resize = new ResizeObserver(() => {
          if (!disposed && instance)
            google.maps.event.trigger(instance, "resize");
        });
        resize.observe(host);
        visibility = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          pauseMotion();
        });
        visibility.observe(host);
        document.addEventListener("visibilitychange", pauseMotion);
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      unsubscribe();
      resize?.disconnect();
      visibility?.disconnect();
      document.removeEventListener("visibilitychange", pauseMotion);
      listeners.forEach((listener) => listener.remove());
      if (instance) {
        google.maps.event.clearInstanceListeners(instance);
        instance.unbindAll();
      }
      // Maps JS has no destroy method. Release listeners, DOM and all references;
      // marker owners detach their AdvancedMarkerElements in their own cleanup.
      host.replaceChildren();
      instance = undefined;
    };
  }, [attempt]);
  function retry() {
    setMap(null);
    setStatus(HAS_GOOGLE_MAPS_CONFIG ? "loading" : "missing");
    setAttempt((value) => value + 1);
  }
  return { container, map, status, retry };
}
