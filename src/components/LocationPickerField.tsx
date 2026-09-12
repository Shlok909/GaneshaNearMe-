"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MapPin } from "lucide-react";
import type { Coordinates } from "@/lib/types";
import { Modal } from "./ui/Modal";

const LocationPickerMap = dynamic(() => import("./map/LocationPickerMap"), {
  ssr: false,
  loading: () => <div className="picker-loading">Loading location picker…</div>,
});

export function LocationPickerField({
  value,
  onChange,
  error,
}: {
  value: Coordinates | null;
  onChange: (point: Coordinates) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="coordinate-field">
      <button
        type="button"
        id="coordinates"
        className="button button-secondary"
        onClick={() => setOpen(true)}
        aria-describedby={error ? "coordinates-error" : "coordinates-help"}
      >
        <MapPin size={18} />
        {value
          ? "Change Exact Location on Map"
          : "Choose Exact Location on Map"}
      </button>
      {value && (
        <p className="selected-coordinates" aria-live="polite">
          Selected location: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
      )}
      <p id="coordinates-help" className="field-hint">
        An exact map point is required for every listing.
      </p>
      {error && (
        <p id="coordinates-error" className="field-error">
          {error}
        </p>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Choose exact pandal location"
        description="Pick the public pandal’s coordinates and confirm your selection."
        className="location-picker-modal"
        returnFocusId="coordinates"
      >
        {open && (
          <LocationPickerMap
            value={value}
            onConfirm={(point) => {
              onChange(point);
              setOpen(false);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
