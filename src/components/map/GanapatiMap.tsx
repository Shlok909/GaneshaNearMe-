"use client";
import { useEffect, useRef } from "react";
import { LocateFixed, Maximize, Minus, Plus } from "lucide-react";
import type { Pandal } from "@/lib/types";
import type { UserLocation } from "@/hooks/useUserLocation";
import type { GanapatiRoute } from "@/hooks/useGanapatiRoute";
import {
  focusPandal,
  focusUserLocation,
  fitVisiblePandals,
  zoomMap,
  discoveryMapPadding,
} from "@/lib/map-camera";
import { createModakElement } from "./ModakMapMarker";
import { createUserLocationElement } from "./UserLocationMarker";
import { useGoogleMap } from "./useGoogleMap";
import { MapErrorState } from "./MapErrorState";

type MarkerEntry = {
  marker: google.maps.marker.AdvancedMarkerElement;
  element: HTMLDivElement;
  click: () => void;
  pandal: Pandal;
};
export default function GanapatiMap({
  pandals,
  selected,
  userLocation,
  locateRequest,
  route,
  onSelect,
  onLocate,
}: {
  pandals: Pandal[];
  selected: Pandal | null;
  userLocation: UserLocation | null;
  locateRequest: number;
  route: GanapatiRoute | null;
  onSelect: (pandal: Pandal) => void;
  onLocate: () => void;
}) {
  const { container, map, status, retry } = useGoogleMap();
  const markers = useRef(new Map<string, MarkerEntry>());
  const userMarker = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null,
  );
  const centered = useRef(false);
  const locateVersion = useRef(0);
  const selection = useRef("");
  const selectHandler = useRef(onSelect);
  useEffect(() => {
    selectHandler.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    if (!map) return;
    const markerSet = markers.current;
    centered.current = false;
    selection.current = "";
    return () => {
      markerSet.forEach(({ marker, click }) => {
        marker.removeEventListener("gmp-click", click);
        marker.map = null;
        marker.remove();
      });
      markerSet.clear();
      if (userMarker.current) {
        userMarker.current.map = null;
        userMarker.current.remove();
        userMarker.current = null;
      }
    };
  }, [map]);
  useEffect(() => {
    if (!map) return;
    const visible = new Set(pandals.map((pandal) => pandal.id));
    markers.current.forEach(({ marker, click }, id) => {
      if (!visible.has(id)) {
        marker.removeEventListener("gmp-click", click);
        marker.map = null;
        marker.remove();
        markers.current.delete(id);
      }
    });
    pandals.forEach((pandal) => {
      let entry = markers.current.get(pandal.id);
      if (!entry) {
        const element = createModakElement(pandal);
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: pandal.coordinates,
          title: "View details for " + pandal.name + ", " + pandal.area,
          gmpClickable: true,
          anchorTop: "-50%",
          zIndex: 1,
        });
        marker.id = "marker-" + pandal.id;
        marker.append(element);
        const click = () => {
          const current = markers.current.get(pandal.id);
          if (current) selectHandler.current(current.pandal);
        };
        marker.addEventListener("gmp-click", click);
        entry = { marker, element, click, pandal };
        markers.current.set(pandal.id, entry);
      }
      entry.pandal = pandal;
      entry.marker.position = pandal.coordinates;
      entry.marker.zIndex = pandal.id === selected?.id ? 10 : 1;
      entry.element.setAttribute(
        "data-selected",
        String(pandal.id === selected?.id),
      );
    });
  }, [map, pandals, selected?.id]);
  useEffect(() => {
    if (!map) return;
    if (selected && selection.current !== selected.id) {
      focusPandal(map, selected);
      selection.current = selected.id;
    }
    if (!selected) selection.current = "";
  }, [map, selected]);
  useEffect(() => {
    if (!map) return;
    if (!userLocation) {
      if (userMarker.current) {
        userMarker.current.map = null;
        userMarker.current.remove();
        userMarker.current = null;
      }
      centered.current = false;
      return;
    }
    if (!userMarker.current) {
      userMarker.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: userLocation,
        anchorTop: "-50%",
        zIndex: 20,
      });
      userMarker.current.append(createUserLocationElement());
    }
    userMarker.current.position = {
      lat: userLocation.lat,
      lng: userLocation.lng,
    };
    userMarker.current.title =
      "Your location, accuracy approximately " +
      Math.round(userLocation.accuracy) +
      " m";
    const requested = locateRequest !== locateVersion.current;
    if (requested || (!centered.current && !selected))
      focusUserLocation(map, userLocation);
    centered.current = true;
    locateVersion.current = locateRequest;
  }, [map, userLocation, locateRequest, selected]);
  useEffect(() => {
    if (!map || !route) return;
    // Draw the provider's path directly. This needs no extra legs/traffic data
    // and keeps the existing Modak and current-location markers intact.
    const line = new google.maps.Polyline({
      map,
      path: route.route.path?.map(point => ({ lat: point.lat, lng: point.lng })),
      strokeColor: "#2563eb", strokeOpacity: 1, strokeWeight: 6,
      clickable: false, zIndex: 5,
    });
    fitRoute(map, route);
    return () => line.setMap(null);
  }, [map, route]);
  return (
    <section
      id="ganapati-discovery-map"
      tabIndex={-1}
      className="real-map"
      aria-label="Map of Ganapati pandals"
      data-map-status={status}
    >
      <div ref={container} className="google-map-host" />
      {status === "loading" && (
        <div className="map-loading" role="status">
          Loading the map…
        </div>
      )}
      {(status === "error" || status === "missing") && (
        <MapErrorState missing={status === "missing"} onRetry={retry} />
      )}
      <div className="real-map-controls">
        <button
          type="button"
          className="icon-button"
          aria-label="Zoom in"
          disabled={!map}
          onClick={() => zoomMap(map, 1)}
        >
          <Plus size={20} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Zoom out"
          disabled={!map}
          onClick={() => zoomMap(map, -1)}
        >
          <Minus size={20} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={route ? "Fit route" : "Fit listed Ganapatis"}
          disabled={!map || !pandals.length}
          onClick={() => {
            if (map) {
              if (route) fitRoute(map, route);
              else fitVisiblePandals(map, pandals);
            }
          }}
        >
          <Maximize size={19} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={
            userLocation ? "Center on my location" : "Use My Location"
          }
          onClick={onLocate}
        >
          <LocateFixed size={21} />
        </button>
      </div>
      <span className="map-data-note">
        {route ? "Blue line · Driving route" : pandals.length
          ? "Public Ganapatis · Tap a Modak for details"
          : "Your community map"}
      </span>
    </section>
  );
}

function fitRoute(map: google.maps.Map, result: GanapatiRoute) {
  const bounds = new google.maps.LatLngBounds();
  bounds.extend(result.origin);
  bounds.extend(result.destination);
  result.route.path?.forEach(point => bounds.extend({ lat: point.lat, lng: point.lng }));
  map.fitBounds(bounds, discoveryMapPadding(map));
}
