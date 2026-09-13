"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readAll } from "@/lib/pandal-data";
import { usePandalData, PANDALS_CHANGED } from "./PandalDataProvider";

type OwnSubmission = { id: string; mandal_name: string; area: string; created_at: string; status: string; public_access: boolean };
const labels: Record<string, string> = { draft: "Draft", approved: "Approved", manual_review: "Under Review", rejected: "Rejected" };
export function MySubmissions() {
  const { userId } = usePandalData();
  const [rows, setRows] = useState<OwnSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    const client = createClient();
    void readAll((from, to) => client.from("pandal_submissions").select("id,mandal_name,area,created_at,status,public_access")
      .eq("submitted_by", userId).order("created_at", { ascending: false }).order("id").range(from, to))
      .then(data => { if (active) { setRows(data); setError(""); } })
      .catch(() => { if (active) setError("Unable to load your submissions. Please retry."); })
      .finally(() => { if (active) setLoading(false); });
    window.addEventListener("focus", retry); window.addEventListener(PANDALS_CHANGED, retry);
    return () => { active = false; window.removeEventListener("focus", retry); window.removeEventListener(PANDALS_CHANGED, retry); };
  }, [userId, revision, retry]);
  if (loading) return <p role="status">Loading your submissions…</p>;
  if (error) return <div role="alert"><p>{error}</p><button type="button" className="text-link" onClick={retry}>Retry</button></div>;
  if (!rows.length) return <p>You haven’t shared a Ganapati yet.</p>;
  return <ul className="my-submissions-list">{rows.map(row => <li key={row.id}>
    <strong>{row.mandal_name}</strong><span>{row.area || "Map-selected location"}</span>
    <small>{new Date(row.created_at).toLocaleDateString("en-IN")} · {labels[row.status] ?? "Under Review"}</small>
    {!row.public_access && <small>Private celebration · Does not appear on the public map</small>}
    {row.status === "draft" && <small>Photos or final submission are incomplete. Retry in your open submission form.</small>}
  </li>)}</ul>;
}
