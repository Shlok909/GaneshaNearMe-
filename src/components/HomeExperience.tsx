"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  LayoutList,
  LocateFixed,
  Map,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { usePublicPandals } from "@/lib/hooks";
import { usePandalData } from "./PandalDataProvider";
import { cn } from "@/lib/utils";
import type { Pandal } from "@/lib/types";
import {
  includeSelected,
  searchPandals,
  withDistances,
} from "@/lib/geo";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useGanapatiRoute } from "@/hooks/useGanapatiRoute";
import { GanapatiRouteCard } from "./map/GanapatiRouteCard";
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
  const data = usePandalData();
  const loading = data.loading;
  const loadError = data.error;
  const [view, setView] = useState<"map" | "list">("map");
  const [locateRequest, setLocateRequest] = useState(0);
  const [returnFocus, setReturnFocus] = useState("area-search");
  const [routePandalId, setRoutePandalId] = useState<string | null>(null);
  const [routeRequest, setRouteRequest] = useState(0);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const sorted = useMemo(
    () => withDistances(publicPandals, location.position),
    [publicPandals, location.position],
  );
  const selected =
    sorted.find((pandal) => pandal.id === params.get("pandal")) ?? null;
  const routeTarget = selected?.id === routePandalId ? selected : null;
  const route = useGanapatiRoute(routeTarget, location.position, routeRequest);
  const searchResults = useMemo(
    () => searchPandals(sorted, query),
    [sorted, query],
  );
  const filtered = useMemo(
    () =>
      searchResults.filter((pandal) => !verifiedOnly || pandal.verified),
    [searchResults, verifiedOnly],
  );
  const markers = useMemo(
    () => includeSelected(filtered, selected),
    [filtered, selected],
  );
  function select(pandal: Pandal) {
    setRoutePandalId(null);
    setDetailsId(null);
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
  function startRoute(pandal: Pandal) {
    select(pandal);
    setReturnFocus("ganapati-discovery-map");
    setRoutePandalId(pandal.id);
    setRouteRequest(value => value + 1);
    // A marker tap is an explicit request for directions. Ask once; denied or
    // unavailable location is retried only through the existing location controls.
    if (!location.position && location.status === "idle") location.requestLocation();
  }
  function clearRoute() {
    setRoutePandalId(null);
    setDetailsId(null);
    router.replace("/home", { scroll: false });
  }
  function locate() {
    if (location.status === "requesting") return;
    setView("map");
    if (selected && !routeTarget) router.replace("/home", { scroll: false });
    setLocateRequest((value) => value + 1);
    if (!location.position) {
      if (routeTarget) setRouteRequest(value => value + 1);
      location.requestLocation();
    }
  }
  function clearFilters() {
    setQuery("");
    setVerifiedOnly(false);
  }
  const empty = loading ? <div className="search-empty" role="status">Loading Ganapati listings…</div> : loadError ?
    <div className="search-empty" role="alert"><p>{loadError}</p><button className="button button-secondary" type="button" onClick={data.refresh}>Retry</button></div> : (
    <DiscoveryEmpty
      noListings={publicPandals.length === 0}
      onClear={clearFilters}
    />
  );
  return (
    <main id="main-content" className="discovery-page map-first-discovery" data-view={view} data-routing={!!routeTarget} data-location={location.status}>
      <h1 className="sr-only">Explore Ganapatis</h1>
      <div className="discovery-controls">
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
            aria-label="All Ganapatis"
            onClick={() => setVerifiedOnly(false)}
          >
            <MapPin size={16} />
            All
          </button>
          <button
            type="button"
            className={cn("filter-chip", verifiedOnly && "selected")}
            aria-pressed={verifiedOnly}
            aria-label="Verified"
            title="Verified Ganapatis"
            onClick={() => setVerifiedOnly((value) => !value)}
          >
            <BadgeCheck size={16} />
            <span>Verified</span>
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
          aria-label={location.status === "requesting" ? "Locating…" : location.position ? "My Location" : "Use My Location"}
          title={location.position ? "My Location" : "Use My Location"}
        >
          <LocateFixed size={17} />
          <span className="location-action-label">{location.status === "requesting"
            ? "Locating…"
            : location.position
              ? "My Location"
              : "Use My Location"}</span>
        </button>
        <span className="nearby-count" aria-live="polite">
          {filtered.length} listed
        </span>
        {location.position && (
          <button
            type="button"
            className="icon-button stop-location"
            aria-label="Stop using my location"
            onClick={() => { location.stopLocation(); if (routeTarget) clearRoute(); }}
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
      </div>
      {routeTarget && view === "map" && <GanapatiRouteCard
        pandal={routeTarget}
        location={location}
        route={route}
        onDetails={() => { setReturnFocus("route-details-button"); setDetailsId(routeTarget.id); }}
        onClose={clearRoute}
      />}
      <div
        className="discovery-workspace"
        style={{ display: view === "map" ? undefined : "none" }}
      >
        <div className="map-container">
          <GanapatiMap
            pandals={markers}
            selected={selected}
            userLocation={location.position}
            locateRequest={locateRequest}
            route={route.result}
            onSelect={startRoute}
            onLocate={locate}
          />
          {!filtered.length && !selected && (
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
        pandal={routeTarget && detailsId !== selected?.id ? null : selected}
        onClose={() => routeTarget ? setDetailsId(null) : router.replace("/home", { scroll: false })}
        onShowRoute={selected ? () => startRoute(selected) : undefined}
        returnFocusId={returnFocus}
      />
    </main>
  );
}
function DiscoveryEmpty({
  noListings,
  onClear,
}: {
  noListings: boolean;
  onClear: () => void;
}) {
  if (noListings) {
    return (
      <div className="search-empty first-listing-empty">
        <MapPin size={28} />
        <h3>No Ganapatis have been listed yet.</h3>
        <p>
          Share your public Ganapati with the community. Approved listings will appear here.
        </p>
        <Link href="/add" className="button button-primary button-small">
          Share Your Ganapati
        </Link>
      </div>
    );
  }
  return (
    <div className="search-empty">
      <Search size={26} />
      <h3>
        No listed Ganapati found for this search.
      </h3>
      <p>
        Try a Ganapati name or area that has been added.
      </p>
      <div className="empty-actions">
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={onClear}
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
