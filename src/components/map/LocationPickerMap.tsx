"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LocateFixed, Minus, Plus } from "lucide-react";
import type { Coordinates } from "@/lib/types";
import { useUserLocation } from "@/hooks/useUserLocation";
import { focusUserLocation, zoomMap } from "@/lib/map-camera";
import { createModakElement } from "./ModakMapMarker";
import { pandals } from "@/lib/mock-data";
import { useGoogleMap } from "./useGoogleMap";
import { MapErrorState } from "./MapErrorState";
import { LocationFeedback } from "../LocationFeedback";

export default function LocationPickerMap({
  value,
  onConfirm,
}: {
  value: Coordinates | null;
  onConfirm: (point: Coordinates) => void;
}) {
  const { container, map, status, retry } = useGoogleMap();
  const [point, setPoint] = useState(value);
  const [useDevicePoint, setUseDevicePoint] = useState(false);
  const location = useUserLocation();
  const candidate = useDevicePoint ? location.position : point;
  const marker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const centered = useRef(false);
  useEffect(() => {
    if (!map) return;
    const choose = (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      setUseDevicePoint(false);
      setPoint(event.latLng.toJSON());
    };
    const clickListener = map.addListener("click", choose);
    map.setOptions({ draggableCursor: "crosshair" });
    centered.current = false;
    return () => {
      clickListener.remove();
      if (marker.current) {
        marker.current.map = null;
        marker.current.remove();
      }
      marker.current = null;
    };
  }, [map]);
  useEffect(() => {
    if (!map) return;
    if (!candidate) {
      if (marker.current) {
        marker.current.map = null;
        marker.current.remove();
      }
      marker.current = null;
      return;
    }
    if (!marker.current) {
      const element = createModakElement({
        ...pandals[0],
        id: "picker-point",
        name: "Selected pandal location",
        area: "Selected point",
      });
      element.setAttribute("aria-label", "Selected pandal location");
      element.tabIndex = -1;
      element.style.pointerEvents = "none";
      marker.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: candidate,
        anchorTop: "-50%",
      });
      marker.current.style.pointerEvents = "none";
      marker.current.append(element);
    }
    marker.current.position = { lat: candidate.lat, lng: candidate.lng };
    if (!centered.current) {
      focusUserLocation(map, candidate);
      centered.current = true;
    }
  }, [map, candidate]);
  return (
    <div className="location-picker">
      <h2>Choose Exact Location on Map</h2>
      <p>Tap the pandal’s spot, or move the map and choose its center.</p>
      <div className="picker-map real-map" data-map-status={status}>
        <div ref={container} className="google-map-host" />
        {status === "loading" && (
          <div className="map-loading" role="status">
            Loading the map…
          </div>
        )}
        {(status === "error" || status === "missing") && (
          <MapErrorState missing={status === "missing"} onRetry={retry} />
        )}
        <span className="picker-crosshair" aria-hidden="true">
          +
        </span>
        <div className="real-map-controls">
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom in on location picker"
            disabled={!map}
            onClick={() => zoomMap(map, 1)}
          >
            <Plus size={19} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom out on location picker"
            disabled={!map}
            onClick={() => zoomMap(map, -1)}
          >
            <Minus size={19} />
          </button>
        </div>
      </div>
      <div className="picker-tools">
        <button
          type="button"
          className="button button-secondary button-small"
          disabled={location.status === "requesting"}
          onClick={() => {
            centered.current = false;
            setUseDevicePoint(true);
            location.requestLocation();
          }}
        >
          <LocateFixed size={16} />
          {location.status === "requesting"
            ? "Locating…"
            : "Use My Current Location"}
        </button>
        <button
          type="button"
          className="button button-secondary button-small"
          disabled={!map}
          onClick={() => {
            if (map) {
              const center = map.getCenter();
              setUseDevicePoint(false);
              if (center) setPoint(center.toJSON());
            }
          }}
        >
          Choose map center
        </button>
      </div>
      <LocationFeedback
        location={location}
        onRetry={() => {
          centered.current = false;
          setUseDevicePoint(true);
          location.requestLocation();
        }}
        onCancel={() => {
          setUseDevicePoint(false);
          location.stopLocation();
        }}
      />
      <p className="selected-coordinates" aria-live="polite">
        {candidate
          ? `Selected location: ${candidate.lat.toFixed(6)}, ${candidate.lng.toFixed(6)}`
          : "No point selected. Tap the map to choose a location."}
      </p>
      <p className="field-hint">
        Confirm only the pandal’s location. This point will be included in your
        listing.
      </p>
      <button
        type="button"
        className="button button-primary picker-confirm"
        disabled={!candidate}
        onClick={() => {
          if (candidate) onConfirm({ lat: candidate.lat, lng: candidate.lng });
        }}
      >
        <Check size={18} />
        Use this location
      </button>
    </div>
  );
}
