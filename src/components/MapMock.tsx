"use client";

import { LocateFixed, Minus, Plus } from "lucide-react";
import { useState } from "react";
import type { Pandal } from "@/lib/types";
import { ModakMarker } from "./ModakMarker";
import { UserLocationMarker } from "./UserLocationMarker";
import { ModakIcon } from "./Brand";

export function MapMock({
  pandals,
  selectedId,
  onSelect,
}: {
  pandals: Pandal[];
  selectedId?: string;
  onSelect: (pandal: Pandal) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [showLocation, setShowLocation] = useState(false);
  return (
    <section
      className="map-mock"
      aria-label="Illustrated map of Ganapati pandals in Nagpur"
    >
      <div
        className="map-canvas"
        style={{ transform: `scale(${zoom})`, transformOrigin: "43% 52%" }}
      >
        <CityMap />
        <span className="map-locality locality-civil">CIVIL LINES</span>
        <span className="map-locality locality-gokul">GOKULPETH</span>
        <span className="map-locality locality-dhantoli">DHANTOLI</span>
        <span className="map-locality locality-nandanvan">NANDANVAN</span>
        <span className="map-park park-one">
          Ambazari
          <br />
          Garden
        </span>
        <span className="map-park park-two">
          Kasturchand
          <br />
          Park
        </span>
        <span className="map-road-label">Wardha Road</span>
        {pandals.map((pandal) => (
          <ModakMarker
            key={pandal.id}
            pandal={pandal}
            selected={pandal.id === selectedId}
            onClick={() => onSelect(pandal)}
          />
        ))}
        <UserLocationMarker
          selected={showLocation}
          onClick={() => setShowLocation((value) => !value)}
        />
      </div>
      <div className="map-label">
        <span className="location-live" /> Exploring Nagpur
      </div>
      <div className="map-controls">
        <div className="zoom-controls">
          <button
            className="icon-button"
            type="button"
            aria-label="Zoom in"
            disabled={zoom >= 1.5}
            onClick={() => setZoom((value) => Math.min(1.5, value + 0.25))}
          >
            <Plus size={20} />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Zoom out"
            disabled={zoom <= 1}
            onClick={() => setZoom((value) => Math.max(1, value - 0.25))}
          >
            <Minus size={20} />
          </button>
        </div>
        <button
          type="button"
          className="icon-button locate-button"
          aria-label="Show your location"
          onClick={() => {
            setZoom(1);
            setShowLocation(true);
            document.getElementById("your-location")?.focus();
          }}
        >
          <LocateFixed size={21} />
        </button>
      </div>
      <div className="map-legend">
        <ModakIcon className="size-5" />
        <span>Tap a modak to discover Bappa</span>
      </div>
      <span className="map-disclaimer">Illustrated map · Demo locations</span>
    </section>
  );
}

function CityMap() {
  return (
    <svg
      className="city-map"
      viewBox="0 0 1000 700"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="map-blocks"
          width="135"
          height="106"
          patternTransform="rotate(-14)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="135" height="106" fill="#f0eee7" />
          <rect x="8" y="8" width="52" height="39" rx="6" fill="#e9e6df" />
          <rect x="67" y="8" width="59" height="39" rx="5" fill="#e6e5dd" />
          <rect x="8" y="55" width="37" height="42" rx="5" fill="#e9e6df" />
          <rect x="53" y="55" width="73" height="42" rx="6" fill="#e7e5dd" />
          <path d="M0 0h135v106" stroke="#fffefa" strokeWidth="8" />
          <path d="M0 51h135M63 0v51" stroke="#fffefa" strokeWidth="5" />
        </pattern>
      </defs>
      <rect width="1000" height="700" fill="url(#map-blocks)" />
      <path
        d="M0 352c57-62 109-28 141 18 40 56 65 87 53 134-16 65-113 140-194 112Z"
        fill="#d6e3c9"
      />
      <path d="M0 423c35-54 76-32 89 11 13 42-8 91-89 112" fill="#c5dce0" />
      <path d="M392 32 476 17l46 104-87 33-72-57Z" fill="#d7e1cc" />
      <path d="m696 476 123-36 40 115-131 17Z" fill="#dce4d0" />
      <path
        d="M822 0c-58 78-67 173-15 231 48 55 92 93 77 174-10 55 17 134 116 142"
        stroke="#cadfe0"
        strokeWidth="29"
      />
      <path
        d="M-20 183C173 186 207 115 370 139s246 3 359-53S861 52 1020 86M170-20c23 161 92 242 211 291s120 118 152 213 45 188 40 236M-20 593c209-19 242-112 354-151s269-6 386-43 226-12 300-39M-20 308c219 64 383 24 523-55s363-48 517-44"
        stroke="#ded9ce"
        strokeWidth="23"
      />
      <path
        d="M-20 183C173 186 207 115 370 139s246 3 359-53S861 52 1020 86M170-20c23 161 92 242 211 291s120 118 152 213 45 188 40 236M-20 593c209-19 242-112 354-151s269-6 386-43 226-12 300-39M-20 308c219 64 383 24 523-55s363-48 517-44"
        stroke="#fffdf7"
        strokeWidth="17"
      />
      <path
        d="M567-20c-16 126-20 185 6 252s79 126 69 235-3 178 20 253"
        stroke="#dccca9"
        strokeWidth="13"
      />
      <path
        d="M567-20c-16 126-20 185 6 252s79 126 69 235-3 178 20 253"
        stroke="#fcf0d1"
        strokeWidth="9"
      />
      <path
        d="M770-20c-98 192-84 259-72 369s-22 249-89 371"
        stroke="#c6c2b7"
        strokeWidth="3"
        strokeDasharray="6 6"
      />
      <path
        d="m99 51 28 36m239 295 72-38m279-136 41-61M827 592l58 79M248 627l-48 58"
        stroke="#fffefa"
        strokeWidth="9"
      />
      <g fill="#c5d5b9">
        <circle cx="102" cy="377" r="10" />
        <circle cx="128" cy="423" r="8" />
        <circle cx="155" cy="466" r="12" />
        <circle cx="78" cy="576" r="11" />
        <circle cx="453" cy="71" r="10" />
        <circle cx="477" cy="107" r="9" />
        <circle cx="780" cy="491" r="11" />
        <circle cx="743" cy="526" r="9" />
      </g>
    </svg>
  );
}
