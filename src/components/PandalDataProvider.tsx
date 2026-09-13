"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readAll, toPandal } from "@/lib/pandal-data";
import type { Pandal } from "@/lib/types";

type DataContext = {
  userId: string; pandals: Pandal[]; ids: string[]; loading: boolean; error: string;
  savesLoading: boolean; savesError: string; pendingIds: string[];
  refresh: () => void; toggle: (id: string) => Promise<void>;
};
const Context = createContext<DataContext | null>(null);
export const PANDALS_CHANGED = "gnm:database-changed";
export function announcePandalChange() { window.dispatchEvent(new Event(PANDALS_CHANGED)); }

export function PandalDataProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [pandals, setPandals] = useState<Pandal[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savesLoading, setSavesLoading] = useState(true);
  const [savesError, setSavesError] = useState("");
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const pending = useRef(new Set<string>());
  const savedIds = useRef<string[]>([]);
  const generation = useRef(0);
  const invalidate = useCallback(() => { ++generation.current; }, []);
  const refresh = useCallback(() => {
    const request = ++generation.current;
    const client = createClient();
    void readAll((from, to) => client.from("pandals").select("*").order("created_at", { ascending: false }).order("id").range(from, to))
      .then(rows => { if (request === generation.current) { setPandals(rows.map(toPandal)); setError(""); } })
      .catch(() => { if (request === generation.current) { setPandals([]); setError("Unable to load Ganapati listings right now."); } })
      .finally(() => { if (request === generation.current) setLoading(false); });
    void readAll((from, to) => client.from("saved_pandals").select("pandal_id").eq("user_id", userId).order("pandal_id").range(from, to))
      .then(rows => { if (request === generation.current && pending.current.size === 0) {
        savedIds.current = rows.map(row => row.pandal_id); setIds(savedIds.current); setSavesError("");
      } })
      .catch(() => { if (request === generation.current) setSavesError("Unable to load your saved Ganapatis. Please retry."); })
      .finally(() => { if (request === generation.current) setSavesLoading(false); });
  }, [userId]);
  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(PANDALS_CHANGED, refresh);
    return () => { invalidate(); window.removeEventListener("focus", refresh); window.removeEventListener(PANDALS_CHANGED, refresh); };
  }, [refresh, invalidate]);
  async function toggle(id: string) {
    if (pending.current.has(id)) return;
    if (savesLoading || savesError) throw new Error("Your saved list is unavailable. Please retry loading it.");
    pending.current.add(id); setPendingIds([...pending.current]);
    try {
      const client = createClient();
      const exists = savedIds.current.includes(id);
      const { error } = exists
        ? await client.from("saved_pandals").delete().eq("user_id", userId).eq("pandal_id", id)
        : await client.from("saved_pandals").insert({ user_id: userId, pandal_id: id });
      if (error && !(error.code === "23505" && !exists)) throw new Error("Your saved list could not be updated. Please try again.");
      savedIds.current = exists ? savedIds.current.filter(value => value !== id) : [...new Set([...savedIds.current, id])];
      setIds(savedIds.current);
    } finally { pending.current.delete(id); setPendingIds([...pending.current]); }
  }
  return <Context.Provider value={{ userId, pandals, ids, loading, error, savesLoading, savesError, pendingIds, refresh, toggle }}>{children}</Context.Provider>;
}
export function usePandalData() {
  const value = useContext(Context);
  if (!value) throw new Error("PandalDataProvider is required.");
  return value;
}
