"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readAll, toSubmission } from "@/lib/pandal-data";
import type { Submission } from "@/lib/types";
import { PANDALS_CHANGED } from "@/components/PandalDataProvider";

export function useAdminSubmissions() {
  const [state, setState] = useState({ requests: [] as Submission[], totalUsers: 0, error: "", ready: false });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    const client = createClient();
    void Promise.all([
      readAll((from, to) => client.from("pandal_submissions").select("*").neq("status", "draft").order("created_at", { ascending: false }).order("id").range(from, to)),
      client.from("profiles").select("id", { count: "exact", head: true }),
    ]).then(([requests, profiles]) => {
      if (profiles.error || profiles.count === null) throw new Error("Counts unavailable");
      if (active) setState({ requests: requests.map(toSubmission), totalUsers: profiles.count, error: "", ready: true });
    }).catch(() => { if (active) setState({ requests: [], totalUsers: 0, error: "Unable to load the review dashboard. Please retry.", ready: true }); });
    window.addEventListener("focus", refresh); window.addEventListener(PANDALS_CHANGED, refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); window.removeEventListener(PANDALS_CHANGED, refresh); };
  }, [revision, refresh]);
  return { ...state, refresh };
}
