"use client";
import { usePandalData } from "@/components/PandalDataProvider";
export function useSavedPandals() {
  const { ids, toggle, savesLoading: loading, savesError: error, pendingIds, refresh } = usePandalData();
  return { ids, toggle, loading, error, pendingIds, refresh };
}
export function usePublicPandals() { return usePandalData().pandals; }
