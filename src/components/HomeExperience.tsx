"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownWideNarrow,
  BadgeCheck,
  LayoutList,
  LocateFixed,
  Map,
  MapPin,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { usePublicPandals } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { Pandal } from "@/lib/types";
import {
  filterNearby,
  includeSelected,
  RADIUS_OPTIONS,
  searchPandals,
  withDistances,
  type NearbyRadius,
} from "@/lib/geo";
import { useUserLocation } from "@/hooks/useUserLocation";
import { AreaSearchBar } from "./AreaSearchBar";
import { PandalCard } from "./PandalCard";
import { PandalPreviewSheet } from "./PandalPreviewSheet";
import { LocationFeedback } from "./LocationFeedback";

const GanapatiMap = dynamic(() => import("./map/GanapatiMap"), {
  ssr: false,
  loading: () => (
    <div className="map-loading" role="status">
      Loading the map…
    </div>
  ),
});

export function HomeExperience() {
  const publicPandals = usePublicPandals();
  const location = useUserLocation();
  const [query, setQuery] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [radius, setRadius] = useState<NearbyRadius>(5);
  const [view, setView] = useState<"map" | "list">("map");
  const [locateRequest, setLocateRequest] = useState(0);
  const [returnFocus, setReturnFocus] = useState("area-search");
  const router = useRouter();
  const params = useSearchParams();
  const sorted = useMemo(
    () => withDistances(publicPandals, location.position),
    [publicPandals, location.position],
  );
  const selected =
    sorted.find((pandal) => pandal.id === params.get("pandal")) ?? null;
  const searchResults = useMemo(
    () => searchPandals(sorted, query),
    [sorted, query],
  );
  const filtered = useMemo(
    () =>
      filterNearby(
        searchResults.filter((pandal) => !verifiedOnly || pandal.verified),
        radius,
        !!location.position,
      ),
    [searchResults, verifiedOnly, radius, location.position],
  );
  const markers = useMemo(
    () => includeSelected(filtered, selected),
    [filtered, selected],
  );
  function select(pandal: Pandal) {
    const focused = document.activeElement?.id;
    setReturnFocus(
      focused?.startsWith("search-result")
        ? "area-search"
        : focused || "area-search",
    );
    setView("map");
    router.replace(`/home?pandal=${encodeURIComponent(pandal.id)}`, {
      scroll: false,
    });
  }
  function locate() {
    if (location.status === "requesting") return;
    setView("map");
    if (selected) router.replace("/home", { scroll: false });
    setLocateRequest((value) => value + 1);
    if (!location.position) location.requestLocation();
  }
  function clearFilters() {
    setQuery("");
    setVerifiedOnly(false);
    setRadius("all");
  }
  const noNearby =
    !!location.position &&
    radius !== "all" &&
    !query.trim() &&
    !filtered.length;
  const empty = (
    <DiscoveryEmpty
      nearby={noNearby}
      radius={radius}
      onIncrease={() =>
        setRadius(
          radius === 1 ? 3 : radius === 3 ? 5 : radius === 5 ? 10 : "all",
        )
      }
      onClear={clearFilters}
    />
  );
  return (
    <main id="main-content" className="discovery-page stage-two-discovery">
      <div className="discovery-heading">
        <div>
          <p className="eyebrow">A city full of devotion</p>
          <h1>
            A little closer to <em>Bappa.</em>
          </h1>
          <p className="discovery-intro">
            Find your next darshan, right around the corner.
          </p>
        </div>
        <span className="festival-tag">
          <Sparkles size={17} />
          Ganeshotsav 2026
        </span>
      </div>
      <div className="discovery-toolbar">
        <AreaSearchBar
          value={query}
          onChange={setQuery}
          results={searchResults}
          onSelect={select}
        />
        <div className="filter-group">
          <button
            type="button"
            className={cn("filter-chip", !verifiedOnly && "selected")}
            aria-pressed={!verifiedOnly}
            onClick={() => setVerifiedOnly(false)}
          >
            <MapPin size={16} />
            All nearby
          </button>
          <button
            type="button"
            className={cn("filter-chip", verifiedOnly && "selected")}
            aria-pressed={verifiedOnly}
            onClick={() => setVerifiedOnly((value) => !value)}
          >
            <BadgeCheck size={16} />
            Verified
          </button>
        </div>
        <div className="view-toggle" role="group" aria-label="Discovery view">
          <button
            type="button"
            aria-label="Map view"
            aria-pressed={view === "map"}
            onClick={() => setView("map")}
          >
            <Map size={17} />
            <span>Map</span>
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <LayoutList size={17} />
            <span>List</span>
          </button>
        </div>
      </div>
      <div className="nearby-controls">
        <button
          type="button"
          className="location-action"
          onClick={locate}
          disabled={location.status === "requesting"}
        >
          <LocateFixed size={17} />
          {location.status === "requesting"
            ? "Locating…"
            : location.position
              ? "My Location"
              : "Use My Location"}
        </button>
        <label className="radius-control">
          Nearby
          <select
            aria-label="Nearby radius"
            value={radius}
            disabled={!location.position}
            onChange={(event) =>
              setRadius(
                event.target.value === "all"
                  ? "all"
                  : (Number(event.target.value) as NearbyRadius),
              )
            }
          >
            {RADIUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All" : `${option} km`}
              </option>
            ))}
          </select>
        </label>
        <span className="nearby-count" aria-live="polite">
          {filtered.length} listed
        </span>
        {location.position && (
          <button
            type="button"
            className="icon-button stop-location"
            aria-label="Stop using my location"
            onClick={location.stopLocation}
          >
            <X size={16} />
          </button>
        )}
      </div>
      <LocationFeedback
        location={location}
        onRetry={locate}
        onCancel={location.stopLocation}
      />
      {process.env.NODE_ENV === "development" && (
        <button
          type="button"
          className="demo-location-button"
          onClick={() => {
            setLocateRequest((value) => value + 1);
            location.useDemoLocation();
          }}
        >
          Use Demo Nagpur Location
        </button>
      )}
      {noNearby && view === "map" && (
        <div className="mobile-location-empty">{empty}</div>
      )}
      <div
        className="discovery-workspace"
        style={{ display: view === "map" ? undefined : "none" }}
      >
        <aside className="nearby-panel">
          <div className="nearby-heading">
            <div>
              <h2>Ganapatis around you</h2>
              <p>
                {location.position
                  ? "Nearest first · straight-line distances"
                  : "Use your location for distances"}
              </p>
            </div>
            <ArrowDownWideNarrow size={19} />
          </div>
          <div className="nearby-list">
            {filtered.map((pandal) => (
              <PandalCard
                key={pandal.id}
                pandal={pandal}
                compact
                onSelect={() => select(pandal)}
              />
            ))}
            {!filtered.length && empty}
          </div>
          <div className="nearby-footer">
            <span className="tiny-dot" />
            Demo listings and local community submissions.
          </div>
        </aside>
        <div className="map-container">
          <GanapatiMap
            pandals={markers}
            selected={selected}
            userLocation={location.position}
            locateRequest={locateRequest}
            onSelect={select}
            onLocate={locate}
          />
          {!filtered.length && !selected && !location.position && (
            <div className="map-empty">{empty}</div>
          )}
        </div>
      </div>
      {view === "list" && (
        <div className="discovery-list-view">
          {filtered.length ? (
            <div className="card-grid">
              {filtered.map((pandal) => (
                <PandalCard key={pandal.id} pandal={pandal} />
              ))}
            </div>
          ) : (
            empty
          )}
        </div>
      )}
      <PandalPreviewSheet
        pandal={selected}
        onClose={() => router.replace("/home", { scroll: false })}
        returnFocusId={returnFocus}
      />
    </main>
  );
}
function DiscoveryEmpty({
  nearby,
  radius,
  onIncrease,
  onClear,
}: {
  nearby: boolean;
  radius: NearbyRadius;
  onIncrease: () => void;
  onClear: () => void;
}) {
  return (
    <div className="search-empty">
      <Search size={26} />
      <h3>
        {nearby
          ? `No listed Ganapatis found within ${radius} km.`
          : "No listed Ganapati found for this search."}
      </h3>
      <p>
        {nearby
          ? "Try a wider radius to discover more places."
          : "Try Pratap Nagar, Dharampeth or another area."}
      </p>
      <div className="empty-actions">
        {nearby && (
          <button
            type="button"
            className="button button-primary button-small"
            onClick={onIncrease}
          >
            Increase Radius
          </button>
        )}
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={onClear}
        >
          {nearby ? "Explore All" : "Clear filters"}
        </button>
      </div>
    </div>
  );
}
