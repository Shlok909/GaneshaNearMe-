"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readAll, toPandal } from "@/lib/pandal-data";
import { PANDALS_CHANGED } from "@/components/PandalDataProvider";
import type { Coordinates, Pandal } from "@/lib/types";
import type { NearbyRadius } from "@/lib/geo";

export function useNearbyPandals(position: Coordinates | null, radius: NearbyRadius) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ key: "", pandals: [] as Pandal[], error: "" });
  const lat = position?.lat; const lng = position?.lng;
  const key = lat !== undefined && lng !== undefined && radius !== "all" ? `${lat}:${lng}:${radius}:${revision}` : "";
  useEffect(() => {
    if (!key || lat === undefined || lng === undefined || radius === "all") return;
    let active = true;
    const client = createClient();
    void readAll((from, to) => client.rpc("nearby_pandals", { p_latitude: lat, p_longitude: lng, p_radius_km: radius }).range(from, to))
      .then(rows => { if (active) setState({ key, pandals: rows.map(toPandal), error: "" }); })
      .catch(() => { if (active) setState({ key, pandals: [], error: "Unable to load nearby Ganapatis right now." }); });
    return () => { active = false; };
  }, [key, lat, lng, radius]);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener("focus", refresh); window.addEventListener(PANDALS_CHANGED, refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener(PANDALS_CHANGED, refresh); };
  }, []);
  return { active: !!key, loading: !!key && state.key !== key, pandals: state.key === key ? state.pandals : [],
    error: state.key === key ? state.error : "", retry: () => setRevision(value => value + 1) };
}
